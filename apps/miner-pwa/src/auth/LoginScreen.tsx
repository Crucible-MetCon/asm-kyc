import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthContext';
import { ApiError } from '../api/client';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  onSwitchToRegister: () => void;
}

export function LoginScreen({ onSwitchToRegister }: Props) {
  const { login } = useAuth();
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string } | null;
        setError(body?.message || t.auth.invalidCredentials);
      } else {
        setError(t.auth.connectionError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          {/* Brand header */}
          <div className="login-brand">
            <img src="/favicon.svg" alt="" className="login-logo" aria-hidden="true" />
            <h1 className="login-title">ASM Gold Trace</h1>
            <p className="login-subtitle">{t.auth.signInSubtitle}</p>
            <div className="login-trust">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span>Secure access · Audit logged</span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="login-error" role="alert" id="login-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label htmlFor="login-username">{t.auth.username}</label>
              <input
                id="login-username"
                type="text"
                className={`login-input${error ? ' login-input-error' : ''}`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                aria-describedby={error ? 'login-error' : undefined}
                placeholder="Enter username"
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">{t.auth.password}</label>
              <div className="login-password-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`login-input login-input-password${error ? ' login-input-error' : ''}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  aria-describedby={error ? 'login-error' : undefined}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={submitting || !username || !password}
            >
              {submitting ? (
                <>
                  <span className="login-spinner" aria-hidden="true" />
                  {t.auth.signingIn}
                </>
              ) : (
                t.auth.signIn
              )}
            </button>
          </form>

          {/* Secondary actions */}
          <div className="login-secondary">
            <button type="button" className="login-register-link" onClick={onSwitchToRegister}>
              {t.auth.noAccount}
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="login-footer">
          <a
            href={import.meta.env.DEV ? 'http://127.0.0.1:5174/admin/' : '/admin/'}
            className="login-admin-link"
          >
            Admin Portal
          </a>
          <span className="login-footer-sep">·</span>
          <span className="login-copyright">© {new Date().getFullYear()} ASM Gold Trace</span>
        </footer>
      </div>
    </div>
  );
}
