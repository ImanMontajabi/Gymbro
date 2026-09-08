import typography from '@tailwindcss/typography'

// Every color below is a CSS variable holding a space-separated RGB triplet,
// defined per theme in src/index.css under [data-theme=...]. `<alpha-value>`
// lets the usual opacity modifiers work: `bg-surface0/50` → rgb(r g b / 0.5).
const themeColor = (token) => `rgb(var(--color-${token}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'sans-serif'],
      },
      colors: {
        base: themeColor('base'),
        mantle: themeColor('mantle'),
        surface0: themeColor('surface0'),
        surface1: themeColor('surface1'),
        text: themeColor('text'),
        subtext0: themeColor('subtext0'),
        primary: themeColor('primary'),
        info: themeColor('info'),
        success: themeColor('success'),
        warning: themeColor('warning'),
        danger: themeColor('danger'),
      },
    },
  },
  plugins: [typography],
}
