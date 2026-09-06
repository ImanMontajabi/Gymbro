import { useEffect, useMemo, useState } from 'react'
import { buildProgressSeries } from '../utils/progress'
import { useLanguage } from '../context/LanguageContext'

// Derives the progress chart's exercise list, selection, and plotted series
// from the already-fetched `history` array (see useWorkoutData). There's no
// separate fetch here — routines/active-session/history are loaded together
// in one Promise.all for performance, so this hook only owns the History
// tab's own state (which exercise is selected) and the memoized derivation
// of chart data from it.
export function useProgressChart(history) {
  // Only used for the X-axis date labels: Jalali calendar for Persian,
  // Gregorian for English/Arabic (see formatShortDate).
  const { language } = useLanguage()
  const [selectedExercise, setSelectedExercise] = useState('')

  // Every exercise name that appears in completed history, for the chart's
  // dropdown — sorted for a stable, scannable list.
  const exerciseNames = useMemo(() => {
    const names = new Set()
    for (const session of history) {
      for (const ex of session.exercises) names.add(ex.exerciseName)
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'fa'))
  }, [history])

  // Keep the selection valid as history loads/changes — default to the
  // first exercise, and fall back if the previously selected one
  // disappears (e.g. after "Clear All Data").
  useEffect(() => {
    if (exerciseNames.length === 0) {
      setSelectedExercise('')
    } else if (!exerciseNames.includes(selectedExercise)) {
      setSelectedExercise(exerciseNames[0])
    }
  }, [exerciseNames, selectedExercise])

  // One point per session for the selected exercise. Which number is
  // plotted (max kg / max reps / max seconds) depends on the exercise —
  // see getProgressMetric in utils/progress.js.
  const { metric, data: chartData } = useMemo(
    () =>
      selectedExercise
        ? buildProgressSeries(history, selectedExercise, language)
        : { metric: 'kg', data: [] },
    [history, selectedExercise, language]
  )

  return { exerciseNames, selectedExercise, setSelectedExercise, chartData, chartMetric: metric }
}
