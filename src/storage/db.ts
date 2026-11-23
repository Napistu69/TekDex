import type { Creature, ServerMultipliers } from '../engine/types';
import type { SavedTimer } from '../engine/timers';

const DB_NAME = 'tekdex';
const DB_VERSION = 1;
const LEGACY_DB = 'tektribe-breeder';

export interface StoredSettings {
  multipliers: ServerMultipliers;
  demoSeeded: boolean;
  hideNoisy: boolean;
}

function openNamed(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function open(): Promise<IDBDatabase> {
  const db = await openNamed(DB_NAME);
  return db;
}

function getFrom(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly');
    const req = tx.objectStore('kv').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

function get<T>(key: string): Promise<T | undefined> {
  return open().then((db) => getFrom(db, key) as Promise<T | undefined>);
}

function set<T>(key: string, value: T): Promise<void> {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(value, key);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      }),
  );
}

/** Copy v1 library/settings once from the old database name. */
export async function migrateLegacyIfNeeded(): Promise<void> {
  const existing = await get<Creature[]>('creatures');
  if (existing && existing.length) return;
  try {
    const old = await openNamed(LEGACY_DB);
    const [creatures, settings] = await Promise.all([
      new Promise((resolve, reject) => {
        const tx = old.transaction('kv', 'readonly');
        const req = tx.objectStore('kv').get('creatures');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
      new Promise((resolve, reject) => {
        const tx = old.transaction('kv', 'readonly');
        const req = tx.objectStore('kv').get('settings');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
    ]);
    old.close();
    if (Array.isArray(creatures) && creatures.length) await set('creatures', creatures);
    if (settings) await set('settings', settings);
  } catch {
    // no legacy db
  }
}

export function loadCreatures(): Promise<Creature[]> {
  return get<Creature[]>('creatures').then((v) => v ?? []);
}

export function saveCreatures(list: Creature[]): Promise<void> {
  return set('creatures', list);
}

export function loadSettings(): Promise<StoredSettings | undefined> {
  return get<StoredSettings>('settings');
}

export function saveSettings(settings: StoredSettings): Promise<void> {
  return set('settings', settings);
}

export function loadTimers(): Promise<SavedTimer[]> {
  return get<SavedTimer[]>('timers').then((v) => v ?? []);
}

export function saveTimers(list: SavedTimer[]): Promise<void> {
  return set('timers', list);
}

export async function clearAll(): Promise<void> {
  await saveCreatures([]);
}
