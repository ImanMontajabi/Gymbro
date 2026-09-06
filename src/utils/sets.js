// Display helpers for a logged set's numbers. Both take the `t` function
// from useLanguage() rather than calling the hook themselves so they can be
// used from plain callbacks and loops, not just component bodies.

// A weight of exactly 0 means a bodyweight set (pull-ups, dips, planks...),
// which reads as "BW" / "وزن بدن" rather than the meaningless "0 kg".
export function formatWeight(weight, t) {
  return Number(weight) === 0 ? t('bodyweight') : `${weight} ${t('unitKg')}`
}

// For a time-based exercise the set's `reps` field holds seconds — same
// storage, different unit label.
export function formatReps(reps, isTimeBased, t) {
  return `${reps} ${t(isTimeBased ? 'unitSeconds' : 'unitReps')}`
}

// "Set 3: 60 kg × 8 reps" / "ست ۳: وزن بدن × ۳۰ ثانیه" — the one line used
// for every set in the active workout view and the previous-record box.
export function formatSetLine(t, { index, weight, reps, isTimeBased }) {
  return t('wtSetLineTemplate')
    .replace('{n}', index + 1)
    .replace('{weight}', formatWeight(weight, t))
    .replace('{reps}', formatReps(reps, isTimeBased, t))
}
