// Пост-обработка билда: TanStack Start (версия, закреплённая в package.json)
// в SPA-режиме генерирует dist/.../ _shell.html, в котором тег <script
// type="module" src="..."> для главного клиентского бандла не вставляется
// в саму HTML-разметку — он только упоминается как данные внутри служебного
// bootstrap-скрипта ($_TSR). Из-за этого браузер не загружает и не
// выполняет ни строчки приложения и показывает полностью белый экран.
//
// Это баг конкретно в сборке SPA-режима этой версии фреймворка (нитро/вайт
// всё остальное собирают верно — CSS, чанки роутов и т.д. присутствуют и
// рабочие). Пока это не починили выше по стеку, чиним сами: находим все
// файлы _shell.html, которые реально попадают в деплой, вытаскиваем путь к
// главному бандлу из уже встроенных в файл данных манифеста и, если
// настоящего <script> тега для него ещё нет, дописываем его явно.
import { readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"

const candidates = [
  ".vercel/output/static/_shell.html",
  "dist/client/_shell.html",
  ".tanstack/start/build/client-dist/_shell.html",
]

const entryRe = /import\(['"](\/assets\/main-[^'"]+\.js)['"]\)/

let patchedAny = false

for (const rel of candidates) {
  const file = path.resolve(process.cwd(), rel)
  if (!existsSync(file)) continue

  const html = await readFile(file, "utf8")
  const match = html.match(entryRe)
  if (!match) {
    console.warn(`[patch-shell] ${rel}: не нашёл путь к главному бандлу в манифесте, пропускаю`)
    continue
  }
  const entryUrl = match[1]

  const hasRealScriptTag = new RegExp(
    `<script[^>]*type=["']module["'][^>]*src=["']${entryUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
  ).test(html)

  if (hasRealScriptTag) {
    console.log(`[patch-shell] ${rel}: настоящий <script> тег уже есть, пропускаю`)
    continue
  }

  const scriptTag = `<script type="module" async src="${entryUrl}"></script>`
  const patched = html.includes("</body>")
    ? html.replace("</body>", `${scriptTag}</body>`)
    : `${html}${scriptTag}`

  await writeFile(file, patched, "utf8")
  patchedAny = true
  console.log(`[patch-shell] ${rel}: добавлен <script src="${entryUrl}">`)
}

if (!patchedAny) {
  console.log("[patch-shell] ни один _shell.html не найден или патчить не потребовалось")
}
