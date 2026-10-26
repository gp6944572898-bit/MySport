import { createFileRoute, Link, Outlet } from "@tanstack/react-router"
import { useConvexAuth, useQuery } from "convex/react"
import { api } from "~convex/_generated/api"

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
})

const links = [
  { to: "/admin", label: "Дашборд", exact: true },
  { to: "/admin/sports", label: "Виды спорта" },
  { to: "/admin/events", label: "События" },
  { to: "/admin/venues", label: "Площадки" },
  { to: "/admin/banners", label: "Баннеры" },
]

function AdminLayout() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const role = useQuery(api.profiles.me, isAuthenticated ? {} : "skip")

  if (isLoading || (isAuthenticated && role === undefined)) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 text-center text-ink-400">
        Загрузка…
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-ink-900">Нужна авторизация</h1>
        <p className="mt-2 text-ink-500">
          Чтобы попасть в админ-панель, сначала войдите в аккаунт.
        </p>
        <Link to="/login" className="btn-primary mt-6 inline-flex">
          Войти
        </Link>
      </main>
    )
  }

  if (role !== "admin") {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-ink-900">Доступ только для админов</h1>
        <p className="mt-2 text-ink-500">
          {role === "organizer"
            ? "Ваш аккаунт — организатор. Создавать и загружать события можно в кабинете организатора."
            : "Этому аккаунту ещё не выдана роль. Обратитесь к администратору платформы."}
        </p>
        {role === "organizer" && (
          <Link to="/organizer" className="btn-primary mt-6 inline-flex">
            В кабинет организатора
          </Link>
        )}
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-6xl gap-8 px-4 pb-16">
      <aside className="sticky top-16 hidden h-fit w-48 shrink-0 space-y-1 py-6 sm:block">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            activeOptions={{ exact: link.exact }}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 [&.active]:bg-brand-50 [&.active]:text-brand-700"
          >
            {link.label}
          </Link>
        ))}
      </aside>
      <div className="min-w-0 flex-1 py-6">
        <nav className="mb-4 flex gap-1 overflow-x-auto sm:hidden">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.exact }}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-100 [&.active]:bg-brand-50 [&.active]:text-brand-700"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Outlet />
      </div>
    </main>
  )
}
