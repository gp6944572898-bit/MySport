// Результаты и протоколы события. Редактирует организатор события или админ;
// опубликованные результаты видны всем.
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { getUserRole, requireRole } from "./lib/authz"
import { getAuthUserId } from "@convex-dev/auth/server"

// Проверка прав на редактирование результатов именно этого события.
async function requireOwner(ctx: MutationCtx, eventId: Id<"events">) {
  const { userId, role } = await requireRole(ctx, ["admin", "organizer"])
  const event = await ctx.db.get(eventId)
  if (!event) throw new Error("Событие не найдено")
  if (role === "organizer" && event.createdBy !== userId) {
    throw new Error("Можно редактировать результаты только своих событий")
  }
  return event
}

async function canEdit(ctx: QueryCtx, eventId: Id<"events">): Promise<boolean> {
  const role = await getUserRole(ctx)
  if (!role) return false
  if (role === "admin") return true
  const userId = await getAuthUserId(ctx)
  const event = await ctx.db.get(eventId)
  return !!event && event.createdBy === userId
}

const rowValidator = v.object({
  _id: v.id("results"),
  place: v.number(),
  fullName: v.string(),
  ageCategory: v.optional(v.string()),
  result: v.string(),
})

// Результаты события: всем — только опубликованные, редактору — всегда.
export const forEvent = query({
  args: { eventId: v.id("events") },
  returns: v.object({
    published: v.boolean(),
    editable: v.boolean(),
    rows: v.array(rowValidator),
    protocols: v.array(v.object({ fileId: v.id("_storage"), name: v.string(), url: v.union(v.string(), v.null()) })),
  }),
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId)
    const published = event?.resultsPublished === true
    const editable = await canEdit(ctx, eventId)
    if (!event || (!published && !editable)) {
      return { published, editable, rows: [], protocols: [] }
    }
    const rows = await ctx.db
      .query("results")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect()
    rows.sort((a, b) => a.place - b.place)
    const protocols = await Promise.all(
      (event.protocols ?? []).map(async (p) => ({ ...p, url: await ctx.storage.getUrl(p.fileId) })),
    )
    return {
      published,
      editable,
      rows: rows.map((r) => ({
        _id: r._id,
        place: r.place,
        fullName: r.fullName,
        ageCategory: r.ageCategory,
        result: r.result,
      })),
      protocols,
    }
  },
})

export const addRow = mutation({
  args: {
    eventId: v.id("events"),
    place: v.number(),
    fullName: v.string(),
    ageCategory: v.optional(v.string()),
    result: v.string(),
  },
  returns: v.id("results"),
  handler: async (ctx, args) => {
    await requireOwner(ctx, args.eventId)
    const fullName = args.fullName.trim()
    if (!fullName || !Number.isFinite(args.place) || args.place < 1) {
      throw new Error("Укажите место и ФИО")
    }
    return ctx.db.insert("results", {
      eventId: args.eventId,
      place: Math.floor(args.place),
      fullName,
      ageCategory: args.ageCategory?.trim() || undefined,
      result: args.result.trim(),
    })
  },
})

export const removeRow = mutation({
  args: { resultId: v.id("results") },
  returns: v.null(),
  handler: async (ctx, { resultId }) => {
    const row = await ctx.db.get(resultId)
    if (!row) return null
    await requireOwner(ctx, row.eventId)
    await ctx.db.delete(resultId)
    return null
  },
})

export const setPublished = mutation({
  args: { eventId: v.id("events"), published: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { eventId, published }) => {
    await requireOwner(ctx, eventId)
    await ctx.db.patch(eventId, { resultsPublished: published })
    return null
  },
})

export const addProtocol = mutation({
  args: { eventId: v.id("events"), fileId: v.id("_storage"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, { eventId, fileId, name }) => {
    const event = await requireOwner(ctx, eventId)
    await ctx.db.patch(eventId, { protocols: [...(event.protocols ?? []), { fileId, name: name.slice(0, 120) }] })
    return null
  },
})

export const removeProtocol = mutation({
  args: { eventId: v.id("events"), fileId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, { eventId, fileId }) => {
    const event = await requireOwner(ctx, eventId)
    await ctx.db.patch(eventId, { protocols: (event.protocols ?? []).filter((p) => p.fileId !== fileId) })
    await ctx.storage.delete(fileId)
    return null
  },
})
