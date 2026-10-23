import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router"
import type { ReactNode } from "react"
import { ConvexAuthProvider } from "@convex-dev/auth/react"
import { convex } from "~/lib/convexClient"
import { NavBar } from "~/components/NavBar"
import appCss from "~/styles/app.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Мой Спорт — спортивное сообщество" },
      {
        name: "description",
        content:
          "Мой Спорт — платформа для спортсменов, тренеров, родителей, спортивных школ и организаторов соревнований.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  // ВРЕМЕННО для диагностики 508 INFINITE_LOOP_DETECTED: отключён
  // ConvexAuthProvider/NavBar, чтобы проверить, не из-за SSR Convex Auth
  // ли самовызов. Вернуть после проверки.
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
