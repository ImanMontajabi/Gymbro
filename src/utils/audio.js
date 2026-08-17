// Rest-timer alarm sounds. `value` is the exact filename under /public/sounds/.
export const REST_SOUND_OPTIONS = [
  { value: 'meow.mp3', label: 'میو ۱' },
  { value: 'meow2.mp3', label: 'میو ۲' },
]

export const DEFAULT_REST_SOUND = REST_SOUND_OPTIONS[0].value

const REST_SOUND_STORAGE_KEY = 'gymbro_rest_sound'

export function loadRestSoundPreference() {
  try {
    const stored = localStorage.getItem(REST_SOUND_STORAGE_KEY)
    return REST_SOUND_OPTIONS.some((option) => option.value === stored)
      ? stored
      : DEFAULT_REST_SOUND
  } catch {
    return DEFAULT_REST_SOUND
  }
}

export function saveRestSoundPreference(sound) {
  try {
    localStorage.setItem(REST_SOUND_STORAGE_KEY, sound)
  } catch {
    // localStorage unavailable (private mode, quota) — preference just won't persist.
  }
}
