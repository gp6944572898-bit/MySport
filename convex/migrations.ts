// Одноразовая миграция: синхронизирует справочник видов спорта с официальным
// реестром ВРВС (раздел, код, номер) и подгружает дисциплины из seed-чанков.
// Безопасно перезапускать — обновляет существующие записи по slug, новые добавляет.
//
// internalMutation, а не mutation: эта функция не нужна клиентскому коду
// (сайту) вообще — она запускается один раз вручную через Convex Dashboard
// (вкладка Functions). Поэтому проверка requireUserId тут не нужна и даже
// мешала бы: Dashboard не передаёт сессию входа на сайте, так что обычная
// мутация с requireUserId просто падала бы с "Требуется авторизация".
// internal-функции и так недоступны напрямую с фронтенда (только из
// Dashboard или другого backend-кода), так что отдельная проверка авторизации
// для них избыточна.
import { v } from "convex/values"
import { internalMutation } from "./_generated/server"

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

export const syncRegistryWithDisciplines = internalMutation({
  args: {},
  returns: v.object({
    inserted: v.number(),
    updated: v.number(),
    disciplinesAttached: v.number(),
  }),
  handler: async (ctx) => {
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

// Удаляет тестовую учётную запись (email + пароль) вместе с её сессиями,
// чтобы можно было заново зарегистрироваться на тот же email. Полезно во
// время разработки, когда регистрация могла "наполовину" пройти из-за
// старых багов деплоя. Как и миграция выше — internalMutation, запускается
// вручную через Convex Dashboard (вкладка Functions), а не с фронтенда.
export const deleteAuthAccountByEmail = internalMutation({
  args: { email: v.string() },
  returns: v.object({
    deletedAccounts: v.number(),
    deletedUsers: v.number(),
    deletedSessions: v.number(),
  }),
  handler: async (ctx, { email }) => {
    const normalizedEmail = email.trim().toLowerCase()
    let deletedAccounts = 0
    let deletedUsers = 0
    let deletedSessions = 0

    const accounts = await ctx.db.query("authAccounts").collect()
    for (const account of accounts) {
      if (account.providerAccountId.trim().toLowerCase() !== normalizedEmail) continue

      const userId = account.userId
      await ctx.db.delete(account._id)
      deletedAccounts++

      const sessions = await ctx.db.query("authSessions").collect()
      for (const session of sessions) {
        if (session.userId === userId) {
          await ctx.db.delete(session._id)
          deletedSessions++
        }
      }

      const user = await ctx.db.get(userId)
      if (user) {
        await ctx.db.delete(userId)
        deletedUsers++
      }
    }

    return { deletedAccounts, deletedUsers, deletedSessions }
  },
})
