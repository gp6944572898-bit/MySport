// Реальная проверка авторизации через @convex-dev/auth: требует активную
// сессию пользователя (вошедшего через Password-провайдер, см. convex/auth.ts)
// и возвращает его Id<"users">. Все admin-мутации (sports/venues/events/banners)
// вызывают это перед изменением данных.
import { getAuthUserId } from "@convex-dev/auth/server"
import type { Id } from "../_generated/dataModel"
import type { QueryCtx, MutationCtx } from "../_generated/server"

export async function requireUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error("Требуется авторизация")
  return userId
}

export type Role = "admin" | "organizer"

// Роль текущего пользователя (из таблицы profiles) или null, если он не
// вошёл или ему ещё не выдали роль.
export async function getUserRole(ctx: QueryCtx | MutationCtx): Promise<Role | null> {
  const userId = await getAuthUserId(ctx)
  if (!userId) return null
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique()
  return profile?.role ?? null
}

// Требует, чтобы пользователь был авторизован и имел одну из разрешённых
// ролей. Используется в mutations, которые должны быть доступны только
// админам и/или организаторам (а не любому зарегистрированному).
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowed: Role[],
): Promise<{ userId: Id<"users">; role: Role }> {
  const userId = await requireUserId(ctx)
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique()
  if (!profile || !allowed.includes(profile.role)) {
    throw new Error("Недостаточно прав для этого действия")
  }
  return { userId, role: profile.role }
}
