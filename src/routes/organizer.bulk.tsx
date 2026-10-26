import { createFileRoute } from "@tanstack/react-router"
import { useRef, useState } from "react"
import { useAction, useMutation, useQuery } from "convex/react"
import { api } from "~convex/_generated/api"
import type { Doc, Id } from "~convex/_generated/dataModel"
import { datetimeLocalToTimestamp } from "~/lib/format"
import { EVENT_RANK_LABELS, EVENT_RANK_OPTIONS, type EventRank } from "~/lib/sportSections"
import { fuzzyFind, uploadFile } from "~/lib/upload"

export const Route = createFileRoute("/organizer/bulk")({
  component: OrganizerBulk,
})

type DraftRow = {
  key: number
  title: string
  sportId: string
  sportNameHint: string
  venueId: string
  city: string
  startTime: string
  endTime: string
  rank: EventRank
  description: string
}

type ExtractedEvent = {
  title?: string
  sportName?: string
  city?: string
  startDateTime?: string
  endDateTime?: string | null
  rank?: EventRank
  description?: string | null
}

function OrganizerBulk() {
  const sports = useQuery(api.sports.list, {})
  const venues = useQuery(api.venues.list, {})
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const extractEvents = useAction(api.ai.extractEvents)
  const createMany = useMutation(api.events.createMany)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [recognizing, setRecognizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<DraftRow[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState<number | null>(null)

  async function handleRecognize() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setError("Сначала выберите файл")
      return
    }
    if (!sports || !venues) return
    setRecognizing(true)
    setError(null)
    setSavedCount(null)
    try {
      const uploadUrl = await generateUploadUrl()
      const storageId = await uploadFile(uploadUrl, file)
      const results = (await extractEvents({ storageId })) as ExtractedEvent[]

      if (!Array.isArray(results) || results.length === 0) {
        setError("В файле не нашлось ни одного мероприятия")
        return
      }

      setRows(
        results.map((r, i) => {
          const matchedSport = fuzzyFind(sports, (s) => s.name, r.sportName)
          const matchedVenue = fuzzyFind(venues, (v) => v.name, r.city)
          return {
            key: i,
            title: r.title ?? "",
            sportId: matchedSport?._id ?? "",
            sportNameHint: matchedSport ? "" : r.sportName ?? "",
            venueId: matchedVenue?._id ?? "",
            city: r.city ?? "",
            startTime: r.startDateTime ? r.startDateTime.slice(0, 16) : "",
            endTime: r.endDateTime ? r.endDateTime.slice(0, 16) : "",
            rank: r.rank ?? "local",
            description: r.description ?? "",
          }
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось распознать файл")
    } finally {
      setRecognizing(false)
    }
  }

  function updateRow(key: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev?.map((r) => (r.key === key ? { ...r, ...patch } : r)) ?? null)
  }

  function removeRow(key: number) {
    setRows((prev) => prev?.filter((r) => r.key !== key) ?? null)
  }

  async function handleSaveAll() {
    if (!rows) return
    const valid = rows.filter((r) => r.title.trim() && r.sportId && r.venueId && r.startTime)
    if (valid.length === 0) {
      setError("Нет ни одной готовой строки — у каждой должны быть название, вид спорта, площадка и дата начала")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const ids = await createMany({
        events: valid.map((r) => ({
          title: r.title,
          sportId: r.sportId as Id<"sports">,
          venueId: r.venueId as Id<"venues">,
          city: r.city,
          startTime: datetimeLocalToTimestamp(r.startTime),
          endTime: r.endTime ? datetimeLocalToTimestamp(r.endTime) : undefined,
          rank: r.rank,
          description: r.description || undefined,
        })),
      })
      setSavedCount(ids.length)
      setRows(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-ink-900">Массовая загрузка</h2>
      <p className="mt-1 text-ink-500">
        Загрузите один документ (например, календарь соревнований) — ИИ попробует
        найти в нём все мероприятия. Проверьте и поправьте каждую строку перед
        сохранением.
      </p>

      <div className="card mt-4 flex flex-wrap items-center gap-2 p-4">
        <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="text-sm" />
        <button
          type="button"
          className="btn-primary"
          disabled={recognizing || !sports || !venues}
          onClick={handleRecognize}
        >
          {recognizing ? "Распознаём…" : "Распознать мероприятия"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {savedCount !== null && (
        <p className="mt-3 text-sm text-green-700">Сохранено событий: {savedCount}</p>
      )}

      {rows && rows.length > 0 && sports && venues && (
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <DraftRowEditor
              key={row.key}
              row={row}
              sports={sports}
              venues={venues}
              onChange={(patch) => updateRow(row.key, patch)}
              onRemove={() => removeRow(row.key)}
            />
          ))}

          <div className="flex justify-end">
            <button type="button" className="btn-primary" disabled={saving} onClick={handleSaveAll}>
              {saving ? "Сохранение…" : `Сохранить все (${rows.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DraftRowEditor({
  row,
  sports,
  venues,
  onChange,
  onRemove,
}: {
  row: DraftRow
  sports: Doc<"sports">[]
  venues: Doc<"venues">[]
  onChange: (patch: Partial<DraftRow>) => void
  onRemove: () => void
}) {
  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <input
          className="input flex-1"
          placeholder="Название"
          value={row.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <button type="button" className="btn-ghost text-red-600" onClick={onRemove}>
          Удалить
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <select
            className="input"
            value={row.sportId}
            onChange={(e) => onChange({ sportId: e.target.value })}
          >
            <option value="">— вид спорта —</option>
            {sports.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
          {row.sportNameHint && !row.sportId && (
            <p className="mt-1 text-xs text-amber-600">ИИ: «{row.sportNameHint}»</p>
          )}
        </div>
        <select
          className="input"
          value={row.venueId}
          onChange={(e) => onChange({ venueId: e.target.value })}
        >
          <option value="">— площадка —</option>
          {venues.map((v) => (
            <option key={v._id} value={v._id}>
              {v.name} ({v.city})
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="input"
          placeholder="Город"
          value={row.city}
          onChange={(e) => onChange({ city: e.target.value })}
        />
        <select
          className="input"
          value={row.rank}
          onChange={(e) => onChange({ rank: e.target.value as EventRank })}
        >
          {EVENT_RANK_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {EVENT_RANK_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="input"
          type="datetime-local"
          value={row.startTime}
          onChange={(e) => onChange({ startTime: e.target.value })}
        />
        <input
          className="input"
          type="datetime-local"
          value={row.endTime}
          onChange={(e) => onChange({ endTime: e.target.value })}
        />
      </div>
    </div>
  )
}
