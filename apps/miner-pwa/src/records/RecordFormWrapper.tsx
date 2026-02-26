import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { useI18n } from '../i18n/I18nContext';
import type { RecordResponse } from '@asm-kyc/shared';
import { RecordForm } from './RecordForm';

interface Props {
  recordId: string;
  onSaved: (record: RecordResponse) => void;
  onBack: () => void;
}

export function RecordFormWrapper({ recordId, onSaved, onBack }: Props) {
  const { t } = useI18n();
  const [record, setRecord] = useState<RecordResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<RecordResponse>(`/records/${recordId}`)
      .then(setRecord)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [recordId]);

  if (loading) {
    return <div className="screen"><div className="loading-text">{t.common.loading}</div></div>;
  }

  if (!record) {
    return (
      <div className="screen">
        <button type="button" className="back-button" onClick={onBack}>← {t.common.back}</button>
        <p>Record not found</p>
      </div>
    );
  }

  return <RecordForm record={record} onSaved={onSaved} onBack={onBack} />;
}
