import { describe, expect, it } from 'vitest';
import { interpretStatInput, parsePastedStats } from '../pasteStats';
import { Stat } from '../ark';

describe('interpretStatInput', () => {
  it('keeps absolute stats as-is', () => {
    expect(interpretStatInput(Stat.Health, '9900.1')).toBeCloseTo(9900.1);
  });
  it('accepts melee as 230.4%, 230.4, or 2.304', () => {
    expect(interpretStatInput(Stat.Melee, '230.4%')).toBeCloseTo(2.304);
    expect(interpretStatInput(Stat.Melee, '230.4')).toBeCloseTo(2.304);
    expect(interpretStatInput(Stat.Melee, '2.304')).toBeCloseTo(2.304);
  });
});

describe('parsePastedStats', () => {
  it('reads labeled inventory text', () => {
    const { values, filled } = parsePastedStats(
      'Health 9900.1\nStamina 1680\nOxygen 450\nMelee 230.4%\nTorpidity 15407.5',
    );
    expect(values[Stat.Health]).toBeCloseTo(9900.1);
    expect(values[Stat.Stamina]).toBe(1680);
    expect(values[Stat.Melee]).toBeCloseTo(2.304);
    expect(values[Stat.Torpidity]).toBeCloseTo(15407.5);
    expect(filled).toContain(Stat.Health);
  });
  it('reads a bare 8-number list in the given used-stat order', () => {
    const order = [0, 1, 2, 3, 4, 7, 8, 9];
    const { values } = parsePastedStats('9900.1 1680 15407.5 450 9000 700 230.4 100', order);
    expect(values[0]).toBeCloseTo(9900.1);
    expect(values[8]).toBeCloseTo(2.304);
    expect(values[9]).toBeCloseTo(1);
  });
});
