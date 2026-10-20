// ЗАГЛУШКА для этого отдельного фрагмента репозитория.
// В основном проекте (Macaly) requireUserId реализован через @convex-dev/auth
// и проверяет реальную сессию пользователя. Здесь — только чтобы convex/sports.ts
// и convex/migrations.ts компилировались как самостоятельный фрагмент.
// При переносе файлов обратно в основной проект этот файл заменяется на настоящий.
import type { QueryCtx, MutationCtx } from "../_generated/server"

export async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) throw new Error("Not authenticated")
  return identity.subject
}
