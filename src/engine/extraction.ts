/**
 * Inverse stat extraction, ported from ARK Smart Breeding Extraction.ExtractLevels
 * (Copyright (c) 2015 cadon, MIT License).
 */
import { LEVELS_ADDED_PER_MUTATION, STATS_COUNT, Stat, precision } from './ark';
import { calculateValue, displayedAberration } from './stats';
import { usesStat, canHaveWildLevels } from './values';
import type { ExtractionInput, ExtractionResult, StatCandidate } from './types';

export function extractLevels(input: ExtractionInput): ExtractionResult {
  const { species, level, statValues, tamed, bred, highPrecision } = input;
  const empty: ExtractionResult = {
    ok: false,
    unique: false,
    message: 'No valid combination found. Check the species, multipliers, and numbers.',
    wildMutSum: 0,
    domSum: 0,
    imprintingBonus: bred ? input.imprintingBonus : 0,
    candidates: Array.from({ length: STATS_COUNT }, () => []),
    chosen: Array(STATS_COUNT).fill(0),
  };

  const domesticated = tamed || bred;
  const teMin = bred ? 1 : Math.max(0, input.teMin - 0.0006);
  const teMax = bred ? 1 : input.teMax + 0.0006;
  const ib = bred ? Math.max(0, Math.min(5, input.imprintingBonus)) : 0;
  const imprintScale = input.multipliers.babyImprintingStatScaleMultiplier ?? 1;

  const imprintM = (stat: number, ibv: number) => {
    const m = species.statImprintMultipliers[stat] ?? 0;
    const tbhm = domesticated && stat === Stat.Health ? species.tamedBaseHealthMultiplier || 1 : 1;
    if (!domesticated) return 1;
    return (m !== 0 ? 1 + ibv * imprintScale * m : 1) * tbhm;
  };

  const torpor = statValues[Stat.Torpidity];
  const stTor = species.stats[Stat.Torpidity];
  if (!stTor || stTor.base === 0) {
    empty.message = 'This species has no torpidity data, so the level split cannot be solved.';
    return empty;
  }

  const addTor = domesticated ? stTor.addWhenTamed : 0;
  // wild+mut sum from torpor (ASB: invert, no TE on torpor typically)
  const maxIm = imprintM(Stat.Torpidity, ib);
  const minIm = imprintM(Stat.Torpidity, ib);
  const wildSumFrom = (im: number) =>
    Math.round(((torpor - addTor) / (im * stTor.base) - 1) / stTor.incWild);

  let wildMutSum = wildSumFrom(maxIm);
  if (!Number.isFinite(wildMutSum) || wildMutSum < 0) wildMutSum = 0;
  const domSum = Math.max(0, level - 1 - wildMutSum);

  const candidates: StatCandidate[][] = [];

  for (let s = 0; s < STATS_COUNT; s++) {
    const list: StatCandidate[] = [];
    if (!usesStat(species, s)) {
      list.push({ wild: 0, mut: 0, dom: 0, teMin: 0, teMax: 5 });
      candidates.push(list);
      continue;
    }
    const observed = statValues[s];
    if (observed == null || observed <= 0) {
      list.push({ wild: -1, mut: 0, dom: 0, teMin: teMin, teMax: teMax });
      candidates.push(list);
      continue;
    }

    const st = species.stats[s];
    const tol = displayedAberration(observed, precision(s), highPrecision);
    const lo = observed - tol;
    const hi = observed + tol;

    const maxLw = canHaveWildLevels(species, s) ? wildMutSum : 0;
    const maxLd = !domesticated || st.incDom === 0 ? 0 : Math.min(domSum, 400);
    const customMut = st.incMut > 0 && Math.abs(st.incMut - st.incWild) > 1e-12;
    const mutStep = customMut ? LEVELS_ADDED_PER_MUTATION : 1;
    // When mut increment equals wild increment the displayed value cannot distinguish
    // them; only search mutation levels if the increment actually differs.
    const maxLm = customMut && canHaveWildLevels(species, s) && s !== Stat.Torpidity
      ? wildMutSum
      : 0;

    // Narrow wild range from the inverse (zero mut, zero-or-max dom, TE bounds)
    const range = inverseWildRange(species, s, lo, hi, domesticated, teMin, teMax, ib, input.multipliers);
    const lwMin = Math.max(0, range.min - 2);
    const lwMax = st.incWild === 0 ? 0 : Math.min(maxLw, range.max + 2);

    const teAffected = domesticated && st.multAffinity > 0;

    if (st.incWild === 0 && st.incDom === 0) {
      const v1 = calculateValue(species, s, 0, 0, 0, domesticated, teMin, ib, false, input.multipliers);
      const v2 = calculateValue(species, s, 0, 0, 0, domesticated, teMax, ib, false, input.multipliers);
      if (rangesOverlap(lo, hi, Math.min(v1, v2), Math.max(v1, v2))) {
        list.push({ wild: 0, mut: 0, dom: 0, teMin, teMax });
      }
      candidates.push(list);
      continue;
    }

    for (let lw = lwMin; lw <= lwMax; lw++) {
      const lmMaxFor = Math.min(maxLm, wildMutSum - lw);
      for (let lm = 0; lm <= lmMaxFor; lm += mutStep) {
        if (lm > 0 && s === Stat.Torpidity) break;
        for (let ld = 0; ld <= maxLd; ld++) {
          if (!teAffected) {
            const v = calculateValue(species, s, lw, lm, ld, domesticated, bred ? 1 : (teMin + teMax) / 2, ib, false, input.multipliers);
            if (v >= lo && v <= hi) {
              list.push({ wild: lw, mut: lm, dom: ld, teMin: bred ? 1 : teMin, teMax: bred ? 1 : teMax });
            }
            continue;
          }
          // Solve TE from the observed value (percentage form)
          const teRange = teForValue(species, s, lw, lm, ld, lo, hi, ib, input.multipliers);
          if (!teRange) continue;
          const t0 = Math.max(teMin, teRange.min);
          const t1 = Math.min(teMax, teRange.max);
          if (t0 <= t1 + 1e-9) {
            list.push({ wild: lw, mut: lm, dom: ld, teMin: t0, teMax: t1 });
          }
        }
      }
    }

    // Fallback: if nothing, try without narrowing
    if (list.length === 0 && lwMax - lwMin < maxLw) {
      for (let lw = 0; lw <= maxLw && list.length < 80; lw++) {
        for (let lm = 0; lm <= Math.min(maxLm, wildMutSum - lw) && list.length < 80; lm += mutStep) {
          for (let ld = 0; ld <= maxLd; ld++) {
            const v = calculateValue(species, s, lw, lm, ld, domesticated, teMax, ib, false, input.multipliers);
            const v2 = calculateValue(species, s, lw, lm, ld, domesticated, teMin, ib, false, input.multipliers);
            if (rangesOverlap(lo, hi, Math.min(v, v2), Math.max(v, v2))) {
              list.push({ wild: lw, mut: lm, dom: ld, teMin, teMax });
            }
          }
        }
      }
    }

    candidates.push(list);
  }

  // Filter combinations whose wild+mut sums and dom sums match, and whose TE ranges intersect.
  const unknown = (c: StatCandidate) => c.wild < 0;
  const usedIdx = [...Array(STATS_COUNT).keys()].filter((s) => usesStat(species, s) && !unknown(candidates[s][0] ?? { wild: -1 } as StatCandidate) && statValues[s] > 0);

  const result = pruneBySums(candidates, usedIdx, wildMutSum, domSum, species);
  if (!result) {
    // Relax: allow mutation levels counted in wild sum already (torpor includes mut)
    return { ...empty, candidates, wildMutSum, domSum };
  }

  const unique = result.every((list) => list.length <= 1);
  const ok = result.every((list, s) => !usesStat(species, s) || list.length > 0 || (statValues[s] ?? 0) <= 0);
  const chosen = result.map((list) => 0);
  return {
    ok,
    unique,
    message: ok
      ? unique
        ? 'Unique level split found.'
        : 'Several splits fit these numbers. Pick the right one for each highlighted stat.'
      : empty.message,
    wildMutSum,
    domSum,
    imprintingBonus: ib,
    candidates: result,
    chosen,
  };
}

