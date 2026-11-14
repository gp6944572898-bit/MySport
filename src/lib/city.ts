// Выбранный город: общее хранилище для афиши и форм, запоминается в браузере.
import { useSyncExternalStore } from "react"

export type City = {
  name: string
  lat: number
  lng: number
  // Область/регион и страна — подставляются в форму создания мероприятия
  region?: string
  country?: string
}

export const DEFAULT_CITY: City = {
  name: "Афины",
  lat: 37.9838,
  lng: 23.7275,
  region: "Аттика",
  country: "Греция",
}

// Крупные города для быстрого выбора (остальные ищутся через поиск Mapbox)
export const POPULAR_CITIES: City[] = [
  { name: "Москва", lat: 55.7558, lng: 37.6173, region: "Москва", country: "Россия" },
  { name: "Санкт-Петербург", lat: 59.9343, lng: 30.3351, region: "Санкт-Петербург", country: "Россия" },
  { name: "Челябинск", lat: 55.1644, lng: 61.4368, region: "Челябинская область", country: "Россия" },
  { name: "Екатеринбург", lat: 56.8389, lng: 60.6057, region: "Свердловская область", country: "Россия" },
  { name: "Казань", lat: 55.7961, lng: 49.1064, region: "Республика Татарстан", country: "Россия" },
  { name: "Новосибирск", lat: 55.0084, lng: 82.9357, region: "Новосибирская область", country: "Россия" },
  { name: "Нижний Новгород", lat: 56.2965, lng: 43.9361, region: "Нижегородская область", country: "Россия" },
  { name: "Краснодар", lat: 45.0355, lng: 38.9753, region: "Краснодарский край", country: "Россия" },
  DEFAULT_CITY,
]

const STORAGE_KEY = "my-sport-city"

let current: City = DEFAULT_CITY
let loaded = false
const listeners = new Set<() => void>()

function isCity(value: unknown): value is City {
  const c = value as City
  return (
    !!c &&
    typeof c.name === "string" &&
    c.name.length > 0 &&
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng)
  )
}

// Читаем сохранённый город только в браузере, после гидратации
function load() {
  if (loaded || typeof window === "undefined") return
  loaded = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed: unknown = JSON.parse(raw)
    if (isCity(parsed)) current = parsed
  } catch {
    // хранилище недоступно — остаёмся на городе по умолчанию
  }
}

export function setCity(city: City) {
  current = city
  loaded = true
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(city))
  } catch {
    // не страшно: город просто не запомнится
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!loaded) {
    const before = current
    load()
    if (current !== before) listener()
  }
  return () => {
    listeners.delete(listener)
  }
}

export function useCity(): City {
  return useSyncExternalStore(subscribe, () => current, () => DEFAULT_CITY)
}
