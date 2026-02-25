import { useState, type ReactNode } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { I18nProvider, useI18n, type Language } from './i18n/I18nContext';
import { LoginScreen } from './auth/LoginScreen';
import { RegisterScreen } from './auth/RegisterScreen';
import { HomeScreen } from './home/HomeScreen';
import { ProfileScreen } from './profile/ProfileScreen';
import { OnboardingFlow } from './onboarding/OnboardingFlow';
import { BottomTabBar } from './layout/BottomTabBar';

type AuthScreen = 'login' | 'register';
type AppScreen = 'home' | 'records' | 'profile' | 'onboarding';

function I18nWrapper({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const lang = (user?.profile?.home_language === 'bem' ? 'bem' : 'en') as Language;
  return <I18nProvider initialLang={lang}>{children}</I18nProvider>;
}

function AppContent() {
  const { user, loading, refreshUser } = useAuth();
  const { t } = useI18n();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [appScreen, setAppScreen] = useState<AppScreen>('home');

  if (loading) {
    return <div className="screen-centered">{t.common.loading}</div>;
  }

  if (!user) {
    return authScreen === 'register' ? (
      <RegisterScreen onSwitchToLogin={() => setAuthScreen('login')} />
    ) : (
      <LoginScreen onSwitchToRegister={() => setAuthScreen('register')} />
    );
  }

  // Check if profile needs onboarding
  const needsOnboarding = !user.profile?.profile_completed_at;

  if (appScreen === 'onboarding' || (needsOnboarding && appScreen === 'home')) {
    return (
      <OnboardingFlow
        onComplete={async () => {
          await refreshUser();
          setAppScreen('home');
        }}
        initialData={
          user.profile
            ? {
                full_name: user.profile.full_name,
                nrc_number: user.profile.nrc_number ?? '',
                date_of_birth: user.profile.date_of_birth
                  ? user.profile.date_of_birth.split('T')[0]
                  : '',
                gender: user.profile.gender ?? '',
                mine_site_name: user.profile.mine_site_name ?? '',
                mine_site_location: user.profile.mine_site_location ?? '',
                mining_license_number: user.profile.mining_license_number ?? '',
                consent_version: user.profile.consent_version ?? '',
              }
            : undefined
        }
        isEdit={appScreen === 'onboarding' && !needsOnboarding}
      />
    );
  }

  const renderScreen = () => {
    switch (appScreen) {
      case 'profile':
        return <ProfileScreen onEdit={() => setAppScreen('onboarding')} />;
      case 'records':
        return (
          <div className="screen">
            <h1>{t.nav.records}</h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>Coming in Phase 4</p>
          </div>
        );
      case 'home':
      default:
        return <HomeScreen onNavigate={setAppScreen} />;
    }
  };

  return (
    <div className="app-shell">
      <main className="main-content">{renderScreen()}</main>
      <BottomTabBar
        tabs={[
          {
            label: t.nav.home,
            icon: '🏠',
            active: appScreen === 'home',
            onClick: () => setAppScreen('home'),
          },
          {
            label: t.nav.records,
            icon: '📋',
            active: appScreen === 'records',
            onClick: () => setAppScreen('records'),
          },
          {
            label: t.nav.profile,
            icon: '👤',
            active: appScreen === 'profile',
            onClick: () => setAppScreen('profile'),
          },
        ]}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <I18nWrapper>
        <AppContent />
      </I18nWrapper>
    </AuthProvider>
  );
}
