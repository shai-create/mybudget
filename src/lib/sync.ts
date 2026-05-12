import { db } from './db';
import { supabase } from './supabase';

const SYNC_INTERVAL_MS = 30_000; // 30 seconds
const STALE_HOURS = 24;

let syncTimer: ReturnType<typeof setInterval> | null = null;

/** Returns true if any pending transaction is older than STALE_HOURS */
export async function hasStaleUnsynced(): Promise<boolean> {
  const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString();
  const stale = await db.pendingTransactions
    .where('createdAt')
    .below(cutoff)
    .and((t) => t.syncedAt === null)
    .count();
  return stale > 0;
}

/** Returns count of all unsynced pending transactions */
export async function unsyncedCount(): Promise<number> {
  return db.pendingTransactions.where('syncedAt').equals('').count()
    .catch(() =>
      db.pendingTransactions.filter((t) => t.syncedAt === null).count()
    );
}

/** Attempt to push all pending operations to Supabase */
export async function syncPendingTransactions(): Promise<void> {
  if (!navigator.onLine) return;

  const pending = await db.pendingTransactions
    .filter((t) => t.syncedAt === null)
    .toArray();

  if (pending.length === 0) return;

  for (const item of pending) {
    try {
      if (item.operation === 'insert') {
        const { error } = await supabase.from(item.table).insert(item.data);
        if (error) throw error;
      } else if (item.operation === 'update') {
        const { error } = await supabase
          .from(item.table)
          .update(item.data)
          .eq('id', (item.data as any).id);
        if (error) throw error;
      } else if (item.operation === 'delete') {
        const { error } = await supabase
          .from(item.table)
          .delete()
          .eq('id', (item.data as any).id);
        if (error) throw error;
      }

      // Mark as synced
      await db.pendingTransactions.update(item.id!, {
        syncedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[sync] Failed to sync item', item.id, err);
    }
  }

  // Clean up synced items older than 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.pendingTransactions
    .filter((t) => t.syncedAt !== null && t.syncedAt < weekAgo)
    .delete();
}

/** Start background sync loop */
export function startSyncLoop(): void {
  if (syncTimer) return;

  // Sync on reconnect
  window.addEventListener('online', syncPendingTransactions);

  // Sync every 30 seconds
  syncTimer = setInterval(syncPendingTransactions, SYNC_INTERVAL_MS);

  // Initial sync attempt
  syncPendingTransactions();
}

/** Stop background sync loop */
export function stopSyncLoop(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  window.removeEventListener('online', syncPendingTransactions);
}

/** Add an operation to the offline queue */
export async function queueOperation(
  table: string,
  operation: 'insert' | 'update' | 'delete',
  data: object
): Promise<void> {
  await db.pendingTransactions.add({
    localId: `${table}_${operation}_${Date.now()}`,
    data,
    table,
    operation,
    createdAt: new Date().toISOString(),
    syncedAt: null,
  });
}
