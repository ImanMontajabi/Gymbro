export function findPreviousExercise(history, exerciseName) {
  const name = exerciseName.trim()
  if (!name) return null

  let latest = null
  for (const session of history) {
    const exercise = session.exercises.find((ex) => ex.exerciseName === name)
    if (exercise && (!latest || session.date > latest.session.date)) {
      latest = { session, exercise }
    }
  }
  return latest
}

export function formatSessionDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
