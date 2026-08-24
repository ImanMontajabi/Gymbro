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

const DATE_LOCALE = { fa: 'fa-IR', en: 'en-US', ar: 'ar' }

// `language` defaults to 'fa' so every existing caller (WorkoutTab.jsx,
// ExerciseChart.jsx, etc. — none of which are language-aware) keeps
// rendering the Jalali/Persian date it always has. HistoryTab passes the
// active UI language explicitly to switch to Gregorian for en/ar, matching
// the react-multi-date-picker calendar switch (see historyDatePickerConfig).
export function formatSessionDate(timestamp, language = 'fa') {
  return new Date(timestamp).toLocaleDateString(DATE_LOCALE[language] ?? 'fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    calendar: language === 'fa' ? 'persian' : 'gregory',
  })
}

// Compact `M/D` label for chart axes, where the long form from
// formatSessionDate would overlap across several data points.
export function formatShortDate(timestamp, language = 'fa') {
  return new Date(timestamp).toLocaleDateString(DATE_LOCALE[language] ?? 'fa-IR', {
    month: 'numeric',
    day: 'numeric',
    calendar: language === 'fa' ? 'persian' : 'gregory',
  })
}

// Sessions whose date (inclusive) falls within [startDate, endDate], both
// 'YYYY-MM-DD' strings from a native <input type="date">. Lexicographic
// comparison is safe here because both the input value and the sliced ISO
// timestamp share that format, which sorts identically to chronological
// order.
export function filterSessionsByDateRange(history, startDate, endDate) {
  if (!startDate || !endDate) return []
  return history.filter((session) => {
    const sessionDate = session.date.slice(0, 10)
    return sessionDate >= startDate && sessionDate <= endDate
  })
}

// Plain-text export of a completed session, meant to be pasted into an
// external AI chat (e.g. to ask for the next workout plan). Kept in
// English/ISO-date form rather than Persian — it's read by an LLM, not
// rendered in the UI, so unambiguous parsing matters more than locale.
export function formatSessionForAI(session) {
  const lines = [`Date: ${session.date.slice(0, 10)}`, `Routine: ${session.routineName}`, '']

  for (const exercise of session.exercises) {
    const setsLabel = exercise.sets
      .map((set, i) => {
        const base = `Set ${i + 1} (${set.weight}kg x ${set.reps})`
        return set.note ? `${base} - ${set.note}` : base
      })
      .join(', ')
    lines.push(`- ${exercise.exerciseName}: ${setsLabel}`)
  }

  return lines.join('\n')
}
