import { useEffect, useMemo, useState } from 'react'
import { formatShortDate } from '../utils/history'

// Derives the progress chart's exercise list, selection, and plotted series
// from the already-fetched `history` array (see useWorkoutData). There's no
// separate fetch here — routines/active-session/history are loaded together
// in one Promise.all for performance, so this hook only owns the History
// tab's own state (which exercise is selected) and the memoized derivation
// of chart data from it.
export function useProgressChart(history) {
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

  // Max weight lifted per session for the selected exercise, oldest first
  // (history itself is newest-first) so the chart reads left-to-right.
  const chartData = useMemo(() => {
    if (!selectedExercise) return []
    return history
      .slice()
      .reverse()
      .map((session) => {
        const ex = session.exercises.find((e) => e.exerciseName === selectedExercise)
        if (!ex || ex.sets.length === 0) return null
        return {
          date: formatShortDate(session.date),
          maxWeight: Math.max(...ex.sets.map((s) => s.weight)),
        }
      })
      .filter(Boolean)
  }, [history, selectedExercise])

  return { exerciseNames, selectedExercise, setSelectedExercise, chartData }
}
