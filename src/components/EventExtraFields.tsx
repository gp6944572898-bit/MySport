import { useRef, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "~convex/_generated/api"
import type { Id } from "~convex/_generated/dataModel"
import { uploadFile } from "~/lib/upload"
import { AGE_CATEGORIES, CURRENCIES } from "~/lib/sportSections"

// Дополнительные поля события: возрастные категории, стоимость участия
// и галерея фотографий. Общий компонент для форм организатора и админа.
export type ExtraValue = {
  ageCategories: string[]
  price: string // строка из input; пусто = бесплатно
  currency: string
  // Фото галереи: id файла + адрес для превью.
  photos: { id: Id<"_storage">; url: string }[]
}

export const emptyExtra: ExtraValue = {
  ageCategories: [],
  price: "",
  currency: "RUB",
  photos: [],
}

const MAX_PHOTOS = 10
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

// Преобразует значение формы в аргументы mutation events.create/update.
export function extraToArgs(v: ExtraValue) {
  const price = v.price.trim() === "" ? undefined : Number(v.price)
  return {
    ageCategories: v.ageCategories,
    price: price !== undefined && Number.isFinite(price) ? price : undefined,
    currency: v.currency,
    photoFileIds: v.photos.map((p) => p.id),
  }
}

export function EventExtraFields({
  value,
  onChange,
}: {
  value: ExtraValue
  onChange: (v: ExtraValue) => void
}) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const getUrl = useMutation(api.files.getUrlMutation)
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleAge(label: string) {
    const has = value.ageCategories.includes(label)
    onChange({
      ...value,
      ageCategories: has
        ? value.ageCategories.filter((a) => a !== label)
        : [...value.ageCategories, label],
    })
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setUploading(true)
    try {
      const added: ExtraValue["photos"] = []
      for (const file of Array.from(files)) {
        if (value.photos.length + added.length >= MAX_PHOTOS) {
          setError(`Не больше ${MAX_PHOTOS} фотографий`)
          break
        }
        if (!file.type.startsWith("image/")) {
          setError("Можно загружать только изображения")
          continue
        }
        if (file.size > MAX_PHOTO_BYTES) {
          setError("Файл больше 5 МБ пропущен")
          continue
        }
        const id = await uploadFile(await generateUploadUrl(), file)
        const url = (await getUrl({ storageId: id })) ?? URL.createObjectURL(file)
        added.push({ id, url })
      }
      if (added.length) onChange({ ...value, photos: [...value.photos, ...added] })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить фото")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">Возрастные категории</label>
        <div className="flex flex-wrap gap-2">
          {AGE_CATEGORIES.map((label) => {
            const active = value.ageCategories.includes(label)
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleAge(label)}
                className={
                  active
                    ? "rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white"
                    : "rounded-full bg-ink-100 px-3 py-1 text-xs font-medium text-ink-600"
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">
            Стоимость участия (пусто — бесплатно)
          </label>
          <input
            className="input"
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            value={value.price}
            onChange={(e) => onChange({ ...value, price: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Валюта</label>
          <select
            className="input"
            value={value.currency}
            onChange={(e) => onChange({ ...value, currency: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-700">
          Фотографии ({value.photos.length}/{MAX_PHOTOS})
        </label>
        {value.photos.length > 0 && (
          <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {value.photos.map((p) => (
              <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-ink-100">
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="Убрать фото"
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-xs text-white"
                  onClick={() =>
                    onChange({ ...value, photos: value.photos.filter((x) => x.id !== p.id) })
                  }
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="text-sm"
          disabled={uploading}
          onChange={(e) => void handleFiles(e.target.files)}
        />
        {uploading && <p className="mt-1 text-xs text-ink-500">Загружаем…</p>}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}
