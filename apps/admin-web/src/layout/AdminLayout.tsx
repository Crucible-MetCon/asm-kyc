import { useState, type ReactNode } from 'react';
import { Sidebar, type AdminScreen } from './Sidebar';
import { Menu, X } from 'lucide-react';

interface AdminLayoutProps {
  screen: AdminScreen;
  onNavigate: (screen: AdminScreen) => void;
  children: ReactNode;
}

export function AdminLayout({ screen, onNavigate, children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavigate = (s: AdminScreen) => {
    onNavigate(s);
    setSidebarOpen(false);
  };

  return (
    <div className="admin-layout">
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <Sidebar screen={screen} onNavigate={handleNavigate} className={sidebarOpen ? 'open' : ''} />
      <main className="admin-main">{children}</main>
    </div>
  );
}
