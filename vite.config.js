import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// App version, resolved at BUILD time and inlined into the bundle — never
// fetched at runtime. For an offline-first PWA that is the only honest
// answer: the badge must describe the code that is actually running, work
// with no network, and never show a release newer than the installed
// bundle. GitHub Releases are created from git tags, so the newest tag
// reachable from the built commit *is* the release version.
//
// Resolution order:
//   1. VITE_APP_VERSION env var — for hosts whose shallow clone has no tags
//      (set it in the host's build settings, or in CI from the release tag)
//   2. `git describe --tags --abbrev=0` — nearest tag on the built commit
//   3. package.json "version" — kept in sync with tags by `npm version`
// A leading v/V is stripped; the UI adds its own "v".
function resolveAppVersion() {
  const fromEnv = process.env.VITE_APP_VERSION?.trim()
  if (fromEnv) return fromEnv.replace(/^v/i, '')
  try {
    const tag = execSync('git describe --tags --abbrev=0', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
    if (tag) return tag.replace(/^v/i, '')
  } catch {
    // not a git checkout, or no tags reachable — fall through
  }
  return JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    // Release version, shown as a badge on the dashboard and in Settings.
    __GYMBRO_VERSION__: JSON.stringify(resolveAppVersion()),
    // Build timestamp, shown in Settings so a phone running a stale
    // service-worker bundle can be told apart from one on the current build.
    __GYMBRO_BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // apple-touch-icon.png isn't referenced by the manifest (iOS ignores
      // manifest icons) so it has to be listed explicitly to be precached.
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'جیم برو',
        short_name: 'GymBro',
        description: 'دفترچه تمرین و ثبت ست‌های باشگاه',
        lang: 'fa',
        dir: 'rtl',
        theme_color: '#030712',
        background_color: '#030712',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})
