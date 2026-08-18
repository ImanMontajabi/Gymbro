import { useState } from 'react'
import { sanitizeNumericInput } from '../utils/numbers'

// Add/rename form for an exercise: name + rest time (seconds). Used both for
// "افزودن حرکت" and for the edit action on an existing exercise card.
export default function ExerciseEditRow({ initialName, initialRestTime, onSave, onCancel }) {
  const [name, setName] = useState(initialName)
  const [restTime, setRestTime] = useState(initialRestTime > 0 ? String(initialRestTime) : '')

  function save() {
    const trimmedName = name.trim()
    if (!trimmedName) return
    onSave({ name: trimmedName, restTime: Number(restTime) > 0 ? Number(restTime) : 0 })
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        autoFocus
        type="text"
        value={name}
        placeholder="نام حرکت"
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-purple-400 bg-gray-50 px-3 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-gray-100"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
          زمان استراحت (ثانیه)
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="۹۰"
          value={restTime}
          onChange={(e) => setRestTime(sanitizeNumericInput(e.target.value))}
          className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          className="flex-1 rounded-lg bg-purple-600 py-2.5 text-sm font-bold text-white"
        >
          ذخیره
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-bold text-gray-600 dark:border-gray-700 dark:text-gray-300"
        >
          لغو
        </button>
      </div>
    </div>
  )
}
