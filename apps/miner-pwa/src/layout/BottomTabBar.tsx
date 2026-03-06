import type { LucideIcon } from 'lucide-react';

interface Tab {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
  badge?: 'error' | 'warning';
}

export function BottomTabBar({ tabs }: { tabs: Tab[] }) {
  return (
    <nav className="bottom-tab-bar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const badgeClass = tab.badge ? ` tab-badge-${tab.badge}` : '';
        return (
          <button
            key={tab.label}
            className={`tab-item ${tab.active ? 'active' : ''}${badgeClass}`}
            onClick={tab.onClick}
            type="button"
          >
            <span className="tab-icon" style={{ position: 'relative' }}>
              <Icon size={22} strokeWidth={tab.active ? 2.5 : 2} />
              {tab.badge === 'error' && <span className="tab-badge-dot" />}
            </span>
            <span className="tab-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
