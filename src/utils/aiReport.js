const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function withinLast30Days(session) {
  return Date.now() - new Date(session.date).getTime() <= THIRTY_DAYS_MS
}

// Builds a compact, token-efficient plain-text summary of the last 30 days
// of training for feeding into an LLM prompt. Grouped by routine → exercise
// (rather than a flat exercise list) so the model can produce accurate
// per-routine, per-exercise feedback instead of guessing which exercise
// belongs to which routine.
export function generateWorkoutReport(routines, history) {
  const recentSessions = (history ?? []).filter(withinLast30Days)

  if (recentSessions.length === 0) {
    return 'کاربر در ۳۰ روز اخیر هیچ تمرینی ثبت نکرده است.'
  }

  // routineName -> exerciseName -> { sets: [{weight, reps}], maxWeight }
  const routineMap = {}

  for (const session of recentSessions) {
    const exerciseMap = routineMap[session.routineName] || {}

    for (const ex of session.exercises) {
      const stats = exerciseMap[ex.exerciseName] || {
        sets: [],
        maxWeight: 0,
        isTimeBased: !!ex.isTimeBased,
      }
      for (const set of ex.sets) {
        stats.sets.push({ weight: set.weight, reps: set.reps })
        if (set.weight > stats.maxWeight) stats.maxWeight = set.weight
      }
      exerciseMap[ex.exerciseName] = stats
    }

    routineMap[session.routineName] = exerciseMap
  }

  // Weight 0 is a bodyweight set ("BW"), and for time-based exercises the
  // reps value is seconds — both spelled out so the model doesn't misread
  // a plank as "0kg x 45 reps".
  const routineBlocks = Object.entries(routineMap).map(([routineName, exerciseMap]) => {
    const exerciseLines = Object.entries(exerciseMap)
      .map(([exerciseName, stats]) => {
        const setsText = stats.sets
          .map((s) => {
            const weight = Number(s.weight) === 0 ? 'BW' : `${s.weight}kg`
            const reps = stats.isTimeBased ? `${s.reps}s` : s.reps
            return `${weight} x ${reps}`
          })
          .join(', ')
        const max = stats.maxWeight === 0 ? 'BW' : `${stats.maxWeight}kg`
        return `- Exercise: ${exerciseName} | Sets: ${setsText} (Max: ${max})`
      })
      .join('\n')
    return `[Routine: ${routineName}]\n${exerciseLines}`
  })

  return [
    `تعداد جلسات تمرینی در ۳۰ روز اخیر: ${recentSessions.length}`,
    ...routineBlocks,
  ].join('\n\n')
}
