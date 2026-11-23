/**
 * Read and write ARK Smart Breeding .asb library JSON (format 1.13).
 * Field names follow Creature / CreatureCollection in ASB
 * (Copyright (c) 2015 cadon, MIT License).
 */
import { sexFromAsb, sexToAsb, STATS_COUNT } from './ark';
import { emptyLevels, type Creature, type ServerMultipliers } from './types';

export const ASB_FORMAT_VERSION = '1.13';

export interface AsbCollection {
  FormatVersion?: string;
  formatVersion?: string;
  Game?: string;
  creatures?: AsbCreature[];
  serverMultipliers?: Partial<AsbMultipliers>;
  singlePlayerSettings?: boolean;
  maxDomLevel?: number;
  maxWildLevel?: number;
  modIDs?: string[];
}

interface AsbMultipliers {
  statMultipliers?: number[][];
  TamingSpeedMultiplier?: number;
  MatingIntervalMultiplier?: number;
  EggHatchSpeedMultiplier?: number;
  BabyMatureSpeedMultiplier?: number;
  BabyCuddleIntervalMultiplier?: number;
  BabyImprintingStatScaleMultiplier?: number;
  BabyImprintAmountMultiplier?: number;
  AllowSpeedLeveling?: boolean;
  AllowFlyerSpeedLeveling?: boolean;
  SinglePlayerSettings?: boolean;
}

interface AsbCreature {
  guid?: string;
  name?: string;
  speciesBlueprint?: string;
  sex?: number | string;
  levelsWild?: number[];
  levelsDom?: number[];
  levelsMutated?: number[];
  tamingEff?: number;
  imprintingBonus?: number;
  isBred?: boolean;
  owner?: string;
  tribe?: string;
  note?: string;
  colors?: number[];
  fatherGuid?: string;
  motherGuid?: string;
  fatherName?: string;
  motherName?: string;
  mutationsMaternal?: number;
  mutationsPaternal?: number;
  ArkId?: number;
  tags?: string[];
}

export function parseAsbJson(text: string): { creatures: Creature[]; game?: string; multipliers?: Partial<AsbMultipliers>; raw: AsbCollection } {
  const raw = JSON.parse(text) as AsbCollection;
  const list = raw.creatures ?? [];
  const creatures = list.map(fromAsbCreature).filter((c): c is Creature => c != null);
  return { creatures, game: raw.Game, multipliers: raw.serverMultipliers, raw };
}

function pad(arr?: number[]): number[] {
  const out = emptyLevels();
  if (!arr) return out;
  for (let i = 0; i < Math.min(STATS_COUNT, arr.length); i++) out[i] = arr[i] ?? 0;
  return out;
}

function fromAsbCreature(c: AsbCreature): Creature | null {
  if (!c.speciesBlueprint && !c.name) return null;
  return {
    id: c.guid || cryptoRandomId(),
    schemaVersion: 1,
    game: 'ASA',
    speciesBlueprint: c.speciesBlueprint ?? '',
    speciesName: guessNameFromBlueprint(c.speciesBlueprint ?? '') || c.name || 'Unknown',
    name: c.name ?? '',
    sex: sexFromAsb(c.sex),
    isBred: Boolean(c.isBred),
    isTamed: (c.tamingEff ?? 0) > -3 || Boolean(c.isBred),
    levelsWild: pad(c.levelsWild),
    levelsDom: pad(c.levelsDom),
    levelsMut: pad(c.levelsMutated),
    tamingEff: c.tamingEff ?? (c.isBred ? 1 : 0),
    imprintingBonus: c.imprintingBonus ?? 0,
    owner: c.owner ?? '',
    tribe: c.tribe ?? '',
    note: c.note ?? '',
    colors: c.colors ?? [0, 0, 0, 0, 0, 0],
    fatherId: c.fatherGuid || undefined,
    motherId: c.motherGuid || undefined,
    fatherName: c.fatherName,
    motherName: c.motherName,
    mutationsMaternal: c.mutationsMaternal ?? 0,
    mutationsPaternal: c.mutationsPaternal ?? 0,
    arkId: c.ArkId,
    addedAt: new Date().toISOString(),
    tags: c.tags ?? [],
  };
}

export function exportAsb(creatures: Creature[], multipliers?: ServerMultipliers): string {
  const collection: AsbCollection = {
    FormatVersion: ASB_FORMAT_VERSION,
    Game: 'ASA',
    creatures: creatures.map((c) => ({
      guid: c.id,
      name: c.name,
      speciesBlueprint: c.speciesBlueprint,
      sex: sexToAsb(c.sex),
      levelsWild: c.levelsWild,
      levelsDom: c.levelsDom,
      levelsMutated: c.levelsMut,
      tamingEff: c.tamingEff,
      imprintingBonus: c.imprintingBonus,
      isBred: c.isBred,
      owner: c.owner || undefined,
      tribe: c.tribe || undefined,
      note: c.note || undefined,
      fatherGuid: c.fatherId,
      motherGuid: c.motherId,
      fatherName: c.fatherName,
      motherName: c.motherName,
      mutationsMaternal: c.mutationsMaternal,
      mutationsPaternal: c.mutationsPaternal,
      ArkId: c.arkId,
    })),
    singlePlayerSettings: multipliers?.singlePlayerSettings,
    serverMultipliers: multipliers
      ? {
          statMultipliers: multipliers.statMultipliers,
          TamingSpeedMultiplier: multipliers.tamingSpeedMultiplier,
          MatingIntervalMultiplier: multipliers.matingIntervalMultiplier,
          EggHatchSpeedMultiplier: multipliers.eggHatchSpeedMultiplier,
          BabyMatureSpeedMultiplier: multipliers.babyMatureSpeedMultiplier,
          BabyCuddleIntervalMultiplier: multipliers.babyCuddleIntervalMultiplier,
          BabyImprintingStatScaleMultiplier: multipliers.babyImprintingStatScaleMultiplier,
          BabyImprintAmountMultiplier: multipliers.babyImprintAmountMultiplier,
          AllowSpeedLeveling: multipliers.allowSpeedLeveling,
          AllowFlyerSpeedLeveling: multipliers.allowFlyerSpeedLeveling,
          SinglePlayerSettings: multipliers.singlePlayerSettings,
        }
      : undefined,
  };
  return JSON.stringify(collection, null, 2);
}

export function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function guessNameFromBlueprint(bp: string): string {
  const leaf = bp.split('/').pop() ?? '';
  return leaf.replace(/_Character_BP.*$/, '').replace(/_/g, ' ');
}
