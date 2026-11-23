/**
 * Breeding probabilities and pair scoring, following ARK Smart Breeding
 * (Copyright (c) 2015 cadon, MIT License).
 */
import {
  MUTATION_POSSIBLE_WITH_LESS_THAN,
  PROBABILITY_INHERIT_HIGHER,
  PROBABILITY_OF_MUTATION,
  STATS_COUNT,
  Stat,
  MUTATION_ROLLS,
} from './ark';
import { usesStat } from './values';
import type { Creature, Species } from './types';

export function mutationCounter(c: Creature): number {
  return (c.mutationsMaternal ?? 0) + (c.mutationsPaternal ?? 0);
}

export function canMutate(c: Creature): boolean {
  return mutationCounter(c) < MUTATION_POSSIBLE_WITH_LESS_THAN;
}

export function probabilityAtLeastOneMutation(a: Creature, b: Creature): number {
  const ma = canMutate(a);
  const mb = canMutate(b);
  if (!ma && !mb) return 0;
  const p = ma && mb ? PROBABILITY_OF_MUTATION : PROBABILITY_OF_MUTATION / 2;
  return 1 - (1 - p) ** MUTATION_ROLLS;
}

export interface PairScore {
  female: Creature;
  male: Creature;
  primary: number;
  expectedTopCount: number;
  potentialTopCount: number;
  maxLevel: number;
  mutationChance: number;
  perStat: { high: number; low: number; pHigh: number }[];
}

/**
 * Conservative-style score: prefer pairs that can combine current top wild+mut levels.
 * Weights default to 1 for usually-bred stats (HP, stam, oxygen, food, weight, melee).
 */
export function scorePair(
  female: Creature,
  male: Creature,
  species: Species,
  best: number[],
  weights?: number[],
): PairScore {
  const w = weights ?? defaultWeights();
  let expected = 0;
  let potentialTop = 0;
  let expectedTop = 0;
  let maxLevel = 1;
  const perStat: PairScore['perStat'] = [];

  for (let s = 0; s < STATS_COUNT; s++) {
    if (s === Stat.Torpidity || !usesStat(species, s)) {
      perStat.push({ high: 0, low: 0, pHigh: 0 });
      continue;
    }
    const fv = (female.levelsWild[s] ?? 0) + (female.levelsMut[s] ?? 0);
    const mv = (male.levelsWild[s] ?? 0) + (male.levelsMut[s] ?? 0);
    const high = Math.max(fv, mv);
    const low = Math.min(fv, mv);
    const pHigh = fv === mv ? 1 : PROBABILITY_INHERIT_HIGHER;
    perStat.push({ high, low, pHigh });
    maxLevel += high;
    const expectedLevel = pHigh * high + (1 - pHigh) * low;
    const weight = w[s] ?? 0;
    let term = weight * expectedLevel / 40;
    const isTop = best[s] > 0 && (fv === best[s] || mv === best[s]);
    if (isTop) {
      potentialTop += 1;
      expectedTop += fv === best[s] && mv === best[s] ? 1 : pHigh;
      if (fv === best[s] && mv === best[s]) term *= 1.142;
    } else if (best[s] > 0 || weight < 0) {
      term *= 0.01;
    }
    expected += term;
  }
  if (potentialTop > 0) expected += expectedTop;

  return {
    female,
    male,
    primary: expected,
    expectedTopCount: expectedTop,
    potentialTopCount: potentialTop,
    maxLevel,
    mutationChance: probabilityAtLeastOneMutation(female, male),
    perStat,
  };
}

export function defaultWeights(): number[] {
  const w = Array(STATS_COUNT).fill(0);
  w[Stat.Health] = 1;
  w[Stat.Stamina] = 1;
  w[Stat.Oxygen] = 0.5;
  w[Stat.Food] = 0.5;
  w[Stat.Weight] = 1;
  w[Stat.Melee] = 1;
  return w;
}

export function topWildLevels(creatures: Creature[], species: Species): number[] {
  const best = Array(STATS_COUNT).fill(0);
  for (const c of creatures) {
    for (let s = 0; s < STATS_COUNT; s++) {
      if (s === Stat.Torpidity || !usesStat(species, s)) continue;
      const v = (c.levelsWild[s] ?? 0) + (c.levelsMut[s] ?? 0);
      if (v > best[s]) best[s] = v;
    }
  }
  return best;
}

export function planPairs(
  creatures: Creature[],
  species: Species,
  weights?: number[],
  limit = 40,
): PairScore[] {
  const ofSpecies = creatures.filter((c) => c.speciesBlueprint === species.blueprintPath);
  const females = ofSpecies.filter((c) => c.sex === 'female' || species.noGender);
  const males = ofSpecies.filter((c) => c.sex === 'male' || species.noGender);
  const best = topWildLevels(ofSpecies, species);
  const pairs: PairScore[] = [];
  const seen = new Set<string>();
  for (const f of females) {
    for (const m of males) {
      if (f.id === m.id) continue;
      const key = [f.id, m.id].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push(scorePair(f, m, species, best, weights));
    }
  }
  pairs.sort((a, b) => b.primary - a.primary);
  return pairs.slice(0, limit);
}

export interface PedigreeNode {
  creature: Creature;
  mother?: PedigreeNode;
  father?: PedigreeNode;
}

export function buildPedigree(creatures: Creature[], rootId: string, depth = 4): PedigreeNode | null {
  const byId = new Map(creatures.map((c) => [c.id, c]));
  const walk = (id: string | undefined, d: number): PedigreeNode | undefined => {
    if (!id || d < 0) return undefined;
    const c = byId.get(id);
    if (!c) return undefined;
    return {
      creature: c,
      mother: walk(c.motherId, d - 1),
      father: walk(c.fatherId, d - 1),
    };
  };
  return walk(rootId, depth) ?? null;
}
