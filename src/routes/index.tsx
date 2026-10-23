import { createFileRoute } from "@tanstack/react-router"

// ВРЕМЕННО для диагностики 508 INFINITE_LOOP_DETECTED: чистая статика без
// Convex/useQuery. Вернуть настоящую главную страницу после проверки.
export const Route = createFileRoute("/")({
  component: HomePage,
})

function HomePage() {
  return <main style={{ padding: 24 }}>diagnostic ok</main>
}
