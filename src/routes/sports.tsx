import { createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { api } from "~convex/_generated/api"
import {
  SPORT_SECTION_LABELS,
  SPORT_SECTION_ORDER,
  type SportSection,
} from "~/lib/sportSections"

export const Route = createFileRoute("/sports")({
  component: SportsPage,
})

function SportsPage() {
  const sports = useQuery(api.sports.list, {})
  const [openSlug, setOpenSlug] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const grouped = useMemo(() => {
    if (!sports) return null
    const query = search.trim().toLowerCase()
    const filtered = query
      ? sports.filter((s) => s.name.toLowerCase().includes(query))
      : sports

    const bySection = new Map<SportSection, typeof sports>()
    for (const sport of filtered) {
      const section = (sport.section ?? "recognized") as SportSection
      const arr = bySection.get(section) ?? []
      arr.push(sport)
      bySection.set(section, arr)
    }
    for (const arr of bySection.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name, "ru"))
    }
    return bySection
  }, [sports, search])

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16">
      <div className="mt-6">
        <h1 className="text-2xl font-bold text-ink-900">Виды спорта</h1>
        <p className="mt-1 text-ink-500">
          Справочник видов спорта по разделам Всероссийского реестра видов
          спорта (ВРВС). Нажмите на вид спорта, чтобы увидеть его дисциплины.
        </p>
      </div>

      <input
        className="input mt-6 max-w-sm"
        placeholder="Поиск вида спорта…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {grouped === null && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-ink-100" />
          ))}
        </div>
      )}

      {grouped &&
        SPORT_SECTION_ORDER.map((section) => {
          const list = grouped.get(section)
          if (!list || list.length === 0) return null
          return (
            <section key={section} className="mt-8">
              <h2 className="text-lg font-bold text-ink-900">
                {SPORT_SECTION_LABELS[section]}
                <span className="ml-2 text-sm font-normal text-ink-400">
                  {list.length}
                </span>
              </h2>
              <div className="mt-3 divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white">
                {list.map((sport) => {
                  const isOpen = openSlug === sport.slug
                  const disciplines = sport.disciplines ?? []
                  return (
                    <div key={sport._id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-ink-50"
                        onClick={() => setOpenSlug(isOpen ? null : sport.slug)}
                      >
                        <span className="font-medium text-ink-900">{sport.name}</span>
                        <span className="flex items-center gap-3 text-sm text-ink-400">
                          {disciplines.length > 0
                            ? `${disciplines.length} дисциплин`
                            : "без дисциплин"}
                          <span
                            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                          >
                            ▾
                          </span>
                        </span>
                      </button>
                      {isOpen && (
                        <div className="bg-ink-50 px-4 py-3">
                          {disciplines.length === 0 ? (
                            <p className="text-sm text-ink-400">
                              Дисциплины для этого вида спорта ещё не добавлены.
                            </p>
                          ) : (
                            <ul className="grid gap-x-6 gap-y-1 text-sm text-ink-600 sm:grid-cols-2">
                              {disciplines.map((d, i) => (
                                <li key={`${d}-${i}`}>• {d}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
    </main>
  )
}
