import { defineConfig } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
// Без плагина nitro() TanStack Start не создаёт серверную функцию для
// Vercel — сайт собирается, но отдаёт 404 на всех страницах (включая "/"),
// потому что Vercel получает только статические ассеты без SSR-рендера.
import { nitro } from "nitro/vite"
import viteReact from "@vitejs/plugin-react"
import tsConfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart(),
    nitro(),
    viteReact(),
  ],
})
