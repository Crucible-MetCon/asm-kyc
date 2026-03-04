import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import type { AdminSurveyListResponse, AdminSurveyStatsResponse } from '@asm-kyc/shared';

const SURVEY_LABELS: Record<string, string> = {
  'about-you': 'About You',
  'mining-operation': 'Your Mining Operation',
  'environmental-practices': 'Environmental Practices',
  'safety-rights': 'Safety & Rights',
  'gold-journey': 'Your Gold Journey',
  'governance-compliance': 'Governance & Compliance',
};

export function SurveyManagementScreen() {
  const [data, setData] = useState<AdminSurveyListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<AdminSurveyListResponse>('/admin/surveys');
      setData(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurveys();
  }, []);

  const handleEdit = (survey: AdminSurveyStatsResponse) => {
    setEditingId(survey.id);
    setEditValue(String(survey.reward_amount));
  };

  const handleSave = async (id: string) => {
    const amount = parseFloat(editValue);
    if (isNaN(amount) || amount < 0 || amount > 100) {
      alert('Reward must be between 0 and 100');
      return;
    }

    setSaving(true);
    try {
      await apiFetch(`/admin/surveys/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ reward_amount: amount }),
      });
      setEditingId(null);
      await loadSurveys();
    } catch {
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;
  if (!data) return <div className="page-error">Failed to load surveys</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Survey Management</h1>
        <span className="page-header-count">{data.total_miners} miners total</span>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Survey</th>
            <th>Reward ($)</th>
            <th>Completions</th>
            <th>Completion %</th>
            <th>Total Paid ($)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.surveys.map((s) => (
            <tr key={s.id}>
              <td className="td-bold">{SURVEY_LABELS[s.slug] ?? s.slug}</td>
              <td>
                {editingId === s.id ? (
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    max="100"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    style={{ width: 80, padding: '4px 8px' }}
                    autoFocus
                  />
                ) : (
                  `$${s.reward_amount.toFixed(2)}`
                )}
              </td>
              <td>{s.completion_count}</td>
              <td>{s.completion_percentage}%</td>
              <td>${s.total_rewards_paid.toFixed(2)}</td>
              <td>
                {editingId === s.id ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSave(s.id)}
                      disabled={saving}
                    >
                      {saving ? '...' : 'Save'}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEdit(s)}
                  >
                    Edit Reward
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
