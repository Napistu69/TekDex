/**
 * TekDex portable library schema.
 * See docs/DATA_MODEL.md for versioning, stable IDs, and future-portability notes.
 */
import { STATS_COUNT } from './ark';
import { cryptoRandomId } from './asb';
import { emptyLevels, type Creature, type ServerMultipliers } from './types';

export const TEKDEX_SCHEMA_ID = 'tekdex.library' as const;
export const TEKDEX_LIBRARY_SCHEMA_VERSION = 1;
export const TEKDEX_CREATURE_SCHEMA_VERSION = 1;

export interface TekDexLibrary {
  schema: typeof TEKDEX_SCHEMA_ID;
  schemaVersion: number;
  exportedAt: string;
  game: string;
  multipliers?: ServerMultipliers;
  creatures: Creature[];
}

function pad(arr?: number[]): number[] {
  const out = emptyLevels();
  if (!arr) return out;
  for (let i = 0; i < Math.min(STATS_COUNT, arr.length); i++) out[i] = arr[i] ?? 0;
  return out;
}

/** Guarantee a stable UUID, schema version, and padded level arrays. */
export function normalizeCreature(c: Creature): Creature {
  return {
    ...c,
    id: c.id || cryptoRandomId(),
    schemaVersion: c.schemaVersion ?? TEKDEX_CREATURE_SCHEMA_VERSION,
    game: c.game ?? 'ASA',
    levelsWild: pad(c.levelsWild),
    levelsDom: pad(c.levelsDom),
    levelsMut: pad(c.levelsMut),
    colors: c.colors?.length ? c.colors : [0, 0, 0, 0, 0, 0],
    tags: c.tags ?? [],
    addedAt: c.addedAt || new Date().toISOString(),
  };
}

export function exportTekDexLibrary(creatures: Creature[], multipliers?: ServerMultipliers): string {
  const doc: TekDexLibrary = {
    schema: TEKDEX_SCHEMA_ID,
    schemaVersion: TEKDEX_LIBRARY_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    game: 'ASA',
    multipliers,
    creatures: creatures.map(normalizeCreature),
  };
  return JSON.stringify(doc, null, 2);
}

export function isTekDexLibrary(value: unknown): value is TekDexLibrary {
  if (!value || typeof value !== 'object') return false;
  const v = value as TekDexLibrary;
  return v.schema === TEKDEX_SCHEMA_ID && Array.isArray(v.creatures);
}

export function parseTekDexLibrary(text: string): TekDexLibrary {
  const raw = JSON.parse(text) as unknown;
  if (!isTekDexLibrary(raw)) throw new Error('Not a TekDex library document.');
  return {
    ...raw,
    schemaVersion: raw.schemaVersion ?? 1,
    creatures: raw.creatures.map(normalizeCreature),
  };
}
