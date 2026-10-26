import { defineSchema, defineTable } from "convex/server"
import { authTables } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { roleValidator } from "./lib/roles"

// Полная схема проекта «Мой Спорт»: справочник видов спорта и дисциплин,
// площадки, события (афиша), баннеры на главной и таблицы авторизации
// из @convex-dev/auth.
export default defineSchema({
  ...authTables,

  // Роли поверх обычной авторизации @convex-dev/auth: "admin" — полный доступ
  // ко всем разделам, "organizer" — может создавать/редактировать только свои
  // события. Выдаётся вручную через Convex Dashboard (см. migrations.ts).
  profiles: defineTable({
    userId: v.id("users"),
    email: v.string(),
    role: roleValidator,
  }).index("by_userId", ["userId"]),

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

  venues: defineTable({
    name: v.string(),
    address: v.string(),
    city: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  }).index("by_city", ["city"]),

  events: defineTable({
    title: v.string(),
    sportId: v.id("sports"),
    venueId: v.id("venues"),
    city: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    rank: v.union(
      v.literal("local"),
      v.literal("regional"),
      v.literal("national"),
      v.literal("international"),
    ),
    description: v.optional(v.string()),
    regulationUrl: v.optional(v.string()),
    // Кто создал событие (организатор или админ) — используется, чтобы
    // организатор видел и мог редактировать только свои события.
    createdBy: v.optional(v.id("users")),
    // Загруженный файл/скриншот положения о проведении соревнований,
    // из которого можно распознать данные через Gemini (convex/ai.ts).
    regulationFileId: v.optional(v.id("_storage")),
  })
    .index("by_city_startTime", ["city", "startTime"])
    .index("by_sport_startTime", ["sportId", "startTime"])
    .index("by_createdBy", ["createdBy"]),

  banners: defineTable({
    title: v.string(),
    subtitle: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    gradient: v.string(),
    order: v.number(),
    active: v.boolean(),
  }).index("by_order", ["order"]),
})
