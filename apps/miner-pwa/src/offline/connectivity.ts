import { useState, useEffect, useSyncExternalStore, useCallback } from 'react';

/* ══════════════════════════════════════════
   Online/Offline status hook
   ══════════════════════════════════════════ */

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

/**
 * Returns true when the browser reports connectivity.
 * Updates in real-time via online/offline events.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
