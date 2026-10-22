import { createRouter as createTanStackRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  return router
}

// @tanstack/start-client-core (current @tanstack/react-start release) imports
// this file and expects a `getRouter` named export rather than `createRouter`.
export { createRouter as getRouter }

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
