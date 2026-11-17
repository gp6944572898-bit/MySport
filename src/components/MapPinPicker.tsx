import { useEffect, useRef, useState } from "react"
import type mapboxgl from "mapbox-gl"

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

export type Pin = { lat: number; lng: number }

// Выбор места на карте: клик по карте ставит метку, метку можно перетащить;
// «Найти по адресу» ищет адрес через геокодер Mapbox и переносит метку.
export function MapPinPicker({
  value,
  center,
  address,
  onChange,
}: {
  value: Pin | null
  center: [number, number] // [долгота, широта]
  address: string
  onChange: (pin: Pin) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const libRef = useRef<typeof mapboxgl | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [ready, setReady] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return
    let cancelled = false
    void (async () => {
      const lib = (await import("mapbox-gl")).default
      await import("mapbox-gl/dist/mapbox-gl.css")
      if (cancelled || !containerRef.current) return
      lib.accessToken = MAPBOX_TOKEN
      libRef.current = lib
      const map = new lib.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: value ? [value.lng, value.lat] : center,
        zoom: value ? 15 : 11,
      })
      map.on("click", (e) => onChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng }))
      mapRef.current = map
      setReady(true)
    })()
    return () => {
      cancelled = true
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Метка следует за значением
  useEffect(() => {
    const map = mapRef.current
    const lib = libRef.current
    if (!ready || !map || !lib) return
    if (!value) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }
    if (!markerRef.current) {
      const marker = new lib.Marker({ color: "#dc2626", draggable: true })
        .setLngLat([value.lng, value.lat])
        .addTo(map)
      marker.on("dragend", () => {
        const p = marker.getLngLat()
        onChangeRef.current({ lat: p.lat, lng: p.lng })
      })
      markerRef.current = marker
    } else {
      markerRef.current.setLngLat([value.lng, value.lat])
    }
  }, [ready, value])

  async function findByAddress() {
    const map = mapRef.current
    if (!MAPBOX_TOKEN || !map || !address.trim()) {
      setError("Сначала введите адрес")
      return
    }
    setSearching(true)
    setError(null)
    try {
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json` +
        `?access_token=${MAPBOX_TOKEN}&language=ru&limit=1&proximity=${center[0]},${center[1]}`
      const res = await fetch(url)
      const data = (await res.json()) as { features?: Array<{ center: [number, number] }> }
      const f = data.features?.[0]
      if (!f) {
        setError("Адрес не найден — поставьте метку на карте вручную")
        return
      }
      onChange({ lng: f.center[0], lat: f.center[1] })
      map.jumpTo({ center: f.center, zoom: 15 })
    } catch {
      setError("Не удалось выполнить поиск")
    } finally {
      setSearching(false)
    }
  }

  if (!MAPBOX_TOKEN) {
    return <p className="text-sm text-ink-500">Карта недоступна: не задан VITE_MAPBOX_TOKEN</p>
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="h-56 w-full overflow-hidden rounded-xl border border-ink-100" />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-secondary" disabled={searching} onClick={() => void findByAddress()}>
          {searching ? "Ищем…" : "Найти по адресу"}
        </button>
        <span className="text-xs text-ink-500">
          {value ? "Метку можно перетащить" : "Нажмите на карту, чтобы поставить метку"}
        </span>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
