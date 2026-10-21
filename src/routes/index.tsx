import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { api } from "~convex/_generated/api"
import { formatEventDateTime } from "~/lib/format"
import { EVENT_RANK_LABELS } from "~/lib/sportSections"

export const Route = createFileRoute("/")({
  component: HomePage,
})

const FALLBACK_GRADIENT = "from-brand-600 via-brand-500 to-brand-700"

function HomePage() {
  const banners = useQuery(api.banners.list, { onlyActive: true })
  const events = useQuery(api.events.list, { fromTime: Date.now(), limit: 6 })
  const sports = useQuery(api.sports.list, {})

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16">
      <section className="mt-6 space-y-4">
        {banners === undefined && (
          <div className="h-56 animate-pulse rounded-2xl bg-ink-100" />
        )}
        {banners?.length === 0 && <HeroFallback />}
        {banners?.map((banner) => (
          <div
            key={banner._id}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${banner.gradient || FALLBACK_GRADIENT} p-8 text-white sm:p-12`}
          >
            <div className="max-w-xl">
              <h1 className="text-2xl font-bold sm:text-4xl">{banner.title}</h1>
              {banner.subtitle && (
                <p className="mt-3 text-base text-white/90 sm:text-lg">
                  {banner.subtitle}
                </p>
              )}
              {banner.ctaText && banner.ctaUrl && (
                <a
                  href={banner.ctaUrl}
                  className="btn-primary mt-6 bg-white !text-brand-700 hover:bg-white/90"
                >
                  {banner.ctaText}
                </a>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink-900">Ближайшие события</h2>
          <Link to="/afisha" className="text-sm font-medium text-brand-700 hover:underline">
            Вся афиша →
          </Link>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events === undefined &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-ink-100" />
            ))}
          {events?.length === 0 && (
            <p className="col-span-full rounded-2xl border border-dashed border-ink-200 p-8 text-center text-ink-500">
              Пока нет запланированных событий.
            </p>
          )}
          {events?.map((event) => {
            const sport = sports?.find((s) => s._id === event.sportId)
            return (
              <div key={event._id} className="card p-5">
                <div className="flex items-center justify-between">
                  <span className="chip">{EVENT_RANK_LABELS[event.rank]}</span>
                  <span className="text-xs text-ink-400">{event.city}</span>
                </div>
                <h3 className="mt-3 font-semibold text-ink-900">{event.title}</h3>
                {sport && <p className="mt-1 text-sm text-ink-500">{sport.name}</p>}
                <p className="mt-3 text-sm font-medium text-brand-700">
                  {formatEventDateTime(event.startTime)}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-12 rounded-2xl bg-ink-900 p-8 text-white sm:p-10">
        <h2 className="text-xl font-bold">Кто пользуется «Мой Спорт»</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-ink-200 sm:grid-cols-4">
          {["Спортсмены", "Родители", "Тренеры", "Спортшколы", "Федерации", "Организаторы", "Спонсоры", "Судьи"].map(
            (role) => (
              <div key={role} className="rounded-xl bg-white/5 p-4 text-center font-medium">
                {role}
              </div>
            ),
          )}
        </div>
      </section>
    </main>
  )
}

function HeroFallback() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 p-8 text-white sm:p-12">
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold sm:text-4xl">
          Единое пространство для спортивного сообщества
        </h1>
        <p className="mt-3 text-base text-white/90 sm:text-lg">
          Афиша соревнований, виды спорта и дисциплины, площадки — всё в одном
          месте для спортсменов, тренеров, родителей и организаторов.
        </p>
        <Link to="/afisha" className="btn-primary mt-6 bg-white !text-brand-700 hover:bg-white/90">
          Смотреть афишу
        </Link>
      </div>
    </div>
  )
}
