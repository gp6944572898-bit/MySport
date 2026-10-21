import { Link } from "@tanstack/react-router"
import { Authenticated, Unauthenticated } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"

const navLinkClass =
  "px-3 py-2 text-sm font-medium text-ink-600 hover:text-brand-700 [&.active]:text-brand-700"

export function NavBar() {
  const { signOut } = useAuthActions()

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-base font-bold text-white">
            МС
          </span>
          <span className="text-lg font-bold tracking-tight text-ink-900">
            Мой Спорт
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <Link to="/" className={navLinkClass}>
            Главная
          </Link>
          <Link to="/afisha" className={navLinkClass}>
            Афиша
          </Link>
          <Link to="/sports" className={navLinkClass}>
            Виды спорта
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Authenticated>
            <Link to="/admin" className="btn-secondary">
              Админка
            </Link>
            <button type="button" className="btn-ghost" onClick={() => void signOut()}>
              Выйти
            </button>
          </Authenticated>
          <Unauthenticated>
            <Link to="/login" className="btn-primary">
              Войти
            </Link>
          </Unauthenticated>
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-ink-100 px-4 py-1.5 sm:hidden">
        <Link to="/" className={navLinkClass}>
          Главная
        </Link>
        <Link to="/afisha" className={navLinkClass}>
          Афиша
        </Link>
        <Link to="/sports" className={navLinkClass}>
          Виды спорта
        </Link>
      </nav>
    </header>
  )
}
