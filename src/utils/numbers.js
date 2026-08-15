const PERSIAN_ZERO = '۰'.charCodeAt(0)
const ARABIC_ZERO = '٠'.charCodeAt(0)

// Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits — plus the Arabic
// decimal separator (٫) — to standard English digits/period, so typing on a
// Persian keyboard works with plain numeric parsing (Number(), parseFloat()).
export function toEnglishDigits(value) {
  return String(value)
    .replace(/[۰-۹]/g, (ch) => String(ch.charCodeAt(0) - PERSIAN_ZERO))
    .replace(/[٠-٩]/g, (ch) => String(ch.charCodeAt(0) - ARABIC_ZERO))
    .replace(/٫/g, '.')
}

// Converts Persian/Arabic digits to English, then strips anything that
// isn't a digit (and, if allowDecimal, at most one '.'). Meant for
// `onChange` on text inputs standing in for `type="number"` fields.
export function sanitizeNumericInput(rawValue, { allowDecimal = false } = {}) {
  const converted = toEnglishDigits(rawValue)
  const cleaned = converted.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, '')

  if (!allowDecimal) return cleaned

  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '')
}
