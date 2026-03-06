import type { LucideIcon } from 'lucide-react';

interface Tab {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
}

export function BottomTabBar({ tabs }: { tabs: Tab[] }) {
  return (
    <nav className="bottom-tab-bar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.label}
            className={`tab-item ${tab.active ? 'active' : ''}`}
            onClick={tab.onClick}
            type="button"
          >
            <span className="tab-icon">
              <Icon size={22} strokeWidth={tab.active ? 2.5 : 2} />
            </span>
            <span className="tab-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
