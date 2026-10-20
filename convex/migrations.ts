// Одноразовая миграция: синхронизирует справочник видов спорта с официальным
// реестром ВРВС (раздел, код, номер) и подгружает дисциплины из seed-чанков.
// Безопасно перезапускать — обновляет существующие записи по slug, новые добавляет.
import { v } from "convex/values"
import { mutation } from "./_generated/server"
import { requireUserId } from "./lib/authz"

import registry from "../src/data/sports-registry.json"
import disc01 from "./seedData/disc-01.json"
import disc02 from "./seedData/disc-02.json"
import disc03 from "./seedData/disc-03.json"
import disc04 from "./seedData/disc-04.json"
import disc05 from "./seedData/disc-05.json"
import disc06 from "./seedData/disc-06.json"
import disc07 from "./seedData/disc-07.json"
import disc08 from "./seedData/disc-08.json"
import disc09 from "./seedData/disc-09.json"
import disc10 from "./seedData/disc-10.json"

type DiscEntry = { s: string; n: string }
const allDiscChunks: DiscEntry[][] = [
  disc01,
  disc02,
  disc03,
  disc04,
  disc05,
  disc06,
  disc07,
  disc08,
  disc09,
  disc10,
] as DiscEntry[][]

export const syncRegistryWithDisciplines = mutation({
  args: {},
  returns: v.object({
    inserted: v.number(),
    updated: v.number(),
    disciplinesAttached: v.number(),
  }),
  handler: async (ctx) => {
    await requireUserId(ctx)

    // Группируем дисциплины по slug вида спорта
    const disciplinesBySlug = new Map<string, string[]>()
    for (const chunk of allDiscChunks) {
      for (const { s, n } of chunk) {
        const arr = disciplinesBySlug.get(s) ?? []
        arr.push(n)
        disciplinesBySlug.set(s, arr)
      }
    }

    let inserted = 0
    let updated = 0
    let disciplinesAttached = 0

    for (const entry of registry as Array<{
      name: string
      slug: string
      section: "recognized" | "all_russian" | "national" | "applied"
      code: string
      number: string
    }>) {
      const slug = entry.slug.trim()
      const name = entry.name.trim()
      const disciplines = disciplinesBySlug.get(slug)
      if (disciplines && disciplines.length > 0) disciplinesAttached++

      const existing = await ctx.db
        .query("sports")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique()

      if (existing) {
        await ctx.db.patch(existing._id, {
          name,
          section: entry.section,
          registryCode: entry.code.trim() || undefined,
          registryNumber: entry.number.trim() || undefined,
          disciplines: disciplines && disciplines.length > 0 ? disciplines : existing.disciplines,
        })
        updated++
      } else {
        await ctx.db.insert("sports", {
          name,
          slug,
          section: entry.section,
          registryCode: entry.code.trim() || undefined,
          registryNumber: entry.number.trim() || undefined,
          disciplines: disciplines && disciplines.length > 0 ? disciplines : undefined,
        })
        inserted++
      }
    }

    return { inserted, updated, disciplinesAttached }
  },
})
