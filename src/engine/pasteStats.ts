import { DISPLAY_ORDER, STAT_NAMES, STAT_SHORT, STATS_COUNT, isPercentageStat } from './ark';

/**
 * Parse a pasted inventory block into 12 stat values (internal units).
 * Accepts labeled lines ("Health 9900.1", "HP: 9900.1", "Dm 230.4%")
 * or a bare list of numbers (whitespace / comma / semicolon / newline).
 * Percentage stats may be entered as 230.4, 230.4%, or 2.304.
 */
export function interpretStatInput(stat: number, raw: string | number): number {
  const text = String(raw).trim().replace(/,/g, '');
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) return Number.NaN;
  let n = Number(m[0]);
  if (!Number.isFinite(n)) return Number.NaN;
  if (isPercentageStat(stat)) {
    const hadPct = /%/.test(text);
    if (hadPct || n > 10) n = n / 100;
  }
  return n;
}

const NAME_TO_STAT: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  for (let s = 0; s < STATS_COUNT; s++) {
    map[STAT_NAMES[s].toLowerCase()] = s;
    map[STAT_SHORT[s].toLowerCase()] = s;
  }
  map['hp'] = 0;
  map['stam'] = 1;
  map['stamina'] = 1;
  map['torpor'] = 2;
  map['torpidity'] = 2;
  map['oxy'] = 3;
  map['melee'] = 8;
  map['damage'] = 8;
  map['melee damage'] = 8;
  map['movement'] = 9;
  map['movement speed'] = 9;
  map['speed'] = 9;
  map['craft'] = 11;
  return map;
})();

export function parsePastedStats(text: string, usedStats: number[] = DISPLAY_ORDER): { values: number[]; filled: number[] } {
  const values = Array(STATS_COUNT).fill(0);
  const filled: number[] = [];
  const labeled = [...text.matchAll(
    /(?:^|[;\n,])\s*([A-Za-z][A-Za-z ]{0,20}?)\s*[:=\s]\s*(-?\d+(?:\.\d+)?%?)/g,
  )];
  let usedLabels = 0;
  for (const m of labeled) {
    const key = m[1].trim().toLowerCase();
    const stat = NAME_TO_STAT[key];
    if (stat == null) continue;
    const n = interpretStatInput(stat, m[2]);
    if (!Number.isFinite(n)) continue;
    values[stat] = n;
    if (!filled.includes(stat)) filled.push(stat);
    usedLabels++;
  }
  if (usedLabels >= 2) return { values, filled };

  const nums = [...text.matchAll(/-?\d+(?:\.\d+)?%?/g)].map((m) => m[0]);
  if (nums.length === 0) return { values, filled: [] };
  const order =
    nums.length === STATS_COUNT
      ? [...Array(STATS_COUNT).keys()]
      : usedStats;
  const out = Array(STATS_COUNT).fill(0);
  const got: number[] = [];
  for (let i = 0; i < Math.min(nums.length, order.length); i++) {
    const stat = order[i];
    const n = interpretStatInput(stat, nums[i]);
    if (!Number.isFinite(n)) continue;
    out[stat] = n;
    got.push(stat);
  }
  return { values: out, filled: got };
}
