import { createFileRoute } from "@tanstack/react-router"
import { useRef, useState } from "react"
import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "~convex/_generated/api"
import type { Doc, Id } from "~convex/_generated/dataModel"
import { datetimeLocalToTimestamp, formatEventDateTime } from "~/lib/format"
import { EVENT_RANK_LABELS, EVENT_RANK_OPTIONS, type EventRank } from "~/lib/sportSections"
import { fuzzyFind, uploadFile } from "~/lib/upload"

export const Route = createFileRoute("/organizer/")({
  component: OrganizerIndex,
})

type Event = Doc<"events">

type EventForm = {
  title: string
  sportId: string
  venueId: string
  newVenueName: string
  newVenueAddress: string
  city: string
  startTime: string
  endTime: string
  rank: EventRank
  description: string
  regulationUrl: string
  regulationFileId: Id<"_storage"> | null
}

function emptyForm(): EventForm {
  return {
    title: "",
    sportId: "",
    venueId: "",
    newVenueName: "",
    newVenueAddress: "",
    city: "",
    startTime: "",
    endTime: "",
    rank: "local",
    description: "",
    regulationUrl: "",
    regulationFileId: null,
  }
}

function OrganizerIndex() {
  const events = useQuery(api.events.listMine, {})
  const sports = useQuery(api.sports.list, {})
  const venues = useQuery(api.venues.list, {})
  const remove = useMutation(api.events.remove)

  const [creating, setCreating] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink-900">Мои события</h2>
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          + Добавить событие
        </button>
      </div>

      {creating && sports && venues && (
        <div className="card mt-4 p-5">
          <EventForm
            sports={sports}
            venues={venues}
            onCancel={() => setCreating(false)}
            onDone={() => setCreating(false)}
          />
        </div>
      )}

      <div className="mt-4 space-y-3">
        {events === undefined &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-ink-100" />
          ))}

        {events?.length === 0 && !creating && (
          <p className="rounded-2xl border border-dashed border-ink-200 p-8 text-center text-ink-500">
            Вы ещё не добавили ни одного события.
          </p>
        )}

        {events?.map((event: Event) => (
          <div key={event._id} className="card flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="chip">{EVENT_RANK_LABELS[event.rank]}</span>
                <span className="text-xs text-ink-400">{event.city}</span>
              </div>
              <p className="mt-1 font-medium text-ink-900">{event.title}</p>
              <p className="text-sm text-ink-500">{formatEventDateTime(event.startTime)}</p>
            </div>
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
        ))}
      </div>
    </div>
  )
}

function EventForm({
  sports,
  venues,
  onCancel,
  onDone,
}: {
  sports: Doc<"sports">[]
  venues: Doc<"venues">[]
  onCancel: () => void
  onDone: () => void
}) {
  const [form, setForm] = useState<EventForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const [recognizeError, setRecognizeError] = useState<string | null>(null)
  const [aiHint, setAiHint] = useState<{ sportName?: string; venueName?: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const extractEvent = useAction(api.ai.extractEvent)
  const createVenue = useMutation(api.venues.create)
  const createEvent = useMutation(api.events.create)

  async function handleRecognize() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setRecognizeError("Сначала выберите файл")
      return
    }
    setRecognizing(true)
    setRecognizeError(null)
    try {
      const uploadUrl = await generateUploadUrl()
      const storageId = await uploadFile(uploadUrl, file)

      const result = await extractEvent({ storageId })
      const matchedSport = fuzzyFind(sports, (s) => s.name, result.sportName)
      const matchedVenue = fuzzyFind(venues, (v) => v.name, result.venueName)

      setForm((f) => ({
        ...f,
        title: result.title || f.title,
        sportId: matchedSport?._id ?? f.sportId,
        venueId: matchedVenue?._id ?? f.venueId,
        newVenueName: matchedVenue ? "" : result.venueName || "",
        newVenueAddress: matchedVenue ? "" : result.address || "",
        city: result.city || f.city,
        startTime: result.startDateTime
          ? result.startDateTime.slice(0, 16)
          : f.startTime,
        endTime: result.endDateTime ? result.endDateTime.slice(0, 16) : f.endTime,
        rank: (result.rank as EventRank) || f.rank,
        description: result.description || f.description,
        regulationFileId: storageId,
      }))
      setAiHint({
        sportName: matchedSport ? undefined : result.sportName,
        venueName: matchedVenue ? undefined : undefined,
      })
    } catch (err) {
      setRecognizeError(
        err instanceof Error ? err.message : "Не удалось распознать файл",
      )
    } finally {
      setRecognizing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      let venueId = form.venueId as Id<"venues"> | ""
      if (!venueId && form.newVenueName.trim()) {
        venueId = await createVenue({
          name: form.newVenueName.trim(),
          address: form.newVenueAddress.trim(),
          city: form.city.trim(),
        })
      }
      if (!form.sportId || !venueId || !form.startTime) return

      await createEvent({
        title: form.title,
        sportId: form.sportId as Id<"sports">,
        venueId,
        city: form.city,
        startTime: datetimeLocalToTimestamp(form.startTime),
        endTime: form.endTime ? datetimeLocalToTimestamp(form.endTime) : undefined,
        rank: form.rank,
        description: form.description || undefined,
        regulationUrl: form.regulationUrl || undefined,
        regulationFileId: form.regulationFileId ?? undefined,
      })
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-4">
        <label className="mb-1 block text-sm font-medium text-ink-700">
          Положение о соревновании (PDF или скриншот)
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="text-sm" />
          <button
            type="button"
            className="btn-secondary"
            disabled={recognizing}
            onClick={handleRecognize}
          >
            {recognizing ? "Распознаём…" : "Распознать и заполнить"}
          </button>
        </div>
        {recognizeError && <p className="mt-2 text-sm text-red-600">{recognizeError}</p>}
        {aiHint?.sportName && (
          <p className="mt-2 text-sm text-amber-600">
            ИИ определил вид спорта как «{aiHint.sportName}», но такого нет в списке —
            выберите вручную.
          </p>
        )}
        <p className="mt-2 text-xs text-ink-400">
          Можно загрузить файл и проверить/поправить поля ниже перед сохранением —
          распознавание не сохраняет событие само по себе.
        </p>
      </div>

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
            value={form.venueId}
            onChange={(e) => {
              const venue = venues.find((v) => v._id === e.target.value)
              setForm({
                ...form,
                venueId: e.target.value,
                city: venue?.city ?? form.city,
              })
            }}
          >
            <option value="">— новая площадка (ниже) —</option>
            {venues.map((v) => (
              <option key={v._id} value={v._id}>
                {v.name} ({v.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!form.venueId && (
        <div className="grid gap-3 rounded-xl bg-ink-50 p-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">
              Название новой площадки
            </label>
            <input
              className="input"
              value={form.newVenueName}
              onChange={(e) => setForm({ ...form, newVenueName: e.target.value })}
              placeholder="Если площадки нет в списке"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Адрес</label>
            <input
              className="input"
              value={form.newVenueAddress}
              onChange={(e) => setForm({ ...form, newVenueAddress: e.target.value })}
            />
          </div>
        </div>
      )}

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
