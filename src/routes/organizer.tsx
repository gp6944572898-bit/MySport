import { createFileRoute, Link, Outlet } from "@tanstack/react-router"
import { useConvexAuth, useQuery } from "convex/react"
import { api } from "~convex/_generated/api"

export const Route = createFileRoute("/organizer")({
  component: OrganizerLayout,
})

const links = [
  { to: "/organizer", label: "Мои события", exact: true },
  { to: "/organizer/bulk", label: "Массовая загрузка" },
]

function OrganizerLayout() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const role = useQuery(api.profiles.me, isAuthenticated ? {} : "skip")

  if (isLoading || (isAuthenticated && role === undefined)) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center text-ink-400">
        Загрузка…
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-ink-900">Нужна авторизация</h1>
        <p className="mt-2 text-ink-500">
          Чтобы попасть в кабинет организатора, сначала войдите в аккаунт.
        </p>
        <Link to="/login" className="btn-primary mt-6 inline-flex">
          Войти
        </Link>
      </main>
    )
  }

  if (role !== "organizer" && role !== "admin") {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-ink-900">Доступ пока не выдан</h1>
        <p className="mt-2 text-ink-500">
          Роль организатора выдаётся администратором платформы. Обратитесь к
          администратору «Мой Спорт», чтобы получить доступ к созданию
          мероприятий.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16">
      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Кабинет организатора</h1>
          <p className="mt-1 text-ink-500">
            Создавайте мероприятия и загружайте положения о соревнованиях.
          </p>
        </div>
        {role === "admin" && (
          <Link to="/admin" className="btn-secondary">
            Админка
          </Link>
        )}
      </div>

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-ink-100">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            activeOptions={{ exact: link.exact }}
            className="shrink-0 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-600 hover:text-brand-700 [&.active]:border-brand-600 [&.active]:text-brand-700"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="py-6">
        <Outlet />
      </div>
    </main>
  )
}
