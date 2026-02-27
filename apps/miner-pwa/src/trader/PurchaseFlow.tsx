import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../api/client';
import { useI18n, interpolate } from '../i18n/I18nContext';
import { useFeatureFlags } from '../config/FeatureFlagContext';
import type { AvailableRecordListResponse, AvailableRecordListItem, PurchaseResponse } from '@asm-kyc/shared';
import rawGoldIcon from '../assets/gold-types/raw-gold.png';
import barIcon from '../assets/gold-types/bar.png';
import lotIcon from '../assets/gold-types/lot.png';

const GOLD_TYPE_ICONS: Record<string, string> = {
  RAW_GOLD: rawGoldIcon,
  BAR: barIcon,
  LOT: lotIcon,
};

interface Props {
  recordIds: string[];
  onComplete: (purchaseId: string) => void;
  onBack: () => void;
}

type PaymentMethod = 'BANK_TRANSFER' | 'MOBILE_MONEY';

const FEE_RATES: Record<PaymentMethod, number> = {
  BANK_TRANSFER: 0.01, // 1%
  MOBILE_MONEY: 0.02,  // 2%
};

export function PurchaseFlow({ recordIds, onComplete, onBack }: Props) {
  const { t } = useI18n();
  const { yellowcard_enabled } = useFeatureFlags();
  const [records, setRecords] = useState<AvailableRecordListItem[]>([]);
  const [notes, setNotes] = useState('');
  const [pricePerGram, setPricePerGram] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MOBILE_MONEY');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  // Payment pending state (when YC enabled)
  const [pendingPurchaseId, setPendingPurchaseId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    apiFetch<AvailableRecordListResponse>('/records/available')
      .then((data) => {
        setRecords(data.records.filter((r) => recordIds.includes(r.id)));
      })
      .catch(() => {});
  }, [recordIds]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const goldTypeLabel = (val: string | null) => {
    if (!val) return '';
    const map: Record<string, string> = {
      RAW_GOLD: t.records.goldTypeRaw,
      BAR: t.records.goldTypeBar,
      LOT: t.records.goldTypeLot,
    };
    return map[val] || val;
  };

  const totalWeight = records.reduce((sum, r) => sum + (r.weight_grams ?? 0), 0);
  const ppg = parseFloat(pricePerGram) || 0;
  const subtotal = totalWeight * ppg;
  const feeRate = FEE_RATES[paymentMethod];
  const fee = subtotal * feeRate;
  const total = subtotal + fee;

  // Poll for payment status when purchase is pending
  const startPolling = (purchaseId: string) => {
    setPendingPurchaseId(purchaseId);
    setPaymentStatus('PENDING');

    pollingRef.current = setInterval(async () => {
      try {
        const data = await apiFetch<{ payment_status: string }>(`/purchases/${purchaseId}/payment-status`);
        setPaymentStatus(data.payment_status);

        if (data.payment_status === 'COMPLETED' || data.payment_status === 'FAILED') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;

          if (data.payment_status === 'COMPLETED') {
            setTimeout(() => onComplete(purchaseId), 1500);
          }
        }
      } catch {
        // Keep polling on error
      }
    }, 3000);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        record_ids: recordIds,
        notes: notes || undefined,
      };
      if (yellowcard_enabled) {
        body.price_per_gram = ppg;
        body.payment_method = paymentMethod;
      }

      const purchase = await apiFetch<PurchaseResponse>('/purchases', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (yellowcard_enabled && purchase.payment_status === 'PENDING') {
        setShowConfirm(false);
        startPolling(purchase.id);
      } else {
        onComplete(purchase.id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Purchase failed';
      setError(message);
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Payment Pending Screen ──
  if (pendingPurchaseId && paymentStatus) {
    return (
      <div className="screen">
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>
          {paymentStatus === 'COMPLETED'
            ? t.trader.paymentComplete
            : paymentStatus === 'FAILED'
              ? t.trader.paymentFailed
              : t.trader.paymentPending}
        </h1>

        <div className="payment-status-card">
          <div className="payment-status-icon">
            {paymentStatus === 'COMPLETED' ? '\u2705' : paymentStatus === 'FAILED' ? '\u274C' : '\u23F3'}
          </div>
          <div className="payment-status-text">
            {paymentStatus === 'COMPLETED'
              ? t.trader.paymentCompleteMsg
              : paymentStatus === 'FAILED'
                ? t.trader.paymentFailedMsg
                : t.trader.paymentPendingMsg}
          </div>
        </div>

        {paymentStatus === 'FAILED' && (
          <button
            type="button"
            className="btn btn-primary btn-full"
            style={{ marginTop: 24 }}
            onClick={onBack}
          >
            {t.common.back}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="record-header">
        <button type="button" className="back-button" onClick={onBack}>
          ← {t.common.back}
        </button>
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>{t.trader.purchaseFlowTitle}</h1>

      {error && <div className="error-message">{error}</div>}

      <div className="purchase-summary">
        <div className="purchase-summary-row">
          <span>{t.records.goldType}</span>
          <span>{records.length} record(s)</span>
        </div>
        <div className="purchase-summary-row">
          <span>{t.records.weightGrams}</span>
          <span>{totalWeight.toFixed(1)}g</span>
        </div>
      </div>

      {/* Record list */}
      <div className="card-grid" style={{ marginTop: 12 }}>
        {records.map((rec) => (
          <div key={rec.id} className="record-card">
            <img
              src={GOLD_TYPE_ICONS[rec.gold_type || 'RAW_GOLD'] || rawGoldIcon}
              alt={goldTypeLabel(rec.gold_type)}
              className="record-card-icon"
            />
            <div className="record-card-body">
              <div className="record-card-title">
                {goldTypeLabel(rec.gold_type) || 'Gold'}
                {rec.weight_grams != null && ` — ${rec.weight_grams}g`}
              </div>
              <div className="record-card-meta">
                {t.trader.minerName}: {rec.miner_name}
              </div>
              <div className="record-card-meta">
                {rec.origin_mine_site || '—'}
                {rec.estimated_purity != null && ` · ${rec.estimated_purity}%`}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Payment fields (only when Yellow Card is enabled) */}
      {yellowcard_enabled && (
        <div style={{ marginTop: 20 }}>
          <div className="form-group">
            <label>{t.trader.pricePerGram} (ZMW)</label>
            <input
              type="number"
              className="form-input"
              placeholder={t.trader.pricePerGramPlaceholder}
              value={pricePerGram}
              onChange={(e) => setPricePerGram(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>{t.trader.paymentMethod}</label>
            <div className="payment-method-selector">
              <button
                type="button"
                className={`payment-method-option ${paymentMethod === 'MOBILE_MONEY' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('MOBILE_MONEY')}
              >
                <span className="payment-method-icon">{'\uD83D\uDCF1'}</span>
                <span>{t.trader.mobileMoney}</span>
                <span className="payment-method-fee">2% {t.trader.fee}</span>
              </button>
              <button
                type="button"
                className={`payment-method-option ${paymentMethod === 'BANK_TRANSFER' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
              >
                <span className="payment-method-icon">{'\uD83C\uDFE6'}</span>
                <span>{t.trader.bankTransfer}</span>
                <span className="payment-method-fee">1% {t.trader.fee}</span>
              </button>
            </div>
          </div>

          {ppg > 0 && (
            <div className="purchase-summary" style={{ marginTop: 12 }}>
              <div className="purchase-summary-row">
                <span>{t.trader.subtotal}</span>
                <span>ZMW {subtotal.toFixed(2)}</span>
              </div>
              <div className="purchase-summary-row">
                <span>{t.trader.fee} ({(feeRate * 100).toFixed(0)}%)</span>
                <span>ZMW {fee.toFixed(2)}</span>
              </div>
              <div className="purchase-summary-row">
                <span>{t.trader.total}</span>
                <span>ZMW {total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="form-group" style={{ marginTop: 20 }}>
        <label>{t.trader.purchaseNotes}</label>
        <textarea
          className="form-textarea"
          placeholder={t.trader.purchaseNotesPlaceholder}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <button
        type="button"
        className="btn btn-primary btn-full"
        style={{ marginTop: 16 }}
        onClick={() => setShowConfirm(true)}
        disabled={submitting || records.length === 0 || (yellowcard_enabled && ppg <= 0)}
      >
        {yellowcard_enabled ? t.trader.proceedToPayment : t.trader.confirmPurchase}
      </button>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="confirm-overlay" onClick={() => !submitting && setShowConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p>
              {yellowcard_enabled
                ? interpolate(t.trader.confirmPaymentMessage, {
                    count: String(records.length),
                    weight: totalWeight.toFixed(1),
                    total: total.toFixed(2),
                  })
                : interpolate(t.trader.confirmPurchaseMessage, {
                    count: String(records.length),
                    weight: totalWeight.toFixed(1),
                  })}
            </p>
            <div className="confirm-buttons">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting ? t.trader.purchasing : (yellowcard_enabled ? t.trader.payNow : t.trader.confirmPurchase)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
