import { useState } from 'react'
import { sanitizeNumericInput } from '../utils/numbers'
import { useLanguage } from '../context/LanguageContext'

// Add/rename form for an exercise: name + rest time (seconds) + whether the
// exercise is time-based (sets logged in seconds instead of reps — planks,
// dead hangs, wall sits). Used both for "افزودن حرکت" and for the edit
// action on an existing exercise card.
export default function ExerciseEditRow({
  initialName,
  initialRestTime,
  initialIsTimeBased = false,
  onSave,
  onCancel,
}) {
  const { t } = useLanguage()
  const [name, setName] = useState(initialName)
  const [restTime, setRestTime] = useState(initialRestTime > 0 ? String(initialRestTime) : '')
  const [isTimeBased, setIsTimeBased] = useState(initialIsTimeBased)

  function save() {
    const trimmedName = name.trim()
    if (!trimmedName) return
    onSave({
      name: trimmedName,
      restTime: Number(restTime) > 0 ? Number(restTime) : 0,
      isTimeBased,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        autoFocus
        type="text"
        value={name}
        placeholder={t('wtExerciseNamePlaceholder')}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-[rgb(var(--ctp-mauve))] bg-[rgb(var(--ctp-mantle))] px-3 py-3.5 text-base text-[rgb(var(--ctp-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ctp-mauve))]"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[rgb(var(--ctp-subtext0))]">
          {t('wtRestTimeLabel')}
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder={t('wtRestTimePlaceholder')}
          value={restTime}
          onChange={(e) => setRestTime(sanitizeNumericInput(e.target.value))}
          className="rounded-lg border border-[rgb(var(--ctp-surface1)/0.6)] bg-[rgb(var(--ctp-mantle))] px-3 py-3.5 text-base text-[rgb(var(--ctp-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ctp-mauve))]"
        />
      </div>
      {/* A native checkbox (not a custom switch) so it's keyboard/screen-
          reader accessible for free; `accent-color` keeps it on-theme. The
          whole row is the label, so the tap target isn't just the 16px box. */}
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[rgb(var(--ctp-surface1)/0.6)] bg-[rgb(var(--ctp-mantle))] px-3 py-3 text-sm text-[rgb(var(--ctp-text))] transition-all duration-150 ease-out active:opacity-80">
        <input
          type="checkbox"
          checked={isTimeBased}
          onChange={(e) => setIsTimeBased(e.target.checked)}
          className="h-5 w-5 shrink-0 rounded accent-[rgb(var(--ctp-mauve))]"
        />
        <span>{t('wtTimeBasedLabel')}</span>
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          className="flex-1 rounded-lg bg-[rgb(var(--ctp-mauve))] py-3 text-sm font-bold text-[rgb(var(--ctp-base))] transition-all duration-150 ease-out active:scale-[0.97] active:opacity-80"
        >
          {t('save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-[rgb(var(--ctp-surface1))] py-3 text-sm font-bold text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out active:scale-[0.97] active:opacity-80"
        >
          {t('wtCancel')}
        </button>
      </div>
    </div>
  )
}
