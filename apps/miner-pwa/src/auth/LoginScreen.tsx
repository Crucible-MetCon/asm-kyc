import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthContext';
import { ApiError } from '../api/client';

interface Props {
  onSwitchToRegister: () => void;
}

export function LoginScreen({ onSwitchToRegister }: Props) {
  const { login } = useAuth();
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
        setError(body?.message || 'Invalid credentials');
      } else {
        setError('Connection error. Please try again.');
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
          <p>Sign in to your account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="username">Username</label>
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
          <label htmlFor="password">Password</label>
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
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>

        <div className="auth-footer">
          <button type="button" className="btn btn-text" onClick={onSwitchToRegister}>
            Don't have an account? Register
          </button>
        </div>
      </form>
    </div>
  );
}
