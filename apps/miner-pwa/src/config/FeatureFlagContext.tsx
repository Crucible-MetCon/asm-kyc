import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiFetch } from '../api/client';
import type { FeatureFlagsResponse } from '@asm-kyc/shared';

interface FeatureFlags {
  yellowcard_enabled: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  yellowcard_enabled: false,
};

const FeatureFlagContext = createContext<FeatureFlags>(DEFAULT_FLAGS);

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);

  useEffect(() => {
    apiFetch<FeatureFlagsResponse>('/feature-flags')
      .then((data) => {
        setFlags({
          yellowcard_enabled: data.yellowcard_enabled,
        });
      })
      .catch(() => {
        // Fallback to defaults — payments disabled
      });
  }, []);

  return (
    <FeatureFlagContext.Provider value={flags}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlags {
  return useContext(FeatureFlagContext);
}
