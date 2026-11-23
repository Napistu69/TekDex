import { Stat } from '../engine/ark';
import type { Creature } from '../engine/types';

/** Total displayed level (wild + mutation + domestic + 1). */
export function creatureLevel(c: Creature): number {
  let wildMut = 0;
  for (let i = 0; i < c.levelsWild.length; i++) {
    if (i === Stat.Torpidity) continue;
    wildMut += (c.levelsWild[i] ?? 0) + (c.levelsMut[i] ?? 0);
  }
  const dom = c.levelsDom.reduce((a, v) => a + v, 0);
  return wildMut + dom + 1;
}

export function wildPlusMut(c: Creature, stat: number): number {
  return (c.levelsWild[stat] ?? 0) + (c.levelsMut[stat] ?? 0);
}

export function downloadText(filename: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function sexGlyph(sex: Creature['sex']): string {
  if (sex === 'male') return '♂';
  if (sex === 'female') return '♀';
  return '·';
}

export function sexLabel(sex: Creature['sex']): string {
  if (sex === 'male') return 'Male';
  if (sex === 'female') return 'Female';
  return 'Unknown';
}
