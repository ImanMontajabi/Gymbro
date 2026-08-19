import Icon from './Icon'

// Fixed bottom navigation switching between the workout flow and the
// history/analytics tab — sits below all screens, safe-area aware for the
// iOS home-indicator strip. Glassmorphic (backdrop-blur + translucent
// surface) so content scrolling underneath stays visible, like a native tab
// bar, with a soft top shadow for depth instead of a hard line.
export default function BottomTabBar({ activeTab, onChange }) {
  const tabs = [
    { id: 'workout', label: 'تمرین امروز', icon: 'fitness_center' },
    { id: 'history', label: 'تاریخچه و پیشرفت', icon: 'monitoring' },
    { id: 'coach', label: 'مربی من', icon: 'auto_awesome' },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/80 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-white/10 dark:bg-gray-950/80 dark:shadow-[0_-8px_24px_rgba(0,0,0,0.35)]">
      <div className="mx-auto flex max-w-md">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-bold transition-all duration-150 ease-out active:scale-95 active:opacity-70 ${
              activeTab === tab.id
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-gray-400 dark:text-gray-500'
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
