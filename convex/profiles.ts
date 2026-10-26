// Роль текущего пользователя — используется на фронтенде, чтобы показать
// нужный интерфейс (полная админка для "admin", личный кабинет для
// "organizer", ничего — если роль ещё не выдана).
import { v } from "convex/values"
import { query } from "./_generated/server"
import { getUserRole } from "./lib/authz"
import { roleValidator } from "./lib/roles"

export const me = query({
  args: {},
  returns: v.union(roleValidator, v.null()),
  handler: async (ctx) => getUserRole(ctx),
})
