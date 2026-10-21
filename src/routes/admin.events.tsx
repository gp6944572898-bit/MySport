import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "~convex/_generated/api"
import type { Doc, Id } from "~convex/_generated/dataModel"
import { datetimeLocalToTimestamp, formatEventDateTime, timestampToDatetimeLocal } from "~/lib/format"
import { EVENT_RANK_LABELS, EVENT_RANK_OPTIONS, type EventRank } from "~/lib/sportSections"

export const Route = createFileRoute("/admin/events")({
  component: AdminEventsPage,
})

type Event = Doc<"events">

type EventForm = {
  title: string
  sportId: string
  venueId: string
  city: string
  startTime: string
  endTime: string
  rank: EventRank
  description: string
  regulationUrl: string
}

function emptyForm(defaultCity = ""): EventForm {
  return {
    title: "",
    sportId: "",
    venueId: "",
    city: defaultCity,
    startTime: "",
    endTime: "",
    rank: "local",
    description: "",
    regulationUrl: "",
  }
}

function toForm(e: Event): EventForm {
  return {
    title: e.title,
    sportId: e.sportId,
    venueId: e.venueId,
    city: e.city,
    startTime: timestampToDatetimeLocal(e.startTime),
    endTime: e.endTime ? timestampToDatetimeLocal(e.endTime) : "",
    rank: e.rank,
    description: e.description ?? "",
    regulationUrl: e.regulationUrl ?? "",
  }
}

function AdminEventsPage() {
  const events = useQuery(api.events.list, {})
  const sports = useQuery(api.sports.list, {})
  const venues = useQuery(api.venues.list, {})
  const create = useMutation(api.events.create)
  const update = useMutation(api.events.update)
  const remove = useMutation(api.events.remove)

  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<Id<"events"> | null>(null)

  async function submit(form: EventForm): Promise<Parameters<typeof create>[0] | null> {
    if (!form.sportId || !form.venueId || !form.startTime) return null
    return {
      title: form.title,
      sportId: form.sportId as Id<"sports">,
      venueId: form.venueId as Id<"venues">,
      city: form.city,
      startTime: datetimeLocalToTimestamp(form.startTime),
      endTime: form.endTime ? datetimeLocalToTimestamp(form.endTime) : undefined,
      rank: form.rank,
      description: form.description || undefined,
      regulationUrl: form.regulationUrl || undefined,
    }
  }

  async function handleCreate(form: EventForm) {
    const args = await submit(form)
    if (!args) return
    await create(args)
    setCreating(false)
  }

  async function handleUpdate(id: Id<"events">, form: EventForm) {
    const args = await submit(form)
    if (!args) return
    await update({ eventId: id, ...args })
    setEditingId(null)
  }

  const sorted = events ? [...events].sort((a, b) => b.startTime - a.startTime) : undefined

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">События</h1>
          <p className="mt-1 text-ink-500">Соревнования и мероприятия для афиши.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          + Добавить событие
        </button>
      </div>

      {creating && sports && venues && (
        <div className="card mt-4 p-5">
          <EventFormFields
            initial={emptyForm(venues[0]?.city ?? "")}
            sports={sports}
            venues={venues}
            onCancel={() => setCreating(false)}
            onSubmit={handleCreate}
          />
        </div>
      )}

      <div className="mt-4 space-y-3">
        {sorted === undefined &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-ink-100" />
          ))}

        {sorted?.length === 0 && !creating && (
          <p className="rounded-2xl border border-dashed border-ink-200 p-8 text-center text-ink-500">
            Событий пока нет.
          </p>
        )}

        {sorted?.map((event) =>
          editingId === event._id && sports && venues ? (
            <div key={event._id} className="card p-5">
              <EventFormFields
                initial={toForm(event)}
                sports={sports}
                venues={venues}
                onCancel={() => setEditingId(null)}
                onSubmit={(form) => handleUpdate(event._id, form)}
              />
            </div>
          ) : (
            <div key={event._id} className="card flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="chip">{EVENT_RANK_LABELS[event.rank]}</span>
                  <span className="text-xs text-ink-400">{event.city}</span>
                </div>
                <p className="mt-1 font-medium text-ink-900">{event.title}</p>
                <p className="text-sm text-ink-500">{formatEventDateTime(event.startTime)}</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost" onClick={() => setEditingId(event._id)}>
                  Изменить
                </button>
                <button
                  className="btn-ghost text-red-600 hover:bg-red-50"
                  onClick={() => {
                    if (confirm(`Удалить событие «${event.title}»?`)) {
                      void remove({ eventId: event._id })
                    }
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}

function EventFormFields({
  initial,
  sports,
  venues,
  onCancel,
  onSubmit,
}: {
  initial: EventForm
  sports: Doc<"sports">[]
  venues: Doc<"venues">[]
  onCancel: () => void
  onSubmit: (form: EventForm) => Promise<void> | void
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Название</label>
        <input
          className="input"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Вид спорта</label>
          <select
            className="input"
            required
            value={form.sportId}
            onChange={(e) => setForm({ ...form, sportId: e.target.value })}
          >
            <option value="">— выберите —</option>
            {sports.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Площадка</label>
          <select
            className="input"
            required
            value={form.venueId}
            onChange={(e) => {
              const venue = venues.find((v) => v._id === e.target.value)
              setForm({ ...form, venueId: e.target.value, city: venue?.city ?? form.city })
            }}
          >
            <option value="">— выберите —</option>
            {venues.map((v) => (
              <option key={v._id} value={v._id}>
                {v.name} ({v.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Город</label>
          <input
            className="input"
            required
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Уровень</label>
          <select
            className="input"
            value={form.rank}
            onChange={(e) => setForm({ ...form, rank: e.target.value as EventRank })}
          >
            {EVENT_RANK_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {EVENT_RANK_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Начало</label>
          <input
            className="input"
            type="datetime-local"
            required
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">
            Окончание (необязательно)
          </label>
          <input
            className="input"
            type="datetime-local"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Описание</label>
        <textarea
          className="input"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">
          Ссылка на положение
        </label>
        <input
          className="input"
          type="url"
          value={form.regulationUrl}
          onChange={(e) => setForm({ ...form, regulationUrl: e.target.value })}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Отмена
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </form>
  )
}
