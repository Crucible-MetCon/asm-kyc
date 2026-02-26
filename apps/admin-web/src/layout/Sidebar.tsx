import { useAuth } from '../auth/AuthContext';

export type AdminScreen =
  | 'dashboard'
  | 'users'
  | 'user-detail'
  | 'records'
  | 'record-detail'
  | 'compliance';

interface SidebarProps {
  screen: AdminScreen;
  onNavigate: (screen: AdminScreen) => void;
}

const navItems: { screen: AdminScreen; label: string; icon: string }[] = [
  { screen: 'dashboard', label: 'Dashboard', icon: '📊' },
  { screen: 'users', label: 'Users', icon: '👥' },
  { screen: 'records', label: 'Records', icon: '📋' },
  { screen: 'compliance', label: 'Compliance', icon: '✅' },
];

export function Sidebar({ screen, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();

  const activeNav = (s: AdminScreen) => {
    if (s === 'users' && screen === 'user-detail') return true;
    if (s === 'records' && screen === 'record-detail') return true;
    return s === screen;
  };

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-title">ASM Gold Trace</div>
        <div className="sidebar-brand-subtitle">Admin Panel</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.screen}
            type="button"
            className={`sidebar-nav-item ${activeNav(item.screen) ? 'active' : ''}`}
            onClick={() => onNavigate(item.screen)}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">{user?.username}</div>
        <button type="button" className="sidebar-logout" onClick={logout}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
