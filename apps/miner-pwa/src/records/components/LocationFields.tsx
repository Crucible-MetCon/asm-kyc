import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';

interface Props {
  country: string;
  locality: string;
  latitude: string;
  longitude: string;
  onCountryChange: (v: string) => void;
  onLocalityChange: (v: string) => void;
  onLatitudeChange: (v: string) => void;
  onLongitudeChange: (v: string) => void;
}

export function LocationFields({
  country, locality, latitude, longitude,
  onCountryChange, onLocalityChange, onLatitudeChange, onLongitudeChange,
}: Props) {
  const { t } = useI18n();
  const [detecting, setDetecting] = useState(false);

  const detectLocation = () => {
    if (!('geolocation' in navigator)) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        onLatitudeChange(pos.coords.latitude.toFixed(7));
        onLongitudeChange(pos.coords.longitude.toFixed(7));

        // Simple reverse geocode attempt (best-effort)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=en`,
            { headers: { 'User-Agent': 'ASM-GoldTrace/1.0' } },
          );
          if (res.ok) {
            const data = await res.json();
            if (data.address?.country) onCountryChange(data.address.country);
            const loc = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
            if (loc) onLocalityChange(loc);
          }
        } catch {
          // Offline or rate limited — just use GPS coords
        }
        setDetecting(false);
      },
      () => { setDetecting(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <div>
      <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>
        {'\uD83D\uDCCD'} {t.vision.location}
      </label>

      <button type="button" className="btn btn-secondary" style={{ marginBottom: 12, fontSize: 13 }} onClick={detectLocation} disabled={detecting}>
        {detecting ? t.common.loading : t.vision.detectLocation}
      </button>

      <div style={{ display: 'flex', gap: 8 }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label>{t.vision.country}</label>
          <input type="text" className="form-input" value={country} onChange={(e) => onCountryChange(e.target.value)} placeholder="Zambia" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label>{t.vision.locality}</label>
          <input type="text" className="form-input" value={locality} onChange={(e) => onLocalityChange(e.target.value)} placeholder="Lusaka" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label style={{ fontSize: 12 }}>{t.vision.latitude}</label>
          <input type="number" className="form-input" value={latitude} onChange={(e) => onLatitudeChange(e.target.value)} placeholder="-15.4167" step="any" />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label style={{ fontSize: 12 }}>{t.vision.longitude}</label>
          <input type="number" className="form-input" value={longitude} onChange={(e) => onLongitudeChange(e.target.value)} placeholder="28.2833" step="any" />
        </div>
      </div>
    </div>
  );
}
