import { useEffect, useRef } from "react"
import { useCity } from "~/lib/city"

// Страна и область/регион мероприятия (обязательные). Город вводится в самой
// форме; при пустых значениях поля подставляются из выбранного в шапке города.
export function CountryRegionFields({
  country,
  region,
  onChange,
}: {
  country: string
  region: string
  onChange: (v: { country: string; region: string }) => void
}) {
  const city = useCity()
  const filled = useRef(false)

  // Один раз подставляем страну и область выбранного города
  useEffect(() => {
    if (filled.current) return
    filled.current = true
    if (!country && !region && city.country) {
      onChange({ country: city.country, region: city.region ?? "" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Страна</label>
        <input
          className="input"
          required
          value={country}
          onChange={(e) => onChange({ country: e.target.value, region })}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Область / регион</label>
        <input
          className="input"
          required
          value={region}
          onChange={(e) => onChange({ country, region: e.target.value })}
        />
      </div>
    </div>
  )
}
