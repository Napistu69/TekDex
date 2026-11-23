/**
 * Forward stat formula ported from ARK Smart Breeding
 * StatValueCalculation.CalculateValue (Copyright (c) 2015 cadon, MIT).
 */
import { Stat, precision } from './ark';
import type { ServerMultipliers, Species } from './types';

export function calculateValue(
  species: Species,
  statIndex: number,
  levelWild: number,
  levelMut: number,
  levelDom: number,
  domesticated: boolean,
  tamingEff = 0,
  imprintingBonus = 0,
  roundToIngame = true,
  multipliers?: ServerMultipliers,
): number {
  const st = species.stats[statIndex];
  if (!st || st.base === 0 && st.incWild === 0 && st.incDom === 0) {
    if (!st) return 0;
  }
  if (!st) return 0;
  if (levelWild < 0 && st.incWild !== 0) return -1;

  let add = 0;
  let domMult = 1;
  let imprintingM = 1;
  let tamedBaseHp = 1;
  let ld = levelDom;

  if (domesticated) {
    add = st.addWhenTamed;
    let domMultAffinity = st.multAffinity;
    if (domMultAffinity >= 0) domMultAffinity *= tamingEff;
    domMult = tamingEff >= 0 ? 1 + domMultAffinity : 1;
    const imprintScale = multipliers?.babyImprintingStatScaleMultiplier ?? 1;
    const imprintStat = species.statImprintMultipliers[statIndex] ?? 0;
    if (imprintingBonus > 0 && imprintStat !== 0) {
      imprintingM = 1 + imprintStat * imprintingBonus * imprintScale;
    }
    if (statIndex === Stat.Health) tamedBaseHp = species.tamedBaseHealthMultiplier || 1;
  } else {
    ld = 0;
  }

  const wildInc = levelWild * st.incWild + levelMut * st.incMut;
  const domInc = ld * st.incDom;

  let result = st.increaseAsPercentage
    ? (st.base * (1 + wildInc) * tamedBaseHp * imprintingM + add) * domMult * (1 + domInc)
    : ((st.base + wildInc) * tamedBaseHp * imprintingM + add) * domMult + domInc;

  if (result <= 0) return 0;
  if (st.cap < result) result = st.cap;
  if (roundToIngame) {
    return roundAwayFromZero(result, precision(statIndex));
  }
  return result;
}

/** MidpointRounding.AwayFromZero to `digits` decimal places. */
export function roundAwayFromZero(value: number, digits: number): number {
  const f = 10 ** digits;
  const x = value * f;
  const r = x >= 0 ? Math.floor(x + 0.5) : Math.ceil(x - 0.5);
  return r / f;
}

/**
 * Display-value tolerance, ported from DisplayedAberration.
 * ASA needs a larger calculation-error factor; ASB uses 20.
 */
export function displayedAberration(
  displayedStatValue: number,
  displayedDecimals = 1,
  highPrecisionInput = false,
): number {
  const arkDisplayValueError = 0.06;
  const minValueError = 0.001;
  const calculationErrorFactor = 20;
  const scaled = displayedStatValue * (displayedDecimals === 3 ? 100 : 1);
  if (highPrecisionInput || scaled > 1e6) {
    const floatPrec = Math.max(Number.EPSILON * Math.abs(displayedStatValue) * 2 ** 12, Math.abs(displayedStatValue) * 1e-7);
    return Math.max(minValueError, floatPrec * calculationErrorFactor);
  }
  return arkDisplayValueError * (displayedDecimals === 3 ? 0.01 : 1);
}

export function formatStatValue(stat: number, value: number): string {
  if (value < 0) return '?';
  if (isPercentageDisplay(stat)) {
    return `${(value * 100).toFixed(1)}%`;
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 0 });
}

function isPercentageDisplay(stat: number): boolean {
  return stat === 8 || stat === 9 || stat === 11;
}

export function totalLevel(wild: number[], mut: number[], dom: number[]): number {
  const wildSum = (wild[2] ?? 0) + (mut[2] ?? 0); // torpor holds the wild+mut total in ASB
  // Prefer summing used wild+mut of non-torpor if torpor is 0 but others exist
  const summed = wild.reduce((a, v, i) => a + v + (mut[i] ?? 0), 0);
  const base = wildSum > 0 ? wild[2] + (mut[2] ?? 0) : summed;
  const domSum = dom.reduce((a, v) => a + v, 0);
  return base + domSum + 1;
}

export function hatchedLevel(wild: number[], mut: number[]): number {
  return (wild[2] || wild.reduce((a, v, i) => a + v + (mut[i] ?? 0), 0)) + 1;
}
