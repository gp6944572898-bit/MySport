// Настройка @convex-dev/auth: вход по email + паролю (без соцсетей и магик-линков,
// чтобы не усложнять MVP). Используется в convex/http.ts и на фронтенде через
// ConvexAuthProvider + useAuthActions из "@convex-dev/auth/react".
import { Password } from "@convex-dev/auth/providers/Password"
import { convexAuth } from "@convex-dev/auth/server"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
})
