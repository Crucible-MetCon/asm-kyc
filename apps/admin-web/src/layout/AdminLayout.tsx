import type { ReactNode } from 'react';
import { Sidebar, type AdminScreen } from './Sidebar';

interface AdminLayoutProps {
  screen: AdminScreen;
  onNavigate: (screen: AdminScreen) => void;
  children: ReactNode;
}

export function AdminLayout({ screen, onNavigate, children }: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      <Sidebar screen={screen} onNavigate={onNavigate} />
      <main className="admin-main">{children}</main>
    </div>
  );
}
