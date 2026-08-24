import Icon from './Icon'
import { useLanguage } from '../context/LanguageContext'

// Fixed bottom navigation switching between the workout flow and the
// history/analytics tab — sits below all screens, safe-area aware for the
// iOS home-indicator strip. Glassmorphic (backdrop-blur + translucent
// surface) so content scrolling underneath stays visible, like a native tab
// bar, with a soft top shadow for depth instead of a hard line.
export default function BottomTabBar({ activeTab, onChange }) {
  const { t } = useLanguage()
  const tabs = [
    { id: 'workout', label: t('navWorkout'), icon: 'fitness_center' },
    { id: 'history', label: t('navHistory'), icon: 'monitoring' },
    { id: 'coach', label: t('navCoach'), icon: 'auto_awesome' },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgb(var(--ctp-surface1)/0.4)] bg-[rgb(var(--ctp-base)/0.8)] pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.2)] backdrop-blur-md">
      <div className="mx-auto flex max-w-md">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-bold transition-all duration-150 ease-out active:scale-95 active:opacity-70 ${
              activeTab === tab.id
                ? 'text-[rgb(var(--ctp-mauve))]'
                : 'text-[rgb(var(--ctp-subtext0))]'
            }`}
          >
            <Icon name={tab.icon} className="text-[22px]" />
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
