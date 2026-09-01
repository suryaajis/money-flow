import type { ApiTransaction } from './api';

export interface OfflineMutation {
  id: string;
  method: 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  clientMutationId?: string;
  createdAt: number;
}

const DB_NAME = 'money-flow-offline';
const DB_VERSION = 1;
const QUEUE = 'mutation-queue';
const CACHE = 'transaction-cache';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(CACHE)) db.createObjectStore(CACHE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = action(tx.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export const cacheTransactions = (rows: ApiTransaction[]) =>
  withStore(CACHE, 'readwrite', (store) => store.put(rows, 'all'));

export const getCachedTransactions = async (): Promise<ApiTransaction[]> =>
  (await withStore<ApiTransaction[] | undefined>(CACHE, 'readonly', (store) => store.get('all'))) ?? [];

export const queueMutation = async (mutation: OfflineMutation) => {
  const result = await withStore(QUEUE, 'readwrite', (store) => store.put(mutation));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('moneyflow:offline-queue-changed'));
  return result;
};

export const listMutations = async (): Promise<OfflineMutation[]> => {
  const rows = await withStore<OfflineMutation[]>(QUEUE, 'readonly', (store) => store.getAll());
  return rows.sort((a, b) => a.createdAt - b.createdAt);
};

export const removeMutation = async (id: string) => {
  await withStore(QUEUE, 'readwrite', (store) => store.delete(id));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('moneyflow:offline-queue-changed'));
};

export async function updateQueuedCreate(clientMutationId: string, patch: Record<string, unknown>) {
  const rows = await listMutations();
  const target = rows.find((row) => row.method === 'POST' && row.clientMutationId === clientMutationId);
  if (!target) return false;
  target.body = { ...(target.body as object), ...patch };
  await queueMutation(target);
  return true;
}

export async function removeQueuedCreate(clientMutationId: string) {
  const rows = await listMutations();
  const target = rows.find((row) => row.method === 'POST' && row.clientMutationId === clientMutationId);
  if (target) await removeMutation(target.id);
}
