// Negative input (rest timer overtime) is formatted as e.g. "-01:05" rather
// than relying on Math.floor/% on a negative number, which would produce a
// negative minutes AND a negative seconds part instead of one leading sign.
export function formatTime(totalSeconds) {
  const sign = totalSeconds < 0 ? '-' : ''
  const abs = Math.abs(totalSeconds)
  const m = Math.floor(abs / 60)
  const s = abs % 60
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
