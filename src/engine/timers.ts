/**
 * Raising / breeding timer math.
 *
 * Duration bases come from the bundled ARK Smart Breeding values files
 * (Copyright (c) 2015 cadon, MIT):
 *   breeding.incubationTime, breeding.gestationTime, breeding.maturationTime,
 *   breeding.matingCooldownMin / matingCooldownMax, breeding.eggTempMin / eggTempMax,
 *   taming.foodConsumptionBase, taming.babyFoodConsumptionMult
 * (seconds at 1× multipliers).
 *
 * Multipliers follow ASB Values.cs:
 *   incubation/gestation = base / EggHatchSpeedMultiplier
 *   maturation         = base / BabyMatureSpeedMultiplier
 *   mating cooldown    = base * MatingIntervalMultiplier
 *
 * Stages: baby 0–10 %, juvenile 10–50 %, adolescent 50–100 %
 * (ASB Raising.GetRaisingTimes; ARK wiki Breeding).
 *
 * Cuddle interval defaults to 28 800 s (8 h) times BabyCuddleIntervalMultiplier
 * (ARK wiki Imprinting; ASB Ark.DefaultCuddleIntervalInSeconds).
 *
 * Imprint amount per care uses the documented wiki formula
 * (https://ark.wiki.gg/wiki/Imprinting):
 *   V = IAM / (TMT / (MSP * DCIT * CIM) - 0.25), clamped to [0, 1]
 * where TMT is 1× maturation time in seconds.
 *
 * Raising food uses the trapezoid in ASB Trough.FoodAmountFromUntil
 * (hunger units / sec interpolates from base*babyMult at 0 % maturation
 * to base at 100 %).
 */
import type { ServerMultipliers, Species } from './types';

export const BABY_UNTIL = 0.1;
export const JUVENILE_UNTIL = 0.5;
export const DEFAULT_CUDDLE_INTERVAL_SEC = 8 * 60 * 60;
export const MEJOBERRY_FOOD = 30;
export const RAW_MEAT_FOOD = 50;

export type StageName = 'egg' | 'gestating' | 'baby' | 'juvenile' | 'adolescent' | 'adult';

