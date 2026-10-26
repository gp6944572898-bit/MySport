// Загрузка файлов (положение о соревнованиях — PDF или скриншот) в хранилище
// Convex. Стандартный паттерн: клиент просит одноразовый URL для загрузки,
// заливает файл туда напрямую (не через наш mutation/action), получает
// storageId и присылает его нам в событии.
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireRole } from "./lib/authz"

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "organizer"])
    return ctx.storage.generateUploadUrl()
  },
})

export const getUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { storageId }) => ctx.storage.getUrl(storageId),
})
