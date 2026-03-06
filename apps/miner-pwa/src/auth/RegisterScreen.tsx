import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthContext';
import { ApiError } from '../api/client';
import { COUNTERPARTY_TYPES } from '@asm-kyc/shared';
import { useI18n, type Language } from '../i18n/I18nContext';
import {
  Pickaxe,
  Package,
  Flame,
  Factory,
  ArrowLeftRight,
  FlaskConical,
  CreditCard,
  BookOpen,
  ScrollText,
  Shield,
  type LucideIcon,
} from 'lucide-react';

interface Props {
  onSwitchToLogin: () => void;
}

const LANGUAGE_OPTIONS: { code: Language; nativeName: string }[] = [
  { code: 'en', nativeName: 'English' },
  { code: 'bem', nativeName: 'Ichibemba' },
  { code: 'ton', nativeName: 'Chitonga' },
  { code: 'nya', nativeName: 'Chinyanja' },
  { code: 'zh', nativeName: '简体中文' },
];

const ROLE_OPTIONS: { value: string; labelKey: 'roleMiner' | 'roleTrader' | 'roleAggregator' | 'roleRefiner' | 'roleMelter' | 'roleProcessor'; descKey: 'roleDescMiner' | 'roleDescTrader' | 'roleDescAggregator' | 'roleDescRefiner' | 'roleDescMelter' | 'roleDescProcessor'; icon: LucideIcon }[] = [
  { value: 'MINER_USER', labelKey: 'roleMiner', descKey: 'roleDescMiner', icon: Pickaxe },
  { value: 'AGGREGATOR_USER', labelKey: 'roleAggregator', descKey: 'roleDescAggregator', icon: Package },
  { value: 'MELTER_USER', labelKey: 'roleMelter', descKey: 'roleDescMelter', icon: Flame },
  { value: 'PROCESSOR_USER', labelKey: 'roleProcessor', descKey: 'roleDescProcessor', icon: Factory },
  { value: 'TRADER_USER', labelKey: 'roleTrader', descKey: 'roleDescTrader', icon: ArrowLeftRight },
  { value: 'REFINER_USER', labelKey: 'roleRefiner', descKey: 'roleDescRefiner', icon: FlaskConical },
];

interface DocInfo {
  labelKey: 'docNrc' | 'docMiningLicense' | 'docPassport' | 'docCooperativeCert';
  icon: LucideIcon;
  required: boolean;
  roles?: string[];
}

const DOC_INFO: DocInfo[] = [
  { labelKey: 'docNrc', icon: CreditCard, required: true },
  { labelKey: 'docMiningLicense', icon: Pickaxe, required: false, roles: ['MINER_USER'] },
  { labelKey: 'docPassport', icon: BookOpen, required: false },
  { labelKey: 'docCooperativeCert', icon: ScrollText, required: false, roles: ['MINER_USER'] },
];

