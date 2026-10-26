// Общий валидатор роли, чтобы не дублировать v.union(...) в schema.ts,
// profiles.ts и migrations.ts по отдельности.
import { v } from "convex/values"

export const roleValidator = v.union(v.literal("admin"), v.literal("organizer"))
