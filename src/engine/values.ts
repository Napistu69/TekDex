/**
 * Load and merge values.json + ASA-values.json, then apply server multipliers.
 * Data files and merge rules follow ARK Smart Breeding (Copyright (c) 2015 cadon, MIT).
 */
import {
  DEFAULT_IMPRINT_ASE,
  MULT_LEVEL_DOM,
  MULT_LEVEL_WILD,
  MULT_TAME_ADD,
  MULT_TAME_MULT,
  RAW_BASE,
  RAW_DOM,
  RAW_TAME_ADD,
  RAW_TAME_MULT,
  RAW_WILD,
  STATS_COUNT,
  Stat,
} from './ark';
import { defaultMultipliers, type ServerMultipliers, type Species, type SpeciesStat } from './types';

interface RawSpecies {
  name: string;
  blueprintPath: string;
  variants?: string[];
  fullStatsRaw?: Array<number[] | null>;
  statImprintMult?: number[];
  TamedBaseHealthMultiplier?: number;
  displayedStats?: number;
  skipWildLevelStats?: number[] | number;
  isFlyer?: boolean;
  noGender?: boolean;
  breeding?: {
    gestationTime?: number;
    incubationTime?: number;
    maturationTime?: number;
    matingCooldownMin?: number;
    matingCooldownMax?: number;
    eggTempMin?: number;
    eggTempMax?: number;
  };
  taming?: {
    violent?: boolean;
    nonViolent?: boolean;
    foodConsumptionBase?: number;
    foodConsumptionMult?: number;
    babyFoodConsumptionMult?: number;
  };
}

interface ValuesFile {
  version?: string;
  format?: string;
  species?: RawSpecies[];
  remaps?: Record<string, string>;
}

let cache: { species: Species[]; byBlueprint: Map<string, Species>; version: string } | null = null;

export async function loadSpeciesIndex(): Promise<{ species: Species[]; byBlueprint: Map<string, Species>; version: string }> {
  if (cache) return cache;
  const [baseRes, asaRes] = await Promise.all([
    fetch('/data/values.json'),
    fetch('/data/ASA-values.json'),
  ]);
  if (!baseRes.ok || !asaRes.ok) throw new Error('Could not load species values files.');
  const base = (await baseRes.json()) as ValuesFile;
  const asa = (await asaRes.json()) as ValuesFile;
  const byBp = new Map<string, RawSpecies>();
  for (const s of base.species ?? []) {
    if (s.blueprintPath) byBp.set(s.blueprintPath, { ...s });
  }
  const remaps = { ...(base.remaps ?? {}), ...(asa.remaps ?? {}) };
  for (const s of asa.species ?? []) {
    const bp = s.blueprintPath;
    if (!bp) continue;
    const existing = byBp.get(bp);
    if (existing) {
      byBp.set(bp, { ...existing, ...s, fullStatsRaw: s.fullStatsRaw ?? existing.fullStatsRaw });
    } else {
      byBp.set(bp, s);
    }
  }
  for (const [from, to] of Object.entries(remaps)) {
    const src = byBp.get(from);
    if (src && !byBp.has(to)) byBp.set(to, { ...src, blueprintPath: to });
  }

  // Store RAW species; multipliers applied per call via finalizeSpecies.
  const rawList = [...byBp.values()].filter((s) => s.fullStatsRaw && s.name);
  const version = `ASE ${base.version ?? '?'} + ASA ${asa.version ?? '?'}`;

  // We keep raw stats on a WeakMap via finalize... actually store raw on the species by
  // first finalizing with 1x multipliers, then re-apply when needed.
  const species = rawList.map((r) => finalizeSpecies(r, defaultMultipliers(), true));
  const byBlueprint = new Map(species.map((s) => [s.blueprintPath, s]));
  cache = { species, byBlueprint, version };
  // stash raw for re-application
  rawCache = new Map(rawList.map((r) => [r.blueprintPath, r]));
  return cache;
}

let rawCache = new Map<string, RawSpecies>();

export function applyMultipliersToSpecies(species: Species, multipliers: ServerMultipliers): Species {
  const raw = rawCache.get(species.blueprintPath);
  if (!raw) return species;
  return finalizeSpecies(raw, multipliers, false);
}

function skipMask(skip: number[] | number | undefined): number {
  if (typeof skip === 'number') return skip;
  if (!skip) return 0;
  return skip.reduce((m, i) => m | (1 << i), 0);
}

