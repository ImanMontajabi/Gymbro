import { useState } from 'react'
import toast from 'react-hot-toast'
import Icon from './Icon'
import { useLanguage } from '../context/LanguageContext'
import { sanitizeNumericInput } from '../utils/numbers'

// Edits one already-completed session from the History tab. Works entirely
// on a local deep-clone of `session.exercises` (structuredClone on mount) —
// nothing here reads or writes useWorkoutData's `activeSession` state at
// all, so it's structurally impossible for editing a past workout to affect
// one currently in progress. `onSave` is `workout.handleUpdateHistorySession`,
// which only ever touches the `history` array and the single Supabase row
// for this session's id.
export default function HistorySessionEditModal({ session, onClose, onSave }) {
  const { t } = useLanguage()
  const [exercises, setExercises] = useState(() => structuredClone(session.exercises))
  const [isSaving, setIsSaving] = useState(false)

  function updateSet(exerciseId, setId, field, value) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId !== exerciseId
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((set) => (set.id === setId ? { ...set, [field]: value } : set)),
            }
      )
    )
  }

  function deleteSet(exerciseId, setId) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId !== exerciseId ? ex : { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
      )
    )
  }

  async function handleSave() {
    setIsSaving(true)
    const { error } = await onSave(session.id, exercises)
    setIsSaving(false)

    if (error) {
      toast.error(t('historyUpdateFailed'))
      return
    }
    toast.success(t('historyUpdateSuccess'))
    onClose()
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-modal-pop flex max-h-[85vh] w-full max-w-sm flex-col rounded-2xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-surface0))] p-5 text-[rgb(var(--ctp-text))] shadow-2xl shadow-black/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 className="truncate text-lg font-bold">
            {t('historyEditTitle')} — {session.routineName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="inline-flex shrink-0 items-center justify-center rounded-full p-2.5 text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out hover:bg-[rgb(var(--ctp-surface1)/0.5)] active:scale-90 active:opacity-70"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4">
            {exercises.map((ex) => (
              <div
                key={ex.exerciseId}
                className="rounded-xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-mantle))] p-3"
              >
                <h3 className="mb-2 truncate text-sm font-bold">{ex.exerciseName}</h3>

                {ex.sets.length === 0 ? (
                  <p className="text-xs text-[rgb(var(--ctp-subtext0))]">{t('historyNoSets')}</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {ex.sets.map((set, i) => (
                      <div key={set.id} className="flex items-center gap-2">
                        <span className="w-5 shrink-0 text-xs text-[rgb(var(--ctp-subtext0))]">
                          {i + 1}
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={t('historyWeight')}
                          value={set.weight}
                          onChange={(e) =>
                            updateSet(
                              ex.exerciseId,
                              set.id,
                              'weight',
                              sanitizeNumericInput(e.target.value, { allowDecimal: true })
                            )
                          }
                          className="w-16 min-w-0 rounded-lg border border-[rgb(var(--ctp-surface1)/0.6)] bg-[rgb(var(--ctp-surface0))] px-2 py-2 text-center text-sm text-[rgb(var(--ctp-text))] focus:border-[rgb(var(--ctp-mauve))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ctp-mauve))]"
                        />
                        <span className="shrink-0 text-xs text-[rgb(var(--ctp-subtext0))]">kg</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label={t('historyReps')}
                          value={set.reps}
                          onChange={(e) =>
                            updateSet(
                              ex.exerciseId,
                              set.id,
                              'reps',
                              sanitizeNumericInput(e.target.value)
                            )
                          }
                          className="w-14 min-w-0 rounded-lg border border-[rgb(var(--ctp-surface1)/0.6)] bg-[rgb(var(--ctp-surface0))] px-2 py-2 text-center text-sm text-[rgb(var(--ctp-text))] focus:border-[rgb(var(--ctp-mauve))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ctp-mauve))]"
                        />
                        <input
                          type="text"
                          aria-label={t('historyNote')}
                          placeholder={t('historyNote')}
                          value={set.note || ''}
                          onChange={(e) => updateSet(ex.exerciseId, set.id, 'note', e.target.value)}
                          className="min-w-0 flex-1 rounded-lg border border-[rgb(var(--ctp-surface1)/0.6)] bg-[rgb(var(--ctp-surface0))] px-2 py-2 text-sm text-[rgb(var(--ctp-text))] placeholder-[rgb(var(--ctp-subtext0))] focus:border-[rgb(var(--ctp-mauve))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ctp-mauve))]"
                        />
                        <button
                          type="button"
                          onClick={() => deleteSet(ex.exerciseId, set.id)}
                          aria-label={t('historyDeleteSet')}
                          className="inline-flex shrink-0 items-center justify-center rounded-full p-2 text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out hover:bg-[rgb(var(--ctp-surface1)/0.5)] hover:text-[rgb(var(--ctp-red))] active:scale-90 active:opacity-70"
                        >
                          <Icon name="close" className="text-[16px]" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-[rgb(var(--ctp-surface1))] py-3 text-sm font-bold text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out active:scale-[0.97] active:opacity-80"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[rgb(var(--ctp-mauve))] py-3 text-sm font-bold text-[rgb(var(--ctp-base))] transition-all duration-150 ease-out active:scale-[0.97] active:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[rgb(var(--ctp-base))]/70 border-t-transparent" />
            )}
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
