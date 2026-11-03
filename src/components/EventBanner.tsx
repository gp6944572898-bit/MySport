import { getPreset } from "~/lib/bannerPresets"

// Обложка события: загруженная/сгенерированная картинка или готовое
// оформление из подборки. Если баннера нет — ничего не рисуем.
export function EventBanner({
  bannerUrl,
  bannerPreset,
  title,
  sportName,
  className = "",
}: {
  bannerUrl?: string | null
  bannerPreset?: string | null
  title: string
  sportName?: string
  className?: string
}) {
  if (bannerUrl) {
    return (
      <img
        src={bannerUrl}
        alt={title}
        loading="lazy"
        className={`aspect-[1200/630] w-full rounded-xl object-cover ${className}`}
      />
    )
  }

  const preset = getPreset(bannerPreset)
  if (!preset) return null

  return (
    <div
      className={`relative flex aspect-[1200/630] w-full flex-col justify-end overflow-hidden rounded-xl p-3 text-white ${className}`}
      style={{ background: preset.gradient }}
    >
      <span className="absolute right-3 top-2 text-4xl opacity-90">{preset.emoji}</span>
      {sportName && <span className="text-xs font-medium opacity-90">{sportName}</span>}
      <span className="line-clamp-2 text-sm font-bold leading-tight">{title}</span>
    </div>
  )
}
