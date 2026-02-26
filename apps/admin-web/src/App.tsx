import { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginScreen } from './auth/LoginScreen';
import { AdminLayout } from './layout/AdminLayout';
import type { AdminScreen } from './layout/Sidebar';
import { DashboardScreen } from './dashboard/DashboardScreen';
import { UserListScreen } from './users/UserListScreen';
import { UserDetailScreen } from './users/UserDetailScreen';
import { RecordListScreen } from './records/RecordListScreen';
import { RecordDetailScreen } from './records/RecordDetailScreen';
import { ComplianceScreen } from './compliance/ComplianceScreen';

function AppContent() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<AdminScreen>('dashboard');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#6b7280' }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // Role guard: only ADMIN_USER
  if (user.role !== 'ADMIN_USER') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
        <h1 style={{ color: '#dc2626' }}>Access Denied</h1>
        <p style={{ color: '#6b7280' }}>This dashboard is only available to admin users.</p>
      </div>
    );
  }

  const navigateToUser = (id: string) => {
    setSelectedUserId(id);
    setScreen('user-detail');
  };

  const navigateToRecord = (id: string) => {
    setSelectedRecordId(id);
    setScreen('record-detail');
  };

  const handleNavigate = (s: AdminScreen) => {
    setScreen(s);
    if (s !== 'user-detail') setSelectedUserId(null);
    if (s !== 'record-detail') setSelectedRecordId(null);
  };

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard':
        return (
          <DashboardScreen
            onNavigateRecords={() => handleNavigate('records')}
            onNavigateCompliance={() => handleNavigate('compliance')}
            onNavigateUsers={() => handleNavigate('users')}
          />
        );
      case 'users':
        return <UserListScreen onSelectUser={navigateToUser} />;
      case 'user-detail':
        return selectedUserId ? (
          <UserDetailScreen userId={selectedUserId} onBack={() => handleNavigate('users')} />
        ) : null;
      case 'records':
        return <RecordListScreen onSelectRecord={navigateToRecord} />;
      case 'record-detail':
        return selectedRecordId ? (
          <RecordDetailScreen recordId={selectedRecordId} onBack={() => handleNavigate('records')} />
        ) : null;
      case 'compliance':
        return <ComplianceScreen onSelectRecord={navigateToRecord} />;
      default:
        return null;
    }
  };

  return (
    <AdminLayout screen={screen} onNavigate={handleNavigate}>
      {renderScreen()}
    </AdminLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
