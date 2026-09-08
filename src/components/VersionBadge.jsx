import { useLanguage } from '../context/LanguageContext'

// Small "v1.2.0" capsule. `version` comes from useAppVersion (GitHub
// Releases, cached for offline use) via App.jsx — the hook is called once
// there so the page makes a single request. Two tones: `accent` (mauve
// tint, next to the dashboard title) and `neutral` (surface colours, in
// the landing header). Version strings stay LTR with Latin digits in
// every UI language.
const TONE_CLASSES = {
  accent:
    'border-[rgb(var(--ctp-mauve)/0.35)] bg-[rgb(var(--ctp-mauve)/0.12)] font-semibold text-[rgb(var(--ctp-mauve))]',
  neutral:
    'border-[rgb(var(--ctp-surface1))] bg-[rgb(var(--ctp-surface0))] font-medium text-[rgb(var(--ctp-subtext0))]',
}

export default function VersionBadge({ version, tone = 'accent', className = '' }) {
  const { t } = useLanguage()
  return (
    <span
      dir="ltr"
      aria-label={`${t('appVersion')} ${version}`}
      title={t('appVersion')}
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] leading-4 tabular-nums ${TONE_CLASSES[tone]} ${className}`}
    >
      v{version}
    </span>
  )
}
