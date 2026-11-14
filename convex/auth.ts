// Настройка @convex-dev/auth: вход по email + паролю (без соцсетей и магик-линков,
// чтобы не усложнять MVP). Используется в convex/http.ts и на фронтенде через
// ConvexAuthProvider + useAuthActions из "@convex-dev/auth/react".
import { Password } from "@convex-dev/auth/providers/Password"
import { convexAuth } from "@convex-dev/auth/server"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    // Любой зарегистрировавшийся пользователь сразу становится организатором
    // (может создавать свои мероприятия). Роль admin выдаётся только вручную.
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId, profile }) {
      if (existingUserId !== null) return
      const existing = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique()
      if (existing) return
      await ctx.db.insert("profiles", {
        userId,
        email: typeof profile.email === "string" ? profile.email : "",
        role: "organizer",
      })
    },
  },
})
