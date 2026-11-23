import { describe, expect, it } from 'vitest';
import { STATS_COUNT, Stat } from '../ark';
import { extractLevels, applyChosen } from '../extraction';
import { officialRexSpecies } from '../officialRex';
import { calculateValue } from '../stats';
import { defaultMultipliers } from '../types';
import { usesStat } from '../values';

const rex = officialRexSpecies();
const m = defaultMultipliers();

function valuesFor(
  wild: number[],
  mut: number[],
  dom: number[],
  tamed: boolean,
  te: number,
  ib: number,
  rounded = true,
): number[] {
  return Array.from({ length: STATS_COUNT }, (_, s) =>
    usesStat(rex, s)
      ? calculateValue(rex, s, wild[s], mut[s], dom[s], tamed, te, ib, rounded, m)
      : 0,
  );
}

describe('extractLevels vs forward formula (official Rex)', () => {
  it('recovers a unique tamed, unleveled, 80% TE split', () => {
    const wild = [40, 30, 149, 20, 20, 0, 0, 20, 19, 0, 0, 0];
    const mut = Array(STATS_COUNT).fill(0);
    const dom = Array(STATS_COUNT).fill(0);
    const te = 0.8;
    const stats = valuesFor(wild, mut, dom, true, te, 0, true);
    const result = extractLevels({
      species: rex,
      level: 150,
      statValues: stats,
      tamed: true,
      bred: false,
      teMin: 0.79,
      teMax: 0.81,
      imprintingBonus: 0,
      multipliers: m,
      highPrecision: false,
    });
    expect(result.ok).toBe(true);
    const got = applyChosen(result);
    for (const s of [Stat.Health, Stat.Stamina, Stat.Oxygen, Stat.Food, Stat.Weight, Stat.Melee]) {
      expect(got.wild[s], `wild ${s}`).toBe(wild[s]);
      expect(got.dom[s], `dom ${s}`).toBe(0);
    }
    expect(got.te).toBeCloseTo(0.8, 2);
  });

  it('recovers the ASB health/melee imprint fixture as part of a bred creature', () => {
    const wild = [84, 20, 84 + 20 + 20 + 20 + 22 + 255, 20, 20, 0, 0, 22, 255, 0, 0, 0];
    const mut = [0, 0, 0, 0, 0, 0, 0, 0, 22, 0, 0, 0];
    // torpor sum must include mutation levels
    wild[Stat.Torpidity] = 84 + 20 + 20 + 20 + 22 + 255 + 22;
    const dom = [21, 0, 0, 0, 0, 0, 0, 4, 67, 0, 0, 0];
    const level = wild[Stat.Torpidity] + 1 + 21 + 4 + 67;
    const stats = valuesFor(wild, mut, dom, true, 1, 1, true);
    const result = extractLevels({
      species: rex,
      level,
      statValues: stats,
      tamed: true,
      bred: true,
      teMin: 1,
      teMax: 1,
      imprintingBonus: 1,
      multipliers: m,
      highPrecision: false,
    });
    expect(result.ok).toBe(true);
    const got = applyChosen(result);
    // Wild vs mutation levels with equal increments cannot be told apart from the
    // displayed number; we recover the combined total and the domestic levels.
    expect(got.wild[Stat.Health] + got.mut[Stat.Health]).toBe(84);
    expect(got.dom[Stat.Health]).toBe(21);
    expect(got.wild[Stat.Melee] + got.mut[Stat.Melee]).toBe(255 + 22);
    expect(got.dom[Stat.Melee]).toBe(67);
    expect(got.dom[Stat.Weight]).toBe(4);
  });

  it('recovers a wild (untamed) level split', () => {
    const wild = [10, 8, 10 + 8 + 6 + 5 + 7 + 4, 6, 5, 0, 0, 7, 4, 0, 0, 0];
    const mut = Array(STATS_COUNT).fill(0);
    const dom = Array(STATS_COUNT).fill(0);
    const stats = valuesFor(wild, mut, dom, false, 0, 0, true);
    const result = extractLevels({
      species: rex,
      level: wild[Stat.Torpidity] + 1,
      statValues: stats,
      tamed: false,
      bred: false,
      teMin: 0,
      teMax: 0,
      imprintingBonus: 0,
      multipliers: m,
      highPrecision: false,
    });
    expect(result.ok).toBe(true);
    const got = applyChosen(result);
    expect(got.wild[Stat.Health]).toBe(10);
    expect(got.wild[Stat.Melee]).toBe(4);
  });
});

