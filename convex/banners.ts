// Баннеры-слайды на главной странице. active + order управляют тем, что
// видно публично и в каком порядке.
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireRole } from "./lib/authz"

const bannerValidator = v.object({
  _id: v.id("banners"),
  _creationTime: v.number(),
  title: v.string(),
  subtitle: v.optional(v.string()),
  ctaText: v.optional(v.string()),
  ctaUrl: v.optional(v.string()),
  gradient: v.string(),
  order: v.number(),
  active: v.boolean(),
})

export const list = query({
  args: { onlyActive: v.optional(v.boolean()) },
  returns: v.array(bannerValidator),
  handler: async (ctx, { onlyActive }) => {
    const banners = await ctx.db.query("banners").withIndex("by_order").collect()
    const sorted = banners.sort((a, b) => a.order - b.order)
    return onlyActive ? sorted.filter((b) => b.active) : sorted
  },
})

export const create = mutation({
  args: {
    title: v.string(),
    subtitle: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    gradient: v.string(),
    order: v.number(),
    active: v.boolean(),
  },
  returns: v.id("banners"),
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"])
    const title = args.title.trim()
    if (!title) throw new Error("Название обязательно")
    return ctx.db.insert("banners", {
      ...args,
      title,
      subtitle: args.subtitle?.trim() || undefined,
      ctaText: args.ctaText?.trim() || undefined,
      ctaUrl: args.ctaUrl?.trim() || undefined,
    })
  },
})

export const update = mutation({
  args: {
    bannerId: v.id("banners"),
    title: v.string(),
    subtitle: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    gradient: v.string(),
    order: v.number(),
    active: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { bannerId, ...rest }) => {
    await requireRole(ctx, ["admin"])
    const existing = await ctx.db.get(bannerId)
    if (!existing) throw new Error("Баннер не найден")
    const title = rest.title.trim()
    if (!title) throw new Error("Название обязательно")
    await ctx.db.patch(bannerId, {
      ...rest,
      title,
      subtitle: rest.subtitle?.trim() || undefined,
      ctaText: rest.ctaText?.trim() || undefined,
      ctaUrl: rest.ctaUrl?.trim() || undefined,
    })
    return null
  },
})

export const remove = mutation({
  args: { bannerId: v.id("banners") },
  returns: v.null(),
  handler: async (ctx, { bannerId }) => {
    await requireRole(ctx, ["admin"])
    await ctx.db.delete(bannerId)
    return null
  },
})