export interface AdjustedTimes {
  incubationSec: number;
  gestationSec: number;
  hatchOrBirthSec: number;
  hatchMode: 'incubation' | 'gestation' | 'none';
  maturationSec: number;
  babySec: number;
  juvenileSec: number;
  adolescentSec: number;
  matingCooldownMinSec: number;
  matingCooldownMaxSec: number;
  cuddleIntervalSec: number;
  imprintPerCare: number;
  eggTempMin: number;
  eggTempMax: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function safeDivisor(n: number): number {
  return n > 1e-8 ? n : 1;
}

export function adjustedTimes(species: Species, m: ServerMultipliers): AdjustedTimes | null {
  const b = species.breeding;
  if (!b) return null;
  const hatch = safeDivisor(m.eggHatchSpeedMultiplier);
  const mature = safeDivisor(m.babyMatureSpeedMultiplier);
  const mating = m.matingIntervalMultiplier > 0 ? m.matingIntervalMultiplier : 1;
  const incubationSec = (b.incubationTime || 0) / hatch;
  const gestationSec = (b.gestationTime || 0) / hatch;
  const hatchMode: AdjustedTimes['hatchMode'] =
    gestationSec > 0 && incubationSec <= 0 ? 'gestation' : incubationSec > 0 ? 'incubation' : 'none';
  const maturationSec = (b.maturationTime || 0) / mature;
  return {
    incubationSec,
    gestationSec,
    hatchOrBirthSec: incubationSec + gestationSec,
    hatchMode,
    maturationSec,
    babySec: maturationSec * BABY_UNTIL,
    juvenileSec: maturationSec * (JUVENILE_UNTIL - BABY_UNTIL),
    adolescentSec: maturationSec * (1 - JUVENILE_UNTIL),
    matingCooldownMinSec: (b.matingCooldownMin || 0) * mating,
    matingCooldownMaxSec: (b.matingCooldownMax || 0) * mating,
    cuddleIntervalSec: cuddleIntervalSeconds(m.babyCuddleIntervalMultiplier),
    imprintPerCare: imprintGainPerCare(
      b.maturationTime || 0,
      m.babyMatureSpeedMultiplier,
      m.babyCuddleIntervalMultiplier,
      m.babyImprintAmountMultiplier,
    ),
    eggTempMin: b.eggTempMin || 0,
    eggTempMax: b.eggTempMax || 0,
  };
}

export function cuddleIntervalSeconds(cuddleIntervalMultiplier: number): number {
  return DEFAULT_CUDDLE_INTERVAL_SEC * (cuddleIntervalMultiplier > 0 ? cuddleIntervalMultiplier : 1);
}

/** Wiki imprint formula. TMT is 1× maturation seconds. Result is 0–1. */
export function imprintGainPerCare(
  maturationTime1xSec: number,
  matureSpeed: number,
  cuddleIntervalMultiplier: number,
  imprintAmountMultiplier: number,
): number {
  const msp = Math.max(matureSpeed, 1e-4);
  const cim = Math.max(cuddleIntervalMultiplier, 1e-4);
  const iam = Math.max(imprintAmountMultiplier, 1e-4);
  if (maturationTime1xSec <= 0) return 1;
  const denom = maturationTime1xSec / (msp * DEFAULT_CUDDLE_INTERVAL_SEC * cim) - 0.25;
  if (denom <= 0) return 1;
  return Math.min(1, iam / denom);
}

export function remainingFromProgress(totalSec: number, progress01: number): number {
  return Math.max(0, totalSec * (1 - clamp(progress01, 0, 1)));
}

export function progressAfterElapsed(totalSec: number, startProgress: number, elapsedSec: number): number {
  if (totalSec <= 0) return 1;
  return clamp(startProgress + elapsedSec / totalSec, 0, 1);
}

export function stageAt(progress01: number): StageName {
  const p = clamp(progress01, 0, 1);
  if (p >= 1) return 'adult';
  if (p >= JUVENILE_UNTIL) return 'adolescent';
  if (p >= BABY_UNTIL) return 'juvenile';
  return 'baby';
}

export function nextMaturationMilestone(progress01: number): { name: StageName; at: number } | null {
  const p = clamp(progress01, 0, 1);
  if (p < BABY_UNTIL) return { name: 'juvenile', at: BABY_UNTIL };
  if (p < JUVENILE_UNTIL) return { name: 'adolescent', at: JUVENILE_UNTIL };
  if (p < 1) return { name: 'adult', at: 1 };
  return null;
}

export function secondsUntilProgress(totalSec: number, nowProgress: number, target: number): number {
  return Math.max(0, (target - nowProgress) * totalSec);
}

/** Hunger units / sec at a given maturation 0–1. ASB Trough.cs. */
export function foodRatePerSec(
  species: Species,
  maturation01: number,
  m: ServerMultipliers,
): number | null {
  const t = species.taming;
  if (!t || t.foodConsumptionBase <= 0) return null;
  const drain = (m.dinoCharacterFoodDrainMultiplier || 1) * (m.tamedDinoCharacterFoodDrainMultiplier || 1);
  const minRate = t.foodConsumptionBase * drain;
  const maxRate = minRate * (t.babyFoodConsumptionMult || 1) * (m.babyFoodConsumptionSpeedMultiplier || 1);
  const p = clamp(maturation01, 0, 1);
  return maxRate + p * (minRate - maxRate);
}

/** Hunger units consumed while maturing from `from` to `until` (0–1). ASB Trough.FoodAmountFromUntil. */
export function foodAmountFromUntil(
  species: Species,
  fromMaturation: number,
  untilMaturation: number,
  m: ServerMultipliers,
  maturationAdjustedSec?: number,
): number | null {
  const t = species.taming;
  const b = species.breeding;
  if (!t || !b || t.foodConsumptionBase <= 0) return null;
  const from = clamp(fromMaturation, 0, 1);
  const until = clamp(untilMaturation, 0, 1);
  if (until <= from) return 0;
  const start = foodRatePerSec(species, from, m);
  const end = foodRatePerSec(species, until, m);
  if (start == null || end == null) return null;
  const duration = maturationAdjustedSec ?? b.maturationTime / safeDivisor(m.babyMatureSpeedMultiplier);
  return duration * (until - from) * (end + 0.5 * Math.abs(start - end));
}

export interface FoodEstimate {
  hungerUnits: number;
  mejoberries: number;
  rawMeat: number;
  perMinuteAtStart: number;
  handFeedUntilJuvenile: boolean;
}

export function foodEstimateRemaining(
  species: Species,
  progress01: number,
  m: ServerMultipliers,
  maturationAdjustedSec?: number,
): FoodEstimate | null {
  const hunger = foodAmountFromUntil(species, progress01, 1, m, maturationAdjustedSec);
  const rate = foodRatePerSec(species, progress01, m);
  if (hunger == null || rate == null) return null;
  return {
    hungerUnits: hunger,
    mejoberries: hunger / MEJOBERRY_FOOD,
    rawMeat: hunger / RAW_MEAT_FOOD,
    perMinuteAtStart: rate * 60,
    handFeedUntilJuvenile: progress01 < BABY_UNTIL,
  };
}

export function formatDuration(totalSec: number): string {
  const sign = totalSec < 0 ? '−' : '';
  let s = Math.max(0, Math.floor(Math.abs(totalSec)));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  if (m || h || d) parts.push(`${m}m`);
  if (!d && (s > 0 || parts.length === 0)) parts.push(`${s}s`);
  return sign + (parts.join(' ') || '0s');
}

export function formatClock(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export type TimerKind = 'incubation' | 'gestation' | 'maturation' | 'cuddle' | 'mating';

export interface SavedTimer {
  id: string;
  name: string;
  speciesBlueprint: string;
  speciesName: string;
  kind: TimerKind;
  /** ISO start of the current run (when not paused). */
  startedAt: string;
  /** Total length of this run in ms (already accounts for start progress). */
  durationMs: number;
  /** For mating, the late end of the window; durationMs is the earliest ready time. */
  durationMaxMs?: number;
  progressStart: number;
  pausedAt: string | null;
  remainingMsWhenPaused: number | null;
  notify: boolean;
  notifyMinutesBefore: number;
  notifiedZero: boolean;
  notifiedSoon: boolean;
  createdAt: string;
}

export interface TimerSnapshot {
  remainingMs: number;
  remainingMaxMs?: number;
  endsAt: Date;
  endsAtMax?: Date;
  running: boolean;
  overdue: boolean;
  progress: number;
}

export function snapshot(timer: SavedTimer, now: Date = new Date()): TimerSnapshot {
  if (timer.pausedAt && timer.remainingMsWhenPaused != null) {
    const remainingMs = Math.max(0, timer.remainingMsWhenPaused);
    const remainingMaxMs =
      timer.durationMaxMs != null
        ? Math.max(0, timer.durationMaxMs - (timer.durationMs - remainingMs))
        : undefined;
    return {
      remainingMs,
      remainingMaxMs,
      endsAt: new Date(now.getTime() + remainingMs),
      endsAtMax: remainingMaxMs != null ? new Date(now.getTime() + remainingMaxMs) : undefined,
      running: false,
      overdue: remainingMs <= 0,
      progress: progressFromRemaining(timer, remainingMs),
    };
  }
  const elapsed = now.getTime() - new Date(timer.startedAt).getTime();
  const remainingMs = Math.max(0, timer.durationMs - elapsed);
  const remainingMaxMs = timer.durationMaxMs != null ? Math.max(0, timer.durationMaxMs - elapsed) : undefined;
  return {
    remainingMs,
    remainingMaxMs,
    endsAt: new Date(new Date(timer.startedAt).getTime() + timer.durationMs),
    endsAtMax: timer.durationMaxMs != null ? new Date(new Date(timer.startedAt).getTime() + timer.durationMaxMs) : undefined,
    running: remainingMs > 0,
    overdue: remainingMs <= 0,
    progress: progressFromRemaining(timer, remainingMs),
  };
}

function progressFromRemaining(timer: SavedTimer, remainingMs: number): number {
  if (timer.kind !== 'maturation' && timer.kind !== 'incubation' && timer.kind !== 'gestation') {
    if (timer.durationMs <= 0) return 1;
    return clamp(1 - remainingMs / timer.durationMs, 0, 1);
  }
  if (timer.durationMs <= 0) return 1;
  const fracDone = 1 - remainingMs / timer.durationMs;
  return clamp(timer.progressStart + (1 - timer.progressStart) * fracDone, 0, 1);
}

export function pauseTimer(timer: SavedTimer, now = new Date()): SavedTimer {
  if (timer.pausedAt) return timer;
  const snap = snapshot(timer, now);
  return {
    ...timer,
    pausedAt: now.toISOString(),
    remainingMsWhenPaused: snap.remainingMs,
  };
}

export function resumeTimer(timer: SavedTimer, now = new Date()): SavedTimer {
  if (!timer.pausedAt || timer.remainingMsWhenPaused == null) return timer;
  const snap = snapshot(timer, now);
  const keepProgress = timer.kind === 'maturation' || timer.kind === 'incubation' || timer.kind === 'gestation';
  return {
    ...timer,
    startedAt: now.toISOString(),
    durationMs: snap.remainingMs,
    durationMaxMs: snap.remainingMaxMs,
    pausedAt: null,
    remainingMsWhenPaused: null,
    progressStart: keepProgress ? snap.progress : timer.progressStart,
  };
}
