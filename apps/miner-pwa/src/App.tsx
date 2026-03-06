import { useState, useEffect, useRef, type ReactNode } from 'react';
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
import { SurveyListScreen } from './surveys/SurveyListScreen';
import { SurveyFlow } from './surveys/SurveyFlow';
import { SyncStatusBanner } from './offline/SyncStatusBanner';
import { initSyncEngine, teardownSyncEngine } from './offline/syncEngine';
import { FeatureFlagProvider } from './config/FeatureFlagContext';
import { InstallPromptScreen } from './pwa/InstallPromptScreen';
import { usePwaInstall } from './hooks/usePwaInstall';
import { MANDATORY_DOCUMENT_TYPES } from '@asm-kyc/shared';
import {
  Home,
  ClipboardList,
  FileText,
  Handshake,
  User,
  Search,
  ShoppingCart,
  Shield,
} from 'lucide-react';

type AuthScreen = 'login' | 'register';
type AppScreen =
  | 'home' | 'records' | 'profile' | 'onboarding' | 'record-create' | 'record-detail' | 'record-edit'
  | 'trader-home' | 'available-records' | 'purchase-flow' | 'purchases' | 'purchase-detail'
  | 'mine-sites'
  | 'sales-partners'
  | 'surveys' | 'survey-flow';

const VALID_LANGS: Language[] = ['en', 'bem', 'ton', 'nya', 'zh'];

