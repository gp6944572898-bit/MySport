const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
})

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
})

export function formatEventDate(timestamp: number): string {
  return dateFormatter.format(new Date(timestamp))
}

export function formatEventDateTime(timestamp: number): string {
  return dateTimeFormatter.format(new Date(timestamp))
}

// Преобразует значение datetime-local input ("2026-10-21T18:30") во время Unix (мс).
export function datetimeLocalToTimestamp(value: string): number {
  return new Date(value).getTime()
}

// Обратное преобразование — для первичного значения datetime-local input.
export function timestampToDatetimeLocal(timestamp: number): string {
  const d = new Date(timestamp)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
