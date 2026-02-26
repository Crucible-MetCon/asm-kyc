import { useAuth } from '../auth/AuthContext';
import { useI18n, interpolate } from '../i18n/I18nContext';
import { PlaceholderCard } from './PlaceholderCard';

interface Props {
  onNavigate: (screen: string) => void;
}

export function HomeScreen({ onNavigate }: Props) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const needsOnboarding = !user?.profile?.profile_completed_at;

  return (
    <div className="home-screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>
            {interpolate(t.home.greeting, {
              name: user?.profile?.full_name || user?.username || '',
            })}
          </h1>
          <p className="subtitle">
            {user?.role === 'TRADER_USER' ? t.home.traderDashboard : t.home.minerDashboard}
          </p>
        </div>
        <button className="btn btn-text" onClick={logout} style={{ fontSize: 14 }}>
          {t.auth.signOut}
        </button>
      </div>

      {needsOnboarding && (
        <div
          className="card"
          style={{ marginTop: 16, borderColor: 'var(--color-gold)', cursor: 'pointer' }}
          onClick={() => onNavigate('onboarding')}
        >
          <span className="card-icon">&#9888;&#65039;</span>
          <div className="card-content">
            <div className="card-title">{t.home.completeProfile}</div>
          </div>
        </div>
      )}

      <div className="card-grid">
        <PlaceholderCard
          title={t.home.myProfile}
          icon="👤"
          subtitle={t.home.viewProfile}
          onClick={() => onNavigate('profile')}
        />
        <PlaceholderCard
          title={t.home.newRecord}
          icon="➕"
          subtitle={t.home.createRecord}
          onClick={() => onNavigate('record-create')}
        />
        <PlaceholderCard
          title={t.home.myRecords}
          icon="📋"
          subtitle={t.home.viewRecords}
          onClick={() => onNavigate('records')}
        />
      </div>
    </div>
  );
}
