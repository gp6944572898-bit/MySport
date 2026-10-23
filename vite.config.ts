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
      // Включаем билд-таймовый пререндер: страницы, которые можно
      // пререндерить (без админских роутов за Authenticated), станут
      // обычными статическими HTML-файлами в .vercel/output/static —
      // для них Vercel вообще не будет вызывать серверную функцию
      // (__fallback), в которой и происходит самовызов → 508
      // INFINITE_LOOP_DETECTED (отключение пререндера само по себе
      // цикл не устранило, проверено деплоем).
      prerender: {
        enabled: true,
        crawlLinks: true,
        failOnError: false,
      },
    }),
    // entryFormat: "node" — задокументированный обход известного бага
    // nitro/srvx на Vercel (TanStack/router#6562): веб-обработчик Nitro
    // перезаписывает req.runtime целиком и стирает runtime.node, который
    // ставит srvx; из-за сломанного объекта запроса обработчик вместо
    // ответа клиенту уходит в исходящий HTTP-запрос на собственный домен
    // (видно в Vercel Logs как "External APIs: GET <свой же хост>"),
    // отсюда 508 INFINITE_LOOP_DETECTED. Node-формат входа не трогает
    // runtime.node.
    nitro({
      preset: "vercel",
      vercel: {
        entryFormat: "node",
      },
    }),
  ],
})
