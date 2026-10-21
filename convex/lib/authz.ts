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
