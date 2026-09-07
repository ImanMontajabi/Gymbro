// Crash-recovery cache for the in-progress workout. Shared by
// useWorkoutData (which owns the session) and useMutationQueue (which
// must know which session is live before replaying a queued insert).
export const ACTIVE_WORKOUT_STORAGE_KEY = 'gymbro_active_workout'

export function loadStoredWorkout() {
  try {
    const raw = localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Reject anything that isn't the expected shape (corrupt write, an older
    // deploy's format, hand-edited storage) rather than letting it crash the
    // workout view on mount.
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.userId !== 'string' ||
      !parsed.activeSession ||
      typeof parsed.activeSession !== 'object' ||
      !Array.isArray(parsed.activeSession.exercises)
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveStoredWorkout(data) {
  try {
    localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage unavailable (private mode, quota) — the session still
    // works for this tab's lifetime, it just won't survive a tab kill.
  }
}

export function clearStoredWorkout() {
  try {
    localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY)
  } catch {
    // ignore — same as above
  }
}
