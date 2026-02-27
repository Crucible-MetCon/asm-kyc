import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useI18n, interpolate } from '../i18n/I18nContext';
import { apiFetch, NetworkError } from '../api/client';
import { setListCache, getListCache } from '../offline/db';
import type { PurchaseListResponse, PurchaseListItem } from '@asm-kyc/shared';
import { PlaceholderCard } from '../home/PlaceholderCard';

interface Props {
  onNavigate: (screen: string) => void;
}

export function TraderHomeScreen({ onNavigate }: Props) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [totalWeight, setTotalWeight] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch<PurchaseListResponse>('/purchases');
        setTotalPurchases(data.total);
        const weight = data.purchases.reduce((sum, p) => sum + p.total_weight, 0);
        setTotalWeight(weight);
        await setListCache('purchases-list', data.purchases);
      } catch (err) {
        if (err instanceof NetworkError) {
          const cached = await getListCache<PurchaseListItem[]>('purchases-list');
          if (cached) {
            setTotalPurchases(cached.length);
            const weight = cached.reduce((sum, p) => sum + p.total_weight, 0);
            setTotalWeight(weight);
          }
        }
      }
    };
    load();
  }, []);

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
          <p className="subtitle">{user?.role === 'REFINER_USER' ? t.trader.refinerDashboard : t.trader.dashboard}</p>
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

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{totalPurchases}</div>
          <div className="stat-label">{t.trader.totalPurchases}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalWeight.toFixed(1)}g</div>
          <div className="stat-label">{t.trader.totalWeightPurchased}</div>
        </div>
      </div>

      <div className="card-grid">
        <PlaceholderCard
          title={t.trader.browseAvailable}
          icon="🔍"
          subtitle={t.trader.browseSubtitle}
          onClick={() => onNavigate('available-records')}
        />
        <PlaceholderCard
          title={t.trader.myPurchases}
          icon="🛒"
          subtitle={t.trader.viewPurchases}
          onClick={() => onNavigate('purchases')}
        />
        <PlaceholderCard
          title={t.home.myProfile}
          icon="👤"
          subtitle={t.home.viewProfile}
          onClick={() => onNavigate('profile')}
        />
      </div>
    </div>
  );
}
