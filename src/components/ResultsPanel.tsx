import { useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "~convex/_generated/api"
import type { Id } from "~convex/_generated/dataModel"
import { uploadFile } from "~/lib/upload"

// Результаты события. Для всех — таблица мест, протоколы и фото (если
// организатор опубликовал). Для организатора/админа — ещё и редактор.
export function ResultsPanel({
  eventId,
  published,
  editor,
  photoUrls,
  ageCategories,
}: {
  eventId: Id<"events">
  published: boolean
  editor?: boolean // показывать кнопку, даже если результаты не опубликованы
  photoUrls?: string[]
  ageCategories?: string[]
}) {
  const [open, setOpen] = useState(false)
  const data = useQuery(api.results.forEvent, open ? { eventId } : "skip")
  const addRow = useMutation(api.results.addRow)
  const removeRow = useMutation(api.results.removeRow)
  const setPublished = useMutation(api.results.setPublished)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const addProtocol = useMutation(api.results.addProtocol)
  const removeProtocol = useMutation(api.results.removeProtocol)

  const [place, setPlace] = useState("")
  const [fullName, setFullName] = useState("")
  const [category, setCategory] = useState("")
  const [result, setResult] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!published && !editor) return null

  async function submitRow(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await addRow({
        eventId,
        place: Number(place),
        fullName,
        ageCategory: category || undefined,
        result,
      })
      // Следующее место подставляем автоматически
      setPlace(String(Number(place) + 1))
      setFullName("")
      setResult("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось добавить")
    }
  }

  async function onProtocol(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setError(null)
    if (file.size > 10 * 1024 * 1024) {
      setError("Файл больше 10 МБ")
      return
    }
    setUploading(true)
    try {
      const id = await uploadFile(await generateUploadUrl(), file)
      await addProtocol({ eventId, fileId: id, name: file.name })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="mt-2 text-sm">
      <button type="button" className="btn-secondary !py-1 text-xs" onClick={() => setOpen((v) => !v)}>
        Результаты{editor && !published ? " (не опубликованы)" : ""}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-ink-100 p-3 text-left">
          {data === undefined && <p className="text-ink-500">Загрузка…</p>}

          {data && (
            <>
              {data.rows.length === 0 && <p className="text-ink-500">Результатов пока нет.</p>}
              {data.rows.length > 0 && (
                <ul className="divide-y divide-ink-100">
                  {data.rows.map((r) => (
                    <li key={r._id} className="flex items-start justify-between gap-2 py-2">
                      <div>
                        <p className="font-medium text-ink-900">
                          {r.place}. {r.fullName}
                        </p>
                        <p className="text-xs text-ink-500">
                          {r.result}
                          {r.ageCategory ? ` · ${r.ageCategory}` : ""}
                        </p>
                      </div>
                      {data.editable && (
                        <button
                          type="button"
                          className="btn-ghost !px-2 !py-1 text-xs text-red-600"
                          onClick={() => void removeRow({ resultId: r._id })}
                        >
                          Удалить
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {data.protocols.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-ink-700">Протоколы</p>
                  <ul className="mt-1 space-y-1">
                    {data.protocols.map((p) => (
                      <li key={p.fileId} className="flex items-center justify-between gap-2">
                        {p.url ? (
                          <a href={p.url} target="_blank" rel="noreferrer" className="truncate text-brand-600 underline">
                            {p.name}
                          </a>
                        ) : (
                          <span className="truncate text-ink-500">{p.name}</span>
                        )}
                        {data.editable && (
                          <button
                            type="button"
                            className="btn-ghost !px-2 !py-1 text-xs text-red-600"
                            onClick={() => void removeProtocol({ eventId, fileId: p.fileId })}
                          >
                            Удалить
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {photoUrls && photoUrls.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {photoUrls.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-lg bg-ink-100">
                      <img src={u} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}

              {data.editable && (
                <div className="mt-3 space-y-3 border-t border-ink-100 pt-3">
                  <form onSubmit={submitRow} className="grid grid-cols-2 gap-2">
                    <input className="input" required type="number" min={1} placeholder="Место" value={place} onChange={(e) => setPlace(e.target.value)} />
                    <input className="input" placeholder="Результат (время, очки)" value={result} onChange={(e) => setResult(e.target.value)} />
                    <input className="input col-span-2" required placeholder="ФИО" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    {ageCategories && ageCategories.length > 0 && (
                      <select className="input col-span-2" value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="">Возрастная категория</option>
                        {ageCategories.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    )}
                    <button type="submit" className="btn-primary col-span-2">
                      Добавить в результаты
                    </button>
                  </form>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-700">Загрузить протокол (PDF или фото, до 10 МБ)</label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="application/pdf,image/*"
                      disabled={uploading}
                      className="text-sm"
                      onChange={(e) => void onProtocol(e.target.files)}
                    />
                    {uploading && <p className="text-xs text-ink-500">Загружаем…</p>}
                  </div>

                  <button
                    type="button"
                    className={data.published ? "btn-secondary" : "btn-primary"}
                    onClick={() => void setPublished({ eventId, published: !data.published })}
                  >
                    {data.published ? "Скрыть результаты" : "Опубликовать результаты"}
                  </button>
                </div>
              )}
              {error && <p className="mt-2 text-red-600">{error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
