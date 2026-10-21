import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { api } from "~convex/_generated/api"
import type { Id } from "~convex/_generated/dataModel"
import { formatEventDateTime } from "~/lib/format"
import { EVENT_RANK_LABELS } from "~/lib/sportSections"

export const Route = createFileRoute("/afisha")({
  component: AfishaPage,
})

function AfishaPage() {
  const [city, setCity] = useState<string>("")
  const [sportId, setSportId] = useState<string>("")

  const sports = useQuery(api.sports.list, {})
  const venues = useQuery(api.venues.list, {})
  const events = useQuery(api.events.list, {
    city: city || undefined,
    sportId: sportId ? (sportId as Id<"sports">) : undefined,
  })

  const cities = useMemo(() => {
    const set = new Set((venues ?? []).map((v) => v.city))
    return Array.from(set).sort()
  }, [venues])

  const filteredEvents = useMemo(() => {
    if (!events) return undefined
    return [...events].sort((a, b) => a.startTime - b.startTime)
  }, [events])

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16">
      <div className="mt-6">
        <h1 className="text-2xl font-bold text-ink-900">Афиша событий</h1>
        <p className="mt-1 text-ink-500">
          Соревнования и мероприятия по видам спорта и городам.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <select
          className="input max-w-[220px]"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="input max-w-[260px]"
          value={sportId}
          onChange={(e) => setSportId(e.target.value)}
        >
          <option value="">Все виды спорта</option>
          {sports?.map((s) => (
            <option key={s._id} value={s._id}>
              {s.name}
            </option>
          ))}
        </select>

        {(city || sportId) && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setCity("")
              setSportId("")
            }}
          >
            Сбросить фильтры
          </button>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {filteredEvents === undefined &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-ink-100" />
          ))}

        {filteredEvents?.length === 0 && (
          <p className="rounded-2xl border border-dashed border-ink-200 p-8 text-center text-ink-500">
            Событий по заданным фильтрам не найдено.
          </p>
        )}

        {filteredEvents?.map((event) => {
          const sport = sports?.find((s) => s._id === event.sportId)
          const venue = venues?.find((v) => v._id === event.venueId)
          return (
            <div
              key={event._id}
              className="card flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="chip">{EVENT_RANK_LABELS[event.rank]}</span>
                  {sport && <span className="text-sm text-ink-500">{sport.name}</span>}
                </div>
                <h3 className="mt-2 font-semibold text-ink-900">{event.title}</h3>
                <p className="mt-1 text-sm text-ink-500">
                  {venue ? `${venue.name}, ${venue.city}` : event.city}
                </p>
                {event.description && (
                  <p className="mt-2 text-sm text-ink-600">{event.description}</p>
                )}
              </div>
              <div className="text-left sm:text-right">
                <p className="font-medium text-brand-700">
                  {formatEventDateTime(event.startTime)}
                </p>
                {event.regulationUrl && (
                  <a
                    href={event.regulationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm text-ink-500 hover:underline"
                  >
                    Положение о соревновании
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
