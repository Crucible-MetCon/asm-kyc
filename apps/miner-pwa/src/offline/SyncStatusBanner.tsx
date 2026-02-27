import { useState, useEffect } from 'react';
import { useOnlineStatus } from './connectivity';
import { getPendingSyncCount } from './db';
import { useI18n } from '../i18n/I18nContext';

export type SyncState = 'online' | 'offline' | 'syncing' | 'error';

/**
 * Global event for sync engine to communicate state changes.
 * SyncStatusBanner listens for these to update its display.
 */
export const SYNC_STATE_EVENT = 'sync:state-change';

export function SyncStatusBanner() {
  const isOnline = useOnlineStatus();
  const { t } = useI18n();
  const [syncState, setSyncState] = useState<SyncState>(isOnline ? 'online' : 'offline');
  const [pendingCount, setPendingCount] = useState(0);

  // Listen for sync engine state events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ state: SyncState; pending?: number }>).detail;
      setSyncState(detail.state);
      if (detail.pending !== undefined) setPendingCount(detail.pending);
    };
    window.addEventListener(SYNC_STATE_EVENT, handler);
    return () => window.removeEventListener(SYNC_STATE_EVENT, handler);
  }, []);

  // Update state based on connectivity changes
  useEffect(() => {
    if (!isOnline) {
      setSyncState('offline');
    } else if (syncState === 'offline') {
      // Coming back online — check if there's pending work
      getPendingSyncCount().then((count) => {
        if (count > 0) {
          setPendingCount(count);
          setSyncState('syncing');
        } else {
          setSyncState('online');
        }
      });
    }
  }, [isOnline]);

  // Periodically check pending count when visible
  useEffect(() => {
    const check = async () => {
      const count = await getPendingSyncCount();
      setPendingCount(count);
      if (count === 0 && syncState === 'syncing') {
        setSyncState('online');
      }
    };
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [syncState]);

  // Don't render when online with nothing to sync
  if (syncState === 'online' && pendingCount === 0) {
    return null;
  }

  const handleRetry = () => {
    window.dispatchEvent(new CustomEvent('sync:retry'));
  };

  const bannerClass = `sync-banner sync-banner--${syncState}`;

  return (
    <div className={bannerClass} role="status" aria-live="polite">
      {syncState === 'offline' && (
        <>
          <span className="sync-banner__icon">&#x26A0;</span>
          <span>{t.sync.offline}</span>
        </>
      )}
      {syncState === 'syncing' && (
        <>
          <span className="sync-banner__icon sync-banner__icon--spin">&#x21BB;</span>
          <span>{t.sync.syncing.replace('{n}', String(pendingCount))}</span>
        </>
      )}
      {syncState === 'error' && (
        <>
          <span className="sync-banner__icon">&#x274C;</span>
          <span>{t.sync.error}</span>
          <button className="sync-banner__retry" onClick={handleRetry}>
            {t.sync.retry}
          </button>
        </>
      )}
    </div>
  );
}
