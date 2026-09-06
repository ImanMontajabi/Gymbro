import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useLanguage } from '../context/LanguageContext'
import { buildProgressSeries, METRIC_CAPTION_KEY, METRIC_UNIT_KEY } from '../utils/progress'

// Tooltip styled to match the app's card/toast surfaces via the active
// Catppuccin flavor rather than a fixed dark palette. `unit` is the
// already-translated label for whatever the line is plotting.
function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  return (
    <div
      dir="rtl"
      className="rounded-lg border border-[rgb(var(--ctp-surface1))] bg-[rgb(var(--ctp-surface0))] px-3 py-2 text-xs text-[rgb(var(--ctp-text))] shadow-lg"
    >
      <p className="mb-1 text-[rgb(var(--ctp-subtext0))]">{label}</p>
      <p className="font-bold text-[rgb(var(--ctp-mauve))]">
        {payload[0].value} {unit}
      </p>
    </div>
  )
}

// Compact progress line chart for one exercise, shown inline when its card
// is expanded in the active workout view. Plots max weight per session —
// or max reps for a bodyweight exercise, or max seconds for a time-based
// one (see getProgressMetric). `history` is `workout.history` (completed
// sessions, newest-first) — this only reflects finished sessions, not the
// current in-progress one. Lazy-loaded from WorkoutTab.jsx since recharts
// is heavy and most exercise cards are never expanded.
export default function ExerciseChart({ exerciseName, history }) {
  const { t } = useLanguage()
  const { metric, data: chartData } = buildProgressSeries(history, exerciseName)
  const unit = t(METRIC_UNIT_KEY[metric])

  return (
    <div className="animate-fade-slide-in mt-3 rounded-xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-mantle)/0.6)] p-3 shadow-inner">
      {chartData.length === 0 ? (
        <p className="py-6 text-center text-sm text-[rgb(var(--ctp-subtext0))]">
          هنوز داده‌ی کافی برای این حرکت ثبت نشده
        </p>
      ) : (
        <>
          <p className="mb-1 text-xs text-[rgb(var(--ctp-subtext0))]">
            {t(METRIC_CAPTION_KEY[metric])}
          </p>
          {/* Chart internals stay LTR — recharts positions ticks/tooltips by
              raw x/y coordinates, so an inherited RTL context would flip them. */}
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
                <Tooltip content={<ChartTooltip unit={unit} />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="rgb(var(--ctp-mauve))"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: 'rgb(var(--ctp-mauve))', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
