import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatShortDate } from '../utils/history'

// Tooltip styled to match the app's card/toast surfaces via the active
// Catppuccin flavor rather than a fixed dark palette.
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      dir="rtl"
      className="rounded-lg border border-[rgb(var(--ctp-surface1))] bg-[rgb(var(--ctp-surface0))] px-3 py-2 text-xs text-[rgb(var(--ctp-text))] shadow-lg"
    >
      <p className="mb-1 text-[rgb(var(--ctp-subtext0))]">{label}</p>
      <p className="font-bold text-[rgb(var(--ctp-mauve))]">{payload[0].value} kg</p>
    </div>
  )
}

// Compact "max weight over time" line chart for one exercise, shown inline
// when its card is expanded in the active workout view. `history` is
// `workout.history` (completed sessions, newest-first) — this only reflects
// finished sessions, not the current in-progress one. Lazy-loaded from
// WorkoutTab.jsx since recharts is heavy and most exercise cards are never
// expanded.
export default function ExerciseChart({ exerciseName, history }) {
  const chartData = (history ?? [])
    .slice()
    .reverse()
    .map((session) => {
      const ex = session.exercises.find((e) => e.exerciseName === exerciseName)
      if (!ex || ex.sets.length === 0) return null
      return {
        date: formatShortDate(session.date),
        maxWeight: Math.max(...ex.sets.map((s) => s.weight)),
      }
    })
    .filter(Boolean)

  return (
    <div className="animate-fade-slide-in mt-3 rounded-xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-mantle)/0.6)] p-3 shadow-inner">
      {chartData.length === 0 ? (
        <p className="py-6 text-center text-sm text-[rgb(var(--ctp-subtext0))]">
          هنوز داده‌ی کافی برای این حرکت ثبت نشده
        </p>
      ) : (
        // Chart internals stay LTR — recharts positions ticks/tooltips by
        // raw x/y coordinates, so an inherited RTL context would flip them.
        <div dir="ltr" className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgb(var(--ctp-surface1))"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'rgb(var(--ctp-subtext0))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'rgb(var(--ctp-subtext0))' }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="maxWeight"
                stroke="rgb(var(--ctp-mauve))"
                strokeWidth={2.5}
                dot={{ r: 3, fill: 'rgb(var(--ctp-mauve))', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
