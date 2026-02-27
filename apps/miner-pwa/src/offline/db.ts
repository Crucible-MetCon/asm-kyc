import { openDB as idbOpen, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  MeResponse,
  RecordListItem,
  RecordResponse,
  PurchaseListItem,
  PurchaseResponse,
  AvailableRecordListItem,
} from '@asm-kyc/shared';

/* ── Sync statuses for locally-created records ── */
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

/* ── Draft record stored offline ── */
export interface DraftRecord {
  id: string; // client-generated UUID via crypto.randomUUID()
  syncStatus: SyncStatus;
  syncError?: string;
  createdAt: string; // ISO timestamp
  data: {
    weight_grams: number | null;
    estimated_purity: number | null;
    origin_mine_site: string | null;
    extraction_date: string | null;
    gold_type: string | null;
    notes: string | null;
  };
  photos: { data: string; mime_type: string }[];
  /** Whether the user wants to submit (true) or save as draft (false) */
  submitAfterSync: boolean;
}

/* ── Sync queue operations ── */
export type SyncOpType = 'create-record' | 'upload-photo' | 'submit-record';

export interface SyncOp {
  id?: number; // autoIncrement key
  type: SyncOpType;
  draftId: string; // reference to draft-records id
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

/* ── DB Schema ── */
interface AsmGoldTraceDB extends DBSchema {
  'auth-cache': {
    key: string;
    value: MeResponse;
  };
  'records-cache': {
    key: string;
    value: RecordListItem | RecordResponse;
    indexes: { 'by-status': string };
  };
  'records-detail-cache': {
    key: string;
    value: RecordResponse;
  };
  'draft-records': {
    key: string;
    value: DraftRecord;
    indexes: { 'by-sync-status': SyncStatus };
  };
  'sync-queue': {
    key: number;
    value: SyncOp;
    indexes: { 'by-draft-id': string };
  };
  'purchases-cache': {
    key: string;
    value: PurchaseListItem | PurchaseResponse;
  };
  'available-records-cache': {
    key: string;
    value: AvailableRecordListItem;
  };
  'list-cache': {
    key: string; // cache key like "records-list", "purchases-list"
    value: { data: unknown; cachedAt: string };
  };
}

const DB_NAME = 'asm-goldtrace-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AsmGoldTraceDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<AsmGoldTraceDB>> {
  if (!dbPromise) {
    dbPromise = idbOpen<AsmGoldTraceDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Auth cache (single entry keyed 'me')
        if (!db.objectStoreNames.contains('auth-cache')) {
          db.createObjectStore('auth-cache');
        }

        // Server records cache
        if (!db.objectStoreNames.contains('records-cache')) {
          const store = db.createObjectStore('records-cache', { keyPath: 'id' });
          store.createIndex('by-status', 'status');
        }

        // Record detail cache
        if (!db.objectStoreNames.contains('records-detail-cache')) {
          db.createObjectStore('records-detail-cache', { keyPath: 'id' });
        }

        // Draft records (offline-created)
        if (!db.objectStoreNames.contains('draft-records')) {
          const store = db.createObjectStore('draft-records', { keyPath: 'id' });
          store.createIndex('by-sync-status', 'syncStatus');
        }

        // Sync queue (FIFO operations)
        if (!db.objectStoreNames.contains('sync-queue')) {
          const store = db.createObjectStore('sync-queue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('by-draft-id', 'draftId');
        }

        // Purchases cache
        if (!db.objectStoreNames.contains('purchases-cache')) {
          db.createObjectStore('purchases-cache', { keyPath: 'id' });
        }

        // Available records cache
        if (!db.objectStoreNames.contains('available-records-cache')) {
          db.createObjectStore('available-records-cache', { keyPath: 'id' });
        }

        // Generic list cache (for full list responses)
        if (!db.objectStoreNames.contains('list-cache')) {
          db.createObjectStore('list-cache');
        }
      },
    });
  }
  return dbPromise;
}

/* ══════════════════════════════════════════
   Auth Cache helpers
   ══════════════════════════════════════════ */

export async function getAuthCache(): Promise<MeResponse | undefined> {
  const db = await getDB();
  return db.get('auth-cache', 'me');
}

export async function setAuthCache(me: MeResponse): Promise<void> {
  const db = await getDB();
  await db.put('auth-cache', me, 'me');
}

export async function clearAuthCache(): Promise<void> {
  const db = await getDB();
  await db.delete('auth-cache', 'me');
}

/* ══════════════════════════════════════════
   Generic list-level cache helpers
   ══════════════════════════════════════════ */

export async function getListCache<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const entry = await db.get('list-cache', key);
  if (!entry) return undefined;
  return entry.data as T;
}

export async function setListCache<T>(key: string, data: T): Promise<void> {
  const db = await getDB();
  await db.put('list-cache', { data, cachedAt: new Date().toISOString() }, key);
}

/* ══════════════════════════════════════════
   Records cache helpers
   ══════════════════════════════════════════ */

