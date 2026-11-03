// Распознавание данных события (или нескольких событий) из загруженного
// организатором файла — PDF с положением о соревновании или скриншот —
// через бесплatный уровень Google Gemini API. "use node" нужен для fetch
// с бинарными данными и Buffer (надёжнее, чем btoa в обычном V8-рантайме
// Convex для больших файлов вроде многостраничных PDF).
"use node"

import { v } from "convex/values"
import { action } from "./_generated/server"
import { api } from "./_generated/api"
import type { Id } from "./_generated/dataModel"

// В экшенах нет прямого доступа к ctx.db, поэтому роль проверяем через
// запрос profiles.me (авторизация передаётся из экшена в runQuery).
async function requireOrganizerOrAdmin(ctx: {
  runQuery: (fn: any, args: any) => Promise<any>
}) {
  const role = await ctx.runQuery(api.profiles.me, {})
  if (role !== "admin" && role !== "organizer") {
    throw new Error("Недостаточно прав для этого действия")
  }
}

const extractedEventSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING", description: "Название соревнования/мероприятия" },
    sportName: { type: "STRING", description: "Вид спорта, как он указан в документе" },
    venueName: { type: "STRING", description: "Название площадки/объекта проведения" },
    address: { type: "STRING", description: "Адрес площадки, если указан" },
    city: { type: "STRING", description: "Город проведения" },
    startDateTime: {
      type: "STRING",
      description: "Дата и время начала в формате ISO 8601 (YYYY-MM-DDTHH:mm:ss), без таймзоны",
    },
    endDateTime: {
      type: "STRING",
      nullable: true,
      description: "Дата и время окончания в формате ISO 8601, если указаны",
    },
    rank: {
      type: "STRING",
      enum: ["local", "regional", "national", "international"],
      description:
        "Уровень соревнования: local — городские/районные, regional — региональные/областные, national — всероссийские, international — международные",
    },
    description: { type: "STRING", nullable: true, description: "Краткое описание, если есть" },
  },
  required: ["title", "sportName", "city", "startDateTime", "rank"],
}

// Список доступных flash-моделей, поддерживающих generateContent: названия
// моделей у Google меняются и старые отключают, поэтому берём актуальный
// список прямо у API и пробуем модели по очереди, если одна перегружена.
async function listFlashModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${apiKey}`,
    )
    if (!res.ok) return []
    const data = (await res.json()) as {
      models?: Array<{ name: string; supportedGenerationMethods?: string[] }>
    }
    return (data.models ?? [])
      .filter(
        (m) =>
          m.name.includes("flash") &&
          m.supportedGenerationMethods?.includes("generateContent") &&
          !/(image|tts|live|audio|embedding|thinking|exp|preview-)/.test(m.name),
      )
      .map((m) => m.name.replace("models/", ""))
      .sort()
      .reverse()
  } catch {
    return []
  }
}

async function callGemini(opts: {
  apiKey: string
  mimeType?: string
  base64Data?: string
  prompt: string
  responseSchema?: unknown
}) {
  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { text: opts.prompt },
          ...(opts.base64Data
            ? [{ inline_data: { mime_type: opts.mimeType, data: opts.base64Data } }]
            : []),
        ],
      },
    ],
    // Без responseSchema возвращаем обычный текст (например, SVG для баннера).
    generationConfig: opts.responseSchema
      ? { responseMimeType: "application/json", responseSchema: opts.responseSchema }
      : {},
  })

  const primary = process.env.GEMINI_MODEL ?? "gemini-3.8-flash"
  const models = [primary]
  let lastError = ""
  let listed = false

  for (let i = 0; i < models.length; i++) {
    const model = models[i]
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${opts.apiKey}`

    // Одна модель: до 2 попыток при временных 503/429.
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) throw new Error("Gemini не вернул данные — возможно, файл не распознан")
        return opts.responseSchema ? JSON.parse(text) : text
      }
      lastError = `${model} (${res.status}): ${(await res.text()).slice(0, 200)}`
      if (res.status !== 503 && res.status !== 429) break
      if (attempt === 0) await new Promise((r) => setTimeout(r, 2000))
    }

    // Основная модель не ответила — один раз подгружаем запасные.
    if (!listed) {
      listed = true
      const others = (await listFlashModels(opts.apiKey)).filter((m) => m !== primary)
      models.push(...others.slice(0, 5))
    }
  }

  throw new Error(`Gemini сейчас перегружен или недоступен, попробуйте через минуту. ${lastError}`)
}

async function fetchStorageFile(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  storageId: Id<"_storage">,
) {
  const url = await ctx.storage.getUrl(storageId)
  if (!url) throw new Error("Файл не найден в хранилище")
  const res = await fetch(url)
  if (!res.ok) throw new Error("Не удалось прочитать загруженный файл")
  const mimeType = res.headers.get("content-type") ?? "application/octet-stream"
  const buffer = Buffer.from(await res.arrayBuffer())
  return { mimeType, base64Data: buffer.toString("base64") }
}

