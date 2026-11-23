/**
 * Game constants and the forward stat formula, ported from ARK Smart Breeding
 * (Copyright (c) 2015 cadon, MIT License). See LICENSE and THIRD_PARTY_NOTICES.
 */

export const STATS_COUNT = 12;

export const Stat = {
  Health: 0,
  Stamina: 1,
  Torpidity: 2,
  Oxygen: 3,
  Food: 4,
  Water: 5,
  Temperature: 6,
  Weight: 7,
  Melee: 8,
  Speed: 9,
  Fortitude: 10,
  Crafting: 11,
} as const;

export type StatIndex = (typeof Stat)[keyof typeof Stat];

export const STAT_NAMES = [
  'Health',
  'Stamina',
  'Torpidity',
  'Oxygen',
  'Food',
  'Water',
  'Temperature',
  'Weight',
  'Melee',
  'Speed',
  'Fortitude',
  'Crafting',
] as const;

export const STAT_SHORT = ['HP', 'St', 'To', 'Ox', 'Fo', 'Wa', 'Te', 'We', 'Dm', 'Sp', 'Ft', 'Cr'] as const;

/** Game display order (torpor last). */
export const DISPLAY_ORDER = [
  Stat.Health,
  Stat.Stamina,
  Stat.Oxygen,
  Stat.Food,
  Stat.Water,
  Stat.Temperature,
  Stat.Weight,
  Stat.Melee,
  Stat.Speed,
  Stat.Fortitude,
  Stat.Crafting,
  Stat.Torpidity,
];

export const USUALLY_VISIBLE = [true, true, true, true, true, false, false, true, true, true, false, false];

export function isPercentageStat(stat: number): boolean {
  return stat === Stat.Melee || stat === Stat.Speed || stat === Stat.Crafting;
}

export function precision(stat: number): number {
  return isPercentageStat(stat) ? 3 : 1;
}

export const PROBABILITY_INHERIT_HIGHER = 0.55;
export const PROBABILITY_INHERIT_LOWER = 0.45;
export const PROBABILITY_OF_MUTATION = 0.025;
export const MUTATION_ROLLS = 3;
export const LEVELS_ADDED_PER_MUTATION = 2;
export const MUTATION_POSSIBLE_WITH_LESS_THAN = 20;

export const DEFAULT_IMPRINT_ASE = [0.2, 0, 0.2, 0, 0.2, 0.2, 0, 0.2, 0.2, 0.2, 0, 0];

export const RAW_BASE = 0;
export const RAW_WILD = 1;
export const RAW_DOM = 2;
export const RAW_TAME_ADD = 3;
export const RAW_TAME_MULT = 4;

export const MULT_TAME_ADD = 0;
export const MULT_TAME_MULT = 1;
export const MULT_LEVEL_DOM = 2;
export const MULT_LEVEL_WILD = 3;

export type Sex = 'unknown' | 'male' | 'female';

export function sexFromAsb(value: unknown): Sex {
  if (value === 1 || value === 'Male' || value === 'male') return 'male';
  if (value === 2 || value === 'Female' || value === 'female') return 'female';
  return 'unknown';
}

export function sexToAsb(sex: Sex): number {
  if (sex === 'male') return 1;
  if (sex === 'female') return 2;
  return 0;
}
