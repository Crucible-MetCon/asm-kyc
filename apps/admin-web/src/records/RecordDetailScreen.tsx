import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import type { AdminRecordDetail, ComplianceReviewResponse } from '@asm-kyc/shared';
import { StatusBadge } from '../components/StatusBadge';

interface RecordDetailScreenProps {
  recordId: string;
  onBack: () => void;
}

export function RecordDetailScreen({ recordId, onBack }: RecordDetailScreenProps) {
  const [record, setRecord] = useState<AdminRecordDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Review form state
  const [reviewStatus, setReviewStatus] = useState('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photoModal, setPhotoModal] = useState<string | null>(null);

  const loadRecord = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<AdminRecordDetail>(`/admin/records/${recordId}`);
      setRecord(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecord();
  }, [recordId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    setSubmitting(true);
    try {
      await apiFetch<ComplianceReviewResponse>('/admin/compliance', {
        method: 'POST',
        body: JSON.stringify({
          record_id: record.id,
          status: reviewStatus,
          notes: reviewNotes || undefined,
        }),
      });
      setReviewNotes('');
      await loadRecord();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loading">Loading record...</div>;
  if (!record) return <div className="page-error">Record not found</div>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>
            Back
          </button>
          <h1>Record Detail</h1>
          <StatusBadge status={record.status} />
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Record Information</h2>
        <div className="detail-grid">
          <div className="detail-field">
            <label>Record ID</label>
            <div className="value value-mono">{record.record_number || record.id.slice(0, 8) + '...'}</div>
          </div>
          <div className="detail-field">
            <label>Miner</label>
            <div className="value">{record.miner_name} ({record.miner_username})</div>
          </div>
          <div className="detail-field">
            <label>Weight</label>
            <div className="value">{record.weight_grams ? `${record.weight_grams}g` : '—'}</div>
          </div>
          <div className="detail-field">
            <label>Purity</label>
            <div className="value">{record.estimated_purity ? `${record.estimated_purity}%` : '—'}</div>
          </div>
          <div className="detail-field">
            <label>Gold Type</label>
            <div className="value">{record.gold_type?.replace('_', ' ') ?? '—'}</div>
          </div>
          <div className="detail-field">
            <label>Mine Site</label>
            <div className="value">{record.origin_mine_site ?? '—'}</div>
          </div>
          <div className="detail-field">
            <label>Extraction Date</label>
            <div className="value">
              {record.extraction_date ? new Date(record.extraction_date).toLocaleDateString() : '—'}
            </div>
          </div>
          <div className="detail-field">
            <label>Created</label>
            <div className="value">{new Date(record.created_at).toLocaleString()}</div>
          </div>
          {record.notes && (
            <div className="detail-field detail-field-full">
              <label>Notes</label>
              <div className="value">{record.notes}</div>
            </div>
          )}
          {record.purchased_by_name && (
            <>
              <div className="detail-field">
                <label>Purchased By</label>
                <div className="value">{record.purchased_by_name}</div>
              </div>
              <div className="detail-field">
                <label>Purchase Date</label>
                <div className="value">
                  {record.purchased_at ? new Date(record.purchased_at).toLocaleString() : '—'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Photos */}
      {record.photos.length > 0 && (
        <div className="card">
          <h2 className="card-title">Photos ({record.photos.length})</h2>
          <div className="photo-gallery">
            {record.photos.map((p) => (
              <img
                key={p.id}
                src={`data:${p.mime_type};base64,${p.photo_data}`}
                alt="Record photo"
                className="photo-thumb"
                onClick={() => setPhotoModal(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Phase 6: Enhanced Fields */}
      {(record.mine_site_name || record.country || record.metal_purities?.length > 0 || record.has_scale_photo || record.has_xrf_photo) && (
        <div className="card">
          <h2 className="card-title">Enhanced Record Data</h2>
          <div className="detail-grid">
            {record.mine_site_name && (
              <div className="detail-field">
                <label>Mine Site</label>
                <div className="value">{record.mine_site_name}</div>
              </div>
            )}
            {record.country && (
              <div className="detail-field">
                <label>Location</label>
                <div className="value">{record.locality ? `${record.locality}, ${record.country}` : record.country}</div>
              </div>
            )}
            {record.gps_latitude != null && record.gps_longitude != null && (
              <div className="detail-field">
                <label>GPS Coordinates</label>
                <div className="value value-mono">{Number(record.gps_latitude).toFixed(6)}, {Number(record.gps_longitude).toFixed(6)}</div>
              </div>
            )}
            <div className="detail-field">
              <label>Scale Photo</label>
              <div className="value">{record.has_scale_photo ? '✅ Captured' : '—'}</div>
            </div>
            <div className="detail-field">
              <label>XRF Photo</label>
              <div className="value">{record.has_xrf_photo ? '✅ Captured' : '—'}</div>
            </div>
          </div>
          {record.metal_purities && record.metal_purities.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Metal Purities</h3>
              <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>Element</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px' }}>Purity</th>
                  </tr>
                </thead>
                <tbody>
                  {record.metal_purities.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '4px 8px', fontWeight: p.element === 'Au' ? 700 : 400, color: p.element === 'Au' ? '#b45309' : undefined }}>{p.element}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right' }}>{p.purity.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Receipts */}
      {record.receipts && record.receipts.length > 0 && (
        <div className="card">
          <h2 className="card-title">Trader/Refiner Receipts ({record.receipts.length})</h2>
          {record.receipts.map((receipt) => (
            <div key={receipt.id} style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', marginBottom: '8px' }}>
              <div className="detail-grid">
                <div className="detail-field">
                  <label>Received By</label>
                  <div className="value">{receipt.receiver_name}</div>
                </div>
                {receipt.receipt_weight != null && (
                  <div className="detail-field">
                    <label>Receipt Weight</label>
                    <div className="value">
                      {receipt.receipt_weight}g
                      {record.weight_grams != null && Math.abs(receipt.receipt_weight - record.weight_grams) / record.weight_grams > 0.05 && (
                        <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: '8px' }}>⚠️ Discrepancy</span>
                      )}
                    </div>
                  </div>
                )}
                {receipt.country && (
                  <div className="detail-field">
                    <label>Location</label>
                    <div className="value">{receipt.locality ? `${receipt.locality}, ${receipt.country}` : receipt.country}</div>
                  </div>
                )}
                <div className="detail-field">
                  <label>Received At</label>
                  <div className="value">{new Date(receipt.received_at).toLocaleString()}</div>
                </div>
              </div>
              {receipt.purities.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <strong style={{ fontSize: '13px' }}>Receipt Purities:</strong>
                  {receipt.purities.map((p) => (
                    <span key={p.id} style={{ marginLeft: '8px', fontSize: '13px' }}>
                      {p.element}: {p.purity.toFixed(2)}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo modal */}
      {photoModal && (
        <div className="modal-overlay" onClick={() => setPhotoModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {record.photos
              .filter((p) => p.id === photoModal)
              .map((p) => (
                <img
                  key={p.id}
                  src={`data:${p.mime_type};base64,${p.photo_data}`}
                  alt="Record photo"
                  className="photo-full"
                />
              ))}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPhotoModal(null)}
              style={{ marginTop: '12px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Compliance Review History */}
      <div className="card">
        <h2 className="card-title">Compliance Reviews ({record.compliance_reviews.length})</h2>
        {record.compliance_reviews.length === 0 ? (
          <p className="text-muted">No reviews yet</p>
        ) : (
          <div className="review-history">
            {record.compliance_reviews.map((cr) => (
              <div key={cr.id} className="review-item">
                <div className="review-item-header">
                  <StatusBadge status={cr.status} />
                  <span className="review-item-reviewer">{cr.reviewer_name}</span>
                  <span className="review-item-date">{new Date(cr.reviewed_at).toLocaleString()}</span>
                </div>
                {cr.notes && <p className="review-item-notes">{cr.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Review Form */}
      <div className="card review-form">
        <h2 className="card-title">Submit Compliance Review</h2>
        <form onSubmit={handleSubmitReview}>
          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select
                className="form-input"
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value)}
              >
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="FLAGGED">Flagged</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              className="form-input form-textarea"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add compliance review notes..."
              rows={3}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
