import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

// Фрагмент схемы, относящийся к справочнику видов спорта и дисциплин.
// Полная схема проекта (события, площадки, баннеры, авторизация) живёт в Macaly
// и сюда не переносилась — это только новая часть: виды спорта + дисциплины.
export default defineSchema({
  sports: defineTable({
    name: v.string(),
    slug: v.string(),
    // Ссылка на официальный Всероссийский реестр видов спорта (ВРВС), опционально —
    // виды спорта, добавленные вручную (ещё не в реестре), просто оставляют эти поля пустыми.
    section: v.optional(
      v.union(
        v.literal("recognized"),
        v.literal("all_russian"),
        v.literal("national"),
        v.literal("applied"),
      ),
    ),
    registryCode: v.optional(v.string()),
    registryNumber: v.optional(v.string()),
    // Свободный список дисциплин внутри вида спорта, управляется администратором.
    disciplines: v.optional(v.array(v.string())),
  }).index("by_slug", ["slug"]),
})
