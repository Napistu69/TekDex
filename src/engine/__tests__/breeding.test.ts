import { describe, expect, it } from 'vitest';
import { PROBABILITY_INHERIT_HIGHER } from '../ark';
import { officialRexSpecies } from '../officialRex';
import { scorePair } from '../breeding';
import { cryptoRandomId } from '../asb';
import { emptyLevels, type Creature } from '../types';

function cr(name: string, sex: Creature['sex'], wild: number[]): Creature {
  const levelsWild = emptyLevels();
  wild.forEach((v, i) => (levelsWild[i] = v));
  levelsWild[2] = wild.reduce((a, b) => a + b, 0);
  return {
    id: cryptoRandomId(),
    schemaVersion: 1,
    game: 'ASA',
    speciesBlueprint: officialRexSpecies().blueprintPath,
    speciesName: 'Rex',
    name,
    sex,
    isBred: true,
    isTamed: true,
    levelsWild,
    levelsDom: emptyLevels(),
    levelsMut: emptyLevels(),
    tamingEff: 1,
    imprintingBonus: 1,
    owner: '',
    tribe: '',
    note: '',
    colors: [],
    mutationsMaternal: 0,
    mutationsPaternal: 0,
    addedAt: new Date().toISOString(),
    tags: [],
  };
}

describe('breeding score', () => {
  it('uses 55% chance of the higher parent stat', () => {
    expect(PROBABILITY_INHERIT_HIGHER).toBeCloseTo(0.55);
  });

  it('scores a pair that already holds every top stat above a weaker pair', () => {
    const species = officialRexSpecies();
    const queen = cr('Queen', 'female', [40, 10, 0, 10, 10, 0, 0, 10, 40]);
    const king = cr('King', 'male', [40, 10, 0, 10, 10, 0, 0, 10, 40]);
    const weakF = cr('A', 'female', [5, 5, 0, 5, 5, 0, 0, 5, 5]);
    const weakM = cr('B', 'male', [5, 5, 0, 5, 5, 0, 0, 5, 5]);
    const best = [40, 10, 0, 10, 10, 0, 0, 10, 40, 0, 0, 0];
    const top = scorePair(queen, king, species, best);
    const low = scorePair(weakF, weakM, species, best);
    expect(top.primary).toBeGreaterThan(low.primary);
    expect(top.potentialTopCount).toBeGreaterThan(0);
  });
});