export function RegisterScreen({ onSwitchToLogin }: Props) {
  const { register } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [form, setForm] = useState({
    username: '',
    password: '',
    phone_e164: '',
    full_name: '',
    preferred_name: '',
    counterparty_type: 'INDIVIDUAL_ASM',
    role: 'MINER_USER',
    home_language: 'en',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLanguageSelect = (code: Language) => {
    setLang(code);
    update('home_language', code);
  };

  const isMiner = form.role === 'MINER_USER';

  const relevantDocs = DOC_INFO.filter(
    (d) => !d.roles || d.roles.includes(form.role),
  );
  const requiredDocs = relevantDocs.filter((d) => d.required);
  const optionalDocs = relevantDocs.filter((d) => !d.required);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({
        ...form,
        preferred_name: form.preferred_name || undefined,
        counterparty_type: isMiner ? form.counterparty_type : 'TRADER_AGGREGATOR',
      });
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { message?: string | unknown[] } | null;
        if (typeof body?.message === 'string') {
          setError(body.message);
        } else if (Array.isArray(body?.message)) {
          const issues = body.message as { message: string }[];
          setError(issues.map((i) => i.message).join('. '));
        } else {
          setError(t.auth.registrationFailed);
        }
      } else {
        setError(t.auth.connectionError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="screen screen-centered">
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 440 }}>
        <div className="auth-header">
          <img src="/favicon.svg" alt="ASM Gold Trace" className="auth-logo" />
          <h1>{t.auth.createAccount}</h1>
          <p>{t.auth.registerSubtitle}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* ── Section 1: Language Selection ── */}
        <div className="form-group">
          <label>{t.auth.selectLanguage}</label>
          <div className="language-grid">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                className={`language-option${lang === opt.code ? ' language-option-active' : ''}`}
                onClick={() => handleLanguageSelect(opt.code)}
              >
                {opt.nativeName}
              </button>
            ))}
          </div>
        </div>

        {/* ── Section 2: Role Selection ── */}
        <div className="form-group">
          <label>{t.auth.selectRole}</label>
          <div className="role-card-list">
            {ROLE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = form.role === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`role-card${isActive ? ' role-card-active' : ''}`}
                  onClick={() => update('role', opt.value)}
                >
                  <span className="role-card-icon">
                    <Icon size={22} strokeWidth={2} />
                  </span>
                  <span className="role-card-info">
                    <span className="role-card-name">{t.auth[opt.labelKey]}</span>
                    <span className="role-card-desc">{t.auth[opt.descKey]}</span>
                  </span>
                  <span className={`role-card-radio${isActive ? ' role-card-radio-active' : ''}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Section 3: Document Info ── */}
        <div className="form-group">
          <label>{t.auth.documentsNeeded}</label>
          <div className="doc-info-card">
            <div className="doc-info-security">
              <Shield size={16} />
              <span>{t.auth.documentsNeededHint}</span>
            </div>

            {requiredDocs.length > 0 && (
              <div className="doc-info-section">
                <span className="doc-info-label">{t.auth.requiredDocuments}</span>
                {requiredDocs.map((doc) => {
                  const DocIcon = doc.icon;
                  return (
                    <div key={doc.labelKey} className="doc-info-row">
                      <DocIcon size={16} />
                      <span>{t.auth[doc.labelKey]}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {optionalDocs.length > 0 && (
              <div className="doc-info-section">
                <span className="doc-info-label">{t.auth.optionalDocuments}</span>
                {optionalDocs.map((doc) => {
                  const DocIcon = doc.icon;
                  return (
                    <div key={doc.labelKey} className="doc-info-row">
                      <DocIcon size={16} />
                      <span>{t.auth[doc.labelKey]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Section 4: Registration Fields ── */}
        <div className="form-group">
          <label htmlFor="full_name">{t.auth.fullName}</label>
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
          <label htmlFor="preferred_name">
            {t.auth.preferredName}
            <span className="form-hint"> — {t.auth.preferredNameHint}</span>
          </label>
          <input
            id="preferred_name"
            type="text"
            className="form-input"
            value={form.preferred_name}
            onChange={(e) => update('preferred_name', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-username">{t.auth.username}</label>
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
          <label htmlFor="phone">{t.auth.phone}</label>
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
          <label htmlFor="reg-password">{t.auth.password}</label>
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

        {isMiner && (
          <div className="form-group">
            <label htmlFor="counterparty_type">{t.auth.type}</label>
            <select
              id="counterparty_type"
              className="form-select"
              value={form.counterparty_type}
              onChange={(e) => update('counterparty_type', e.target.value)}
            >
              {COUNTERPARTY_TYPES.map((ct) => (
                <option key={ct} value={ct}>
                  {t.counterpartyType[ct]}
                </option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
          {submitting ? t.auth.creatingAccount : t.auth.createAccount}
        </button>

        <div className="auth-footer">
          <button type="button" className="btn btn-text" onClick={onSwitchToLogin}>
            {t.auth.alreadyHaveAccount}
          </button>
        </div>
      </form>
    </div>
  );
}
