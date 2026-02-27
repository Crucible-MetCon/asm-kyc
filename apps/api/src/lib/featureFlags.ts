/**
 * Feature flags — reads environment variables.
 * YELLOWCARD_ENABLED defaults to false.
 */
export const featureFlags = {
  get yellowCardEnabled(): boolean {
    return process.env.YELLOWCARD_ENABLED === 'true';
  },
};
