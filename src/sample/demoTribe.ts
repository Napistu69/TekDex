import { Stat, STATS_COUNT } from '../engine/ark';
import { cryptoRandomId } from '../engine/asb';
import type { Creature } from '../engine/types';

const REX_BP = '/Game/PrimalEarth/Dinos/Rex/Rex_Character_BP.Rex_Character_BP';

function levels(map: Partial<Record<number, number>>): number[] {
  const out = Array(STATS_COUNT).fill(0);
  for (const [k, v] of Object.entries(map)) out[Number(k)] = v ?? 0;
  // Torpor holds the non-torpor wild+mut total in ASB style once filled later.
  return out;
}

function fillTorpor(c: Creature): Creature {
  let sum = 0;
  for (let i = 0; i < STATS_COUNT; i++) {
    if (i === Stat.Torpidity) continue;
    sum += (c.levelsWild[i] ?? 0) + (c.levelsMut[i] ?? 0);
  }
  c.levelsWild[Stat.Torpidity] = sum;
  return c;
}

function rex(partial: Partial<Creature> & Pick<Creature, 'id' | 'name' | 'sex' | 'isBred' | 'levelsWild' | 'levelsDom' | 'levelsMut' | 'tamingEff' | 'imprintingBonus'>): Creature {
  return fillTorpor({
    schemaVersion: 1,
    game: 'ASA',
    speciesBlueprint: REX_BP,
    speciesName: 'Rex',
    owner: '',
    tribe: 'TekDex demo',
    note: '',
    colors: [0, 0, 0, 0, 0, 0],
    addedAt: '2026-11-22T00:00:00.000Z',
    tags: ['demo'],
    isTamed: true,
    mutationsMaternal: 0,
    mutationsPaternal: 0,
    ...partial,
  });
}

/** A small official-Rex family so the planner, library, and pedigree have something to show. */
export function demoTribe(): Creature[] {
  const fernId = 'demo-fern';
  const redwoodId = 'demo-redwood';
  const queenId = 'demo-queen';
  const thornId = 'demo-thorn';
  const mossId = 'demo-moss';
  const sprigId = 'demo-sprig';

  const fern = rex({
    id: fernId,
    name: 'Fern',
    sex: 'female',
    isBred: false,
    levelsWild: levels({ [Stat.Health]: 84, [Stat.Stamina]: 28, [Stat.Oxygen]: 22, [Stat.Food]: 20, [Stat.Weight]: 18, [Stat.Melee]: 40, [Stat.Speed]: 0 }),
    levelsDom: Array(STATS_COUNT).fill(0),
    levelsMut: Array(STATS_COUNT).fill(0),
    tamingEff: 0.92,
    imprintingBonus: 0,
  });

  const redwood = rex({
    id: redwoodId,
    name: 'Redwood',
    sex: 'male',
    isBred: false,
    levelsWild: levels({ [Stat.Health]: 40, [Stat.Stamina]: 24, [Stat.Oxygen]: 16, [Stat.Food]: 18, [Stat.Weight]: 22, [Stat.Melee]: 255, [Stat.Speed]: 0 }),
    levelsDom: Array(STATS_COUNT).fill(0),
    levelsMut: Array(STATS_COUNT).fill(0),
    tamingEff: 0.88,
    imprintingBonus: 0,
  });

  const queen = rex({
    id: queenId,
    name: 'Imprint Queen',
    sex: 'female',
    isBred: true,
    levelsWild: levels({ [Stat.Health]: 84, [Stat.Stamina]: 20, [Stat.Oxygen]: 20, [Stat.Food]: 20, [Stat.Weight]: 22, [Stat.Melee]: 255, [Stat.Speed]: 0 }),
    levelsDom: levels({ [Stat.Health]: 21, [Stat.Weight]: 4, [Stat.Melee]: 67 }),
    levelsMut: levels({ [Stat.Melee]: 22 }),
    tamingEff: 1,
    imprintingBonus: 1,
    fatherId: redwoodId,
    motherId: fernId,
    fatherName: 'Redwood',
    motherName: 'Fern',
    mutationsMaternal: 0,
    mutationsPaternal: 11,
    note: 'ASB LevelAllocationSolver health/melee fixture, packed as a library creature.',
  });

  const thorn = rex({
    id: thornId,
    name: 'Thorn',
    sex: 'male',
    isBred: false,
    levelsWild: levels({ [Stat.Health]: 40, [Stat.Stamina]: 30, [Stat.Oxygen]: 20, [Stat.Food]: 20, [Stat.Weight]: 20, [Stat.Melee]: 19, [Stat.Speed]: 0 }),
    levelsDom: Array(STATS_COUNT).fill(0),
    levelsMut: Array(STATS_COUNT).fill(0),
    tamingEff: 0.8,
    imprintingBonus: 0,
    note: 'Official unleveled tame, 80% TE — used in extraction tests.',
  });

  const moss = rex({
    id: mossId,
    name: 'Moss',
    sex: 'female',
    isBred: false,
    levelsWild: levels({ [Stat.Health]: 36, [Stat.Stamina]: 28, [Stat.Oxygen]: 22, [Stat.Food]: 25, [Stat.Weight]: 18, [Stat.Melee]: 20, [Stat.Speed]: 0 }),
    levelsDom: Array(STATS_COUNT).fill(0),
    levelsMut: Array(STATS_COUNT).fill(0),
    tamingEff: 0.84,
    imprintingBonus: 0,
  });

  const sprig = rex({
    id: sprigId,
    name: 'Sprig',
    sex: 'male',
    isBred: true,
    levelsWild: levels({ [Stat.Health]: 84, [Stat.Stamina]: 30, [Stat.Oxygen]: 22, [Stat.Food]: 25, [Stat.Weight]: 22, [Stat.Melee]: 255, [Stat.Speed]: 0 }),
    levelsDom: levels({ [Stat.Health]: 10, [Stat.Melee]: 12 }),
    levelsMut: levels({ [Stat.Melee]: 22 }),
    tamingEff: 1,
    imprintingBonus: 1,
    fatherId: thornId,
    motherId: queenId,
    fatherName: 'Thorn',
    motherName: 'Imprint Queen',
    mutationsMaternal: 11,
    mutationsPaternal: 0,
  });

  // cryptoRandomId is only used if ids need refresh; keep stable ids for the demo pedigree.
  void cryptoRandomId;
  return [fern, redwood, queen, thorn, moss, sprig];
}

export const DEMO_REX_BLUEPRINT = REX_BP;