function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 <= b1 && b0 <= a1;
}

function inverseWildRange(
  species: Parameters<typeof calculateValue>[0],
  s: number,
  lo: number,
  hi: number,
  domesticated: boolean,
  teMin: number,
  teMax: number,
  ib: number,
  multipliers: ExtractionInput['multipliers'],
): { min: number; max: number } {
  const st = species.stats[s];
  if (!st.incWild) return { min: 0, max: 0 };
  const inc = st.increaseAsPercentage ? st.incWild * st.base : st.incWild;
  const add = domesticated ? st.addWhenTamed : 0;
  let tmMin = 1;
  let tmMax = 1;
  if (domesticated) {
    if (st.multAffinity > 0) {
      tmMin = 1 + st.multAffinity * teMin;
      tmMax = 1 + st.multAffinity * teMax;
    } else {
      tmMin = tmMax = 1 + st.multAffinity;
    }
  }
  const imprint = (() => {
    const m = species.statImprintMultipliers[s] ?? 0;
    const tbhm = domesticated && s === 0 ? species.tamedBaseHealthMultiplier || 1 : 1;
    if (!domesticated) return 1;
    return (m !== 0 ? 1 + ib * (multipliers.babyImprintingStatScaleMultiplier ?? 1) * m : 1) * tbhm;
  })();
  const maxLw = Math.round(((hi / tmMin - add) / imprint - st.base) / inc);
  const minLw = Math.floor(((lo / tmMax - add) / imprint - st.base) / inc);
  return {
    min: Number.isFinite(minLw) ? minLw : 0,
    max: Number.isFinite(maxLw) ? maxLw : 0,
  };
}

