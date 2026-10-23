import { defineConfig } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
// Без плагина nitro() TanStack Start не создаёт серверную функцию для
// Vercel — сайт собирается, но отдаёт 404 на всех страницах (включая "/"),
// потому что Vercel получает только статические ассеты без SSR-рендера.
import { nitro } from "nitro/vite"
import tsConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      // На Vercel пререндер TanStack Start делает HTTP-запрос самого себя
      // на свой же деплойный URL, чтобы сгенерировать статический HTML —
      // именно это и давало 508 INFINITE_LOOP_DETECTED на каждой странице
      // (Vercel обслуживает SSR по запросу, пререндер тут не нужен).
      prerender: {
        enabled: false,
      },
    }),
    nitro(),
  ],
})
