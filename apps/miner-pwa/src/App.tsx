import { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginScreen } from './auth/LoginScreen';
import { RegisterScreen } from './auth/RegisterScreen';
import { HomeScreen } from './home/HomeScreen';
import { BottomTabBar } from './layout/BottomTabBar';

function AppContent() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<'login' | 'register'>('login');

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return screen === 'register' ? (
      <RegisterScreen onSwitchToLogin={() => setScreen('login')} />
    ) : (
      <LoginScreen onSwitchToRegister={() => setScreen('register')} />
    );
  }

  return (
    <div className="app-shell">
      <main className="main-content">
        <HomeScreen />
      </main>
      <BottomTabBar
        tabs={[
          { label: 'Home', icon: '\u{1F3E0}', active: true },
          { label: 'Records', icon: '\u{1F4CB}' },
          { label: 'Profile', icon: '\u{1F464}' },
        ]}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