/** Invert TE for a percentage-style stat at a fixed level split. */
function teForValue(
  species: Parameters<typeof calculateValue>[0],
  s: number,
  lw: number,
  lm: number,
  ld: number,
  lo: number,
  hi: number,
  ib: number,
  multipliers: ExtractionInput['multipliers'],
): { min: number; max: number } | null {
  const st = species.stats[s];
  if (st.multAffinity === 0) return { min: 0, max: 1 };
  // Solve from: result = pre * (1 + TE * Tm) * postDom, where pre includes imprint and add.
  const imprintScale = multipliers.babyImprintingStatScaleMultiplier ?? 1;
  const imprintStat = species.statImprintMultipliers[s] ?? 0;
  const tbhm = s === 0 ? species.tamedBaseHealthMultiplier || 1 : 1;
  const im = (imprintStat !== 0 ? 1 + ib * imprintScale * imprintStat : 1) * tbhm;
  const wildInc = lw * st.incWild + lm * st.incMut;
  const pre = st.increaseAsPercentage
    ? st.base * (1 + wildInc) * im + st.addWhenTamed
    : (st.base + wildInc) * im + st.addWhenTamed;
  const post = st.increaseAsPercentage ? 1 + ld * st.incDom : 1;
  // For absolute-increase stats, dom is added after: result = pre * (1+TE*Tm) + ld*id
  const tes: number[] = [];
  const targets = [lo, hi];
  for (const target of targets) {
    let te: number;
    if (st.increaseAsPercentage) {
      const body = pre * post;
      if (body === 0) continue;
      te = (target / body - 1) / st.multAffinity;
    } else {
      const adj = target - ld * st.incDom;
      if (pre === 0) continue;
      te = (adj / pre - 1) / st.multAffinity;
    }
    tes.push(te);
  }
  if (!tes.length) return null;
  return { min: Math.min(...tes), max: Math.max(...tes) };
}

