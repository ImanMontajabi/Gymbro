import Icon from './Icon'

// Fixed bottom navigation switching between the workout flow and the
// history/analytics tab — sits below all screens, safe-area aware for the
// iOS home-indicator strip.
export default function BottomTabBar({ activeTab, onChange }) {
  const tabs = [
    { id: 'workout', label: 'تمرین امروز', icon: 'fitness_center' },
    { id: 'history', label: 'تاریخچه و پیشرفت', icon: 'monitoring' },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
      <div className="mx-auto flex max-w-md">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-bold transition-colors ${
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
