import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../api/client';
import type { SupplyChainMapResponse } from '@asm-kyc/shared';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const ROLE_COLORS: Record<string, string> = {
  MINER_USER: '#b8860b',
  TRADER_USER: '#1d4ed8',
  REFINER_USER: '#7c3aed',
  AGGREGATOR_USER: '#065f46',
  MELTER_USER: '#9a3412',
};

const ROLE_LABELS: Record<string, string> = {
  MINER_USER: 'Miner',
  TRADER_USER: 'Trader',
  REFINER_USER: 'Refiner',
  AGGREGATOR_USER: 'Aggregator',
  MELTER_USER: 'Melter',
};

const ZAMBIA_CENTER: [number, number] = [-13.1339, 28.2292];
const DEFAULT_ZOOM = 6;

interface LayerVisibility {
  miners: boolean;
  traders: boolean;
  refiners: boolean;
  aggregators: boolean;
  melters: boolean;
  records: boolean;
  flows: boolean;
}

const ROLE_TO_LAYER: Record<string, keyof LayerVisibility> = {
  MINER_USER: 'miners',
  TRADER_USER: 'traders',
  REFINER_USER: 'refiners',
  AGGREGATOR_USER: 'aggregators',
  MELTER_USER: 'melters',
};

function getAngle(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = lng2 - lng1;
  const dLat = lat2 - lat1;
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

export function SupplyChainMapScreen() {
  const [data, setData] = useState<SupplyChainMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layers, setLayers] = useState<LayerVisibility>({
    miners: true,
    traders: true,
    refiners: true,
    aggregators: true,
    melters: true,
    records: true,
    flows: true,
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupsRef = useRef<Record<string, L.LayerGroup>>({});

  // Fetch data
  useEffect(() => {
    apiFetch<SupplyChainMapResponse>('/admin/supply-chain-map')
      .then(setData)
      .catch(() => setError('Failed to load supply chain data'))
      .finally(() => setLoading(false));
  }, []);

  // Initialize map once data has loaded (container must be in DOM)
  useEffect(() => {
    if (loading || !mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(ZAMBIA_CENTER, DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;

    // Ensure tiles load correctly after container layout settles
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [loading]);

  // Render data layers
  const renderLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !data) return;

    // Clear all existing layers
    Object.values(layerGroupsRef.current).forEach((lg) => {
      lg.clearLayers();
      map.removeLayer(lg);
    });
    layerGroupsRef.current = {};

    const getGroup = (key: string): L.LayerGroup => {
      if (!layerGroupsRef.current[key]) {
        layerGroupsRef.current[key] = L.layerGroup().addTo(map);
      }
      return layerGroupsRef.current[key];
    };

    // Actor markers
    for (const actor of data.actors) {
      const layerKey = ROLE_TO_LAYER[actor.role];
      if (!layerKey || !layers[layerKey]) continue;

      const group = getGroup(layerKey);
      const color = ROLE_COLORS[actor.role] || '#888';

      L.circleMarker([actor.lat, actor.lng], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85,
      })
        .bindPopup(
          `<div style="min-width:150px">
            <strong>${actor.name}</strong><br/>
            <span style="color:${color};font-weight:600">${ROLE_LABELS[actor.role] || actor.role}</span><br/>
            Records: ${actor.recordCount}<br/>
            Total: ${actor.totalWeight.toFixed(1)}g
          </div>`,
        )
        .addTo(group);
    }

    // Record markers
    if (layers.records) {
      const recordGroup = getGroup('records');
      for (const rec of data.records) {
        L.circleMarker([rec.lat, rec.lng], {
          radius: 4,
          fillColor: '#f59e0b',
          color: '#92400e',
          weight: 1,
          fillOpacity: 0.7,
        })
          .bindPopup(
            `<div style="min-width:140px">
              <strong>${rec.recordNumber || 'No number'}</strong><br/>
              Miner: ${rec.minerName}<br/>
              Weight: ${rec.weight?.toFixed(1) ?? '\u2014'}g<br/>
              Type: ${rec.goldType ?? '\u2014'}<br/>
              Status: ${rec.status}
            </div>`,
          )
          .addTo(recordGroup);
      }
    }

    // Flow lines (animated marching ants showing direction of sale)
    if (layers.flows) {
      const flowGroup = getGroup('flows');
      for (const flow of data.flows) {
        const line = L.polyline(
          [
            [flow.fromLat, flow.fromLng],
            [flow.toLat, flow.toLng],
          ],
          {
            color: '#3b82f6',
            weight: 2,
            opacity: 0.6,
            dashArray: '10 10',
            className: 'flow-line-animated',
          },
        )
          .bindPopup(
            `<div style="min-width:160px">
              <strong>${flow.recordNumber || 'Record'}</strong><br/>
              ${flow.minerName} \u2192 ${flow.buyerName}<br/>
              Weight: ${flow.weight?.toFixed(1) ?? '\u2014'}g<br/>
              Status: ${flow.status}
            </div>`,
          )
          .addTo(flowGroup);

        // Arrow at destination
        const angle = getAngle(flow.fromLat, flow.fromLng, flow.toLat, flow.toLng);
        L.marker([flow.toLat, flow.toLng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="color:#3b82f6;font-size:16px;transform:rotate(${angle}deg)">&#9654;</div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
          interactive: false,
        }).addTo(flowGroup);
      }
    }
  }, [data, layers]);

  useEffect(() => {
    renderLayers();
  }, [renderLayers]);

  const toggleLayer = (key: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return <div className="page-loading">Loading supply chain map…</div>;
  if (error) return <div className="page-error">{error}</div>;

  const stats = data
    ? {
        miners: data.actors.filter((a) => a.role === 'MINER_USER').length,
        traders: data.actors.filter((a) => a.role === 'TRADER_USER').length,
        refiners: data.actors.filter((a) => a.role === 'REFINER_USER').length,
        aggregators: data.actors.filter((a) => a.role === 'AGGREGATOR_USER').length,
        melters: data.actors.filter((a) => a.role === 'MELTER_USER').length,
        records: data.records.length,
        flows: data.flows.length,
        totalWeight: data.records.reduce((s, r) => s + (r.weight ?? 0), 0),
      }
    : null;

  const layerConfig = [
    { key: 'miners' as const, label: 'Miners', color: ROLE_COLORS.MINER_USER, count: stats?.miners },
    { key: 'traders' as const, label: 'Traders', color: ROLE_COLORS.TRADER_USER, count: stats?.traders },
    { key: 'refiners' as const, label: 'Refiners', color: ROLE_COLORS.REFINER_USER, count: stats?.refiners },
    { key: 'aggregators' as const, label: 'Aggregators', color: ROLE_COLORS.AGGREGATOR_USER, count: stats?.aggregators },
    { key: 'melters' as const, label: 'Melters', color: ROLE_COLORS.MELTER_USER, count: stats?.melters },
    { key: 'records' as const, label: 'Records', color: '#f59e0b', count: stats?.records },
    { key: 'flows' as const, label: 'Flow Lines', color: '#3b82f6', count: stats?.flows },
  ];

  const totalActors = stats
    ? stats.miners + stats.traders + stats.refiners + stats.aggregators + stats.melters
    : 0;

  return (
    <div className="supply-chain-map-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <h1>Supply Chain Map</h1>
        {stats && (
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            {totalActors} actors &middot; {stats.records} records &middot; {stats.flows} flows
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 12 }}>
        {/* Layer control sidebar */}
        <div
          style={{
            width: 200,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: 'var(--color-text)' }}>
            Layers
          </div>

          {layerConfig.map(({ key, label, color, count }) => (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={() => toggleLayer(key)}
                style={{ accentColor: color }}
              />
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: color,
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1 }}>{label}</span>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}>{count ?? 0}</span>
            </label>
          ))}

          {stats && (
            <div
              style={{
                marginTop: 'auto',
                paddingTop: 12,
                borderTop: '1px solid var(--color-border)',
                fontSize: 12,
                color: 'var(--color-text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div>Total weight: <strong>{stats.totalWeight.toFixed(1)}g</strong></div>
            </div>
          )}
        </div>

        {/* Map */}
        <div
          ref={mapContainerRef}
          style={{
            flex: 1,
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            minHeight: 400,
          }}
        />
      </div>
    </div>
  );
}
