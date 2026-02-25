import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthContext';
import { ApiError } from '../api/client';
import { COUNTERPARTY_TYPES } from '@asm-kyc/shared';

interface Props {
  onSwitchToLogin: () => void;
}

const COUNTERPARTY_LABELS: Record<string, string> = {
  INDIVIDUAL_ASM: 'Individual ASM Miner',
  COOPERATIVE: 'Cooperative',
  SMALL_SCALE_OPERATOR: 'Small-Scale Operator',
  TRADER_AGGREGATOR: 'Trader / Aggregator',
};

export function RegisterScreen({ onSwitchToLogin }: Props) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    username: '',
    password: '',
    phone_e164: '',
    full_name: '',
    counterparty_type: 'INDIVIDUAL_ASM',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string | unknown[] } | null;
        if (typeof body?.message === 'string') {
          setError(body.message);
        } else if (Array.isArray(body?.message)) {
          const issues = body.message as { message: string }[];
          setError(issues.map((i) => i.message).join('. '));
        } else {
          setError('Registration failed. Please check your details.');
        }
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
          <h1>Create Account</h1>
          <p>Register as a miner or trader</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="full_name">Full Name</label>
          <input
            id="full_name"
            type="text"
            className="form-input"
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-username">Username</label>
          <input
            id="reg-username"
            type="text"
            className="form-input"
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone (E.164 format)</label>
          <input
            id="phone"
            type="tel"
            className="form-input"
            placeholder="+260971234567"
            value={form.phone_e164}
            onChange={(e) => update('phone_e164', e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            className="form-input"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="counterparty_type">Type</label>
          <select
            id="counterparty_type"
            className="form-select"
            value={form.counterparty_type}
            onChange={(e) => update('counterparty_type', e.target.value)}
          >
            {COUNTERPARTY_TYPES.map((ct) => (
              <option key={ct} value={ct}>
                {COUNTERPARTY_LABELS[ct] || ct}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create Account'}
        </button>

        <div className="auth-footer">
          <button type="button" className="btn btn-text" onClick={onSwitchToLogin}>
            Already have an account? Sign in
          </button>
        </div>
      </form>
    </div>
  );
}
