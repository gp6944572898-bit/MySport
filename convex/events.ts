// События афиши: привязаны к виду спорта и площадке, фильтруются по городу
// и времени начала. by_city_startTime используется на публичной афише,
// by_sport_startTime — для фильтра по виду спорта, by_createdBy — чтобы
// организатор видел только свои события.
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireRole } from "./lib/authz"

const rankValidator = v.union(
  v.literal("local"),
  v.literal("regional"),
  v.literal("national"),
  v.literal("international"),
)

const eventValidator = v.object({
  _id: v.id("events"),
  _creationTime: v.number(),
  title: v.string(),
  sportId: v.id("sports"),
  venueId: v.id("venues"),
  city: v.string(),
  startTime: v.number(),
  endTime: v.optional(v.number()),
  rank: rankValidator,
  description: v.optional(v.string()),
  regulationUrl: v.optional(v.string()),
  createdBy: v.optional(v.id("users")),
  regulationFileId: v.optional(v.id("_storage")),
})

export const list = query({
  args: {
    city: v.optional(v.string()),
    sportId: v.optional(v.id("sports")),
    fromTime: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.array(eventValidator),
  handler: async (ctx, { city, sportId, fromTime, limit }) => {
    let events
    if (sportId) {
      events = await ctx.db
        .query("events")
        .withIndex("by_sport_startTime", (q) => q.eq("sportId", sportId))
        .collect()
    } else if (city) {
      events = await ctx.db
        .query("events")
        .withIndex("by_city_startTime", (q) => q.eq("city", city))
        .collect()
    } else {
      events = await ctx.db.query("events").collect()
    }

    let filtered = events
    if (city && sportId) filtered = filtered.filter((e) => e.city === city)
    if (fromTime !== undefined) {
      filtered = filtered.filter((e) => e.startTime >= fromTime)
    }
    filtered.sort((a, b) => a.startTime - b.startTime)
    if (limit !== undefined) filtered = filtered.slice(0, limit)
    return filtered
  },
})

export const get = query({
  args: { eventId: v.id("events") },
  returns: v.union(eventValidator, v.null()),
  handler: async (ctx, { eventId }) => ctx.db.get(eventId),
})

// События, которые создал текущий организатор/админ — для личного кабинета
// организатора. Админу тоже можно (он увидит свои, если что-то создавал).
export const listMine = query({
  args: {},
  returns: v.array(eventValidator),
  handler: async (ctx) => {
    const { userId } = await requireRole(ctx, ["admin", "organizer"])
    const events = await ctx.db
      .query("events")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", userId))
      .collect()
    events.sort((a, b) => b.startTime - a.startTime)
    return events
  },
})

const eventFields = {
  title: v.string(),
  sportId: v.id("sports"),
  venueId: v.id("venues"),
  city: v.string(),
  startTime: v.number(),
  endTime: v.optional(v.number()),
  rank: rankValidator,
  description: v.optional(v.string()),
  regulationUrl: v.optional(v.string()),
  regulationFileId: v.optional(v.id("_storage")),
}

export const create = mutation({
  args: eventFields,
  returns: v.id("events"),
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, ["admin", "organizer"])
    const title = args.title.trim()
    const city = args.city.trim()
    if (!title || !city) throw new Error("Название и город обязательны")
    return ctx.db.insert("events", {
      ...args,
      title,
      city,
      description: args.description?.trim() || undefined,
      regulationUrl: args.regulationUrl?.trim() || undefined,
      createdBy: userId,
    })
  },
})

export const update = mutation({
  args: { eventId: v.id("events"), ...eventFields },
  returns: v.null(),
  handler: async (ctx, { eventId, ...rest }) => {
    const { userId, role } = await requireRole(ctx, ["admin", "organizer"])
    const existing = await ctx.db.get(eventId)
    if (!existing) throw new Error("Событие не найдено")
    if (role === "organizer" && existing.createdBy !== userId) {
      throw new Error("Можно редактировать только свои события")
    }
    const title = rest.title.trim()
    const city = rest.city.trim()
    if (!title || !city) throw new Error("Название и город обязательны")
    await ctx.db.patch(eventId, {
      ...rest,
      title,
      city,
      description: rest.description?.trim() || undefined,
      regulationUrl: rest.regulationUrl?.trim() || undefined,
    })
    return null
  },
})

export const remove = mutation({
  args: { eventId: v.id("events") },
  returns: v.null(),
  handler: async (ctx, { eventId }) => {
    const { userId, role } = await requireRole(ctx, ["admin", "organizer"])
    const existing = await ctx.db.get(eventId)
    if (!existing) return null
    if (role === "organizer" && existing.createdBy !== userId) {
      throw new Error("Можно удалять только свои события")
    }
    await ctx.db.delete(eventId)
    return null
  },
})

// Массовое создание событий — используется после распознавания нескольких
// мероприятий из одного загруженного файла (convex/ai.ts). Каждое событие
// создаётся отдельной записью с тем же createdBy.
export const createMany = mutation({
  args: { events: v.array(v.object(eventFields)) },
  returns: v.array(v.id("events")),
  handler: async (ctx, { events }) => {
    const { userId } = await requireRole(ctx, ["admin", "organizer"])
    const ids = []
    for (const args of events) {
      const title = args.title.trim()
      const city = args.city.trim()
      if (!title || !city) continue
      ids.push(
        await ctx.db.insert("events", {
          ...args,
          title,
          city,
          description: args.description?.trim() || undefined,
          regulationUrl: args.regulationUrl?.trim() || undefined,
          createdBy: userId,
        }),
      )
    }
    return ids
  },
})
