/**
 * Parser for ARK ASA/ASE creature export .ini files.
 * Field mapping follows ARK Smart Breeding ImportExported.ReadExportedCreature
 * (Copyright (c) 2015 cadon, MIT License).
 */
import { STATS_COUNT, isPercentageStat, sexFromAsb, type Sex } from './ark';

export interface ExportedCreature {
  name: string;
  speciesBlueprint: string;
  sex: Sex;
  level: number;
  imprintingBonus: number;
  isBred: boolean;
  isTamed: true;
  owner: string;
  tribe: string;
  imprinterName: string;
  mutationsMaternal: number;
  mutationsPaternal: number;
  statValues: number[];
  colors: number[];
  motherName?: string;
  fatherName?: string;
  motherArkId?: string;
  fatherArkId?: string;
  dinoId1?: string;
  dinoId2?: string;
  babyAge?: number;
}

export function parseExportIni(text: string): ExportedCreature | null {
  const lines = text.split(/\r?\n/);
  const map = new Map<string, string>();
  let inStats = false;
  const stats: number[] = Array(STATS_COUNT).fill(0);
  let statIndex = -1;
  let lastAncestors = '';

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith(';')) continue;
    if (line.includes('[Max Character Status Values]')) {
      inStats = true;
      continue;
    }
    if (inStats) {
      const eq = line.indexOf('=');
      const value = eq === -1 ? line : line.slice(eq + 1).trim();
      const key = eq === -1 ? '' : line.slice(0, eq).trim();
      if (line.startsWith('[')) { inStats = false; }
      else {
        statIndex += 1;
        if (statIndex < STATS_COUNT) {
          const n = Number(value);
          if (!Number.isNaN(n)) stats[statIndex] = n + (isPercentageStat(statIndex) ? 1 : 0);
          continue;
        }
        inStats = false;
        if (key) map.set(key, value);
        continue;
      }
    }
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (key.includes('DinoAncestorsMale')) lastAncestors = value;
    else map.set(key, value);
  }

  const blueprint = map.get('DinoClass') ?? '';
  if (!blueprint) return null;

  const imprinter = map.get('ImprinterName') ?? '';
  const imprint = Number(map.get('DinoImprintingQuality') ?? 0);
  const babyAge = map.get('BabyAge') != null ? Number(map.get('BabyAge')) : undefined;
  const isBred = Boolean(imprinter) || imprint > 0 || (babyAge != null && babyAge < 1) || Boolean(lastAncestors);

  let motherName: string | undefined;
  let fatherName: string | undefined;
  const m = lastAncestors.match(
    /MaleName=([^;]+) - Lvl \d+;MaleDinoID1=([^;]+);MaleDinoID2=([^;]+);FemaleName=([^;]+) - Lvl \d+;FemaleDinoID1=([^;]+);FemaleDinoID2=([^;]+)/,
  );
  if (m) {
    fatherName = m[1];
    motherName = m[4];
  }

  const sexRaw = map.get('bIsFemale');
  const sex: Sex = sexRaw === 'True' ? 'female' : sexRaw === 'False' ? 'male' : sexFromAsb(sexRaw);

  const colors: number[] = [];
  // Color IDs are not always numeric in the export (RGBA tuples). Store 0 as placeholder
  // unless a trailing id is present; closest-color matching is out of scope for v1.
  for (let i = 0; i < 6; i++) colors[i] = 0;

  return {
    name: map.get('TamedName') ?? '',
    speciesBlueprint: blueprint,
    sex,
    level: Number(map.get('CharacterLevel') ?? 0),
    imprintingBonus: imprint,
    isBred,
    isTamed: true,
    owner: imprinter || map.get('TamerString') || '',
    tribe: map.get('TamerString') ?? '',
    imprinterName: imprinter,
    mutationsMaternal: Number(map.get('RandomMutationsFemale') ?? 0),
    mutationsPaternal: Number(map.get('RandomMutationsMale') ?? 0),
    statValues: stats,
    colors,
    motherName,
    fatherName,
    dinoId1: map.get('DinoID1'),
    dinoId2: map.get('DinoID2'),
    babyAge,
  };
}

export const SAMPLE_EXPORT_INI = `; Test fixture shaped like an ASA creature export
[Dino Data]
DinoID1=12345
DinoID2=67890
DinoClass=/Game/PrimalEarth/Dinos/Rex/Rex_Character_BP.Rex_Character_BP
bIsFemale=True
bNeutered=False
TamerString=TekTribe
TamedName=Forest Queen
ImprinterName=Nappy
RandomMutationsMale=0
RandomMutationsFemale=0
CharacterLevel=150
DinoImprintingQuality=1.000000
[Max Character Status Values]
Health=0
Stamina=0
Torpidity=0
Oxygen=0
Food=0
Water=0
Temperature=0
Weight=0
Melee=0
Speed=0
Fortitude=0
Crafting=0
`;
