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
        className="rounded-lg border border-[rgb(var(--ctp-mauve))] bg-[rgb(var(--ctp-mantle))] px-3 py-3.5 text-base text-[rgb(var(--ctp-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ctp-mauve))]"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[rgb(var(--ctp-subtext0))]">
          زمان استراحت (ثانیه)
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="۹۰"
          value={restTime}
          onChange={(e) => setRestTime(sanitizeNumericInput(e.target.value))}
          className="rounded-lg border border-[rgb(var(--ctp-surface1)/0.6)] bg-[rgb(var(--ctp-mantle))] px-3 py-3.5 text-base text-[rgb(var(--ctp-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ctp-mauve))]"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          className="flex-1 rounded-lg bg-[rgb(var(--ctp-mauve))] py-3 text-sm font-bold text-[rgb(var(--ctp-base))] transition-all duration-150 ease-out active:scale-[0.97] active:opacity-80"
        >
          ذخیره
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-[rgb(var(--ctp-surface1))] py-3 text-sm font-bold text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out active:scale-[0.97] active:opacity-80"
        >
          لغو
        </button>
      </div>
    </div>
  )
}
