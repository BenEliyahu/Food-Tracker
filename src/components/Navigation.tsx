import type { TabType } from '../lib/types';

interface Props {
  active: TabType;
  onChange: (tab: TabType) => void;
}

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Home', icon: '🏠' },
  { id: 'scan', label: 'Scan', icon: '📷' },
  { id: 'log', label: 'Log', icon: '📋' },
  { id: 'charts', label: 'Charts', icon: '📊' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function Navigation({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50 shadow-lg">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex flex-col items-center py-2.5 text-xs transition-colors ${
            active === tab.id ? 'text-emerald-600' : 'text-gray-400'
          }`}
        >
          <span className="text-xl leading-none">{tab.icon}</span>
          <span className={`mt-1 font-medium ${active === tab.id ? 'text-emerald-600' : 'text-gray-400'}`}>
            {tab.label}
          </span>
          {active === tab.id && (
            <span className="absolute bottom-0 w-6 h-0.5 bg-emerald-500 rounded-full" />
          )}
        </button>
      ))}
    </nav>
  );
}
