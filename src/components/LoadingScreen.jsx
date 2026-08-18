// Skeleton loader shown while checking the auth session and while the
// initial Supabase fetch (routines/history/active session) is in flight —
// avoids a blank flash on a cloud-backed app that always has some latency.
export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] dark:bg-gray-950">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  )
}