const todayPrompt = () => {
  const today = new Date().toISOString().slice(0, 10)
  return `Сегодняшняя дата: ${today}. Если в документе год не указан явно, выбирай ближайшую будущую дату относительно сегодняшней.`
}

export const extractEvent = action({
  args: { storageId: v.id("_storage") },
  returns: v.any(),
  handler: async (ctx, { storageId }) => {
    await requireOrganizerOrAdmin(ctx)
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error("GEMINI_API_KEY не настроен в Convex")

    const { mimeType, base64Data } = await fetchStorageFile(ctx, storageId)
    const prompt = `Ты помогаешь заполнить карточку спортивного мероприятия на сайте «Мой Спорт». Извлеки данные из приложенного документа (положение о проведении соревнования или афиша/скриншот) и верни их строго в виде JSON по заданной схеме, на русском языке. ${todayPrompt()} Если какого-то поля нет в документе — оставь его пустой строкой (кроме rank — выбери наиболее вероятный уровень).`

    return callGemini({ apiKey, mimeType, base64Data, prompt, responseSchema: extractedEventSchema })
  },
})

export const extractEvents = action({
  args: { storageId: v.id("_storage") },
  returns: v.any(),
  handler: async (ctx, { storageId }) => {
    await requireOrganizerOrAdmin(ctx)
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error("GEMINI_API_KEY не настроен в Convex")

    const { mimeType, base64Data } = await fetchStorageFile(ctx, storageId)
    const prompt = `Ты помогаешь массово добавить спортивные мероприятия на сайт «Мой Спорт» из загруженного документа (календарь/расписание соревнований, может содержать несколько мероприятий). Извлеки ВСЕ найденные мероприятия и верни их строго в виде JSON-массива по заданной схеме, на русском языке. ${todayPrompt()} Если какого-то поля нет для конкретного мероприятия — оставь его пустой строкой (кроме rank — выбери наиболее вероятный уровень). Если в документе только одно мероприятие — верни массив из одного элемента.`

    return callGemini({
      apiKey,
      mimeType,
      base64Data,
      prompt,
      responseSchema: { type: "ARRAY", items: extractedEventSchema },
    })
  },
})

// Убирает из SVG всё, что может выполнять код или тянуть внешние ресурсы.
// Баннер показывается через <img>, где скрипты и так не исполняются, но
// чистим на всякий случай — файл публичный и его могут открыть напрямую.
function sanitizeSvg(raw: string): string {
  let svg = raw.replace(/```(?:svg|xml)?/gi, "").trim()
  const start = svg.indexOf("<svg")
  const end = svg.lastIndexOf("</svg>")
  if (start === -1 || end === -1) throw new Error("ИИ не вернул корректный баннер, попробуйте ещё раз")
  svg = svg.slice(start, end + 6)
  svg = svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/(xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, "")
  if (svg.length > 150_000) throw new Error("Баннер получился слишком большим, попробуйте ещё раз")
  return svg
}

// Генерация баннера события ИИ: бесплатные модели Gemini не рисуют картинки,
// но умеют писать SVG — получается аккуратная векторная обложка с названием,
// видом спорта, городом и датой. Файл сохраняется в хранилище Convex.
export const generateBanner = action({
  args: {
    title: v.string(),
    sportName: v.optional(v.string()),
    city: v.optional(v.string()),
    dateText: v.optional(v.string()),
  },
  returns: v.object({ storageId: v.id("_storage"), url: v.union(v.string(), v.null()) }),
  handler: async (ctx, { title, sportName, city, dateText }) => {
    await requireOrganizerOrAdmin(ctx)
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error("GEMINI_API_KEY не настроен в Convex")

    const prompt = `Нарисуй рекламный баннер спортивного соревнования в формате SVG для сайта афиши.
Требования: viewBox="0 0 1200 630" с width="1200" height="630"; яркий современный градиентный фон и простые векторные спортивные силуэты/фигуры по теме вида спорта; крупный читаемый заголовок; под ним мелким шрифтом вид спорта, город и дата; текст на русском, font-family="Arial, sans-serif", без обрезания текста за границы (длинный заголовок разбей на 2–3 строки через отдельные <text>/<tspan>); достаточный контраст текста с фоном.
Запрещено: <script>, <foreignObject>, внешние ссылки и изображения, любые href кроме внутренних #id.
Данные: заголовок «${title}»; вид спорта «${sportName ?? ""}»; город «${city ?? ""}»; дата «${dateText ?? ""}».
Верни ТОЛЬКО код SVG, без пояснений и без markdown.`

    const raw = (await callGemini({ apiKey, prompt })) as string
    const svg = sanitizeSvg(raw)
    const storageId = await ctx.storage.store(new Blob([svg], { type: "image/svg+xml" }))
    return { storageId, url: await ctx.storage.getUrl(storageId) }
  },
})
