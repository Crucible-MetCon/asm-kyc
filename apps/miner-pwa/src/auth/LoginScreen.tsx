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
    <div className="screen screen-centered">
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 400 }}>
        <div className="auth-header">
          <img src="/favicon.svg" alt="ASM Gold Trace" className="auth-logo" />
          <h1>ASM Gold Trace</h1>
          <p>{t.auth.signInSubtitle}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="username">{t.auth.username}</label>
          <input
            id="username"
            type="text"
            className="form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">{t.auth.password}</label>
          <input
            id="password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
          {submitting ? t.auth.signingIn : t.auth.signIn}
        </button>

        <div className="auth-footer">
          <button type="button" className="btn btn-text" onClick={onSwitchToRegister}>
            {t.auth.noAccount}
          </button>
        </div>
      </form>
    </div>
  );
}
