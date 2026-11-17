import { useEffect, useState } from "react"
import { POPULAR_CITIES, setCity, useCity, type City } from "~/lib/city"

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

export type Suggestion = City & { region: string; country: string }

// Поиск населённых пунктов через геокодер Mapbox (нужен VITE_MAPBOX_TOKEN).
// Без токена возвращает пустой список — остаются города из быстрого выбора.
export async function searchCities(
  query: string,
  signal: AbortSignal,
  options: { countries?: string; types?: string } = {},
): Promise<Suggestion[]> {
  if (!MAPBOX_TOKEN) return []
  const { countries = "", types = "place" } = options
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
    `?access_token=${MAPBOX_TOKEN}&types=${types}${countries ? `&country=${countries}` : ""}` +
    `&language=ru&autocomplete=true&limit=7`
  const response = await fetch(url, { signal })
  if (!response.ok) return []
  const data = (await response.json()) as {
    features?: Array<{
      text: string
      center: [number, number]
      context?: Array<{ id: string; text: string }>
    }>
  }
  return (data.features ?? []).map((f) => ({
    name: f.text,
    lng: f.center[0],
    lat: f.center[1],
    region: f.context?.find((c) => c.id.startsWith("region"))?.text ?? "",
    country: f.context?.find((c) => c.id.startsWith("country"))?.text ?? "",
  }))
}

export function CityPicker() {
  const city = useCity()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)

  // Задержка 300 мс, чтобы не дёргать геокодер на каждую букву
  useEffect(() => {
    const text = query.trim()
    if (!open || text.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    const timer = setTimeout(() => {
      searchCities(text, controller.signal)
        .then((found) => setResults(found))
        .catch(() => undefined)
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, open])

  function choose(next: City) {
    setCity({ name: next.name, lat: next.lat, lng: next.lng, region: next.region, country: next.country })
    setOpen(false)
    setQuery("")
  }

  const showSearch = query.trim().length >= 2
  const rowClass = "flex w-full flex-col rounded-lg px-2 py-2 text-left text-sm hover:bg-ink-50"

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <span aria-hidden>📍</span>
        {city.name}
        <span aria-hidden className="text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] space-y-2 rounded-xl border border-ink-100 bg-white p-2 shadow-lg">
          <input
            autoFocus
            className="input"
            placeholder="Найти город"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto">
            {!showSearch &&
              POPULAR_CITIES.map((c) => (
                <button key={c.name} type="button" onClick={() => choose(c)} className={rowClass}>
                  {c.name}
                </button>
              ))}
            {showSearch && loading && results.length === 0 && (
              <p className="px-2 py-2 text-sm text-ink-500">Поиск…</p>
            )}
            {showSearch && !loading && results.length === 0 && (
              <p className="px-2 py-2 text-sm text-ink-500">Ничего не найдено</p>
            )}
            {showSearch &&
              results.map((c) => (
                <button key={`${c.name}-${c.lat}-${c.lng}`} type="button" onClick={() => choose(c)} className={rowClass}>
                  <span>{c.name}</span>
                  {c.region && <span className="text-xs text-ink-500">{c.region}</span>}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
