import { useMemo, useState } from 'react';
import { DISPLAY_ORDER, STAT_SHORT, Stat } from '../engine/ark';
import { planPairs, topWildLevels } from '../engine/breeding';
import { preferredSpecies, usesStat } from '../engine/values';
import { SpeciesSelect } from '../components/SpeciesSelect';
import { useAppState } from '../state/AppState';
import { creatureLevel, sexGlyph } from '../utils/creature';
import { DEMO_REX_BLUEPRINT } from '../sample/demoTribe';

export function PlannerPage() {
  const { creatures, species, hideNoisy, findSpecies } = useAppState();
  const present = useMemo(() => {
    const bps = new Set(creatures.map((c) => c.speciesBlueprint));
    return species.filter((s) => bps.has(s.blueprintPath));
  }, [creatures, species]);
  const fallback = findSpecies(DEMO_REX_BLUEPRINT) ?? preferredSpecies(species, 'Rex') ?? present[0] ?? species[0];
  const [current, setCurrent] = useState(fallback);
  const sp = present.find((s) => s.blueprintPath === (current ?? fallback)?.blueprintPath) ?? fallback;
  const ofSpecies = creatures.filter((c) => c.speciesBlueprint === sp?.blueprintPath);
  const pairs = useMemo(() => (sp ? planPairs(ofSpecies, sp, undefined, 25) : []), [ofSpecies, sp]);
  const best = useMemo(() => (sp ? topWildLevels(ofSpecies, sp) : []), [ofSpecies, sp]);

  return (
    <section id="planner-page">
      <div className="page-head">
        <div>
          <h1>Breeding planner</h1>
          <p className="lede">
            Pairs are ranked by how reliably they combine the current top wild+mutation levels in
            the library. Higher chance of inheriting the better parent is 55%. Mutation chance is
            shown when either parent is still under the 20-counter cap.
          </p>
        </div>
      </div>
      <div className="card">
        <SpeciesSelect
          species={present.length ? present : species}
          value={sp}
          onChange={setCurrent}
          hideNoisy={hideNoisy}
          breedableOnly
        />
        <p className="lede" style={{ marginTop: '0.6rem' }}>
          {ofSpecies.length} {sp?.displayName ?? 'creatures'} in the library
          {sp ? ` · tribe tops ${DISPLAY_ORDER.filter((s) => s !== Stat.Torpidity && usesStat(sp, s)).map((s) => `${STAT_SHORT[s]} ${best[s] ?? 0}`).join(' · ')}` : ''}.
        </p>
      </div>
      {pairs.length === 0 && (
        <p className="banner warn">Need at least one male and one female of this species in the library.</p>
      )}
      {pairs.map((p, i) => (
        <article className="card pair-card" key={`${p.female.id}-${p.male.id}`} id={i === 0 ? 'top-pair' : undefined}>
          <div className="pair-head">
            <div>
              <h2>
                <span className="sex-f">{sexGlyph(p.female.sex)} {p.female.name}</span>
                {'  ×  '}
                <span className="sex-m">{sexGlyph(p.male.sex)} {p.male.name}</span>
              </h2>
              <p className="lede">
                L{creatureLevel(p.female)} × L{creatureLevel(p.male)} · possible baby level {p.maxLevel} · mutation{' '}
                {(p.mutationChance * 100).toFixed(1)}%
              </p>
            </div>
            <div className="score" title="Relative pair score">{p.primary.toFixed(2)}</div>
          </div>
          <div className="stat-pills">
            {DISPLAY_ORDER.filter((s) => s !== Stat.Torpidity && sp && usesStat(sp, s)).map((s) => {
              const row = p.perStat[s];
              const top = best[s] > 0 && row.high === best[s];
              const same = row.high === row.low;
              return (
                <span key={s} className={top ? 'pill top' : 'pill'}>
                  {STAT_SHORT[s]} {same ? row.high : `${row.high}/${row.low}`}
                  {!same && <span style={{ opacity: 0.7 }}> {(row.pHigh * 100).toFixed(0)}%</span>}
                </span>
              );
            })}
          </div>
          <p className="lede">
            Expected top stats {p.expectedTopCount.toFixed(2)} of {p.potentialTopCount} currently available tops.
          </p>
        </article>
      ))}
    </section>
  );
}