function I18nWrapper({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const profileLang = user?.profile?.home_language;
  const lang: Language = VALID_LANGS.includes(profileLang as Language) ? (profileLang as Language) : 'en';
  return <I18nProvider initialLang={lang}>{children}</I18nProvider>;
}

function AppContent() {
  const { user, loading, refreshUser, logout } = useAuth();
  const { t } = useI18n();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [appScreen, setAppScreen] = useState<AppScreen>('home');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [selectedSurveySlug, setSelectedSurveySlug] = useState<string | null>(null);
  const [surveyRefreshKey, setSurveyRefreshKey] = useState(0);
  const [installPromptDismissed, setInstallPromptDismissed] = useState(false);
  const wasOnRegisterRef = useRef(false);
  const { deferredPrompt, isInstalled, isIos, canPrompt, promptInstall } = usePwaInstall();

  const isTraderOrRefiner = user?.role === 'TRADER_USER' || user?.role === 'REFINER_USER'
    || user?.role === 'AGGREGATOR_USER' || user?.role === 'MELTER_USER' || user?.role === 'PROCESSOR_USER';
  const isMiner = user?.role === 'MINER_USER';

  // LBMA compliance: check if mandatory documents have been uploaded
  const uploadedDocs = user?.uploaded_doc_types ?? [];
  const hasMandatoryDocs = MANDATORY_DOCUMENT_TYPES.every(dt => uploadedDocs.includes(dt));

  // Initialize sync engine when user is logged in
  // MUST be before any early returns to satisfy Rules of Hooks
  useEffect(() => {
    if (user) {
      initSyncEngine();
    }
    return () => teardownSyncEngine();
  }, [user]);

  if (loading) {
    return <div className="screen-centered">{t.common.loading}</div>;
  }

  if (!user) {
    wasOnRegisterRef.current = authScreen === 'register';
    return authScreen === 'register' ? (
      <RegisterScreen onSwitchToLogin={() => setAuthScreen('login')} />
    ) : (
      <LoginScreen onSwitchToRegister={() => setAuthScreen('register')} />
    );
  }

  // Show PWA install prompt after registration (once only)
  const showInstallPrompt =
    wasOnRegisterRef.current
    && !installPromptDismissed
    && !isInstalled
    && canPrompt
    && !localStorage.getItem('pwa-install-dismissed');

  if (showInstallPrompt) {
    const dismiss = () => {
      setInstallPromptDismissed(true);
      localStorage.setItem('pwa-install-dismissed', '1');
      wasOnRegisterRef.current = false;
    };
    return (
      <InstallPromptScreen
        isIos={isIos}
        hasNativePrompt={!!deferredPrompt}
        onContinue={dismiss}
        onInstall={async () => {
          await promptInstall();
          dismiss();
        }}
      />
    );
  }

  // Admin users should use the admin panel, not the miner PWA
  // In dev mode, admin-web runs on port 5174; in production it's at /admin/ on the same host
  const adminPanelUrl = import.meta.env.DEV ? 'http://127.0.0.1:5174/admin/' : '/admin/';

  if (user.role === 'ADMIN_USER') {
    return (
      <div className="screen screen-centered">
        <div style={{ textAlign: 'center', maxWidth: 360, padding: '0 16px' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-lg)', color: 'var(--color-gold)' }}>
              <Shield size={32} />
            </div>
          </div>
          <h1 style={{ color: 'var(--color-gold)', marginBottom: 8 }}>Admin Account</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
            {t.common.adminRedirect || 'This app is for miners and traders. Please use the Admin Panel to manage the system.'}
          </p>
          <a
            href={adminPanelUrl}
            className="btn btn-primary btn-full"
            style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}
          >
            Go to Admin Panel
          </a>
          <button
            type="button"
            className="btn btn-text"
            style={{ marginTop: 16, width: '100%' }}
            onClick={() => logout()}
          >
            Sign out and switch account
          </button>
        </div>
      </div>
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
      // Surveys
      case 'surveys':
        return (
          <SurveyListScreen
            key={surveyRefreshKey}
            onStartSurvey={(slug) => {
              setSelectedSurveySlug(slug);
              setAppScreen('survey-flow');
            }}
          />
        );
      case 'survey-flow':
        return (
          <SurveyFlow
            slug={selectedSurveySlug!}
            onComplete={() => {
              setSurveyRefreshKey(k => k + 1);
              setAppScreen('surveys');
            }}
            onBack={() => setAppScreen('surveys')}
          />
        );
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
        return <HomeScreen onNavigate={(screen) => setAppScreen(screen as AppScreen)} hasMandatoryDocs={hasMandatoryDocs} />;
    }
  };

  // Determine which tab is active
  const getActiveTab = () => {
    if (appScreen === 'sales-partners') return 'sales-partners';
    if (appScreen === 'surveys' || appScreen === 'survey-flow') return 'surveys';
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
      icon: Home,
      active: activeTab === 'home',
      onClick: () => setAppScreen('home'),
    },
    {
      label: t.nav.available,
      icon: Search,
      active: activeTab === 'available-records',
      onClick: () => setAppScreen('available-records'),
    },
    {
      label: t.nav.purchases,
      icon: ShoppingCart,
      active: activeTab === 'purchases',
      onClick: () => setAppScreen('purchases'),
    },
    {
      label: t.nav.profile,
      icon: User,
      active: activeTab === 'profile',
      onClick: () => setAppScreen('profile'),
      badge: !hasMandatoryDocs ? 'error' as const : undefined,
    },
  ];

  const minerTabs = [
    {
      label: t.nav.home,
      icon: Home,
      active: activeTab === 'home',
      onClick: () => setAppScreen('home'),
    },
    {
      label: t.nav.records,
      icon: ClipboardList,
      active: activeTab === 'records',
      onClick: () => setAppScreen('records'),
    },
    {
      label: t.nav.surveys,
      icon: FileText,
      active: activeTab === 'surveys',
      onClick: () => setAppScreen('surveys'),
    },
    {
      label: t.nav.partners,
      icon: Handshake,
      active: activeTab === 'sales-partners',
      onClick: () => setAppScreen('sales-partners'),
    },
    {
      label: t.nav.profile,
      icon: User,
      active: activeTab === 'profile',
      onClick: () => setAppScreen('profile'),
      badge: !hasMandatoryDocs ? 'error' as const : undefined,
    },
  ];

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
