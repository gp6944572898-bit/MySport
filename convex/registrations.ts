// Регистрации на события: участник записывается сам, организатор события
// (или админ) видит список участников. Оплата и страховка — позже.
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireRole, requireUserId } from "./lib/authz"

const registrationValidator = v.object({
  _id: v.id("registrations"),
  _creationTime: v.number(),
  eventId: v.id("events"),
  userId: v.id("users"),
  fullName: v.string(),
  phone: v.string(),
  ageCategory: v.optional(v.string()),
  club: v.optional(v.string()),
  status: v.union(v.literal("registered"), v.literal("cancelled")),
})

// Записаться на событие. Повторная запись после отмены возобновляет заявку.
export const register = mutation({
  args: {
    eventId: v.id("events"),
    fullName: v.string(),
    phone: v.string(),
    ageCategory: v.optional(v.string()),
    club: v.optional(v.string()),
  },
  returns: v.id("registrations"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    const event = await ctx.db.get(args.eventId)
    if (!event) throw new Error("Событие не найдено")
    const fullName = args.fullName.trim()
    const phone = args.phone.trim()
    if (!fullName || !phone) throw new Error("Укажите ФИО и телефон")

    const active = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect()
    const mine = active.find((r) => r.userId === userId)
    if (mine?.status === "registered") throw new Error("Вы уже записаны на это событие")

    const taken = active.filter((r) => r.status === "registered").length
    if (event.capacity !== undefined && taken >= event.capacity) {
      throw new Error("Свободных мест нет")
    }

    const data = {
      fullName,
      phone,
      ageCategory: args.ageCategory?.trim() || undefined,
      club: args.club?.trim() || undefined,
      status: "registered" as const,
    }
    if (mine) {
      await ctx.db.patch(mine._id, data)
      return mine._id
    }
    return ctx.db.insert("registrations", { eventId: args.eventId, userId, ...data })
  },
})

// Отменить свою запись.
export const cancelMine = mutation({
  args: { eventId: v.id("events") },
  returns: v.null(),
  handler: async (ctx, { eventId }) => {
    const userId = await requireUserId(ctx)
    const mine = await ctx.db
      .query("registrations")
      .withIndex("by_event_user", (q) => q.eq("eventId", eventId).eq("userId", userId))
      .unique()
    if (mine && mine.status === "registered") await ctx.db.patch(mine._id, { status: "cancelled" })
    return null
  },
})

// Публично: сколько человек записано на событие.
export const countForEvent = query({
  args: { eventId: v.id("events") },
  returns: v.number(),
  handler: async (ctx, { eventId }) => {
    const rows = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect()
    return rows.filter((r) => r.status === "registered").length
  },
})

// События, на которые записан текущий пользователь.
export const myEventIds = query({
  args: {},
  returns: v.array(v.id("events")),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx).catch(() => null)
    if (!userId) return []
    const rows = await ctx.db
      .query("registrations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()
    return rows.filter((r) => r.status === "registered").map((r) => r.eventId)
  },
})

// Список участников: только организатор события или админ.
export const listForEvent = query({
  args: { eventId: v.id("events") },
  returns: v.array(registrationValidator),
  handler: async (ctx, { eventId }) => {
    const { userId, role } = await requireRole(ctx, ["admin", "organizer"])
    const event = await ctx.db.get(eventId)
    if (!event) return []
    if (role === "organizer" && event.createdBy !== userId) {
      throw new Error("Список участников доступен только организатору события")
    }
    const rows = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect()
    return rows.filter((r) => r.status === "registered")
  },
})

// Организатор снимает участника с события.
export const removeParticipant = mutation({
  args: { registrationId: v.id("registrations") },
  returns: v.null(),
  handler: async (ctx, { registrationId }) => {
    const { userId, role } = await requireRole(ctx, ["admin", "organizer"])
    const reg = await ctx.db.get(registrationId)
    if (!reg) return null
    const event = await ctx.db.get(reg.eventId)
    if (role === "organizer" && event?.createdBy !== userId) {
      throw new Error("Можно управлять только участниками своих событий")
    }
    await ctx.db.patch(registrationId, { status: "cancelled" })
    return null
  },
})
