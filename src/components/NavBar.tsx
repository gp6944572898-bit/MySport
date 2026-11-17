import { useState, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { useConvexAuth } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import { CityPicker } from "~/components/CityPicker"

// Выпадающее меню с прозрачной подложкой: клик вне меню закрывает его.
function Dropdown({
  trigger,
  align,
  children,
}: {
  trigger: ReactNode
  align: "left" | "right"
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return (
    <div className="relative">
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div
            className={`absolute top-full z-50 mt-2 w-56 rounded-xl border border-ink-100 bg-white p-1 shadow-lg ${
              align === "left" ? "left-0" : "right-0"
            }`}
          >
            {children(close)}
          </div>
        </>
      )}
    </div>
  )
}

const itemClass = "block w-full rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"

// Меню под тремя полосками (слева)
function MainMenu() {
  return (
    <Dropdown
      align="left"
      trigger={
        <button type="button" aria-label="Меню" className="btn-secondary !px-3 text-lg leading-none">
          ☰
        </button>
      }
    >
      {(close) => (
        <>
          <Link to="/" className={itemClass} onClick={close}>
            Афиша
          </Link>
          <Link to="/organizer" className={itemClass} onClick={close}>
            Создать мероприятие
          </Link>
          <Link to="/sports" className={itemClass} onClick={close}>
            Виды спорта
          </Link>
        </>
      )}
    </Dropdown>
  )
}

// Аватар (справа): гостю — вход, вошедшему — меню профиля
function UserMenu() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const { signOut } = useAuthActions()

  if (isLoading) return <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-ink-100" />

  if (!isAuthenticated) {
    return (
      <Link to="/login" aria-label="Войти" className="btn-secondary !rounded-full !px-3">
        👤
      </Link>
    )
  }

  return (
    <Dropdown
      align="right"
      trigger={
        <button
          type="button"
          aria-label="Профиль"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white"
        >
          👤
        </button>
      }
    >
      {(close) => (
        <>
          <Link to="/organizer" className={itemClass} onClick={close}>
            Мои мероприятия
          </Link>
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              close()
              void signOut()
            }}
          >
            Выйти
          </button>
        </>
      )}
    </Dropdown>
  )
}

// Шапка: меню слева, название и город по центру, аватар справа
export function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <MainMenu />
        <div className="min-w-0 flex-1">
          <Link to="/" className="block text-xl font-semibold leading-tight text-ink-900">
            My Sport
          </Link>
          <CityPicker />
        </div>
        <UserMenu />
      </div>
    </header>
  )
}

// Подвал: вход в админку для суперадминистратора
export function AppFooter() {
  return (
    <footer className="border-t border-ink-100 px-4 py-4 text-center text-xs text-ink-500">
      <Link to="/admin" className="underline underline-offset-2">
        Админка
      </Link>
    </footer>
  )
}