function finalizeSpecies(raw: RawSpecies, m: ServerMultipliers, _unusedRawOnes: boolean): Species {
  const stats: SpeciesStat[] = [];
  let used = 0;
  const skip = skipMask(raw.skipWildLevelStats);
  for (let s = 0; s < STATS_COUNT; s++) {
    const row = raw.fullStatsRaw?.[s];
    const statM = m.statMultipliers[s] ?? [1, 1, 1, 1];
    if (!row) {
      stats.push({
        base: 0, incWild: 0, incMut: 0, incDom: 0,
        addWhenTamed: 0, multAffinity: 0, increaseAsPercentage: true, cap: Number.MAX_VALUE,
      });
      continue;
    }
    used |= 1 << s;
    const base = row[RAW_BASE] ?? 0;
    let add = row[RAW_TAME_ADD] ?? 0;
    let tm = row[RAW_TAME_MULT] ?? 0;
    let id = row[RAW_DOM] ?? 0;
    let iw = row[RAW_WILD] ?? 0;
    if (add > 0) add *= statM[MULT_TAME_ADD] ?? 1;
    if (tm > 0) tm *= statM[MULT_TAME_MULT] ?? 1;
    id *= statM[MULT_LEVEL_DOM] ?? 1;
    iw *= statM[MULT_LEVEL_WILD] ?? 1;

    // Single-player extra multipliers (ASB applies official * then SP file).
    // Callers should already fold SP into `m.statMultipliers`.

    let incWild = iw;
    // ASA speed: no wild/dom speed levels unless allowed
    if (s === Stat.Speed && !m.allowSpeedLeveling && !(raw.isFlyer && m.allowFlyerSpeedLeveling)) {
      // Flyer speed: if not allowFlyerSpeedLeveling, wild speed stays 0 (inc may already be 0).
      if (raw.isFlyer && !m.allowFlyerSpeedLeveling) {
        incWild = raw.isFlyer ? 0 : incWild;
        id = 0;
      } else if (!m.allowSpeedLeveling) {
        // ASA default: cannot level speed
        id = 0;
        // wild speed inc often already 0 for many species
      }
    }
    if (raw.isFlyer && s === Stat.Speed && !m.allowFlyerSpeedLeveling) {
      incWild = 0;
      id = 0;
    }

    stats.push({
      base,
      incWild,
      incMut: incWild, // default mutation increment equals wild; species may override later
      incDom: id,
      addWhenTamed: add,
      multAffinity: tm,
      increaseAsPercentage: true,
      cap: Number.MAX_VALUE,
    });
  }

  const imprint = raw.statImprintMult?.length === STATS_COUNT
    ? raw.statImprintMult.slice()
    : DEFAULT_IMPRINT_ASE.slice();
  if (!m.allowSpeedLeveling) imprint[Stat.Speed] = 0;

  const variants = raw.variants ?? [];
  const displayName = variants.length ? `${raw.name} (${variants.filter((v) => !isNoisyVariant(v)).join(', ') || variants.join(', ')})` : raw.name;

  const canBreed = Boolean(raw.breeding && (raw.breeding.incubationTime || raw.breeding.gestationTime || raw.breeding.maturationTime));
  const canTame = Boolean(raw.taming?.violent || raw.taming?.nonViolent || canBreed);

  return {
    name: raw.name,
    blueprintPath: raw.blueprintPath,
    variants,
    displayName: variants.length ? `${raw.name} — ${variants.join(', ')}` : raw.name,
    stats,
    usedStats: used,
    displayedStats: raw.displayedStats ?? 927,
    skipWildLevelStats: skip,
    statImprintMultipliers: imprint,
    tamedBaseHealthMultiplier: raw.TamedBaseHealthMultiplier ?? 1,
    isFlyer: Boolean(raw.isFlyer),
    noGender: Boolean(raw.noGender),
    canBreed,
    canTame,
    breeding: raw.breeding
      ? {
          incubationTime: raw.breeding.incubationTime ?? 0,
          gestationTime: raw.breeding.gestationTime ?? 0,
          maturationTime: raw.breeding.maturationTime ?? 0,
          matingCooldownMin: raw.breeding.matingCooldownMin ?? 0,
          matingCooldownMax: raw.breeding.matingCooldownMax ?? 0,
          eggTempMin: raw.breeding.eggTempMin ?? 0,
          eggTempMax: raw.breeding.eggTempMax ?? 0,
        }
      : undefined,
    taming: raw.taming
      ? {
          foodConsumptionBase: raw.taming.foodConsumptionBase ?? 0,
          foodConsumptionMult: raw.taming.foodConsumptionMult ?? 0,
          babyFoodConsumptionMult: raw.taming.babyFoodConsumptionMult ?? 0,
        }
      : undefined,
  };
}

function isNoisyVariant(v: string): boolean {
  return /mission|gauntlet|summoned|hunt|boss|minion|vr\b/i.test(v);
}

export function usesStat(species: Species, stat: number): boolean {
  return (species.usedStats & (1 << stat)) !== 0;
}

export function displaysStat(species: Species, stat: number): boolean {
  return (species.displayedStats & (1 << stat)) !== 0;
}

