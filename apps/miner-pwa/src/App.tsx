import { useState, useEffect, type ReactNode } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { I18nProvider, useI18n, type Language } from './i18n/I18nContext';
import { LoginScreen } from './auth/LoginScreen';
import { RegisterScreen } from './auth/RegisterScreen';
import { HomeScreen } from './home/HomeScreen';
import { ProfileScreen } from './profile/ProfileScreen';
import { OnboardingFlow } from './onboarding/OnboardingFlow';
import { BottomTabBar } from './layout/BottomTabBar';
import { RecordsList } from './records/RecordsList';
import { RecordForm } from './records/RecordForm';
import { RecordDetail } from './records/RecordDetail';
import { RecordFormWrapper } from './records/RecordFormWrapper';
import { TraderHomeScreen } from './trader/TraderHomeScreen';
import { AvailableRecordsList } from './trader/AvailableRecordsList';
import { PurchaseFlow } from './trader/PurchaseFlow';
import { PurchasesList } from './trader/PurchasesList';
import { PurchaseDetail } from './trader/PurchaseDetail';
import { SalesPartnerScreen } from './partners/SalesPartnerScreen';
import { MineSiteScreen } from './mine-sites/MineSiteScreen';
import { SyncStatusBanner } from './offline/SyncStatusBanner';
import { initSyncEngine, teardownSyncEngine } from './offline/syncEngine';
import { FeatureFlagProvider } from './config/FeatureFlagContext';

type AuthScreen = 'login' | 'register';
type AppScreen =
  | 'home' | 'records' | 'profile' | 'onboarding' | 'record-create' | 'record-detail' | 'record-edit'
  | 'trader-home' | 'available-records' | 'purchase-flow' | 'purchases' | 'purchase-detail'
  | 'mine-sites'
  | 'sales-partners';

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
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

  const isTraderOrRefiner = user?.role === 'TRADER_USER' || user?.role === 'REFINER_USER';
  const isMiner = user?.role === 'MINER_USER';

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

  if (appScreen === 'onboarding' || (needsOnboarding && (appScreen === 'home' || appScreen === 'trader-home'))) {
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
        return <ProfileScreen onEdit={() => setAppScreen('onboarding')} onManageSites={isMiner ? () => setAppScreen('mine-sites') : undefined} />;
      case 'records':
        return (
          <RecordsList
            onCreateNew={() => setAppScreen('record-create')}
            onViewRecord={(id) => {
              setSelectedRecordId(id);
              setAppScreen('record-detail');
            }}
          />
        );
      case 'record-create':
        return (
          <RecordForm
            onSaved={(record) => {
              setSelectedRecordId(record.id);
              setAppScreen('record-detail');
            }}
            onBack={() => setAppScreen('records')}
          />
        );
      case 'record-detail':
        return (
          <RecordDetail
            recordId={selectedRecordId!}
            onBack={() => setAppScreen('records')}
            onEdit={(id) => {
              setSelectedRecordId(id);
              setAppScreen('record-edit');
            }}
          />
        );
      case 'record-edit':
        return (
          <RecordFormWrapper
            recordId={selectedRecordId!}
            onSaved={(record) => {
              setSelectedRecordId(record.id);
              setAppScreen('record-detail');
            }}
            onBack={() => setAppScreen('record-detail')}
          />
        );
      case 'mine-sites':
        return <MineSiteScreen onBack={() => setAppScreen('profile')} />;
      // Miner: sales partners
      case 'sales-partners':
        return <SalesPartnerScreen />;
      // Trader/Refiner screens
      case 'trader-home':
        return <TraderHomeScreen onNavigate={(screen) => setAppScreen(screen as AppScreen)} />;
      case 'available-records':
        return (
          <AvailableRecordsList
            onPurchase={(ids) => {
              setSelectedRecordIds(ids);
              setAppScreen('purchase-flow');
            }}
          />
        );
      case 'purchase-flow':
        return (
          <PurchaseFlow
            recordIds={selectedRecordIds}
            onComplete={(purchaseId) => {
              setSelectedPurchaseId(purchaseId);
              setAppScreen('purchase-detail');
            }}
            onBack={() => setAppScreen('available-records')}
          />
        );
      case 'purchases':
        return (
          <PurchasesList
            onViewPurchase={(id) => {
              setSelectedPurchaseId(id);
              setAppScreen('purchase-detail');
            }}
          />
        );
      case 'purchase-detail':
        return (
          <PurchaseDetail
            purchaseId={selectedPurchaseId!}
            onBack={() => setAppScreen('purchases')}
          />
        );
      case 'home':
      default:
        if (isTraderOrRefiner) {
          return <TraderHomeScreen onNavigate={(screen) => setAppScreen(screen as AppScreen)} />;
        }
        return <HomeScreen onNavigate={(screen) => setAppScreen(screen as AppScreen)} />;
    }
  };

  // Determine which tab is active
  const getActiveTab = () => {
    if (appScreen === 'sales-partners') return 'sales-partners';
    if (appScreen.startsWith('record')) return isTraderOrRefiner ? 'available-records' : 'records';
    if (appScreen.startsWith('purchase') || appScreen === 'purchase-flow') return 'purchases';
    if (appScreen === 'available-records') return 'available-records';
    if (appScreen === 'trader-home') return 'home';
    return appScreen;
  };
  const activeTab = getActiveTab();

  const traderTabs = [
    {
      label: t.nav.home,
      icon: '\u{1F3E0}',
      active: activeTab === 'home',
      onClick: () => setAppScreen('home'),
    },
    {
      label: t.nav.available,
      icon: '\u{1F50D}',
      active: activeTab === 'available-records',
      onClick: () => setAppScreen('available-records'),
    },
    {
      label: t.nav.purchases,
      icon: '\u{1F6D2}',
      active: activeTab === 'purchases',
      onClick: () => setAppScreen('purchases'),
    },
    {
      label: t.nav.profile,
      icon: '\u{1F464}',
      active: activeTab === 'profile',
      onClick: () => setAppScreen('profile'),
    },
  ];

  const minerTabs = [
    {
      label: t.nav.home,
      icon: '\u{1F3E0}',
      active: activeTab === 'home',
      onClick: () => setAppScreen('home'),
    },
    {
      label: t.nav.records,
      icon: '\u{1F4CB}',
      active: activeTab === 'records',
      onClick: () => setAppScreen('records'),
    },
    {
      label: t.nav.partners,
      icon: '\u{1F91D}',
      active: activeTab === 'sales-partners',
      onClick: () => setAppScreen('sales-partners'),
    },
    {
      label: t.nav.profile,
      icon: '\u{1F464}',
      active: activeTab === 'profile',
      onClick: () => setAppScreen('profile'),
    },
  ];

  // Initialize sync engine when user is logged in
  useEffect(() => {
    if (user) {
      initSyncEngine();
    }
    return () => teardownSyncEngine();
  }, [user]);

  return (
    <div className="app-shell">
      <SyncStatusBanner />
      <main className="main-content">{renderScreen()}</main>
      <BottomTabBar tabs={isTraderOrRefiner ? traderTabs : minerTabs} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FeatureFlagProvider>
        <I18nWrapper>
          <AppContent />
        </I18nWrapper>
      </FeatureFlagProvider>
    </AuthProvider>
  );
}
