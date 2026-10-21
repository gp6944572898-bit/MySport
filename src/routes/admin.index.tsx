import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { api } from "~convex/_generated/api"

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
})

function AdminDashboard() {
  const sports = useQuery(api.sports.list, {})
  const events = useQuery(api.events.list, {})
  const venues = useQuery(api.venues.list, {})
  const banners = useQuery(api.banners.list, {})

  const sportsWithDisciplines =
    sports?.filter((s) => (s.disciplines?.length ?? 0) > 0).length ?? undefined
  const upcomingEvents =
    events?.filter((e) => e.startTime >= Date.now()).length ?? undefined
  const activeBanners = banners?.filter((b) => b.active).length ?? undefined

  const cards: Array<{ label: string; value: number | undefined; hint?: string }> = [
    { label: "Видов спорта", value: sports?.length },
    { label: "…с дисциплинами", value: sportsWithDisciplines },
    { label: "Площадок", value: venues?.length },
    { label: "Событий всего", value: events?.length },
    { label: "Предстоящих событий", value: upcomingEvents },
    { label: "Активных баннеров", value: activeBanners },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">Дашборд</h1>
      <p className="mt-1 text-ink-500">Краткая сводка по данным платформы.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="card p-5">
            <p className="text-sm text-ink-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-ink-900">
              {card.value === undefined ? "—" : card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