export function canHaveWildLevels(species: Species, stat: number): boolean {
  if ((species.skipWildLevelStats & (1 << stat)) !== 0) return false;
  return usesStat(species, stat) && species.stats[stat].incWild !== 0;
}

export async function loadServerMultiplierPresets(): Promise<Record<string, Partial<ServerMultipliers> & { statMultipliers?: Array<number[] | null> }>> {
  const res = await fetch('/data/serverMultipliers.json');
  const json = await res.json();
  return json.serverMultiplierDictionary ?? {};
}

export function foldPreset(
  base: ServerMultipliers,
  preset: { statMultipliers?: Array<number[] | null>; TamingSpeedMultiplier?: number; MatingIntervalMultiplier?: number; EggHatchSpeedMultiplier?: number; BabyMatureSpeedMultiplier?: number; BabyCuddleIntervalMultiplier?: number; BabyImprintingStatScaleMultiplier?: number; AllowSpeedLeveling?: boolean; AllowFlyerSpeedLeveling?: boolean },
  extra?: typeof preset,
): ServerMultipliers {
  const out = structuredClone(base);
  const apply = (p?: typeof preset) => {
    if (!p) return;
    if (p.statMultipliers) {
      p.statMultipliers.forEach((row, s) => {
        if (!row) return;
        for (let i = 0; i < 4; i++) out.statMultipliers[s][i] *= row[i] ?? 1;
      });
    }
    if (p.TamingSpeedMultiplier != null) out.tamingSpeedMultiplier *= p.TamingSpeedMultiplier;
    if (p.MatingIntervalMultiplier != null) out.matingIntervalMultiplier *= p.MatingIntervalMultiplier;
    if (p.EggHatchSpeedMultiplier != null) out.eggHatchSpeedMultiplier *= p.EggHatchSpeedMultiplier;
    if (p.BabyMatureSpeedMultiplier != null) out.babyMatureSpeedMultiplier *= p.BabyMatureSpeedMultiplier;
    if (p.BabyCuddleIntervalMultiplier != null) out.babyCuddleIntervalMultiplier *= p.BabyCuddleIntervalMultiplier;
    if (p.BabyImprintingStatScaleMultiplier != null) {
      out.babyImprintingStatScaleMultiplier *= p.BabyImprintingStatScaleMultiplier;
    }
    if (p.AllowSpeedLeveling) out.allowSpeedLeveling = true;
    if (p.AllowFlyerSpeedLeveling) out.allowFlyerSpeedLeveling = true;
  };
  apply(preset);
  apply(extra);
  return out;
}

export function officialAsaMultipliers(singlePlayer = false, presets?: Record<string, any>): ServerMultipliers {
  const base = defaultMultipliers();
  if (!presets) {
    // Hard-coded official HP / melee from the bundled serverMultipliers.json
    base.statMultipliers[Stat.Health] = [0.14, 0.44, 0.2, 1];
    base.statMultipliers[Stat.Melee] = [0.14, 0.44, 0.17, 1];
    if (singlePlayer) {
      const sp = foldPreset(base, {
        statMultipliers: [
          [3.57142857, 2.27272727, 2.125, 1],
          null, null, null, null, null, null, null,
          [3.57142857, 2.27272727, 2.35294118, 1],
        ],
        TamingSpeedMultiplier: 2.5,
        MatingIntervalMultiplier: 0.125,
        EggHatchSpeedMultiplier: 10,
        BabyMatureSpeedMultiplier: 36.799,
        BabyCuddleIntervalMultiplier: 0.167,
      } as any);
      sp.singlePlayerSettings = true;
      return sp;
    }
    return base;
  }
  const official = presets.official ?? {};
  const sp = singlePlayer ? presets.singleplayer ?? presets.singlePlayer : undefined;
  const out = foldPreset(base, official, sp);
  out.singlePlayerSettings = singlePlayer;
  return out;
}

export function searchSpecies(list: Species[], query: string, opts?: { breedableOnly?: boolean; hideNoisy?: boolean }): Species[] {
  const q = query.trim().toLowerCase();
  return list.filter((s) => {
    if (opts?.breedableOnly && !s.canBreed) return false;
    if (opts?.hideNoisy && s.variants.some(isNoisyVariant)) return false;
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.displayName.toLowerCase().includes(q) ||
      s.variants.some((v) => v.toLowerCase().includes(q)) ||
      s.blueprintPath.toLowerCase().includes(q)
    );
  });
}

/** Preferred "plain" official species (no mission variants) matching a name. */
export function preferredSpecies(list: Species[], name: string): Species | undefined {
  const hits = list.filter((s) => s.name.toLowerCase() === name.toLowerCase());
  return hits.find((s) => s.variants.length === 0) ?? hits[0];
}

export function speciesByBlueprint(list: Species[], bp: string, remapped = true): Species | undefined {
  void remapped;
  return list.find((s) => s.blueprintPath === bp);
}

export { isNoisyVariant };
