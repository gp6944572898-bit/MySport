import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { useAuthActions } from "@convex-dev/auth/react"

export const Route = createFileRoute("/login")({
  component: LoginPage,
})

function LoginPage() {
  const { signIn } = useAuthActions()
  const navigate = useNavigate()
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn("password", { email, password, flow: mode })
      void navigate({ to: "/admin" })
    } catch (err) {
      setError(
        mode === "signIn"
          ? "Не удалось войти. Проверьте email и пароль."
          : "Не удалось зарегистрироваться. Возможно, такой email уже используется.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 pb-16 pt-12">
      <h1 className="text-2xl font-bold text-ink-900">
        {mode === "signIn" ? "Вход в админку" : "Регистрация"}
      </h1>
      <p className="mt-1 text-ink-500">
        Доступ к админ-панели «Мой Спорт» для организаторов и модераторов.
      </p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Email</label>
          <input
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Пароль</label>
          <input
            type="password"
            required
            minLength={8}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? "Подождите…" : mode === "signIn" ? "Войти" : "Зарегистрироваться"}
        </button>

        <button
          type="button"
          className="btn-ghost w-full"
          onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
        >
          {mode === "signIn"
            ? "Нет аккаунта? Зарегистрироваться"
            : "Уже есть аккаунт? Войти"}
        </button>
      </form>
    </main>
  )
}
