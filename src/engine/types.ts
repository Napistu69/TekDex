import type { Sex } from './ark';

export interface SpeciesStat {
  base: number;
  incWild: number;
  incMut: number;
  incDom: number;
  addWhenTamed: number;
  multAffinity: number;
  increaseAsPercentage: boolean;
  cap: number;
}

export interface ServerMultipliers {
  statMultipliers: number[][];
  tamingSpeedMultiplier: number;
  matingIntervalMultiplier: number;
  eggHatchSpeedMultiplier: number;
  babyMatureSpeedMultiplier: number;
  babyCuddleIntervalMultiplier: number;
  babyImprintingStatScaleMultiplier: number;
  babyImprintAmountMultiplier: number;
  babyFoodConsumptionSpeedMultiplier: number;
  dinoCharacterFoodDrainMultiplier: number;
  tamedDinoCharacterFoodDrainMultiplier: number;
  allowSpeedLeveling: boolean;
  allowFlyerSpeedLeveling: boolean;
  singlePlayerSettings: boolean;
}

export interface Species {
  name: string;
  blueprintPath: string;
  variants: string[];
  displayName: string;
  stats: SpeciesStat[];
  usedStats: number;
  displayedStats: number;
  skipWildLevelStats: number;
  statImprintMultipliers: number[];
  tamedBaseHealthMultiplier: number;
  isFlyer: boolean;
  noGender: boolean;
  canBreed: boolean;
  canTame: boolean;
  breeding?: {
    /** Seconds at 1× EggHatchSpeed. Field: breeding.incubationTime in values.json. */
    incubationTime: number;
    /** Seconds at 1× EggHatchSpeed. Field: breeding.gestationTime in values.json. */
    gestationTime: number;
    /** Seconds at 1× BabyMatureSpeed. Field: breeding.maturationTime in values.json. */
    maturationTime: number;
    /** Seconds at 1× MatingInterval. Field: breeding.matingCooldownMin. */
    matingCooldownMin: number;
    /** Seconds at 1× MatingInterval. Field: breeding.matingCooldownMax. */
    matingCooldownMax: number;
    /** Celsius. Fields: breeding.eggTempMin / eggTempMax. */
    eggTempMin: number;
    eggTempMax: number;
  };
  taming?: {
    /** Hunger units / sec at 100% maturation (times food-drain multipliers). Field: taming.foodConsumptionBase. */
    foodConsumptionBase: number;
    /** Taming-only drain mult; not used for raising. Field: taming.foodConsumptionMult. */
    foodConsumptionMult: number;
    /** Extra drain at 0% maturation. Field: taming.babyFoodConsumptionMult. */
    babyFoodConsumptionMult: number;
  };
}

export interface Creature {
  /** Stable UUID for this record. Never recycle an id once issued. */
  id: string;
  /** TekDex creature record version. Current: 1. See docs/DATA_MODEL.md. */
  schemaVersion: number;
  /** Game this record was captured in. v1 uses 'ASA' (or 'ASE'). */
  game: string;
  /** Unreal blueprint path — portable species identity across library exports. */
  speciesBlueprint: string;
  speciesName: string;
  name: string;
  sex: Sex;
  isBred: boolean;
  isTamed: boolean;
  levelsWild: number[];
  levelsDom: number[];
  levelsMut: number[];
  tamingEff: number;
  imprintingBonus: number;
  owner: string;
  tribe: string;
  note: string;
  colors: number[];
  fatherId?: string;
  motherId?: string;
  fatherName?: string;
  motherName?: string;
  mutationsMaternal: number;
  mutationsPaternal: number;
  arkId?: number;
  addedAt: string;
  tags: string[];
}

export function emptyLevels(): number[] {
  return Array(12).fill(0);
}

export function defaultMultipliers(): ServerMultipliers {
  return {
    statMultipliers: Array.from({ length: 12 }, () => [1, 1, 1, 1]),
    tamingSpeedMultiplier: 1,
    matingIntervalMultiplier: 1,
    eggHatchSpeedMultiplier: 1,
    babyMatureSpeedMultiplier: 1,
    babyCuddleIntervalMultiplier: 1,
    babyImprintingStatScaleMultiplier: 1,
    babyImprintAmountMultiplier: 1,
    babyFoodConsumptionSpeedMultiplier: 1,
    dinoCharacterFoodDrainMultiplier: 1,
    tamedDinoCharacterFoodDrainMultiplier: 1,
    allowSpeedLeveling: false,
    allowFlyerSpeedLeveling: false,
    singlePlayerSettings: false,
  };
}

export interface ExtractionInput {
  species: Species;
  level: number;
  statValues: number[];
  tamed: boolean;
  bred: boolean;
  teMin: number;
  teMax: number;
  imprintingBonus: number;
  multipliers: ServerMultipliers;
  highPrecision: boolean;
}

export interface StatCandidate {
  wild: number;
  mut: number;
  dom: number;
  teMin: number;
  teMax: number;
}

export interface ExtractionResult {
  ok: boolean;
  unique: boolean;
  message: string;
  wildMutSum: number;
  domSum: number;
  imprintingBonus: number;
  candidates: StatCandidate[][];
  chosen: number[];
}
