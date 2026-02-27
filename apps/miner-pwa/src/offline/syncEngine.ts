import { apiFetch, NetworkError } from '../api/client';
import {
  getAllSyncOps,
  getDraft,
  updateDraftSyncStatus,
  getPendingSyncCount,
  type SyncOp,
} from './db';
import { completeOp, failOp, finalizeDraftSync, getPendingOps } from './syncQueue';
import { SYNC_STATE_EVENT, type SyncState } from './SyncStatusBanner';

/**
 * Server ID mapping: when a draft record is created on the server,
 * we map the client-generated UUID → server-assigned UUID
 * so subsequent photo uploads and submit ops use the correct ID.
 */
const serverIdMap = new Map<string, string>();

let isSyncing = false;
let onlineHandler: (() => void) | null = null;
let retryHandler: (() => void) | null = null;

function emitState(state: SyncState, pending?: number) {
  window.dispatchEvent(
    new CustomEvent(SYNC_STATE_EVENT, { detail: { state, pending } }),
  );
}

/**
 * Process a single sync operation.
 * Returns true on success, false on failure.
 */
async function processOp(op: SyncOp): Promise<boolean> {
  const serverId = serverIdMap.get(op.draftId);

  try {
    switch (op.type) {
      case 'create-record': {
        const draft = await getDraft(op.draftId);
        if (!draft) {
          // Draft was deleted — skip this op
          await completeOp(op);
          return true;
        }

        // Create the record on the server
        const result = await apiFetch<{ id: string }>('/records', {
          method: 'POST',
          body: JSON.stringify(draft.data),
        });

        // Map client ID → server ID
        serverIdMap.set(op.draftId, result.id);
        await completeOp(op);
        return true;
      }

      case 'upload-photo': {
        const recordId = serverId ?? serverIdMap.get(op.draftId);
        if (!recordId) {
          // Record hasn't been created yet — this shouldn't happen in FIFO order
          // but let's retry
          return false;
        }

        const payload = op.payload as { index: number; photo: { data: string; mime_type: string } };
        await apiFetch(`/records/${recordId}/photos`, {
          method: 'POST',
          body: JSON.stringify({
            photo_data: payload.photo.data,
            mime_type: payload.photo.mime_type,
          }),
        });

        await completeOp(op);
        return true;
      }

      case 'submit-record': {
        const recordId = serverId ?? serverIdMap.get(op.draftId);
        if (!recordId) {
          return false;
        }

        await apiFetch(`/records/${recordId}/submit`, {
          method: 'POST',
        });

        await completeOp(op);
        return true;
      }

      default:
        // Unknown op type — remove it
        await completeOp(op);
        return true;
    }
  } catch (err) {
    if (err instanceof NetworkError) {
      // Back offline — stop syncing
      return false;
    }

    // Server error (4xx / 5xx)
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    const shouldRetry = await failOp(op, errorMsg);
    return !shouldRetry; // if shouldRetry is true, we didn't complete — return false to stop
  }
}

/**
 * Process all pending sync operations in FIFO order.
 */
async function processQueue(): Promise<void> {
  if (isSyncing) return;
  if (!navigator.onLine) return;

  const ops = await getPendingOps();
  if (ops.length === 0) return;

  isSyncing = true;
  emitState('syncing', ops.length);

  // Group ops by draft ID to process each draft's ops in order
  let remainingOps = [...ops];

  while (remainingOps.length > 0) {
    const op = remainingOps[0];

    // Update draft status
    await updateDraftSyncStatus(op.draftId, 'syncing');

    const success = await processOp(op);
    if (!success) {
      // Failed — check if we're offline
      if (!navigator.onLine) {
        emitState('offline');
        isSyncing = false;
        return;
      }

      // Remove the failed op from our local list and continue
      remainingOps = remainingOps.slice(1);

      // If this was a network error-type failure, stop processing
      const pending = await getPendingSyncCount();
      if (pending > 0) {
        emitState('error', pending);
      }
      isSyncing = false;
      return;
    }

    // Remove processed op and check if draft is fully synced
    remainingOps = remainingOps.slice(1);

    // Check if this draft has more ops remaining
    const draftHasMoreOps = remainingOps.some((o) => o.draftId === op.draftId);
    if (!draftHasMoreOps) {
      // All ops for this draft are done — finalize
      await finalizeDraftSync(op.draftId);
      serverIdMap.delete(op.draftId);
    }

    // Update count
    const pending = await getPendingSyncCount();
    if (pending > 0) {
      emitState('syncing', pending);
    }
  }

  // All done
  isSyncing = false;
  emitState('online', 0);
}

/**
 * Initialize the sync engine. Should be called once on app mount
 * when a user is logged in.
 */
export function initSyncEngine(): void {
  // Process queue immediately if online
  processQueue();

  // Listen for online event
  onlineHandler = () => {
    // Small delay to let the connection stabilize
    setTimeout(processQueue, 1000);
  };
  window.addEventListener('online', onlineHandler);

  // Listen for manual retry
  retryHandler = () => {
    processQueue();
  };
  window.addEventListener('sync:retry', retryHandler);
}

/**
 * Tear down the sync engine listeners.
 */
export function teardownSyncEngine(): void {
  if (onlineHandler) {
    window.removeEventListener('online', onlineHandler);
    onlineHandler = null;
  }
  if (retryHandler) {
    window.removeEventListener('sync:retry', retryHandler);
    retryHandler = null;
  }
}
