import { useMemo, useState } from 'react';
import { DISPLAY_ORDER, STAT_SHORT, Stat } from '../engine/ark';
import { buildPedigree, topWildLevels, type PedigreeNode } from '../engine/breeding';
import { usesStat } from '../engine/values';
import { useAppState } from '../state/AppState';
import { creatureLevel, sexGlyph, wildPlusMut } from '../utils/creature';

function NodeCard({ node, tops, findUses }: { node: PedigreeNode; tops?: number[]; findUses: (s: number) => boolean }) {
  const c = node.creature;
  return (
    <article className="card pedigree-card">
      <span className="nm">
        <span className={c.sex === 'male' ? 'sex-m' : c.sex === 'female' ? 'sex-f' : ''}>{sexGlyph(c.sex)}</span> {c.name}
      </span>
      <p className="lede">{c.speciesName} · L{creatureLevel(c)}</p>
      <div className="stat-pills" style={{ justifyContent: 'center', marginTop: '0.4rem' }}>
        {DISPLAY_ORDER.filter((s) => s !== Stat.Torpidity && findUses(s)).slice(0, 6).map((s) => {
          const v = wildPlusMut(c, s);
          const top = tops && tops[s] > 0 && v === tops[s];
          return (
            <span key={s} className={top ? 'pill top' : 'pill'}>
              {STAT_SHORT[s]} {v}
            </span>
          );
        })}
      </div>
    </article>
  );
}

function collectRows(root: PedigreeNode): PedigreeNode[][] {
  const rows: PedigreeNode[][] = [];
  const walk = (n: PedigreeNode, d: number) => {
    (rows[d] ??= []).push(n);
    if (n.mother) walk(n.mother, d + 1);
    if (n.father) walk(n.father, d + 1);
  };
  walk(root, 0);
  return rows;
}

export function PedigreePage() {
  const { creatures, findSpecies } = useAppState();
  const bredFirst = useMemo(
    () => [...creatures].sort((a, b) => Number(b.isBred) - Number(a.isBred) || a.name.localeCompare(b.name)),
    [creatures],
  );
  const defaultId = useMemo(() => {
    let best = bredFirst.find((c) => c.motherId || c.fatherId) ?? bredFirst[0];
    let bestDepth = 0;
    for (const c of bredFirst) {
      const tree = buildPedigree(creatures, c.id, 6);
      if (!tree) continue;
      const depth = (function d(n: PedigreeNode | undefined): number {
        if (!n) return 0;
        return 1 + Math.max(d(n.mother), d(n.father));
      })(tree);
      if (depth > bestDepth) {
        bestDepth = depth;
        best = c;
      }
    }
    return best?.id ?? '';
  }, [bredFirst, creatures]);
  const [id, setId] = useState(defaultId);
  const root = useMemo(() => (id ? buildPedigree(creatures, id, 4) : null), [creatures, id]);
  const sp = root ? findSpecies(root.creature.speciesBlueprint) : undefined;
  const ofSpecies = root
    ? creatures.filter((c) => c.speciesBlueprint === root.creature.speciesBlueprint)
    : [];
  const tops = useMemo(() => (sp ? topWildLevels(ofSpecies, sp) : []), [ofSpecies, sp]);
  const rows = root ? collectRows(root) : [];

  return (
    <section id="pedigree-page">
      <div className="page-head">
        <div>
          <h1>Pedigree</h1>
          <p className="lede">
            Walk the parents stored on this device. Gold pills mark top wild+mutation levels among
            the same species in your library.
          </p>
        </div>
      </div>
      <div className="card">
        <label className="field">
          Creature
          <select value={id} onChange={(e) => setId(e.target.value)}>
            {bredFirst.length === 0 && <option value="">No creatures yet</option>}
            {bredFirst.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.speciesName}, L{creatureLevel(c)})
              </option>
            ))}
          </select>
        </label>
      </div>
      {root && (
        <div className="pedigree" id="pedigree-tree">
          {rows.map((row, depth) => (
            <div key={depth} className="pedigree-row">
              {depth > 0 && <p className="lede" style={{ width: '100%', textAlign: 'center' }}>{depth === 1 ? 'Parents' : depth === 2 ? 'Grandparents' : `Generation −${depth}`}</p>}
              {row.map((n) => (
                <NodeCard
                  key={n.creature.id + depth}
                  node={n}
                  tops={tops}
                  findUses={(s) => !sp || usesStat(sp, s)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
      {!root && <p className="banner warn">Pick a creature with saved parents, or extract and link them from a .asb import.</p>}
    </section>
  );
}

