import { formatShortDate } from './history'

// Which number a progress chart should plot for an exercise, decided once
// across its whole history so the line is always one consistent metric:
//   'seconds' — a time-based exercise (plank, dead hang): max seconds, which
//               live in each set's `reps` field
//   'reps'    — a bodyweight exercise (every logged set has weight 0): max
//               reps, since a flat "0 kg" line would show no progress at all
//   'kg'      — everything else: max weight. Also the answer for a mixed
//               history (some bodyweight sets, some weighted — e.g. moving
//               from pull-ups to weighted pull-ups), where weight is the
//               progression that matters.
// `snapshots` are that exercise's entries from completed sessions (any
// order). The time-based flag is read from the newest snapshot that has
// one, so sessions logged before the flag existed don't drag a plank back
// to "reps".
export function getProgressMetric(snapshots) {
  if (snapshots.length === 0) return 'kg'

  const flagged = snapshots.find((ex) => typeof ex.isTimeBased === 'boolean')
  if (flagged?.isTimeBased) return 'seconds'

  const allBodyweight = snapshots.every((ex) => ex.sets.every((s) => Number(s.weight) === 0))
  return allBodyweight ? 'reps' : 'kg'
}

// Builds the series for one exercise: `{ metric, data: [{ date, value }] }`,
// oldest session first (history is stored newest-first) so the chart reads
// left-to-right. Shared by the History tab's progress chart and the inline
// per-exercise chart in the active workout view.
export function buildProgressSeries(history, exerciseName, language = 'fa') {
  // newest-first, matching `history`, which is what getProgressMetric relies
  // on to pick the most recent isTimeBased flag.
  const entries = (history ?? [])
    .map((session) => {
      const ex = session.exercises.find((e) => e.exerciseName === exerciseName)
      return ex && ex.sets.length > 0 ? { session, ex } : null
    })
    .filter(Boolean)

  const metric = getProgressMetric(entries.map(({ ex }) => ex))
  const pick = metric === 'kg' ? (s) => Number(s.weight) : (s) => Number(s.reps)

  const data = entries
    .slice()
    .reverse()
    .map(({ session, ex }) => ({
      date: formatShortDate(session.date, language),
      value: Math.max(...ex.sets.map(pick)),
    }))

  return { metric, data }
}

// Translation keys for a metric's unit (tooltip) and its axis caption.
export const METRIC_UNIT_KEY = { kg: 'unitKg', reps: 'unitReps', seconds: 'unitSeconds' }
export const METRIC_CAPTION_KEY = {
  kg: 'chartMetricKg',
  reps: 'chartMetricReps',
  seconds: 'chartMetricSeconds',
}
