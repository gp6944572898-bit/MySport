import type { Id } from "~convex/_generated/dataModel"

// Загружает файл в Convex Storage через одноразовый URL (стандартный паттерн
// Convex) и возвращает storageId.
export async function uploadFile(
  uploadUrl: string,
  file: File,
): Promise<Id<"_storage">> {
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  })
  if (!res.ok) throw new Error("Не удалось загрузить файл")
  const { storageId } = (await res.json()) as { storageId: Id<"_storage"> }
  return storageId
}

// Простое нечёткое сопоставление названия (от ИИ) со списком существующих
// записей — сначала точное совпадение без учёта регистра, потом вхождение
// подстроки в любую сторону.
export function fuzzyFind<T>(
  items: T[],
  getName: (item: T) => string,
  query: string | undefined | null,
): T | undefined {
  if (!query?.trim()) return undefined
  const q = query.trim().toLowerCase()
  const exact = items.find((i) => getName(i).trim().toLowerCase() === q)
  if (exact) return exact
  return items.find((i) => {
    const name = getName(i).trim().toLowerCase()
    return name.includes(q) || q.includes(name)
  })
}
