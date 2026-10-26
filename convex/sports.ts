// Справочник видов спорта: используется для фильтрации событий в афише
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireRole } from "./lib/authz"

const sectionValidator = v.union(
  v.literal("recognized"),
  v.literal("all_russian"),
  v.literal("national"),
  v.literal("applied"),
)

const sportValidator = v.object({
  _id: v.id("sports"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  section: v.optional(sectionValidator),
  registryCode: v.optional(v.string()),
  registryNumber: v.optional(v.string()),
  disciplines: v.optional(v.array(v.string())),
})

export const list = query({
  args: {},
  returns: v.array(sportValidator),
  handler: async (ctx) => ctx.db.query("sports").collect(),
})

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    section: v.optional(sectionValidator),
    registryCode: v.optional(v.string()),
    registryNumber: v.optional(v.string()),
    disciplines: v.optional(v.array(v.string())),
  },
  returns: v.id("sports"),
  handler: async (ctx, { name, slug, section, registryCode, registryNumber, disciplines }) => {
    await requireRole(ctx, ["admin"])
    const trimmedName = name.trim()
    const trimmedSlug = slug.trim()
    if (!trimmedName || !trimmedSlug) throw new Error("Name and slug are required")
    const existing = await ctx.db
      .query("sports")
      .withIndex("by_slug", (q) => q.eq("slug", trimmedSlug))
      .unique()
    if (existing) throw new Error("A sport with this slug already exists")
    return ctx.db.insert("sports", {
      name: trimmedName,
      slug: trimmedSlug,
      section,
      registryCode: registryCode?.trim() || undefined,
      registryNumber: registryNumber?.trim() || undefined,
      disciplines: disciplines && disciplines.length > 0 ? disciplines : undefined,
    })
  },
})

export const update = mutation({
  args: {
    sportId: v.id("sports"),
    name: v.string(),
    slug: v.string(),
    section: v.optional(sectionValidator),
    registryCode: v.optional(v.string()),
    registryNumber: v.optional(v.string()),
    disciplines: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (
    ctx,
    { sportId, name, slug, section, registryCode, registryNumber, disciplines },
  ) => {
    await requireRole(ctx, ["admin"])
    const existing = await ctx.db.get(sportId)
    if (!existing) throw new Error("Sport not found")
    const trimmedName = name.trim()
    const trimmedSlug = slug.trim()
    if (!trimmedName || !trimmedSlug) throw new Error("Name and slug are required")
    const bySlug = await ctx.db
      .query("sports")
      .withIndex("by_slug", (q) => q.eq("slug", trimmedSlug))
      .unique()
    if (bySlug && bySlug._id !== sportId) throw new Error("A sport with this slug already exists")
    await ctx.db.patch(sportId, {
      name: trimmedName,
      slug: trimmedSlug,
      section,
      registryCode: registryCode?.trim() || undefined,
      registryNumber: registryNumber?.trim() || undefined,
      disciplines: disciplines && disciplines.length > 0 ? disciplines : undefined,
    })
    return null
  },
})

export const remove = mutation({
  args: { sportId: v.id("sports") },
  returns: v.null(),
  handler: async (ctx, { sportId }) => {
    await requireRole(ctx, ["admin"])
    await ctx.db.delete(sportId)
    return null
  },
})

// Массовый импорт видов спорта из официального Всероссийского реестра видов спорта (ВРВС).
// Пропускает записи, slug которых уже существует, поэтому безопасно перезапускать.
export const importRegistry = mutation({
  args: {
    sports: v.array(
      v.object({
        name: v.string(),
        slug: v.string(),
        section: sectionValidator,
        registryCode: v.string(),
        registryNumber: v.string(),
      }),
    ),
  },
  returns: v.object({ inserted: v.number(), skipped: v.number() }),
  handler: async (ctx, { sports }) => {
    await requireRole(ctx, ["admin"])
    const existingSlugs = new Set((await ctx.db.query("sports").collect()).map((s) => s.slug))
    let inserted = 0
    let skipped = 0
    for (const sport of sports) {
      const slug = sport.slug.trim()
      const name = sport.name.trim()
      if (!slug || !name || existingSlugs.has(slug)) {
        skipped++
        continue
      }
      await ctx.db.insert("sports", {
        name,
        slug,
        section: sport.section,
        registryCode: sport.registryCode.trim() || undefined,
        registryNumber: sport.registryNumber.trim() || undefined,
      })
      existingSlugs.add(slug)
      inserted++
    }
    return { inserted, skipped }
  },
})
