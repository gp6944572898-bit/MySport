import { defineConfig } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import tsConfigPaths from "vite-tsconfig-paths"

// ВАЖНО: используем официальный SPA-режим TanStack Start (`spa.enabled`),
// а не просто "выключенный" SSR. Без плагина nitro() и без SPA-режима
// билд всё равно собирает dist/server/server.js (сам TanStack Start так
// устроен), но ничего не упаковывает это в функцию для Vercel — рантайма,
// который бы обслуживал "/", просто нет, и Vercel отдаёт 404.
//
// SPA-режим решает это иначе: во время сборки TanStack Start сам
// поднимает dist/server/server.js как временный preview-сервер, рендерит
// HTML-оболочку корневого роута ОДИН раз и сохраняет её как статический
// файл (_shell.html) рядом с остальными ассетами в dist/client/. Дальше
// уже не нужен никакой серверный рантайм вообще — Vercel отдаёт
// dist/client как чистую статику, а на любой путь (кроме реальных файлов)
// возвращает _shell.html, и TanStack Router подхватывает роутинг в
// браузере. Вся работа с данными и так идёт через реактивный Convex
// useQuery на клиенте, так что SSR тут не нужен.
//
// Это тот же билд-таймовый пререндер, что ломался раньше (ERR_MODULE_NOT_FOUND:
// preview-сервер искал dist/server/server.js, а nitro с vercel-пресетом
// клал билд в .vercel/output/functions/__fallback.func/...). Теперь nitro
// вообще не используется, dist/server/server.js лежит там, где его ищет
// preview-сервер, так что пререндер должен отработать штатно.
export default defineConfig({
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          outputPath: "/_shell.html",
        },
      },
    }),
  ],
})
