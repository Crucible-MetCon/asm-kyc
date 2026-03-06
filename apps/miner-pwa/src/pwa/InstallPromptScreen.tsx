import { useI18n } from '../i18n/I18nContext';
import { Download, Share2 } from 'lucide-react';

interface Props {
  onContinue: () => void;
  onInstall: () => Promise<void>;
  isIos: boolean;
  hasNativePrompt: boolean;
}

export function InstallPromptScreen({ onContinue, onInstall, isIos, hasNativePrompt }: Props) {
  const { t } = useI18n();

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <img src="/favicon.svg" alt="Gold Trace" width={64} height={64} />
            </div>
            <h1 className="login-title">{t.install.title}</h1>
            <p className="login-subtitle">{t.install.subtitle}</p>
          </div>

          <div style={{ marginTop: 24 }}>
            {isIos ? (
              <>
                <div className="install-steps">
                  <div className="install-step">
                    <span className="install-step-number">1</span>
                    <span>
                      {t.install.iosStep1} <Share2 size={16} style={{ verticalAlign: 'middle' }} />
                    </span>
                  </div>
                  <div className="install-step">
                    <span className="install-step-number">2</span>
                    <span>{t.install.iosStep2}</span>
                  </div>
                  <div className="install-step">
                    <span className="install-step-number">3</span>
                    <span>{t.install.iosStep3}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  style={{ marginTop: 16 }}
                  onClick={onContinue}
                >
                  {t.install.iosContinue}
                </button>
              </>
            ) : hasNativePrompt ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  onClick={onInstall}
                >
                  <Download size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  {t.install.installButton}
                </button>
                <button
                  type="button"
                  className="btn btn-text btn-full"
                  style={{ marginTop: 12 }}
                  onClick={onContinue}
                >
                  {t.install.skipButton}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-full"
                onClick={onContinue}
              >
                {t.install.skipButton}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
