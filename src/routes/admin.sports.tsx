import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "~convex/_generated/api"
import type { Doc, Id } from "~convex/_generated/dataModel"
import {
  SPORT_SECTION_LABELS,
  SPORT_SECTION_ORDER,
  type SportSection,
} from "~/lib/sportSections"

export const Route = createFileRoute("/admin/sports")({
  component: AdminSportsPage,
})

type Sport = Doc<"sports">

function AdminSportsPage() {
  const sports = useQuery(api.sports.list, {})
  const updateSport = useMutation(api.sports.update)
  const removeSport = useMutation(api.sports.remove)

  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<Id<"sports"> | null>(null)
  const [editingSport, setEditingSport] = useState<Sport | null>(null)

  const filtered = sports?.filter((s) =>
    s.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  async function saveDisciplines(sport: Sport, disciplines: string[]) {
    await updateSport({
      sportId: sport._id,
      name: sport.name,
      slug: sport.slug,
      section: sport.section,
      registryCode: sport.registryCode,
      registryNumber: sport.registryNumber,
      disciplines: disciplines.length > 0 ? disciplines : undefined,
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Виды спорта</h1>
          <p className="mt-1 text-ink-500">
            Нажмите на строку, чтобы посмотреть дисциплины. Карандаш — чтобы
            отредактировать сам вид спорта.
          </p>
        </div>
      </div>

      <input
        className="input mt-4 max-w-sm"
        placeholder="Поиск вида спорта…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mt-4 overflow-hidden rounded-2xl border border-ink-100 bg-white">
        {filtered === undefined &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse border-b border-ink-50 bg-ink-100" />
          ))}

        {filtered?.length === 0 && (
          <p className="p-6 text-center text-ink-400">Ничего не найдено.</p>
        )}

        {filtered?.map((sport) => {
          const isOpen = expandedId === sport._id
          return (
            <div key={sport._id} className="border-b border-ink-50 last:border-b-0">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(isOpen ? null : sport._id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setExpandedId(isOpen ? null : sport._id)
                  }
                }}
                className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 hover:bg-ink-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">{sport.name}</p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {sport.section
                      ? SPORT_SECTION_LABELS[sport.section as SportSection]
                      : "Без раздела"}
                    {sport.registryCode ? ` · ${sport.registryCode}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="chip">
                    {sport.disciplines?.length ?? 0} дисциплин
                  </span>
                  <button
                    type="button"
                    title="Редактировать вид спорта"
                    className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingSport(sport)
                    }}
                  >
                    ✏️
                  </button>
                  <span className={`text-ink-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                    ▾
                  </span>
                </div>
              </div>

              {isOpen && (
                <DisciplinesPanel
                  sport={sport}
                  onSave={(disciplines) => void saveDisciplines(sport, disciplines)}
                />
              )}
            </div>
          )
        })}
      </div>

      {editingSport && (
        <EditSportModal
          sport={editingSport}
          onClose={() => setEditingSport(null)}
          onSave={async (values) => {
            await updateSport({ sportId: editingSport._id, ...values })
            setEditingSport(null)
          }}
          onDelete={async () => {
            if (!confirm(`Удалить вид спорта «${editingSport.name}»?`)) return
            await removeSport({ sportId: editingSport._id })
            setEditingSport(null)
          }}
        />
      )}
    </div>
  )
}

function DisciplinesPanel({
  sport,
  onSave,
}: {
  sport: Sport
  onSave: (disciplines: string[]) => void
}) {
  const disciplines = sport.disciplines ?? []
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")
  const [newDiscipline, setNewDiscipline] = useState("")

  function startEdit(index: number) {
    setEditingIndex(index)
    setEditValue(disciplines[index])
  }

  function commitEdit() {
    if (editingIndex === null) return
    const trimmed = editValue.trim()
    if (!trimmed) {
      setEditingIndex(null)
      return
    }
    const next = [...disciplines]
    next[editingIndex] = trimmed
    onSave(next)
    setEditingIndex(null)
  }

  function removeDiscipline(index: number) {
    const next = disciplines.filter((_, i) => i !== index)
    onSave(next)
  }

  function addDiscipline(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = newDiscipline.trim()
    if (!trimmed) return
    onSave([...disciplines, trimmed])
    setNewDiscipline("")
  }

  return (
    <div className="bg-ink-50 px-4 py-4" onClick={(e) => e.stopPropagation()}>
      {disciplines.length === 0 ? (
        <p className="text-sm text-ink-400">Дисциплин пока нет.</p>
      ) : (
        <ul className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-100 bg-white">
          {disciplines.map((d, index) => (
            <li key={index} className="flex items-center justify-between gap-3 px-3 py-2">
              {editingIndex === index ? (
                <input
                  autoFocus
                  className="input flex-1"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit()
                    if (e.key === "Escape") setEditingIndex(null)
                  }}
                  onBlur={commitEdit}
                />
              ) : (
                <span className="flex-1 text-sm text-ink-700">{d}</span>
              )}
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  title="Переименовать дисциплину"
                  className="rounded-lg p-1.5 text-xs text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                  onClick={() => startEdit(index)}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  title="Удалить дисциплину"
                  className="rounded-lg p-1.5 text-xs text-ink-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => removeDiscipline(index)}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addDiscipline} className="mt-3 flex gap-2">
        <input
          className="input"
          placeholder="Новая дисциплина…"
          value={newDiscipline}
          onChange={(e) => setNewDiscipline(e.target.value)}
        />
        <button type="submit" className="btn-secondary shrink-0">
          Добавить
        </button>
      </form>
    </div>
  )
}

function EditSportModal({
  sport,
  onClose,
  onSave,
  onDelete,
}: {
  sport: Sport
  onClose: () => void
  onSave: (values: {
    name: string
    slug: string
    section: SportSection | undefined
    registryCode: string | undefined
    registryNumber: string | undefined
    disciplines: string[] | undefined
  }) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [name, setName] = useState(sport.name)
  const [slug, setSlug] = useState(sport.slug)
  const [section, setSection] = useState<SportSection | "">(sport.section ?? "")
  const [registryCode, setRegistryCode] = useState(sport.registryCode ?? "")
  const [registryNumber, setRegistryNumber] = useState(sport.registryNumber ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        name,
        slug,
        section: section || undefined,
        registryCode: registryCode.trim() || undefined,
        registryNumber: registryNumber.trim() || undefined,
        disciplines: sport.disciplines,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-ink-900">Редактировать вид спорта</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Название</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Slug</label>
            <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-700">Раздел</label>
            <select
              className="input"
              value={section}
              onChange={(e) => setSection(e.target.value as SportSection | "")}
            >
              <option value="">Без раздела</option>
              {SPORT_SECTION_ORDER.map((s) => (
                <option key={s} value={s}>
                  {SPORT_SECTION_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Код реестра</label>
              <input
                className="input"
                value={registryCode}
                onChange={(e) => setRegistryCode(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Номер</label>
              <input
                className="input"
                value={registryNumber}
                onChange={(e) => setRegistryNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              className="text-sm font-medium text-red-600 hover:underline"
              onClick={() => void onDelete()}
            >
              Удалить вид спорта
            </button>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Отмена
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
