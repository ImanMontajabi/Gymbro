import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

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

// "Max weight over time" area chart for one selected exercise, with a
// dropdown to switch which exercise's history is plotted. Lazy-loaded from
// App.jsx (recharts is heavy and only needed once the history tab opens).
export default function ProgressChart({
  exerciseNames,
  selectedExercise,
  onSelectExercise,
  chartData,
}) {
  return (
    <div className="animate-fade-slide-in rounded-2xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-surface0))] p-4 text-[rgb(var(--ctp-text))] shadow-md shadow-black/10">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">روند پیشرفت</h2>
        {exerciseNames.length > 0 && (
          <select
            value={selectedExercise}
            onChange={(e) => onSelectExercise(e.target.value)}
            className="min-w-0 max-w-[60%] rounded-xl border border-[rgb(var(--ctp-surface1)/0.6)] bg-[rgb(var(--ctp-mantle))] px-3 py-2.5 text-sm text-[rgb(var(--ctp-text))] transition-all duration-150 ease-out focus:border-[rgb(var(--ctp-mauve))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ctp-mauve))] active:scale-[0.98]"
          >
            {exerciseNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

      {chartData.length === 0 ? (
        <p className="py-10 text-center text-sm text-[rgb(var(--ctp-subtext0))]">
          داده‌ای برای نمایش نمودار موجود نیست
        </p>
      ) : (
        // Chart internals stay LTR — recharts positions ticks/tooltips by
        // raw x/y coordinates, so an inherited RTL context would flip them
        // in confusing ways. Surrounding labels stay RTL Persian.
        <div dir="ltr" className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--ctp-mauve))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="rgb(var(--ctp-mauve))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgb(var(--ctp-surface1))"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'rgb(var(--ctp-subtext0))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'rgb(var(--ctp-subtext0))' }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="maxWeight"
                stroke="rgb(var(--ctp-mauve))"
                strokeWidth={2.5}
                fill="url(#progressGradient)"
                dot={{ r: 3, fill: 'rgb(var(--ctp-mauve))', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
