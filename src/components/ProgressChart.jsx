import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Dark-themed tooltip for the progress chart, styled to match the app's
// card/toast surfaces rather than recharts' default light tooltip.
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      dir="rtl"
      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-100 shadow-lg"
    >
      <p className="mb-1 text-gray-400">{label}</p>
      <p className="font-bold text-purple-400">{payload[0].value} kg</p>
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
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">روند پیشرفت</h2>
        {exerciseNames.length > 0 && (
          <select
            value={selectedExercise}
            onChange={(e) => onSelectExercise(e.target.value)}
            className="min-w-0 max-w-[60%] rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
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
        <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
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
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                vertical={false}
                className="text-gray-200 dark:text-gray-800"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'currentColor' }}
                axisLine={false}
                tickLine={false}
                className="text-gray-500 dark:text-gray-400"
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'currentColor' }}
                axisLine={false}
                tickLine={false}
                width={36}
                className="text-gray-500 dark:text-gray-400"
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="maxWeight"
                stroke="#a855f7"
                strokeWidth={2.5}
                fill="url(#progressGradient)"
                dot={{ r: 3, fill: '#a855f7', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
