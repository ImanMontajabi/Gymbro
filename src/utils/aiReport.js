const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function withinLast30Days(session) {
  return Date.now() - new Date(session.date).getTime() <= THIRTY_DAYS_MS
}

// Builds a compact, token-efficient plain-text summary of the last 30 days
// of training for feeding into an LLM prompt. Plain lines instead of nested
// JSON — the braces/quotes/indentation of JSON cost tokens here without
// adding signal an LLM needs.
export function generateWorkoutReport(routines, history) {
  const recentSessions = (history ?? []).filter(withinLast30Days)

  if (recentSessions.length === 0) {
    return 'کاربر در ۳۰ روز اخیر هیچ تمرینی ثبت نکرده است.'
  }

  const routineCounts = {}
  const exerciseStats = {} // exerciseName -> { maxWeight, totalSets, restTime }

  for (const session of recentSessions) {
    routineCounts[session.routineName] = (routineCounts[session.routineName] || 0) + 1

    for (const ex of session.exercises) {
      const stats = exerciseStats[ex.exerciseName] || {
        maxWeight: 0,
        totalSets: 0,
        restTime: ex.restTime || 0,
      }
      stats.totalSets += ex.sets.length
      for (const set of ex.sets) {
        if (set.weight > stats.maxWeight) stats.maxWeight = set.weight
      }
      exerciseStats[ex.exerciseName] = stats
    }
  }

  const routineSummary = Object.entries(routineCounts)
    .map(([name, count]) => `${name} (${count} بار)`)
    .join('، ')

  const exerciseSummary = Object.entries(exerciseStats)
    .map(([name, s]) => {
      const rest = s.restTime > 0 ? `، استراحت ${s.restTime} ثانیه` : ''
      return `- ${name}: حداکثر وزنه ${s.maxWeight}kg، مجموع ${s.totalSets} ست${rest}`
    })
    .join('\n')

  return [
    `تعداد جلسات تمرینی در ۳۰ روز اخیر: ${recentSessions.length}`,
    `برنامه‌های اجرا شده: ${routineSummary}`,
    `عملکرد به تفکیک حرکت:`,
    exerciseSummary,
  ].join('\n')
}
