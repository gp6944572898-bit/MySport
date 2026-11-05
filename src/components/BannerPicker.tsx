import { useRef, useState } from "react"
import { useAction, useMutation } from "convex/react"
import { api } from "~convex/_generated/api"
import type { Id } from "~convex/_generated/dataModel"
import { datetimeLocalToTimestamp, formatEventDateTime } from "~/lib/format"
import { presetsForSport } from "~/lib/bannerPresets"
import { uploadFile } from "~/lib/upload"
import { EventBanner } from "~/components/EventBanner"

export type BannerValue = {
  bannerFileId: Id<"_storage"> | null
  bannerPreset: string | null
  // Адрес картинки для предпросмотра (загруженный файл или уже сохранённый баннер).
  bannerPreviewUrl: string | null
}

export const EMPTY_BANNER: BannerValue = {
  bannerFileId: null,
  bannerPreset: null,
  bannerPreviewUrl: null,
}

// Выбор баннера события: загрузить своё, сгенерировать ИИ или взять из
// подборки под вид спорта. Общий для кабинета организатора и админки.
export function BannerPicker({
  value,
  onChange,
  title,
  sportName,
  city,
  startTime,
}: {
  value: BannerValue
  onChange: (value: BannerValue) => void
  title: string
  sportName?: string
  city?: string
  // Значение datetime-local поля формы (для даты в тексте ИИ-баннера).
  startTime?: string
}) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const generateBanner = useAction(api.ai.generateBanner)
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<"upload" | "ai" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(file: File) {
    setBusy("upload")
    setError(null)
    try {
      const uploadUrl = await generateUploadUrl()
      const storageId = await uploadFile(uploadUrl, file)
      onChange({
        bannerFileId: storageId,
        bannerPreset: null,
        bannerPreviewUrl: URL.createObjectURL(file),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить баннер")
    } finally {
      setBusy(null)
    }
  }

  async function handleGenerate() {
    if (!title.trim()) {
      setError("Сначала впишите название события — баннер рисуется по нему")
      return
    }
    setBusy("ai")
    setError(null)
    try {
      const result = await generateBanner({
        title: title.trim(),
        sportName,
        city: city || undefined,
        dateText: startTime
          ? formatEventDateTime(datetimeLocalToTimestamp(startTime))
          : undefined,
      })
      onChange({
        bannerFileId: result.storageId,
        bannerPreset: null,
        bannerPreviewUrl: result.url,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сгенерировать баннер")
    } finally {
      setBusy(null)
    }
  }

  const hasBanner = Boolean(value.bannerFileId || value.bannerPreset || value.bannerPreviewUrl)

  return (
    <div className="rounded-xl border border-ink-100 p-4">
      <label className="mb-2 block text-sm font-medium text-ink-700">Баннер события</label>

      {hasBanner && (
        <div className="mb-3 max-w-xs">
          <EventBanner
            bannerUrl={value.bannerPreviewUrl}
            bannerPreset={value.bannerPreset}
            title={title || "Название события"}
            sportName={sportName}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleUpload(file)
            e.target.value = ""
          }}
        />
        <button
          type="button"
          className="btn-secondary"
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
        >
          {busy === "upload" ? "Загружаем…" : "Загрузить своё"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy !== null}
          onClick={handleGenerate}
        >
          {busy === "ai" ? "Рисуем…" : "Создать с помощью ИИ"}
        </button>
        {hasBanner && (
          <button type="button" className="btn-ghost" onClick={() => onChange(EMPTY_BANNER)}>
            Убрать
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <p className="mb-2 mt-4 text-xs font-medium text-ink-500">
        Или выберите из подборки{sportName ? ` для «${sportName}»` : ""}:
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {presetsForSport(sportName).map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() =>
              onChange({ bannerFileId: null, bannerPreset: preset.id, bannerPreviewUrl: null })
            }
            className={`overflow-hidden rounded-xl border-2 text-left ${
              value.bannerPreset === preset.id ? "border-brand-600" : "border-transparent"
            }`}
          >
            <EventBanner
              bannerPreset={preset.id}
              title={title || preset.label}
              sportName={preset.label}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
