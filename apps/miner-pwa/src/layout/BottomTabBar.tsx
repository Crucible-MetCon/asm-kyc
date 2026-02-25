interface Tab {
  label: string;
  icon: string;
  active?: boolean;
  onClick?: () => void;
}

export function BottomTabBar({ tabs }: { tabs: Tab[] }) {
  return (
    <nav className="bottom-tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.label}
          className={`tab-item ${tab.active ? 'active' : ''}`}
          onClick={tab.onClick}
          type="button"
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
