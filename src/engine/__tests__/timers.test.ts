/**
 * Timer math vs published 1× values from the bundled values.json (cadon / ASB)
 * and vs public stage breakdowns on the ARK wiki and Dododex/wikily calculators.
 */
import { describe, expect, it } from 'vitest';
import { officialRexSpecies } from '../officialRex';
import { defaultMultipliers, type ServerMultipliers, type Species } from '../types';
import {
  adjustedTimes,
  cuddleIntervalSeconds,
  foodAmountFromUntil,
  foodRatePerSec,
  formatDuration,
  imprintGainPerCare,
  remainingFromProgress,
  snapshot,
  stageAt,
  type SavedTimer,
} from '../timers';

/** Official Dodo_Character_BP from values.json (no variants). */
function officialDodo(): Species {
  return {
    name: 'Dodo',
    blueprintPath: '/Game/PrimalEarth/Dinos/Dodo/Dodo_Character_BP.Dodo_Character_BP',
    variants: [],
    displayName: 'Dodo',
    stats: [],
    usedStats: 0,
    displayedStats: 927,
    skipWildLevelStats: 0,
    statImprintMultipliers: [],
    tamedBaseHealthMultiplier: 1,
    isFlyer: false,
    noGender: false,
    canBreed: true,
    canTame: true,
    breeding: {
      // values.json breeding.* for Dodo_Character_BP
      incubationTime: 2999.76002,
      gestationTime: 0,
      maturationTime: 55555.5556,
      matingCooldownMin: 64800,
      matingCooldownMax: 172800,
      eggTempMin: 22,
      eggTempMax: 30,
    },
    taming: {
      // values.json taming.foodConsumptionBase / babyFoodConsumptionMult
      foodConsumptionBase: 0.000868,
      foodConsumptionMult: 2880.184,
      babyFoodConsumptionMult: 510,
    },
  };
}

function eventOfficial(): ServerMultipliers {
  const m = defaultMultipliers();
  // Common official event layout published on dododex.com/rates (not treated as live).
  m.eggHatchSpeedMultiplier = 2;
  m.babyMatureSpeedMultiplier = 2;
  m.babyCuddleIntervalMultiplier = 0.6;
  m.babyImprintAmountMultiplier = 2;
  m.matingIntervalMultiplier = 0.5;
  return m;
}

describe('raising durations vs values.json and public calculators', () => {
  it('Dodo 1× incubation is ~49m 60s (values.json incubationTime; wiki Breeding table 0:49)', () => {
    const t = adjustedTimes(officialDodo(), defaultMultipliers())!;
    expect(t.hatchMode).toBe('incubation');
    expect(t.incubationSec).toBeCloseTo(2999.76002, 5);
    expect(t.incubationSec / 60).toBeCloseTo(49.996, 3);
    expect(formatDuration(t.incubationSec)).toBe('49m 59s');
  });

  it('Dodo 2× hatch is ~24m 59s (wikily / Dododex public Dodo calculator at 2× hatch)', () => {
    const t = adjustedTimes(officialDodo(), eventOfficial())!;
    expect(t.incubationSec).toBeCloseTo(1499.88001, 5);
    expect(Math.round(t.incubationSec)).toBe(1500);
    expect(formatDuration(t.incubationSec)).toBe('24m 59s');
  });

  it('Dodo 1× maturation stages match the wiki Breeding table (15:25 total, baby 1:32, juv 6:10, ado 7:42)', () => {
    const t = adjustedTimes(officialDodo(), defaultMultipliers())!;
    expect(t.maturationSec).toBeCloseTo(55555.5556, 4);
    // 15h 25m 55.56s
    expect(t.maturationSec / 3600).toBeCloseTo(15.4321, 3);
    expect(t.babySec / 60).toBeCloseTo(92.5926, 3); // 1h 32m 35s
    expect(t.juvenileSec / 3600).toBeCloseTo(6.1728, 3); // 6h 10m
    expect(t.adolescentSec / 3600).toBeCloseTo(7.7160, 3); // 7h 42m
  });

  it('Dodo 2× mature stages match public calculator (baby 46m 17s, juv 3h 05m 11s, ado 3h 51m 28s, total 7h 42m 57s)', () => {
    const t = adjustedTimes(officialDodo(), eventOfficial())!;
    expect(t.maturationSec).toBeCloseTo(27777.7778, 3);
    expect(Math.round(t.babySec)).toBe(2778);
    expect(Math.round(t.juvenileSec)).toBe(11111);
    expect(Math.round(t.adolescentSec)).toBe(13889);
    expect(formatDuration(t.maturationSec)).toBe('7h 42m 57s');
  });

  it('Rex 1× incubation ~5h and maturation ~3d 20h 36m (values.json; Dododex Rex page at 1×)', () => {
    const t = adjustedTimes(officialRexSpecies(), defaultMultipliers())!;
    expect(t.incubationSec).toBeCloseTo(17998.5601, 4);
    expect(t.incubationSec / 3600).toBeCloseTo(4.9996, 3);
    expect(t.maturationSec).toBeCloseTo(333333.333, 3);
    expect(t.maturationSec / 86400).toBeCloseTo(3.858, 3);
    expect(t.babySec).toBeCloseTo(33333.3333, 3);
  });

  it('Ovis uses gestation, not incubation, divided by EggHatchSpeed', () => {
    const ovis: Species = {
      ...officialDodo(),
      name: 'Ovis',
      breeding: {
        incubationTime: 0,
        gestationTime: 15037.594,
        maturationTime: 175438.596,
        matingCooldownMin: 64800,
        matingCooldownMax: 172800,
        eggTempMin: 0,
        eggTempMax: 0,
      },
    };
    const t = adjustedTimes(ovis, eventOfficial())!;
    expect(t.hatchMode).toBe('gestation');
    expect(t.gestationSec).toBeCloseTo(15037.594 / 2, 4);
  });

  it('mating cooldown is multiplied by MatingInterval (18–48 h at 1×; 9–24 h at 0.5×)', () => {
    const one = adjustedTimes(officialDodo(), defaultMultipliers())!;
    expect(one.matingCooldownMinSec).toBe(64800);
    expect(one.matingCooldownMaxSec).toBe(172800);
    const ev = adjustedTimes(officialDodo(), eventOfficial())!;
    expect(ev.matingCooldownMinSec).toBe(32400);
    expect(ev.matingCooldownMaxSec).toBe(86400);
  });
});

