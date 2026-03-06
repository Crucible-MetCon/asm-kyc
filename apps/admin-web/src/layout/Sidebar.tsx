import { useAuth } from '../auth/AuthContext';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  ShieldCheck,
  FileText,
  FolderOpen,
  Map,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

export type AdminScreen =
  | 'dashboard'
  | 'users'
  | 'user-detail'
  | 'records'
  | 'record-detail'
  | 'compliance'
  | 'surveys'
  | 'entity-packs'
  | 'supply-chain-map';

interface SidebarProps {
  screen: AdminScreen;
  onNavigate: (screen: AdminScreen) => void;
  className?: string;
}

const navItems: { screen: AdminScreen; label: string; icon: LucideIcon }[] = [
  { screen: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { screen: 'users', label: 'Users', icon: Users },
  { screen: 'records', label: 'Records', icon: ClipboardList },
  { screen: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { screen: 'surveys', label: 'Surveys', icon: FileText },
  { screen: 'entity-packs', label: 'Entity Packs', icon: FolderOpen },
  { screen: 'supply-chain-map', label: 'Supply Chain Map', icon: Map },
];

export function Sidebar({ screen, onNavigate, className = '' }: SidebarProps) {
  const { user, logout } = useAuth();

  const activeNav = (s: AdminScreen) => {
    if (s === 'users' && screen === 'user-detail') return true;
    if (s === 'records' && screen === 'record-detail') return true;
    return s === screen;
  };

  return (
    <aside className={`admin-sidebar ${className}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-title">ASM Gold Trace</div>
        <div className="sidebar-brand-subtitle">Admin Panel</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.screen}
              type="button"
              className={`sidebar-nav-item ${activeNav(item.screen) ? 'active' : ''}`}
              onClick={() => onNavigate(item.screen)}
            >
              <span className="sidebar-nav-icon">
                <Icon size={18} strokeWidth={2} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">{user?.username}</div>
        <button type="button" className="sidebar-logout" onClick={logout}>
          <LogOut size={14} strokeWidth={2} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
