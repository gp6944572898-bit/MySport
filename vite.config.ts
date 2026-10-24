import { defineConfig } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import tsConfigPaths from "vite-tsconfig-paths"

// ВАЖНО: без плагина nitro() собирается полностью клиентский SPA-билд
// (dist/client/ — обычный index.html + ассеты, dist/server/ при этом не
// нужен и не собирается). Это осознанный выбор, а не временная заглушка:
// связка nitro + TanStack Start + Vercel на момент написания этого кода
// (версии ~2026-10) ломается на проде несколькими разными способами —
// исследовано и подтверждено в этом репозитории:
//   1. nitro() с vercel-пресетом даёт 508 INFINITE_LOOP_DETECTED на
//      КАЖДОЙ странице в рантайме: серверная функция __fallback сама
//      делает исходящий HTTP-запрос на собственный домен (видно в
//      Vercel Logs как "External APIs: GET <свой же хост>"). Бисекцией
//      подтверждено, что это не баг нашего кода — цикл остаётся даже на
//      полностью пустой странице без Convex/auth. Ни entryFormat: "node"
//      (обход из TanStack/router#6562), ни отключение, ни включение
//      build-time пререндера цикл не устранили.
//   2. Билд-таймовый пререндер (prerender.enabled: true) ДОПОЛНИТЕЛЬНО
//      ломается отдельно: TanStack Start поднимает свой preview-сервер
//      для рендера HTML и ищет его по пути dist/server/server.js, но
//      nitro с vercel-пресетом кладёт сборку в другую структуру
//      (.vercel/output/functions/__fallback.func/...) — preview-сервер
//      не находит файл (ERR_MODULE_NOT_FOUND), пререндерит 0 страниц.
// Поскольку вся работа с данными (Convex) и так идёт на клиенте через
// реактивные useQuery, SSR тут не критичен — обычный SPA полностью
// закрывает потребности этого MVP. Vercel раздаёт dist/client как
// статику и возвращает index.html на любой путь через rewrites в
// vercel.json (SPA fallback), а TanStack Router берёт на себя роутинг
// в браузере.
export default defineConfig({
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      prerender: {
        enabled: false,
      },
    }),
  ],
})
