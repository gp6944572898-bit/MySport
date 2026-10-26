// Справочник спортивных площадок: используется в событиях афиши.
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireRole } from "./lib/authz"

const venueValidator = v.object({
  _id: v.id("venues"),
  _creationTime: v.number(),
  name: v.string(),
  address: v.string(),
  city: v.string(),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
})

export const list = query({
  args: { city: v.optional(v.string()) },
  returns: v.array(venueValidator),
  handler: async (ctx, { city }) => {
    if (city) {
      return ctx.db
        .query("venues")
        .withIndex("by_city", (q) => q.eq("city", city))
        .collect()
    }
    return ctx.db.query("venues").collect()
  },
})

export const get = query({
  args: { venueId: v.id("venues") },
  returns: v.union(venueValidator, v.null()),
  handler: async (ctx, { venueId }) => ctx.db.get(venueId),
})

export const create = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    city: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  returns: v.id("venues"),
  handler: async (ctx, { name, address, city, lat, lng }) => {
    // Организаторам тоже можно создавать площадки — иначе им негде было бы
    // проводить свои события, если подходящей площадки ещё нет в списке.
    // Редактировать/удалять чужие площадки остаётся только у админа.
    await requireRole(ctx, ["admin", "organizer"])
    const trimmedName = name.trim()
    const trimmedCity = city.trim()
    if (!trimmedName || !trimmedCity) {
      throw new Error("Название и город обязательны")
    }
    return ctx.db.insert("venues", {
      name: trimmedName,
      address: address.trim(),
      city: trimmedCity,
      lat,
      lng,
    })
  },
})

export const update = mutation({
  args: {
    venueId: v.id("venues"),
    name: v.string(),
    address: v.string(),
    city: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { venueId, name, address, city, lat, lng }) => {
    await requireRole(ctx, ["admin"])
    const existing = await ctx.db.get(venueId)
    if (!existing) throw new Error("Площадка не найдена")
    const trimmedName = name.trim()
    const trimmedCity = city.trim()
    if (!trimmedName || !trimmedCity) {
      throw new Error("Название и город обязательны")
    }
    await ctx.db.patch(venueId, {
      name: trimmedName,
      address: address.trim(),
      city: trimmedCity,
      lat,
      lng,
    })
    return null
  },
})

export const remove = mutation({
  args: { venueId: v.id("venues") },
  returns: v.null(),
  handler: async (ctx, { venueId }) => {
    await requireRole(ctx, ["admin"])
    await ctx.db.delete(venueId)
    return null
  },
})
