// Theme registry — the single JS-side list of selectable themes. The colors
// themselves live only in CSS (see the `[data-theme=...]` blocks in
// index.css); this file just names them so the hook can validate stored
// values and the switcher can render one card per theme.
//
// Adding a theme = one `[data-theme='x']` block in index.css + one entry
// here. Nothing else needs to change.
export const THEMES = [
  { id: 'catppuccin', name: 'Catppuccin', isDark: true },
  { id: 'dracula', name: 'Dracula', isDark: true },
  { id: 'tokyo-night', name: 'Tokyo Night', isDark: true },
  { id: 'nord', name: 'Nord', isDark: true },
  { id: 'rose-pine', name: 'Rosé Pine', isDark: true },
  { id: 'gruvbox', name: 'Gruvbox', isDark: true },
]

export const DEFAULT_THEME_ID = 'catppuccin'

// Also read by the inline pre-paint script in index.html — keep in sync.
export const THEME_STORAGE_KEY = 'gymbro_theme'

export function getTheme(id) {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
}

export function isThemeId(id) {
  return THEMES.some((theme) => theme.id === id)
}
