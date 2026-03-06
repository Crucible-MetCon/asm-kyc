import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthContext';
import { ApiError, apiFetch } from '../api/client';
import { COUNTERPARTY_TYPES, MANDATORY_DOCUMENT_TYPES } from '@asm-kyc/shared';
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
  Camera,
  CheckCircle,
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
  docType: string;
  labelKey: 'docNrc' | 'docMiningLicense' | 'docPassport' | 'docCooperativeCert';
  icon: LucideIcon;
  mandatory: boolean;
  roles?: string[];
}

const DOC_INFO: DocInfo[] = [
  { docType: 'NRC', labelKey: 'docNrc', icon: CreditCard, mandatory: true },
  { docType: 'MINING_LICENSE', labelKey: 'docMiningLicense', icon: Pickaxe, mandatory: true, roles: ['MINER_USER'] },
  { docType: 'PASSPORT', labelKey: 'docPassport', icon: BookOpen, mandatory: false },
  { docType: 'COOPERATIVE_CERT', labelKey: 'docCooperativeCert', icon: ScrollText, mandatory: false, roles: ['MINER_USER'] },
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
  const mandatoryDocs = relevantDocs.filter((d) => d.mandatory);
  const optionalDocs = relevantDocs.filter((d) => !d.mandatory);

  // Track selected document files for upload after registration
  const [docFiles, setDocFiles] = useState<Record<string, { dataUri: string; fileName: string }>>({});
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const handleDocFile = (docType: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setDocFiles(prev => ({ ...prev, [docType]: { dataUri: reader.result as string, fileName: file.name } }));
    };
    reader.readAsDataURL(file);
  };

  const removeDocFile = (docType: string) => {
    setDocFiles(prev => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });
  };

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

      // Upload any selected documents (user is now authenticated)
      const docEntries = Object.entries(docFiles);
      if (docEntries.length > 0) {
        setUploadingDocs(true);
        for (const [docType, { dataUri }] of docEntries) {
          try {
            await apiFetch(`/documents/${docType}`, {
              method: 'POST',
              body: JSON.stringify({ image_data: dataUri }),
            });
          } catch {
            // Non-critical — user can re-upload from Profile later
          }
        }
        setUploadingDocs(false);
      }
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
          <img src="/favicon.svg" alt="Gold Trace" className="auth-logo" />
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

        {/* ── Section 3: Document Upload ── */}
        <div className="form-group">
          <label>{t.auth.documentsNeeded}</label>
          <div className="doc-info-card">
            <div className="doc-info-security">
              <Shield size={16} />
              <span>{t.auth.documentsNeededHint}</span>
            </div>
            <p style={{ fontSize: 12, color: '#888', margin: '8px 0 0' }}>
              {t.auth.docsCanCompleteLater || 'You can also complete this later in your Profile.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {mandatoryDocs.map((doc) => {
              const DocIcon = doc.icon;
              const selected = docFiles[doc.docType];
              return (
                <div
                  key={doc.docType}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: 10, borderRadius: 10,
                    border: selected ? '1px solid var(--color-success)' : '1px solid var(--color-error)',
                    background: selected ? '#f0fdf4' : '#fff',
                  }}
                >
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 8,
                    background: selected ? '#dcfce7' : '#fef2f2',
                    color: selected ? 'var(--color-success)' : 'var(--color-error)',
                  }}>
                    {selected ? <CheckCircle size={18} /> : <DocIcon size={18} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {t.auth[doc.labelKey]}
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-error)', textTransform: 'uppercase' }}>
                        {t.documents?.required || 'Required'}
                      </span>
                    </div>
                    {selected ? (
                      <div style={{ fontSize: 11, color: 'var(--color-success)' }}>
                        {selected.fileName}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#999' }}>
                        {t.auth.tapToUpload || 'Tap to upload or take photo'}
                      </div>
                    )}
                  </div>
                  {selected ? (
                    <button
                      type="button"
                      onClick={() => removeDocFile(doc.docType)}
                      style={{
                        background: 'none', border: '1px solid #ccc', borderRadius: 6,
                        padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: '#666',
                      }}
                    >
                      {t.common.cancel}
                    </button>
                  ) : (
                    <label style={{
                      cursor: 'pointer', background: 'var(--color-gold)', color: '#fff',
                      padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <Camera size={14} />
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDocFile(doc.docType, file);
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
                      />
                      {t.auth.upload || 'Upload'}
                    </label>
                  )}
                </div>
              );
            })}

            {optionalDocs.map((doc) => {
              const DocIcon = doc.icon;
              const selected = docFiles[doc.docType];
              return (
                <div
                  key={doc.docType}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: 10, borderRadius: 10,
                    border: selected ? '1px solid var(--color-success)' : '1px solid #e5e7eb',
                    background: selected ? '#f0fdf4' : '#fff',
                  }}
                >
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 8,
                    background: selected ? '#dcfce7' : '#f3f4f6',
                    color: selected ? 'var(--color-success)' : '#999',
                  }}>
                    {selected ? <CheckCircle size={18} /> : <DocIcon size={18} />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {t.auth[doc.labelKey]}
                      <span style={{ fontSize: 10, color: '#999' }}>{t.documents?.optional || 'Optional'}</span>
                    </div>
                    {selected ? (
                      <div style={{ fontSize: 11, color: 'var(--color-success)' }}>{selected.fileName}</div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#999' }}>{t.auth.tapToUpload || 'Tap to upload or take photo'}</div>
                    )}
                  </div>
                  {selected ? (
                    <button
                      type="button"
                      onClick={() => removeDocFile(doc.docType)}
                      style={{
                        background: 'none', border: '1px solid #ccc', borderRadius: 6,
                        padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: '#666',
                      }}
                    >
                      {t.common.cancel}
                    </button>
                  ) : (
                    <label style={{
                      cursor: 'pointer', background: '#e5e7eb', color: '#555',
                      padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <Camera size={14} />
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleDocFile(doc.docType, file);
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
                      />
                      {t.auth.upload || 'Upload'}
                    </label>
                  )}
                </div>
              );
            })}
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

        <button type="submit" className="btn btn-primary btn-full" disabled={submitting || uploadingDocs}>
          {uploadingDocs
            ? (t.auth.uploadingDocuments || 'Uploading documents...')
            : submitting
              ? t.auth.creatingAccount
              : t.auth.createAccount}
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
