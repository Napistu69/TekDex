import { DEFAULT_IMPRINT_ASE, STATS_COUNT, Stat } from './ark';
import type { Species, SpeciesStat } from './types';

function stat(
  base: number,
  incWild: number,
  incDom: number,
  add: number,
  tm: number,
): SpeciesStat {
  return {
    base,
    incWild,
    incMut: incWild,
    incDom,
    addWhenTamed: add,
    multAffinity: tm,
    increaseAsPercentage: true,
    cap: Number.MAX_VALUE,
  };
}

/** Official-server Rex stats after official HP/melee multipliers are applied. */
export function officialRexSpecies(): Species {
  const stats: SpeciesStat[] = Array.from({ length: STATS_COUNT }, () =>
    stat(0, 0, 0, 0, 0),
  );
  // Raw * official multipliers (HP [0.14,0.44,0.2,1], Melee [0.14,0.44,0.17,1])
  stats[Stat.Health] = stat(1100, 0.2, 0.054, 0.07, 0);
  stats[Stat.Stamina] = stat(420, 0.1, 0.1, 0, 0);
  stats[Stat.Torpidity] = stat(1550, 0.06, 0, 0.5, 0);
  stats[Stat.Oxygen] = stat(150, 0.1, 0.1, 0, 0);
  stats[Stat.Food] = stat(3000, 0.1, 0.1, 0, 0);
  stats[Stat.Weight] = stat(500, 0.02, 0.04, 0, 0);
  stats[Stat.Melee] = stat(1, 0.05, 0.017, 0.07, 0.176);
  stats[Stat.Speed] = stat(1, 0, 0.01, 0, 0);

  const used =
    (1 << Stat.Health) |
    (1 << Stat.Stamina) |
    (1 << Stat.Torpidity) |
    (1 << Stat.Oxygen) |
    (1 << Stat.Food) |
    (1 << Stat.Weight) |
    (1 << Stat.Melee) |
    (1 << Stat.Speed);

  return {
    name: 'Rex',
    blueprintPath: '/Game/PrimalEarth/Dinos/Rex/Rex_Character_BP.Rex_Character_BP',
    variants: [],
    displayName: 'Rex',
    stats,
    usedStats: used,
    displayedStats: 927,
    skipWildLevelStats: 0,
    statImprintMultipliers: DEFAULT_IMPRINT_ASE.slice(),
    tamedBaseHealthMultiplier: 1,
    isFlyer: false,
    noGender: false,
    canBreed: true,
    canTame: true,
    breeding: {
      incubationTime: 17998.5601,
      gestationTime: 0,
      maturationTime: 333333.333,
      matingCooldownMin: 64800,
      matingCooldownMax: 172800,
      eggTempMin: 32,
      eggTempMax: 34,
    },
    taming: {
      foodConsumptionBase: 0.002314,
      foodConsumptionMult: 180.0634,
      babyFoodConsumptionMult: 510,
    },
  };
}
