import { Suspense, lazy, useRef, useState } from 'react'
import { DndContext, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Icon from './Icon'
import NameEditRow from './NameEditRow'
import ExerciseEditRow from './ExerciseEditRow'
import HeaderActions from './HeaderActions'
import SettingsModal from './SettingsModal'
import BottomTabBar from './BottomTabBar'
import { formatSessionDate } from '../utils/history'
import { formatTime } from '../utils/time'
import { sanitizeNumericInput } from '../utils/numbers'

// recharts is heavy and most exercise cards are never expanded, so it's
// split into its own chunk instead of bloating WorkoutTab's (unlazy, always
// rendered) bundle.
const ExerciseChart = lazy(() => import('./ExerciseChart'))

// One row in a set list, draggable via its handle. dnd-kit requires
// `useSortable` to run inside the item component itself (it can't be called
// from a loop in the parent), so this is split out rather than inlined.
function SortableSetRow({ set, index, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: set.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`animate-fade-slide-in flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0 ${
        isDragging ? 'relative z-10 rounded-lg bg-[rgb(var(--ctp-mantle))] shadow-md' : ''
      }`}
    >
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="جابجایی ست"
          className="inline-flex shrink-0 touch-none items-center justify-center rounded-full p-2.5 text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out active:scale-90 active:cursor-grabbing active:opacity-70"
        >
          <Icon name="drag_indicator" className="text-[20px]" />
        </button>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[rgb(var(--ctp-text))]">
            ست {index + 1}: {set.weight} kg × {set.reps} تکرار
          </span>
          {set.note && (
            <span className="truncate text-sm text-[rgb(var(--ctp-subtext0))]">{set.note}</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onEdit}
          aria-label="ویرایش ست"
          className="inline-flex items-center justify-center rounded-full p-2.5 text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out hover:bg-[rgb(var(--ctp-surface1)/0.5)] hover:text-[rgb(var(--ctp-mauve))] active:scale-90 active:opacity-70"
        >
          <Icon name="edit" className="text-[18px]" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="حذف ست"
          className="inline-flex items-center justify-center rounded-full p-2.5 text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out hover:bg-[rgb(var(--ctp-surface1)/0.5)] hover:text-[rgb(var(--ctp-red))] active:scale-90 active:opacity-70"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>
    </li>
  )
}

// How long "پایان تمرین" must be held before it actually fires — long enough
// that a stray tap while reaching for another button can't end the workout
// by accident, short enough not to feel broken.
const END_WORKOUT_HOLD_MS = 650

// Tab 1: the routine-picker home screen, and the active-workout logging
// view once a routine is started — the two states the original app treated
// as one continuous "workout flow". `workout` and `timer` are the full
// objects returned by useWorkoutData()/useRestTimer() in App.jsx. Both
// objects — along with `activeTab`, which lives in the Dashboard component
// in App.jsx — are already owned above this component, so switching to the
// history/coach tab mid-workout (via the header back button or the bottom
// tab bar) never loses the session or the running rest timer; there's
// nothing here to persist separately.
export default function WorkoutTab({
  workout,
  timer,
  user,
  onLogout,
  isOnline,
  restSound,
  onRestSoundChange,
  activeTab,
  onTabChange,
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [expandedCharts, setExpandedCharts] = useState(() => new Set())
  // Focus Mode: only one exercise is ever expanded for data entry at a time,
  // so a stray tap mid-set can't land on the wrong exercise's inputs.
  const [activeExerciseId, setActiveExerciseId] = useState(null)

  // "پایان تمرین" only fires after being held for END_WORKOUT_HOLD_MS — the
  // timeout below does the actual firing, isHoldingEnd just drives the fill
  // animation. Any release before it fires (pointerup/leave/cancel) clears
  // the timeout, so the workout is never ended by a normal tap.
  const [isHoldingEnd, setIsHoldingEnd] = useState(false)
  const endHoldTimeoutRef = useRef(null)

  function startEndHold() {
    setIsHoldingEnd(true)
    endHoldTimeoutRef.current = setTimeout(() => {
      handleFinishWorkout()
      setIsHoldingEnd(false)
    }, END_WORKOUT_HOLD_MS)
  }

  function cancelEndHold() {
    clearTimeout(endHoldTimeoutRef.current)
    setIsHoldingEnd(false)
  }

  function toggleChart(exerciseId) {
    setExpandedCharts((prev) => {
      const next = new Set(prev)
      if (next.has(exerciseId)) {
        next.delete(exerciseId)
      } else {
        next.add(exerciseId)
      }
      return next
    })
  }

  const {
    routines,
    history,
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
    handleReorderSets,
    handleFinishWorkout,
    handleClearAllData,
  } = workout

  // TouchSensor needs a short hold + a bit of movement tolerance before it
  // activates, so a normal vertical swipe still scrolls the page instead of
  // starting a drag; MouseSensor needs a small move distance for the same
  // reason with a trackpad/mouse.
  const dndSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

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
    <HeaderActions onOpenSettings={() => setIsSettingsOpen(true)} isOnline={isOnline} />
  )

  const bottomTabBar = <BottomTabBar activeTab={activeTab} onChange={onTabChange} />

  // --- Home screen ------------------------------------------------------

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-[rgb(var(--ctp-base))] text-[rgb(var(--ctp-text))]">
        {settingsModal}
        <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
          <header className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/pwa-192x192.png"
                alt="Gymbro Logo"
                className="h-8 w-8 rounded-xl object-contain shadow-sm"
              />
              <h1 className="text-2xl font-bold">جیم برو</h1>
            </div>
            {headerActions}
          </header>

          <section>
            <h2 className="mb-4 text-lg font-bold">برنامه امروز رو انتخاب کن</h2>
            <div className="flex flex-col gap-3">
              {routines.map((routine) => (
                <div
                  key={routine.id}
                  className="animate-fade-slide-in rounded-2xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-surface0))] p-4 shadow-md shadow-black/10 transition-all duration-200"
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
                        className="flex-1 truncate rounded-xl py-2 text-right text-lg font-bold text-[rgb(var(--ctp-text))] transition-all duration-150 ease-out active:scale-[0.98] active:opacity-70"
                      >
                        {routine.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRoutineId(routine.id)}
                        aria-label="ویرایش نام برنامه"
                        className="inline-flex shrink-0 items-center justify-center rounded-full p-3 text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out hover:bg-[rgb(var(--ctp-surface1)/0.5)] hover:text-[rgb(var(--ctp-mauve))] active:scale-90 active:opacity-70"
                      >
                        <Icon name="edit" className="text-[20px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoutine(routine.id, routine.name)}
                        aria-label="حذف برنامه"
                        className="inline-flex shrink-0 items-center justify-center rounded-full p-3 text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out hover:bg-[rgb(var(--ctp-surface1)/0.5)] hover:text-[rgb(var(--ctp-red))] active:scale-90 active:opacity-70"
                      >
                        <Icon name="delete" className="text-[20px]" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {isAddingRoutine ? (
                <div className="animate-fade-slide-in rounded-2xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-surface0))] p-4 shadow-md shadow-black/10">
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
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[rgb(var(--ctp-surface1))] py-4 text-lg font-bold text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out hover:border-[rgb(var(--ctp-mauve))] hover:text-[rgb(var(--ctp-mauve))] active:scale-[0.98] active:opacity-80"
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

  // The active exercise is always pinned to index 0; the rest keep their
  // original routine order. The comparator only ever returns -1/0/1 for
  // pairs touching the active exercise, so it leaves everyone else's
  // relative order untouched (sort is stable per spec).
  const sortedExercises = [...activeSession.exercises].sort((a, b) => {
    if (a.exerciseId === activeExerciseId) return -1
    if (b.exerciseId === activeExerciseId) return 1
    return 0
  })

  return (
    <div className="min-h-screen bg-[rgb(var(--ctp-base))] text-[rgb(var(--ctp-text))]">
      {settingsModal}
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
        <header className="mb-6 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onTabChange('history')}
              aria-label="خروج موقت از تمرین"
              className="inline-flex shrink-0 items-center justify-center rounded-full p-2 text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out hover:bg-[rgb(var(--ctp-surface1)/0.5)] hover:text-[rgb(var(--ctp-mauve))] active:scale-90 active:opacity-70"
            >
              <Icon name="chevron_right" className="text-[26px]" />
            </button>
            <div className="flex min-w-0 flex-col">
              <span className="text-sm text-[rgb(var(--ctp-subtext0))]">برنامه</span>
              <h1 className="truncate text-2xl font-bold">{activeSession.routineName}</h1>
            </div>
          </div>
          {headerActions}
        </header>

        <div className="flex flex-col gap-4">
          {sortedExercises.map((ex) => {
            const isActive = ex.exerciseId === activeExerciseId

            if (!isActive) {
              const setsSummary =
                ex.sets.length > 0 ? `${ex.sets.length} ست ثبت شده` : 'هنوز ستی ثبت نشده'

              return (
                <div
                  key={ex.exerciseId}
                  className="animate-fade-slide-in flex items-center gap-3 rounded-2xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-surface0))] p-4 shadow-md shadow-black/10 transition-all duration-300"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-bold">{ex.exerciseName}</h3>
                    <p className="text-sm text-[rgb(var(--ctp-subtext0))]">{setsSummary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveExerciseId(ex.exerciseId)}
                    className="shrink-0 rounded-xl bg-[rgb(var(--ctp-mauve))] px-4 py-3 text-sm font-bold text-[rgb(var(--ctp-base))] transition-all duration-150 ease-out active:scale-[0.97] active:opacity-80"
                  >
                    انجام حرکت
                  </button>
                </div>
              )
            }

            const draft = getDraft(ex.exerciseId)
            const previous = previousRecords[ex.exerciseName]
            const canSubmit = Number(draft.weight) > 0 && Number(draft.reps) > 0
            const isSubmittingSet = addingSetExerciseId === ex.exerciseId

            return (
              <div
                key={ex.exerciseId}
                className="animate-fade-slide-in rounded-2xl border border-[rgb(var(--ctp-mauve)/0.5)] bg-[rgb(var(--ctp-surface0))] p-4 shadow-md shadow-black/10 transition-all duration-300"
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
                        onClick={() => toggleChart(ex.exerciseId)}
                        aria-label="نمودار پیشرفت"
                        aria-expanded={expandedCharts.has(ex.exerciseId)}
                        className={`inline-flex shrink-0 items-center justify-center rounded-full p-2.5 transition-all duration-150 ease-out hover:bg-[rgb(var(--ctp-surface1)/0.5)] active:scale-90 active:opacity-70 ${
                          expandedCharts.has(ex.exerciseId)
                            ? 'text-[rgb(var(--ctp-mauve))]'
                            : 'text-[rgb(var(--ctp-subtext0))] hover:text-[rgb(var(--ctp-mauve))]'
                        }`}
                      >
                        <Icon name="show_chart" className="text-[18px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingExerciseId(ex.exerciseId)}
                        aria-label="ویرایش نام حرکت"
                        className="inline-flex shrink-0 items-center justify-center rounded-full p-2.5 text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out hover:bg-[rgb(var(--ctp-surface1)/0.5)] hover:text-[rgb(var(--ctp-mauve))] active:scale-90 active:opacity-70"
                      >
                        <Icon name="edit" className="text-[18px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExercise(ex.exerciseId, ex.exerciseName)}
                        aria-label="حذف حرکت"
                        className="inline-flex shrink-0 items-center justify-center rounded-full p-2.5 text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out hover:bg-[rgb(var(--ctp-surface1)/0.5)] hover:text-[rgb(var(--ctp-red))] active:scale-90 active:opacity-70"
                      >
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveExerciseId(null)}
                        aria-label="بستن حرکت"
                        className="inline-flex shrink-0 items-center justify-center rounded-full p-2.5 text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out hover:bg-[rgb(var(--ctp-surface1)/0.5)] hover:text-[rgb(var(--ctp-mauve))] active:scale-90 active:opacity-70"
                      >
                        <Icon name="expand_less" className="text-[18px]" />
                      </button>
                    </div>
                    {ex.restTime > 0 && (
                      <p className="text-xs text-[rgb(var(--ctp-subtext0))]">
                        استراحت پیش‌فرض: {ex.restTime} ثانیه
                      </p>
                    )}
                    {expandedCharts.has(ex.exerciseId) && (
                      <Suspense
                        fallback={
                          <div className="mt-3 h-[9.75rem] animate-pulse rounded-xl bg-[rgb(var(--ctp-mantle))]" />
                        }
                      >
                        <ExerciseChart exerciseName={ex.exerciseName} history={history} />
                      </Suspense>
                    )}
                  </div>
                )}

                {previous && (
                  <div className="mb-3 rounded-xl border border-[rgb(var(--ctp-mauve)/0.3)] bg-[rgb(var(--ctp-mauve)/0.08)] p-3 shadow-inner">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[rgb(var(--ctp-mauve))]">
                        رکورد جلسه قبل
                      </span>
                      <span className="text-xs text-[rgb(var(--ctp-subtext0))]">
                        {formatSessionDate(previous.session.date)}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-0.5">
                      {previous.exercise.sets.map((set, i) => (
                        <li key={set.id} className="text-sm text-[rgb(var(--ctp-text))]">
                          ست {i + 1}: {set.weight} kg × {set.reps} تکرار
                          {set.note && (
                            <span className="text-[rgb(var(--ctp-subtext0))]"> — {set.note}</span>
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
                        htmlFor={`weight-${ex.exerciseId}`}
                        className="text-sm font-medium text-[rgb(var(--ctp-subtext0))]"
                      >
                        وزنه (kg)
                      </label>
                      <input
                        id={`weight-${ex.exerciseId}`}
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
                        className="w-full min-w-0 rounded-xl border border-[rgb(var(--ctp-surface1)/0.6)] bg-[rgb(var(--ctp-mantle))] px-4 py-4 text-lg text-[rgb(var(--ctp-text))] placeholder-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out focus:border-[rgb(var(--ctp-mauve))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ctp-mauve))]"
                      />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <label
                        htmlFor={`reps-${ex.exerciseId}`}
                        className="text-sm font-medium text-[rgb(var(--ctp-subtext0))]"
                      >
                        تکرار
                      </label>
                      <input
                        id={`reps-${ex.exerciseId}`}
                        type="text"
                        inputMode="numeric"
                        placeholder="۰"
                        value={draft.reps}
                        onChange={(e) =>
                          updateDraft(ex.exerciseId, 'reps', sanitizeNumericInput(e.target.value))
                        }
                        className="w-full min-w-0 rounded-xl border border-[rgb(var(--ctp-surface1)/0.6)] bg-[rgb(var(--ctp-mantle))] px-4 py-4 text-lg text-[rgb(var(--ctp-text))] placeholder-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out focus:border-[rgb(var(--ctp-mauve))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ctp-mauve))]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor={`note-${ex.exerciseId}`}
                      className="text-sm font-medium text-[rgb(var(--ctp-subtext0))]"
                    >
                      یادداشت{' '}
                      <span className="text-[rgb(var(--ctp-subtext0))]">(اختیاری)</span>
                    </label>
                    <input
                      id={`note-${ex.exerciseId}`}
                      type="text"
                      inputMode="text"
                      placeholder="مثلاً ست اضافی یا مکث دو ثانیه"
                      value={draft.note}
                      onChange={(e) => updateDraft(ex.exerciseId, 'note', e.target.value)}
                      className="rounded-xl border border-[rgb(var(--ctp-surface1)/0.6)] bg-[rgb(var(--ctp-mantle))] px-4 py-4 text-lg text-[rgb(var(--ctp-text))] placeholder-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out focus:border-[rgb(var(--ctp-mauve))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--ctp-mauve))]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit || isSubmittingSet}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[rgb(var(--ctp-mauve))] py-4 text-lg font-bold text-[rgb(var(--ctp-base))] shadow-md shadow-black/20 transition-all duration-150 ease-out active:scale-[0.98] active:opacity-80 disabled:cursor-not-allowed disabled:bg-[rgb(var(--ctp-surface1))] disabled:text-[rgb(var(--ctp-subtext0))] disabled:shadow-none"
                  >
                    {isSubmittingSet && (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[rgb(var(--ctp-base))]/70 border-t-transparent" />
                    )}
                    {isSubmittingSet ? 'در حال ثبت...' : 'ثبت ست'}
                  </button>
                </form>

                {timer.activeTimer?.exerciseId === ex.exerciseId && (
                  <div className="animate-fade-slide-in mt-3 rounded-xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-mantle))] p-3 shadow-inner">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[rgb(var(--ctp-text))]">
                        استراحت
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold tabular-nums text-[rgb(var(--ctp-mauve))]">
                          {formatTime(timer.remaining)}
                        </span>
                        <button
                          type="button"
                          onClick={timer.cancelTimer}
                          className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--ctp-surface1))] px-3 py-2 text-xs font-bold text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out hover:opacity-80 active:scale-90 active:opacity-70"
                        >
                          <Icon name="close" className="text-[16px]" />
                          لغو
                        </button>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[rgb(var(--ctp-surface1))]">
                      <div
                        className="h-full rounded-full bg-[rgb(var(--ctp-mauve))] transition-[width] duration-300 ease-linear"
                        style={{ width: `${(timer.remaining / timer.activeTimer.duration) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {ex.sets.length > 0 && (
                  <DndContext
                    sensors={dndSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={({ active, over }) => {
                      if (over && active.id !== over.id) {
                        handleReorderSets(ex.exerciseId, active.id, over.id)
                      }
                    }}
                  >
                    <SortableContext
                      items={ex.sets.map((set) => set.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul className="mt-3 flex flex-col divide-y divide-[rgb(var(--ctp-surface1)/0.4)] border-t border-[rgb(var(--ctp-surface1)/0.4)] pt-2">
                        {ex.sets.map((set, i) => (
                          <SortableSetRow
                            key={set.id}
                            set={set}
                            index={i}
                            onEdit={() => handleEditSet(ex.exerciseId, set.id)}
                            onDelete={() => handleDeleteSet(ex.exerciseId, set.id)}
                          />
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            )
          })}

          {isAddingExercise ? (
            <div className="animate-fade-slide-in rounded-2xl border border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-surface0))] p-4 shadow-md shadow-black/10">
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
              className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[rgb(var(--ctp-surface1))] py-4 text-lg font-bold text-[rgb(var(--ctp-subtext0))] transition-all duration-150 ease-out hover:border-[rgb(var(--ctp-mauve))] hover:text-[rgb(var(--ctp-mauve))] active:scale-[0.98] active:opacity-80"
            >
              <Icon name="add" className="text-[22px]" />
              افزودن حرکت
            </button>
          )}
        </div>

        <button
          type="button"
          onPointerDown={startEndHold}
          onPointerUp={cancelEndHold}
          onPointerLeave={cancelEndHold}
          onPointerCancel={cancelEndHold}
          onContextMenu={(e) => e.preventDefault()}
          className="relative mt-6 touch-none select-none overflow-hidden rounded-xl border-2 border-[rgb(var(--ctp-red))] py-4 text-lg font-bold text-[rgb(var(--ctp-red))] transition-transform duration-150 ease-out active:scale-[0.98]"
        >
          <span
            aria-hidden="true"
            className="absolute inset-y-0 right-0 bg-[rgb(var(--ctp-red)/0.25)]"
            style={{
              width: isHoldingEnd ? '100%' : '0%',
              transition: `width ${isHoldingEnd ? END_WORKOUT_HOLD_MS : 150}ms ${isHoldingEnd ? 'linear' : 'ease-out'}`,
            }}
          />
          <span className="relative">
            {isHoldingEnd ? 'نگه دارید...' : 'برای پایان، لمس کرده و نگه دارید'}
          </span>
        </button>
      </div>
      {bottomTabBar}
    </div>
  )
}
