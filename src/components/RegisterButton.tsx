import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { api } from "~convex/_generated/api"
import type { Doc } from "~convex/_generated/dataModel"

// Запись на событие: счётчик мест, кнопка «Записаться» с короткой формой
// и «Отменить запись» для уже записанного пользователя.
export function RegisterButton({ event }: { event: Doc<"events"> }) {
  const { isAuthenticated } = useConvexAuth()
  const count = useQuery(api.registrations.countForEvent, { eventId: event._id })
  const myIds = useQuery(api.registrations.myEventIds, isAuthenticated ? {} : "skip")
  const register = useMutation(api.registrations.register)
  const cancel = useMutation(api.registrations.cancelMine)

  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [ageCategory, setAgeCategory] = useState("")
  const [club, setClub] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const registered = myIds?.includes(event._id) ?? false
  const full = event.capacity !== undefined && count !== undefined && count >= event.capacity
  const past = (event.endTime ?? event.startTime) < Date.now()

  const counter =
    count === undefined
      ? ""
      : event.capacity !== undefined
        ? `Записано ${count} из ${event.capacity}`
        : `Записано: ${count}`

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await register({
        eventId: event._id,
        fullName,
        phone,
        ageCategory: ageCategory || undefined,
        club: club || undefined,
      })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось записаться")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-2 text-sm">
      {counter && <p className="text-xs text-ink-500">{counter}</p>}

      {past ? null : registered ? (
        <div className="mt-1 flex items-center gap-2">
          <span className="text-green-700">Вы записаны</span>
          <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={() => void cancel({ eventId: event._id })}>
            Отменить
          </button>
        </div>
      ) : !isAuthenticated ? (
        <Link to="/login" className="btn-secondary mt-1 inline-flex">
          Войти, чтобы записаться
        </Link>
      ) : full ? (
        <p className="mt-1 text-ink-500">Мест нет</p>
      ) : !open ? (
        <button type="button" className="btn-primary mt-1" onClick={() => setOpen(true)}>
          Записаться
        </button>
      ) : (
        <form onSubmit={submit} className="mt-2 space-y-2 rounded-xl bg-ink-50 p-3 text-left">
          <input className="input" required placeholder="ФИО участника" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input className="input" required type="tel" placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {event.ageCategories && event.ageCategories.length > 0 && (
            <select className="input" value={ageCategory} onChange={(e) => setAgeCategory(e.target.value)}>
              <option value="">Возрастная категория</option>
              {event.ageCategories.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          )}
          <input className="input" placeholder="Клуб / тренер (необязательно)" value={club} onChange={(e) => setClub(e.target.value)} />
          {error && <p className="text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Отправляем…" : "Отправить заявку"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Отмена
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
