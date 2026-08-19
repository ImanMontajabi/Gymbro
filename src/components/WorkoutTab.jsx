import { useState } from 'react'
import Icon from './Icon'
import NameEditRow from './NameEditRow'
import ExerciseEditRow from './ExerciseEditRow'
import HeaderActions from './HeaderActions'
import SettingsModal from './SettingsModal'
import BottomTabBar from './BottomTabBar'
import { formatSessionDate } from '../utils/history'
import { formatTime } from '../utils/time'
import { sanitizeNumericInput } from '../utils/numbers'

// Tab 1: the routine-picker home screen, and the active-workout logging
// view once a routine is started — the two states the original app treated
// as one continuous "workout flow". `workout` and `timer` are the full
// objects returned by useWorkoutData()/useRestTimer() in App.jsx.
export default function WorkoutTab({
  workout,
  timer,
  user,
  onLogout,
  isDark,
  onToggleDark,
  isOnline,
  restSound,
  onRestSoundChange,
  activeTab,
  onTabChange,
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const {
    routines,
    activeSession,
    previousRecords,
    getDraft,
    updateDraft,
    editingRoutineId,
    setEditingRoutineId,
    isAddingRoutine,
    setIsAddingRoutine,
    isCreatingRoutine,
    editingExerciseId,
    setEditingExerciseId,
    isAddingExercise,
    setIsAddingExercise,
    addingSetExerciseId,
    handleCreateRoutine,
    handleRenameRoutine,
    handleDeleteRoutine,
    handleStartRoutine,
    handleAddExercise,
    handleRenameExercise,
    handleDeleteExercise,
    handleAddSet,
    handleDeleteSet,
    handleEditSet,
    handleMoveSet,
    handleFinishWorkout,
    handleClearAllData,
  } = workout

  const settingsModal = isSettingsOpen && (
    <SettingsModal
      onClose={() => setIsSettingsOpen(false)}
      onClearData={() => {
        handleClearAllData()
        setIsSettingsOpen(false)
      }}
      onLogout={() => {
        setIsSettingsOpen(false)
        onLogout()
      }}
      userEmail={user?.email}
      restSound={restSound}
      onRestSoundChange={onRestSoundChange}
    />
  )

  const headerActions = (
    <HeaderActions
      isDark={isDark}
      onToggleDark={onToggleDark}
      onOpenSettings={() => setIsSettingsOpen(true)}
      isOnline={isOnline}
    />
  )

  const bottomTabBar = <BottomTabBar activeTab={activeTab} onChange={onTabChange} />

  // --- Home screen ------------------------------------------------------

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {settingsModal}
        <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">جیم برو</h1>
            {headerActions}
          </header>

          <section>
            <h2 className="mb-4 text-lg font-bold">برنامه امروز رو انتخاب کن</h2>
            <div className="flex flex-col gap-3">
              {routines.map((routine) => (
                <div
                  key={routine.id}
                  className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"
                >
                  {editingRoutineId === routine.id ? (
                    <NameEditRow
                      initialValue={routine.name}
                      onSave={(name) => handleRenameRoutine(routine.id, name)}
                      onCancel={() => setEditingRoutineId(null)}
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartRoutine(routine)}
                        className="flex-1 truncate py-2 text-right text-lg font-bold text-gray-900 dark:text-gray-100"
                      >
                        {routine.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRoutineId(routine.id)}
                        aria-label="ویرایش نام برنامه"
                        className="inline-flex shrink-0 items-center justify-center rounded-full p-3 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800"
                      >
                        <Icon name="edit" className="text-[20px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoutine(routine.id, routine.name)}
                        aria-label="حذف برنامه"
                        className="inline-flex shrink-0 items-center justify-center rounded-full p-3 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
                      >
                        <Icon name="delete" className="text-[20px]" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {isAddingRoutine ? (
                <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
                  <NameEditRow
                    initialValue=""
                    placeholder="مثلاً Push Day"
                    onSave={handleCreateRoutine}
                    onCancel={() => setIsAddingRoutine(false)}
                    isSaving={isCreatingRoutine}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingRoutine(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 py-4 text-lg font-bold text-gray-500 transition hover:border-purple-400 hover:text-purple-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-purple-500 dark:hover:text-purple-400"
                >
                  <Icon name="add" className="text-[22px]" />
                  ایجاد برنامه جدید
                </button>
              )}
            </div>
          </section>
        </div>
        {bottomTabBar}
      </div>
    )
  }

  // --- Active workout view -------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {settingsModal}
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm text-gray-500 dark:text-gray-400">برنامه</span>
            <h1 className="text-2xl font-bold">{activeSession.routineName}</h1>
          </div>
          {headerActions}
        </header>

        <div className="flex flex-col gap-4">
          {activeSession.exercises.map((ex, index) => {
            const draft = getDraft(ex.exerciseId)
            const previous = previousRecords[ex.exerciseName]
            const canSubmit = Number(draft.weight) > 0 && Number(draft.reps) > 0
            const isSubmittingSet = addingSetExerciseId === ex.exerciseId

            return (
              <div
                key={ex.exerciseId}
                className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"
              >
                {editingExerciseId === ex.exerciseId ? (
                  <div className="mb-3">
                    <ExerciseEditRow
                      initialName={ex.exerciseName}
                      initialRestTime={ex.restTime}
                      onSave={(data) => handleRenameExercise(ex.exerciseId, data)}
                      onCancel={() => setEditingExerciseId(null)}
                    />
                  </div>
                ) : (
                  <div className="mb-3">
                    <div className="flex items-center gap-1">
                      <h3 className="flex-1 truncate text-lg font-bold">{ex.exerciseName}</h3>
                      <button
                        type="button"
                        onClick={() => setEditingExerciseId(ex.exerciseId)}
                        aria-label="ویرایش نام حرکت"
                        className="inline-flex shrink-0 items-center justify-center rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800"
                      >
                        <Icon name="edit" className="text-[18px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExercise(ex.exerciseId, ex.exerciseName)}
                        aria-label="حذف حرکت"
                        className="inline-flex shrink-0 items-center justify-center rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
                      >
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                    </div>
                    {ex.restTime > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        استراحت پیش‌فرض: {ex.restTime} ثانیه
                      </p>
                    )}
                  </div>
                )}

                {previous && (
                  <div className="mb-3 rounded-xl border border-purple-300 bg-purple-50 p-3 dark:border-purple-500/30 dark:bg-purple-500/10">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                        رکورد جلسه قبل
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatSessionDate(previous.session.date)}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-0.5">
                      {previous.exercise.sets.map((set, i) => (
                        <li key={set.id} className="text-sm text-gray-700 dark:text-gray-300">
                          ست {i + 1}: {set.weight} kg × {set.reps} تکرار
                          {set.note && (
                            <span className="text-gray-500 dark:text-gray-400"> — {set.note}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <form
                  onSubmit={(e) => handleAddSet(ex.exerciseId, e)}
                  className="flex flex-col gap-3"
                >
                  <div className="flex gap-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <label
                        htmlFor={`weight-${index}`}
                        className="text-sm font-medium text-gray-600 dark:text-gray-400"
                      >
                        وزنه (kg)
                      </label>
                      <input
                        id={`weight-${index}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="۰"
                        value={draft.weight}
                        onChange={(e) =>
                          updateDraft(
                            ex.exerciseId,
                            'weight',
                            sanitizeNumericInput(e.target.value, { allowDecimal: true })
                          )
                        }
                        className="w-full min-w-0 rounded-xl border border-gray-300 bg-gray-50 px-4 py-4 text-lg text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                      />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <label
                        htmlFor={`reps-${index}`}
                        className="text-sm font-medium text-gray-600 dark:text-gray-400"
                      >
                        تکرار
                      </label>
                      <input
                        id={`reps-${index}`}
                        type="text"
                        inputMode="numeric"
                        placeholder="۰"
                        value={draft.reps}
                        onChange={(e) =>
                          updateDraft(ex.exerciseId, 'reps', sanitizeNumericInput(e.target.value))
                        }
                        className="w-full min-w-0 rounded-xl border border-gray-300 bg-gray-50 px-4 py-4 text-lg text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor={`note-${index}`}
                      className="text-sm font-medium text-gray-600 dark:text-gray-400"
                    >
                      یادداشت <span className="text-gray-400 dark:text-gray-500">(اختیاری)</span>
                    </label>
                    <input
                      id={`note-${index}`}
                      type="text"
                      inputMode="text"
                      placeholder="مثلاً ست اضافی یا مکث دو ثانیه"
                      value={draft.note}
                      onChange={(e) => updateDraft(ex.exerciseId, 'note', e.target.value)}
                      className="rounded-xl border border-gray-300 bg-gray-50 px-4 py-4 text-lg text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit || isSubmittingSet}
                    className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-4 text-lg font-bold text-white transition disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
                  >
                    {isSubmittingSet && (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/70 border-t-transparent dark:border-gray-500" />
                    )}
                    {isSubmittingSet ? 'در حال ثبت...' : 'ثبت ست'}
                  </button>
                </form>

                {timer.activeTimer?.exerciseId === ex.exerciseId && (
                  <div className="mt-3 rounded-xl bg-gray-100 p-3 dark:bg-gray-800">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                        استراحت
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold tabular-nums text-purple-600 dark:text-purple-400">
                          {formatTime(timer.remaining)}
                        </span>
                        <button
                          type="button"
                          onClick={timer.cancelTimer}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                          <Icon name="close" className="text-[16px]" />
                          لغو
                        </button>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-300 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-purple-500 transition-[width] duration-300 ease-linear"
                        style={{ width: `${(timer.remaining / timer.activeTimer.duration) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {ex.sets.length > 0 && (
                  <ul className="mt-3 flex flex-col divide-y divide-gray-100 border-t border-gray-100 pt-2 dark:divide-gray-800 dark:border-gray-800">
                    {ex.sets.map((set, i) => (
                      <li
                        key={set.id}
                        className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-800 dark:text-gray-200">
                            ست {i + 1}: {set.weight} kg × {set.reps} تکرار
                          </span>
                          {set.note && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {set.note}
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => handleMoveSet(ex.exerciseId, set.id, -1)}
                              disabled={i === 0}
                              aria-label="جابجایی به بالا"
                              className="inline-flex items-center justify-center rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple-600 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-gray-800"
                            >
                              <Icon name="keyboard_arrow_up" className="text-[18px]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveSet(ex.exerciseId, set.id, 1)}
                              disabled={i === ex.sets.length - 1}
                              aria-label="جابجایی به پایین"
                              className="inline-flex items-center justify-center rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple-600 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-gray-800"
                            >
                              <Icon name="keyboard_arrow_down" className="text-[18px]" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleEditSet(ex.exerciseId, set.id)}
                            aria-label="ویرایش ست"
                            className="inline-flex items-center justify-center rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800"
                          >
                            <Icon name="edit" className="text-[18px]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSet(ex.exerciseId, set.id)}
                            aria-label="حذف ست"
                            className="inline-flex items-center justify-center rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-800"
                          >
                            <Icon name="close" className="text-[18px]" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}

          {isAddingExercise ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
              <ExerciseEditRow
                initialName=""
                initialRestTime={0}
                onSave={handleAddExercise}
                onCancel={() => setIsAddingExercise(false)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingExercise(true)}
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 py-4 text-lg font-bold text-gray-500 transition hover:border-purple-400 hover:text-purple-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-purple-500 dark:hover:text-purple-400"
            >
              <Icon name="add" className="text-[22px]" />
              افزودن حرکت
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleFinishWorkout}
          className="mt-6 rounded-xl border-2 border-red-500 py-4 text-lg font-bold text-red-500 transition active:scale-95 dark:border-red-500/70 dark:text-red-400"
        >
          پایان تمرین
        </button>
      </div>
      {bottomTabBar}
    </div>
  )
}
