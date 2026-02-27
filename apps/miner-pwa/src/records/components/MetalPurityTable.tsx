import { useI18n } from '../../i18n/I18nContext';

interface PurityEntry {
  element: string;
  purity: number;
}

interface Props {
  purities: PurityEntry[];
  onChange: (purities: PurityEntry[]) => void;
  readOnly?: boolean;
}

const COMMON_ELEMENTS = ['Au', 'Ag', 'Cu', 'Pt', 'Pd', 'Fe', 'Zn', 'Ni'];

export function MetalPurityTable({ purities, onChange, readOnly = false }: Props) {
  const { t } = useI18n();

  const handleElementChange = (index: number, element: string) => {
    const updated = [...purities];
    updated[index] = { ...updated[index], element };
    onChange(updated);
  };

  const handlePurityChange = (index: number, purity: string) => {
    const updated = [...purities];
    updated[index] = { ...updated[index], purity: parseFloat(purity) || 0 };
    onChange(updated);
  };

  const addRow = () => {
    if (purities.length >= 5) return;
    const usedElements = purities.map((p) => p.element);
    const nextElement = COMMON_ELEMENTS.find((e) => !usedElements.includes(e)) || 'Au';
    onChange([...purities, { element: nextElement, purity: 0 }]);
  };

  const removeRow = (index: number) => {
    onChange(purities.filter((_, i) => i !== index));
  };

  return (
    <div style={{ marginTop: 8 }}>
      <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>
        {t.vision.metalPurities}
      </label>

      {purities.length === 0 && !readOnly && (
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
          {t.vision.noPurities}
        </div>
      )}

      {purities.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
          {readOnly ? (
            <span style={{
              width: 50, fontWeight: 700, fontSize: 14, textAlign: 'center',
              color: p.element === 'Au' ? '#b45309' : '#374151',
            }}>
              {p.element}
            </span>
          ) : (
            <select
              className="form-input"
              style={{ width: 70, padding: '6px 4px' }}
              value={p.element}
              onChange={(e) => handleElementChange(i, e.target.value)}
            >
              {COMMON_ELEMENTS.map((el) => (
                <option key={el} value={el}>{el}</option>
              ))}
            </select>
          )}
          {readOnly ? (
            <span style={{ flex: 1, fontSize: 14 }}>{p.purity.toFixed(2)}%</span>
          ) : (
            <input
              type="number"
              className="form-input"
              style={{ flex: 1, padding: '6px 8px' }}
              value={p.purity || ''}
              onChange={(e) => handlePurityChange(i, e.target.value)}
              min="0"
              max="100"
              step="0.01"
              placeholder="0.00"
            />
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={() => removeRow(i)}
              style={{
                width: 28, height: 28, borderRadius: '50%', border: '1px solid #ef4444',
                color: '#ef4444', background: 'none', cursor: 'pointer', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {!readOnly && purities.length < 5 && (
        <button type="button" className="btn btn-secondary" style={{ fontSize: 13, marginTop: 4 }} onClick={addRow}>
          + {t.vision.addElement}
        </button>
      )}
    </div>
  );
}
