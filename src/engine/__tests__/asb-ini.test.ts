import { describe, expect, it } from 'vitest';
import { exportAsb, parseAsbJson } from '../asb';
import { parseExportIni } from '../importIni';
import type { Creature } from '../types';

describe('ASA export .ini parser', () => {
  it('reads blueprint, name, sex, imprint, mutations, and percentage stats', () => {
    const ini = `
DinoID1=1
DinoID2=2
DinoClass=/Game/PrimalEarth/Dinos/Rex/Rex_Character_BP.Rex_Character_BP
bIsFemale=True
TamerString=Tribe
TamedName=Queen
ImprinterName=Nappy
RandomMutationsMale=12
RandomMutationsFemale=4
CharacterLevel=180
DinoImprintingQuality=0.75
[Max Character Status Values]
1100.0
420.0
1550.0
150.0
3000.0
0
0
500.0
0.5
0.0
0
0
`;
    const c = parseExportIni(ini);
    expect(c).not.toBeNull();
    expect(c!.speciesBlueprint).toContain('Rex_Character_BP');
    expect(c!.name).toBe('Queen');
    expect(c!.sex).toBe('female');
    expect(c!.isBred).toBe(true);
    expect(c!.imprintingBonus).toBeCloseTo(0.75);
    expect(c!.mutationsPaternal).toBe(12);
    expect(c!.mutationsMaternal).toBe(4);
    expect(c!.level).toBe(180);
    // percentage stats have 1 added, matching ASB
    expect(c!.statValues[8]).toBeCloseTo(1.5);
  });
});

describe('.asb JSON round-trip', () => {
  it('preserves levels, parents, and sex', () => {
    const c: Creature = {
      id: '11111111-1111-4111-8111-111111111111',
      schemaVersion: 1,
      game: 'ASA',
      speciesBlueprint: '/Game/PrimalEarth/Dinos/Rex/Rex_Character_BP.Rex_Character_BP',
      speciesName: 'Rex',
      name: 'Queen',
      sex: 'female',
      isBred: true,
      isTamed: true,
      levelsWild: [40, 30, 149, 20, 20, 0, 0, 20, 19, 0, 0, 0],
      levelsDom: [5, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0],
      levelsMut: [0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
      tamingEff: 1,
      imprintingBonus: 1,
      owner: 'Nappy',
      tribe: 'TekTribe',
      note: 'test',
      colors: [0, 0, 0, 0, 0, 0],
      fatherId: '22222222-2222-4222-8222-222222222222',
      motherId: '33333333-3333-4333-8333-333333333333',
      fatherName: 'King',
      motherName: 'Matriarch',
      mutationsMaternal: 4,
      mutationsPaternal: 12,
      addedAt: '2026-11-22T00:00:00.000Z',
      tags: [],
    };
    const json = exportAsb([c]);
    const parsed = parseAsbJson(json);
    expect(parsed.raw.FormatVersion).toBe('1.13');
    expect(parsed.raw.Game).toBe('ASA');
    expect(parsed.creatures).toHaveLength(1);
    const g = parsed.creatures[0];
    expect(g.name).toBe('Queen');
    expect(g.sex).toBe('female');
    expect(g.levelsWild[0]).toBe(40);
    expect(g.levelsMut[8]).toBe(2);
    expect(g.fatherName).toBe('King');
    expect(g.mutationsPaternal).toBe(12);
    expect(g.isBred).toBe(true);
  });
});
