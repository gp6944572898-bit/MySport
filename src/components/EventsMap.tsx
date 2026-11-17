import { useEffect, useRef, useState } from "react"
import type mapboxgl from "mapbox-gl"

export type MapVenue = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined

// Центр по умолчанию — Афины
const DEFAULT_CENTER: [number, number] = [23.7275, 37.9838]

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Компактная карта (128 px): по нажатию раскрывается на весь экран.
// mapbox-gl подгружается динамически — на сервере/при сборке он не нужен.
export function EventsMap({
  venues,
  center,
}: {
  venues: MapVenue[]
  // Центр выбранного города [долгота, широта]
  center?: [number, number]
}) {
  const centerLng = center?.[0]
  const centerLat = center?.[1]
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const libRef = useRef<typeof mapboxgl | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const refitRef = useRef<() => void>(() => {})
  const [ready, setReady] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  // Полноэкранный режим: закрытие по Esc и блокировка прокрутки страницы
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false)
    }
    window.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [fullscreen])

  // После смены размера контейнера карту нужно пересчитать
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const frame = requestAnimationFrame(() => {
      map.resize()
      refitRef.current()
    })
    return () => cancelAnimationFrame(frame)
  }, [fullscreen])

  // Создание карты
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return
    let cancelled = false
    void (async () => {
      const lib = (await import("mapbox-gl")).default
      await import("mapbox-gl/dist/mapbox-gl.css")
      if (cancelled || !containerRef.current) return
      lib.accessToken = MAPBOX_TOKEN
      libRef.current = lib
      mapRef.current = new lib.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center:
          centerLng !== undefined && centerLat !== undefined ? [centerLng, centerLat] : DEFAULT_CENTER,
        zoom: 11,
      })
      mapRef.current.addControl(new lib.NavigationControl(), "top-right")
      setReady(true)
    })()
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // При смене города перемещаем карту к новому центру
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || centerLng === undefined || centerLat === undefined) return
    map.jumpTo({ center: [centerLng, centerLat], zoom: 11 })
  }, [ready, centerLng, centerLat])

  // Маркеры площадок
  useEffect(() => {
    const map = mapRef.current
    const lib = libRef.current
    if (!ready || !map || !lib) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    refitRef.current = () => {}
    const valid = venues.filter((v) => v.lat !== 0 || v.lng !== 0)
    if (valid.length === 0) return

    const bounds = new lib.LngLatBounds()
    valid.forEach((venue) => {
      const popup = new lib.Popup({ offset: 24 }).setHTML(
        `<strong>${escapeHtml(venue.name)}</strong><br/>${escapeHtml(venue.address)}`,
      )
      markersRef.current.push(
        new lib.Marker({ color: "#dc2626" }).setLngLat([venue.lng, venue.lat]).setPopup(popup).addTo(map),
      )
      bounds.extend([venue.lng, venue.lat])
    })
    const refit = () => {
      if (valid.length === 1) {
        map.setCenter([valid[0].lng, valid[0].lat])
        map.setZoom(13)
      } else {
        map.fitBounds(bounds, { padding: 24, maxZoom: 14, duration: 0 })
      }
    }
    refitRef.current = refit
    refit()
  }, [ready, venues])

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-ink-100 text-sm text-ink-500">
        Карта недоступна: не задан VITE_MAPBOX_TOKEN
      </div>
    )
  }

  // Внешний блок держит место в странице, пока карта раскрыта на весь экран
  return (
    <div className="relative h-32 w-full">
      <div
        className={
          fullscreen
            ? "fixed inset-0 z-50 bg-white"
            : // В свёрнутом виде кнопки зума скрыты; логотип и «i» уменьшены, но видны (требование Mapbox)
              "absolute inset-0 overflow-hidden rounded-xl border border-ink-100 [&_.mapboxgl-ctrl-top-right]:hidden [&_.mapboxgl-ctrl-logo]:origin-bottom-left [&_.mapboxgl-ctrl-logo]:scale-[0.5] [&_.mapboxgl-ctrl-attrib]:origin-bottom-right [&_.mapboxgl-ctrl-attrib]:scale-[0.7]"
        }
      >
        <div ref={containerRef} className="h-full w-full" />
        {fullscreen ? (
          <button
            type="button"
            aria-label="Закрыть карту"
            onClick={() => setFullscreen(false)}
            className="btn-secondary absolute left-3 top-3 shadow-md"
          >
            ✕
          </button>
        ) : (
          <button
            type="button"
            aria-label="Открыть карту на весь экран"
            onClick={() => setFullscreen(true)}
            className="absolute inset-0"
          />
        )}
      </div>
    </div>
  )
}
