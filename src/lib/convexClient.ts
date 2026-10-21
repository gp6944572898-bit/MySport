import { ConvexReactClient } from "convex/react"

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined

if (!convexUrl) {
  // В рантайме без переменной окружения Convex-клиент не сможет подключиться —
  // явная ошибка в консоли вместо непонятного поведения UI.
  console.warn(
    "VITE_CONVEX_URL не задан. Задайте его в .env.local (см. BUILD_NOTES.md).",
  )
}

export const convex = new ConvexReactClient(convexUrl ?? "")
