// События афиши: привязаны к виду спорта и площадке, фильтруются по городу
// и времени начала. by_city_startTime используется на публичной афише,
// by_sport_startTime — для фильтра по виду спорта.
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireUserId } from "./lib/authz"

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

export const create = mutation({
  args: {
    title: v.string(),
    sportId: v.id("sports"),
    venueId: v.id("venues"),
    city: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    rank: rankValidator,
    description: v.optional(v.string()),
    regulationUrl: v.optional(v.string()),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    await requireUserId(ctx)
    const title = args.title.trim()
    const city = args.city.trim()
    if (!title || !city) throw new Error("Название и город обязательны")
    return ctx.db.insert("events", {
      ...args,
      title,
      city,
      description: args.description?.trim() || undefined,
      regulationUrl: args.regulationUrl?.trim() || undefined,
    })
  },
})

export const update = mutation({
  args: {
    eventId: v.id("events"),
    title: v.string(),
    sportId: v.id("sports"),
    venueId: v.id("venues"),
    city: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    rank: rankValidator,
    description: v.optional(v.string()),
    regulationUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { eventId, ...rest }) => {
    await requireUserId(ctx)
    const existing = await ctx.db.get(eventId)
    if (!existing) throw new Error("Событие не найдено")
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
    await requireUserId(ctx)
    await ctx.db.delete(eventId)
    return null
  },
})
