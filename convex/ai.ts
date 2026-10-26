// Распознавание данных события (или нескольких событий) из загруженного
// организатором файла — PDF с положением о соревновании или скриншот —
// через бесплatный уровень Google Gemini API. "use node" нужен для fetch
// с бинарными данными и Buffer (надёжнее, чем btoa в обычном V8-рантайме
// Convex для больших файлов вроде многостраничных PDF).
"use node"

import { v } from "convex/values"
import { action } from "./_generated/server"
import { requireRole } from "./lib/authz"
import type { Id } from "./_generated/dataModel"

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

async function callGemini(opts: {
  apiKey: string
  mimeType: string
  base64Data: string
  prompt: string
  responseSchema: unknown
}) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${opts.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: opts.prompt },
              { inline_data: { mime_type: opts.mimeType, data: opts.base64Data } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: opts.responseSchema,
        },
      }),
    },
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API вернул ошибку (${res.status}): ${errText.slice(0, 500)}`)
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error("Gemini не вернул данные — возможно, файл не распознан")
  return JSON.parse(text)
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
    await requireRole(ctx, ["admin", "organizer"])
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
    await requireRole(ctx, ["admin", "organizer"])
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