export async function getCachedRecords(): Promise<(RecordListItem | RecordResponse)[]> {
  const db = await getDB();
  return db.getAll('records-cache');
}

export async function setCachedRecords(records: RecordListItem[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('records-cache', 'readwrite');
  await tx.store.clear();
  for (const r of records) {
    await tx.store.put(r);
  }
  await tx.done;
}

export async function getCachedRecordDetail(id: string): Promise<RecordResponse | undefined> {
  const db = await getDB();
  return db.get('records-detail-cache', id);
}

export async function setCachedRecordDetail(record: RecordResponse): Promise<void> {
  const db = await getDB();
  await db.put('records-detail-cache', record);
}

/* ══════════════════════════════════════════
   Draft records helpers
   ══════════════════════════════════════════ */

export async function getAllDrafts(): Promise<DraftRecord[]> {
  const db = await getDB();
  return db.getAll('draft-records');
}

export async function getPendingDrafts(): Promise<DraftRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('draft-records', 'by-sync-status', 'pending');
}

export async function getDraft(id: string): Promise<DraftRecord | undefined> {
  const db = await getDB();
  return db.get('draft-records', id);
}

export async function saveDraft(draft: DraftRecord): Promise<void> {
  const db = await getDB();
  await db.put('draft-records', draft);
}

export async function updateDraftSyncStatus(
  id: string,
  syncStatus: SyncStatus,
  error?: string,
): Promise<void> {
  const db = await getDB();
  const draft = await db.get('draft-records', id);
  if (!draft) return;
  draft.syncStatus = syncStatus;
  if (error) draft.syncError = error;
  await db.put('draft-records', draft);
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('draft-records', id);
}

/* ══════════════════════════════════════════
   Sync queue helpers
   ══════════════════════════════════════════ */

export async function addSyncOp(op: Omit<SyncOp, 'id'>): Promise<number> {
  const db = await getDB();
  return db.add('sync-queue', op as SyncOp);
}

export async function getAllSyncOps(): Promise<SyncOp[]> {
  const db = await getDB();
  return db.getAll('sync-queue');
}

export async function getSyncOpsByDraft(draftId: string): Promise<SyncOp[]> {
  const db = await getDB();
  return db.getAllFromIndex('sync-queue', 'by-draft-id', draftId);
}

export async function deleteSyncOp(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('sync-queue', id);
}

export async function updateSyncOp(op: SyncOp): Promise<void> {
  const db = await getDB();
  await db.put('sync-queue', op);
}

export async function clearSyncOpsForDraft(draftId: string): Promise<void> {
  const db = await getDB();
  const ops = await db.getAllFromIndex('sync-queue', 'by-draft-id', draftId);
  const tx = db.transaction('sync-queue', 'readwrite');
  for (const op of ops) {
    if (op.id !== undefined) {
      await tx.store.delete(op.id);
    }
  }
  await tx.done;
}

/* ══════════════════════════════════════════
   Purchases cache helpers
   ══════════════════════════════════════════ */

export async function getCachedPurchases(): Promise<(PurchaseListItem | PurchaseResponse)[]> {
  const db = await getDB();
  return db.getAll('purchases-cache');
}

export async function setCachedPurchases(purchases: PurchaseListItem[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('purchases-cache', 'readwrite');
  await tx.store.clear();
  for (const p of purchases) {
    await tx.store.put(p);
  }
  await tx.done;
}

export async function getCachedPurchaseDetail(id: string): Promise<PurchaseResponse | undefined> {
  const db = await getDB();
  return db.get('purchases-cache', id) as Promise<PurchaseResponse | undefined>;
}

export async function setCachedPurchaseDetail(purchase: PurchaseResponse): Promise<void> {
  const db = await getDB();
  await db.put('purchases-cache', purchase);
}

/* ══════════════════════════════════════════
   Available records cache helpers
   ══════════════════════════════════════════ */

export async function getCachedAvailableRecords(): Promise<AvailableRecordListItem[]> {
  const db = await getDB();
  return db.getAll('available-records-cache');
}

export async function setCachedAvailableRecords(records: AvailableRecordListItem[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('available-records-cache', 'readwrite');
  await tx.store.clear();
  for (const r of records) {
    await tx.store.put(r);
  }
  await tx.done;
}

/* ══════════════════════════════════════════
   Utility: clear all caches on logout
   ══════════════════════════════════════════ */

export async function clearAllCaches(): Promise<void> {
  const db = await getDB();
  const stores = [
    'auth-cache',
    'records-cache',
    'records-detail-cache',
    'draft-records',
    'sync-queue',
    'purchases-cache',
    'available-records-cache',
    'list-cache',
  ] as const;

  for (const store of stores) {
    const tx = db.transaction(store, 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
}

/* ══════════════════════════════════════════
   Utility: count pending sync operations
   ══════════════════════════════════════════ */

export async function getPendingSyncCount(): Promise<number> {
  const db = await getDB();
  return db.count('sync-queue');
}
