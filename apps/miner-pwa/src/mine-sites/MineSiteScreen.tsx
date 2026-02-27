import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { useI18n } from '../i18n/I18nContext';
import type { MineSiteResponse, MineSiteListResponse } from '@asm-kyc/shared';

interface Props {
  onBack?: () => void;
}

export function MineSiteScreen({ onBack }: Props) {
  const { t } = useI18n();
  const [sites, setSites] = useState<MineSiteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [license, setLicense] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadSites = useCallback(async () => {
    try {
      const data = await apiFetch<MineSiteListResponse>('/mine-sites');
      setSites(data.sites);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSites(); }, [loadSites]);

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setName('');
    setLatitude('');
    setLongitude('');
    setLicense('');
    setError('');
  };

  const detectGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(7));
          setLongitude(pos.coords.longitude.toFixed(7));
        },
        () => { /* ignore error */ },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t.mineSites.nameRequired);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        mining_license_number: license || undefined,
      };
      if (latitude) body.gps_latitude = parseFloat(latitude);
      if (longitude) body.gps_longitude = parseFloat(longitude);

      if (editId) {
        await apiFetch(`/mine-sites/${editId}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await apiFetch('/mine-sites', { method: 'POST', body: JSON.stringify(body) });
      }
      resetForm();
      await loadSites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (site: MineSiteResponse) => {
    setEditId(site.id);
    setName(site.name);
    setLatitude(site.gps_latitude?.toString() || '');
    setLongitude(site.gps_longitude?.toString() || '');
    setLicense(site.mining_license_number || '');
    setShowForm(true);
  };

  const handleDelete = async (site: MineSiteResponse) => {
    if (!confirm(t.mineSites.confirmDelete)) return;
    try {
      await apiFetch(`/mine-sites/${site.id}`, { method: 'DELETE' });
      await loadSites();
    } catch {
      // ignore
    }
  };

  const handleSetDefault = async (siteId: string) => {
    try {
      await apiFetch(`/mine-sites/${siteId}/default`, { method: 'PATCH' });
      await loadSites();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return <div className="screen"><div className="loading-text">{t.common.loading}</div></div>;
  }

  return (
    <div className="screen">
      {onBack && (
        <div className="record-header">
          <button type="button" className="back-button" onClick={onBack}>
            ← {t.common.back}
          </button>
        </div>
      )}

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{t.mineSites.title}</h1>

      {!showForm && (
        <button
          type="button"
          className="btn btn-primary btn-full"
          style={{ marginBottom: 16 }}
          onClick={() => { resetForm(); setShowForm(true); }}
        >
          {t.mineSites.addSite}
        </button>
      )}

      {showForm && (
        <div className="mine-site-form" style={{ marginBottom: 20, padding: 16, background: 'var(--bg-secondary, #f5f5f5)', borderRadius: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            {editId ? t.mineSites.editSite : t.mineSites.addSite}
          </h2>

          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>{t.mineSites.siteName}</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.mineSites.siteNamePlaceholder}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>{t.mineSites.latitude}</label>
              <input
                type="number"
                className="form-input"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="-15.4167"
                step="any"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>{t.mineSites.longitude}</label>
              <input
                type="number"
                className="form-input"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="28.2833"
                step="any"
              />
            </div>
          </div>

          <button type="button" className="btn btn-secondary" style={{ marginBottom: 12, fontSize: 13 }} onClick={detectGps}>
            {'\uD83D\uDCCD'} {t.mineSites.detectGps}
          </button>

          <div className="form-group">
            <label>{t.mineSites.miningLicense}</label>
            <input
              type="text"
              className="form-input"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              placeholder={t.mineSites.licensePlaceholder}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={resetForm} disabled={saving}>
              {t.common.cancel}
            </button>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
              {saving ? t.common.loading : t.common.save}
            </button>
          </div>
        </div>
      )}

      {sites.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{'\u26CF\uFE0F'}</div>
          <div className="empty-state-title">{t.mineSites.noSites}</div>
          <p className="empty-state-hint">{t.mineSites.noSitesHint}</p>
        </div>
      ) : (
        <div>
          {sites.map((site) => (
            <div key={site.id} className="mine-site-card" style={{
              padding: 14, marginBottom: 10, background: 'white', borderRadius: 10,
              border: site.is_default ? '2px solid var(--color-primary, #2563eb)' : '1px solid #e5e7eb',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {site.name}
                    {site.is_default && (
                      <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--color-primary, #2563eb)', color: 'white', padding: '2px 8px', borderRadius: 10 }}>
                        {t.mineSites.defaultLabel}
                      </span>
                    )}
                  </div>
                  {site.gps_latitude != null && site.gps_longitude != null && (
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                      {'\uD83D\uDCCD'} {site.gps_latitude.toFixed(4)}, {site.gps_longitude.toFixed(4)}
                    </div>
                  )}
                  {site.mining_license_number && (
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {t.mineSites.miningLicense}: {site.mining_license_number}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {!site.is_default && (
                    <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}
                      onClick={() => handleSetDefault(site.id)}
                    >
                      {t.mineSites.setDefault}
                    </button>
                  )}
                  <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => handleEdit(site)}
                  >
                    {t.common.edit}
                  </button>
                  <button type="button" style={{ fontSize: 11, padding: '4px 10px', background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 6, cursor: 'pointer' }}
                    onClick={() => handleDelete(site)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
