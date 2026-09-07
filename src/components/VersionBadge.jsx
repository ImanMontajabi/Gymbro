import { useLanguage } from '../context/LanguageContext'

// Small "v1.2.0" pill for the dashboard header. The value is inlined at
// build time (see resolveAppVersion in vite.config.js), so it needs no
// network, no cache and no loading state — it is simply the version of the
// bundle the user is running. Version strings stay LTR with Latin digits
// in every UI language, as they do everywhere else.
export default function VersionBadge({ className = '' }) {
  const { t } = useLanguage()
  return (
    <span
      dir="ltr"
      aria-label={`${t('appVersion')} ${__GYMBRO_VERSION__}`}
      title={t('appVersion')}
      className={`inline-flex shrink-0 items-center rounded-full border border-[rgb(var(--ctp-surface1)/0.6)] bg-[rgb(var(--ctp-surface0))] px-2 py-0.5 font-mono text-[11px] font-medium leading-4 tabular-nums text-[rgb(var(--ctp-subtext0))] ${className}`}
    >
      v{__GYMBRO_VERSION__}
    </span>
  )
}
