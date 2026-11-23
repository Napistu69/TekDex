import { describe, expect, it } from 'vitest';
import { Stat } from '../ark';
import { officialRexSpecies } from '../officialRex';
import { calculateValue } from '../stats';
import { defaultMultipliers } from '../types';

const rex = officialRexSpecies();
const m = defaultMultipliers();

describe('calculateValue (official Rex, ASB LevelAllocationSolver fixtures)', () => {
  it('matches ASB health 50140.6 for 84 wild, 21 dom, 100% imprint, official multipliers', () => {
    const v = calculateValue(rex, Stat.Health, 84, 0, 21, true, 1, 1, true, m);
    expect(v).toBeCloseTo(50140.6, 1);
  });

  it('matches ASB melee 45.002 for 255 wild, 22 mut, 67 dom, 100% imprint', () => {
    const v = calculateValue(rex, Stat.Melee, 255, 22, 67, true, 1, 1, true, m);
    expect(v).toBeCloseTo(45.002, 3);
  });

  it('matches ASB weight 1002.2 for 22 wild, 4 dom, 100% imprint', () => {
    const v = calculateValue(rex, Stat.Weight, 22, 0, 4, true, 1, 1, true, m);
    expect(v).toBeCloseTo(1002.2, 1);
  });

  it('wild (untamed) health uses only wild levels', () => {
    // 1100 * (1 + 0.2 * 10) = 3300
    const v = calculateValue(rex, Stat.Health, 10, 0, 99, false, 0, 0, true, m);
    expect(v).toBeCloseTo(3300, 1);
  });
});