function pruneBySums(
  candidates: StatCandidate[][],
  usedIdx: number[],
  wildMutSum: number,
  domSum: number,
  species: ExtractionInput['species'],
): StatCandidate[][] | null {
  // Torpor wild should equal wildMutSum; other stats' wild+mut should sum to that.
  const contribute = usedIdx.filter((s) => s !== Stat.Torpidity && usesStat(species, s) && (candidates[s][0]?.wild ?? 0) >= 0);

  const teIntersect = (a: StatCandidate[], b: StatCandidate) =>
    a.some((x) => rangesOverlap(x.teMin, x.teMax, b.teMin, b.teMax));

  // First keep only candidates that could possibly fit (loose bounds)
  const filtered = candidates.map((list, s) => {
    if (!usedIdx.includes(s)) return list;
    if (s === Stat.Torpidity) {
      return list.filter((c) => c.wild + c.mut === wildMutSum || c.wild === wildMutSum);
    }
    return list.filter((c) => c.wild + c.mut <= wildMutSum && c.dom <= domSum);
  });

  // Iterative sum pruning
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 20) {
    changed = false;
    const minW = Array(STATS_COUNT).fill(0);
    const maxW = Array(STATS_COUNT).fill(0);
    const minD = Array(STATS_COUNT).fill(0);
    const maxD = Array(STATS_COUNT).fill(0);
    for (const s of contribute) {
      if (!filtered[s].length) continue;
      minW[s] = Math.min(...filtered[s].map((c) => c.wild + c.mut));
      maxW[s] = Math.max(...filtered[s].map((c) => c.wild + c.mut));
      minD[s] = Math.min(...filtered[s].map((c) => c.dom));
      maxD[s] = Math.max(...filtered[s].map((c) => c.dom));
    }
    for (const s of contribute) {
      const othersMinW = contribute.reduce((a, i) => a + (i === s ? 0 : minW[i]), 0);
      const othersMaxW = contribute.reduce((a, i) => a + (i === s ? 0 : maxW[i]), 0);
      const othersMinD = contribute.reduce((a, i) => a + (i === s ? 0 : minD[i]), 0);
      const othersMaxD = contribute.reduce((a, i) => a + (i === s ? 0 : maxD[i]), 0);
      const before = filtered[s].length;
      filtered[s] = filtered[s].filter((c) => {
        const w = c.wild + c.mut;
        return w + othersMinW <= wildMutSum && w + othersMaxW >= wildMutSum
          && c.dom + othersMinD <= domSum && c.dom + othersMaxD >= domSum;
      });
      if (filtered[s].length !== before) changed = true;
    }
  }

  // TE intersection: drop candidates whose TE range doesn't overlap at least one combo
  // Lightweight: intersect global TE window from remaining TE-affected stats
  let gMin = 0;
  let gMax = 5;
  for (let s = 0; s < STATS_COUNT; s++) {
    if (!filtered[s].length) continue;
    if (species.stats[s].multAffinity <= 0) continue;
    const sMin = Math.min(...filtered[s].map((c) => c.teMin));
    const sMax = Math.max(...filtered[s].map((c) => c.teMax));
    gMin = Math.max(gMin, sMin);
    gMax = Math.min(gMax, sMax);
  }
  if (gMin <= gMax) {
    for (let s = 0; s < STATS_COUNT; s++) {
      if (species.stats[s].multAffinity > 0) {
        filtered[s] = filtered[s].filter((c) => rangesOverlap(c.teMin, c.teMax, gMin, gMax));
      }
    }
  }

  const missing = usedIdx.some((s) => s !== Stat.Torpidity && filtered[s].length === 0 && (candidates[s].length > 0));
  if (missing) return null;
  // Restore unused / empty as original if we emptied everything
  return filtered.map((list, s) => (list.length ? list : candidates[s]));
}

export function applyChosen(
  result: ExtractionResult,
  chosen?: number[],
): { wild: number[]; mut: number[]; dom: number[]; te: number } {
  const idx = chosen ?? result.chosen.map((i, s) => {
    const list = result.candidates[s];
    if (!list.length) return 0;
    // Prefer the lowest mutation interpretation when the caller has not picked one.
    const best = list.reduce((bi, c, i2, arr) => (c.mut < arr[bi].mut ? i2 : bi), 0);
    return i ?? best;
  });
  const wild = Array(STATS_COUNT).fill(0);
  const mut = Array(STATS_COUNT).fill(0);
  const dom = Array(STATS_COUNT).fill(0);
  let teMin = -Infinity;
  let teMax = Infinity;
  for (let s = 0; s < STATS_COUNT; s++) {
    const list = result.candidates[s];
    const c = list[idx[s] ?? 0] ?? list[0];
    if (!c || c.wild < 0) {
      wild[s] = 0;
      continue;
    }
    wild[s] = c.wild;
    mut[s] = c.mut;
    dom[s] = c.dom;
    if (c.teMax - c.teMin < 0.5) {
      teMin = Math.max(teMin, c.teMin);
      teMax = Math.min(teMax, c.teMax);
    }
  }
  wild[Stat.Torpidity] = result.wildMutSum;
  mut[Stat.Torpidity] = 0;
  if (!Number.isFinite(teMin)) teMin = 0;
  if (!Number.isFinite(teMax)) teMax = 1;
  const te = teMin <= teMax ? (teMin + teMax) / 2 : Math.max(0, Math.min(1, teMin));
  return { wild, mut, dom, te };
}