describe('imprint / cuddle', () => {
  it('default cuddle interval is 8h, 4h 48m at 0.6× (wiki Imprinting; Dododex official rates)', () => {
    expect(cuddleIntervalSeconds(1)).toBe(28800);
    expect(cuddleIntervalSeconds(0.6)).toBe(17280);
    expect(formatDuration(17280)).toBe('4h 48m');
  });

  it('Dodo at 2× mature / 0.6× interval / 2× imprint is 100% per care (public Dodo calculator)', () => {
    const gain = imprintGainPerCare(55555.5556, 2, 0.6, 2);
    expect(gain).toBe(1);
  });

  it('Rex at 1× gains about 8.83% per care (wiki formula)', () => {
    const gain = imprintGainPerCare(333333.333, 1, 1, 1);
    expect(gain).toBeCloseTo(0.0883, 3);
  });
});

describe('raising food (ASB Trough.cs, checked against public Dodo numbers)', () => {
  it('Dodo food at birth is 26.56 hunger/min (wikily Dodo calculator)', () => {
    const rate = foodRatePerSec(officialDodo(), 0, eventOfficial())!;
    expect(rate * 60).toBeCloseTo(26.5608, 3);
  });

  it('Dodo 2× mature 0–100% is about 205 mejoberries (30 food each)', () => {
    const hunger = foodAmountFromUntil(officialDodo(), 0, 1, eventOfficial())!;
    expect(hunger / 30).toBeCloseTo(205.3, 0);
  });
});

describe('timer snapshot pause / resume', () => {
  it('remaining time and finish clock survive a pause', () => {
    const started = new Date('2026-11-22T17:00:00-05:00');
    const timer: SavedTimer = {
      id: 't1',
      name: 'Dodo egg',
      speciesBlueprint: 'x',
      speciesName: 'Dodo',
      kind: 'incubation',
      startedAt: started.toISOString(),
      durationMs: 1500_000,
      progressStart: 0,
      pausedAt: null,
      remainingMsWhenPaused: null,
      notify: false,
      notifyMinutesBefore: 5,
      notifiedZero: false,
      notifiedSoon: false,
      createdAt: started.toISOString(),
    };
    const mid = new Date(started.getTime() + 500_000);
    const snap = snapshot(timer, mid);
    expect(snap.remainingMs).toBe(1_000_000);
    expect(snap.endsAt.getTime()).toBe(started.getTime() + 1500_000);
    expect(stageAt(0)).toBe('baby');
    expect(stageAt(0.1)).toBe('juvenile');
    expect(stageAt(0.5)).toBe('adolescent');
    expect(stageAt(1)).toBe('adult');
    expect(remainingFromProgress(1000, 0.25)).toBe(750);
  });
});
