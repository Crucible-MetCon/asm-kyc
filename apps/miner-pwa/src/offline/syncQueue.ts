import {
  addSyncOp,
  getAllSyncOps,
  deleteSyncOp,
  updateSyncOp,
  saveDraft,
  updateDraftSyncStatus,
  deleteDraft,
  clearSyncOpsForDraft,
  type DraftRecord,
  type SyncOp,
  type SyncOpType,
} from './db';

/**
 * Add a complete set of sync operations for a new draft record.
 *
 * Creates ops in order:
 *   1. create-record  (creates the record on the server)
 *   2. upload-photo   (one per photo)
 *   3. submit-record  (moves it from DRAFT → SUBMITTED if requested)
 */
export async function enqueueRecordSync(draft: DraftRecord): Promise<void> {
  // Save the draft to IndexedDB first
  await saveDraft(draft);

  const now = new Date().toISOString();

  // 1. Create the record
  await addSyncOp({
    type: 'create-record',
    draftId: draft.id,
    payload: draft.data,
    createdAt: now,
    attempts: 0,
  });

  // 2. Upload photos (one op per photo)
  for (let i = 0; i < draft.photos.length; i++) {
    await addSyncOp({
      type: 'upload-photo',
      draftId: draft.id,
      payload: { index: i, photo: draft.photos[i] },
      createdAt: now,
      attempts: 0,
    });
  }

  // 3. Submit the record (if the user chose to submit, not just save draft)
  if (draft.submitAfterSync) {
    await addSyncOp({
      type: 'submit-record',
      draftId: draft.id,
      payload: null,
      createdAt: now,
      attempts: 0,
    });
  }
}

/**
 * Get all pending sync operations in FIFO order.
 */
export async function getPendingOps(): Promise<SyncOp[]> {
  return getAllSyncOps();
}

/**
 * Mark an operation as completed and remove it from the queue.
 */
export async function completeOp(op: SyncOp): Promise<void> {
  if (op.id !== undefined) {
    await deleteSyncOp(op.id);
  }
}

/**
 * Mark an operation as failed with retry info.
 * Returns true if the op should be retried, false if it's exhausted retries.
 */
export async function failOp(op: SyncOp, error: string, maxRetries = 3): Promise<boolean> {
  op.attempts += 1;
  op.lastError = error;

  if (op.attempts >= maxRetries) {
    // Exhausted retries — mark the draft as error
    await updateDraftSyncStatus(op.draftId, 'error', error);
    // Remove all remaining ops for this draft
    await clearSyncOpsForDraft(op.draftId);
    return false;
  }

  // Update the op for retry
  await updateSyncOp(op);
  return true;
}

/**
 * After a draft has been fully synced (all ops complete),
 * clean up the local draft.
 */
export async function finalizeDraftSync(draftId: string): Promise<void> {
  await updateDraftSyncStatus(draftId, 'synced');
  // Optionally delete the draft after sync — we'll keep it briefly for the UI
  // The draft can be cleaned up later or on next app load
  setTimeout(async () => {
    await deleteDraft(draftId);
  }, 5000);
}
