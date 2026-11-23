import { useMemo, useState } from 'react';
import { DISPLAY_ORDER, STAT_SHORT, Stat, USUALLY_VISIBLE } from '../engine/ark';

const LIB_STATS = DISPLAY_ORDER.filter((s) => s !== Stat.Torpidity && USUALLY_VISIBLE[s]);
import { exportAsb, parseAsbJson } from '../engine/asb';
import { exportTekDexLibrary, isTekDexLibrary, parseTekDexLibrary } from '../engine/schema';
import { topWildLevels } from '../engine/breeding';
import { usesStat } from '../engine/values';
import { useAppState } from '../state/AppState';
import { creatureLevel, downloadText, sexGlyph, sexLabel, wildPlusMut } from '../utils/creature';
import type { Creature } from '../engine/types';

export function LibraryPage() {
  const { creatures, species, findSpecies, removeCreature, replaceCreatures, multipliers, demoSeeded } = useAppState();
  const [filter, setFilter] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const speciesNames = useMemo(() => {
    const set = new Set(creatures.map((c) => c.speciesName || findSpecies(c.speciesBlueprint)?.displayName || 'Unknown'));
    return [...set].sort();
  }, [creatures, findSpecies]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return creatures.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.speciesName.toLowerCase().includes(q) ||
        c.note.toLowerCase().includes(q)
      );
    });
  }, [creatures, filter]);

  const bestBySpecies = useMemo(() => {
    const map = new Map<string, number[]>();
    const groups = new Map<string, Creature[]>();
    for (const c of creatures) {
      const list = groups.get(c.speciesBlueprint) ?? [];
      list.push(c);
      groups.set(c.speciesBlueprint, list);
    }
    for (const [bp, list] of groups) {
      const sp = findSpecies(bp) ?? species.find((s) => s.name === list[0].speciesName);
      if (sp) map.set(bp, topWildLevels(list, sp));
    }
    return map;
  }, [creatures, findSpecies, species]);

  const statsFor = (c: Creature) => {
    const sp = findSpecies(c.speciesBlueprint);
    return DISPLAY_ORDER.filter((s) => s !== Stat.Torpidity && (!sp || usesStat(sp, s)));
  };

  const onAsbIn = async (file: File) => {
    try {
      const text = await file.text();
      try {
        const raw = JSON.parse(text) as unknown;
        if (isTekDexLibrary(raw)) {
          const doc = parseTekDexLibrary(text);
          replaceCreatures(doc.creatures, { merge: true });
          setNotice(`Imported ${doc.creatures.length} creatures from TekDex library ${file.name} (merged).`);
          return;
        }
      } catch (inner) {
        if (inner instanceof Error && inner.message.startsWith('Not a TekDex')) throw inner;
      }
      const parsed = parseAsbJson(text);
      replaceCreatures(parsed.creatures, { merge: true });
      setNotice(`Imported ${parsed.creatures.length} creatures from ${file.name} (merged).`);
    } catch (err) {
      setNotice(`Could not read that library file: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const onExport = () => {
    downloadText('library.asb', exportAsb(creatures, multipliers), 'application/json');
  };

  const onExportTekDex = () => {
    downloadText('library.tekdex.json', exportTekDexLibrary(creatures, multipliers), 'application/json');
  };

  return (
    <section id="library-page">
      <div className="page-head">
        <div>
          <h1>Creature library</h1>
          <p className="lede">
            {creatures.length} stored on this device. Gold cells are the highest wild+mutation level
            for that stat in the species. {demoSeeded && creatures.some((c) => c.tags.includes('demo'))
              ? 'A demo Rex tribe is loaded so you can explore; clear or replace it in Settings.'
              : ''}
          </p>
        </div>
      </div>
      <div className="toolbar">
        <label className="field" style={{ flex: '1 1 200px' }}>
          Filter
          <input type="search" placeholder="Name or species…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </label>
        <label className="btn-secondary">
          Import library
          <input className="hidden-file" type="file" accept=".asb,.json,application/json" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onAsbIn(f);
            e.target.value = '';
          }} />
        </label>
        <button type="button" className="btn-secondary" onClick={onExport} disabled={creatures.length === 0}>
          Export .asb
        </button>
        <button type="button" className="btn-primary" onClick={onExportTekDex} disabled={creatures.length === 0}>
          Export TekDex JSON
        </button>
      </div>
      {notice && <p className="banner">{notice}</p>}

      <div className="card table-wrap">
        <table className="library" id="library-table">
          <thead>
            <tr>
              <th className="name">Name</th>
              <th>Sp.</th>
              <th>Sex</th>
              <th>Lvl</th>
              {LIB_STATS.map((s) => (
                <th key={s}>{STAT_SHORT[s]}</th>
              ))}
              <th>Imp</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => {
              const best = bestBySpecies.get(c.speciesBlueprint);
              const cols = statsFor(c).filter((s) => (LIB_STATS as number[]).includes(s));
              return (
                <tr key={c.id}>
                  <td className="name">{c.name}</td>
                  <td>{c.speciesName}</td>
                  <td className={c.sex === 'male' ? 'sex-m' : c.sex === 'female' ? 'sex-f' : ''}>
                    {sexGlyph(c.sex)} {sexLabel(c.sex)[0]}
                  </td>
                  <td>{creatureLevel(c)}</td>
                  {LIB_STATS.map((s) => {
                    if (!cols.includes(s)) return <td key={s}>—</td>;
                    const v = wildPlusMut(c, s);
                    const top = best && best[s] > 0 && v === best[s];
                    return (
                      <td key={s}>
                        <span className={top ? 'stat-top' : undefined} title={c.levelsMut[s] ? `${c.levelsWild[s]} wild + ${c.levelsMut[s]} mut` : undefined}>
                          {v}{c.levelsMut[s] ? 'm' : ''}
                        </span>
                      </td>
                    );
                  })}
                  <td>{c.isBred ? `${Math.round(c.imprintingBonus * 100)}%` : c.isTamed ? `${Math.round(c.tamingEff * 100)}% TE` : 'wild'}</td>
                  <td>
                    <button type="button" className="btn-ghost" aria-label={`Remove ${c.name}`} onClick={() => removeCreature(c.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="creature-cards">
          {visible.map((c) => {
            const best = bestBySpecies.get(c.speciesBlueprint);
            return (
              <article key={c.id} className="card">
                <div className="pair-head">
                  <strong>
                    <span className={c.sex === 'male' ? 'sex-m' : c.sex === 'female' ? 'sex-f' : ''}>{sexGlyph(c.sex)}</span>{' '}
                    {c.name}
                  </strong>
                  <span>
                    {c.speciesName} · L{creatureLevel(c)}
                  </span>
                </div>
                <div className="stat-pills">
                  {statsFor(c).map((s) => {
                    const v = wildPlusMut(c, s);
                    const top = best && best[s] > 0 && v === best[s];
                    return (
                      <span key={s} className={top ? 'pill top' : 'pill'}>
                        {STAT_SHORT[s]} {v}
                      </span>
                    );
                  })}
                </div>
                <div className="row" style={{ marginTop: '0.6rem' }}>
                  <button type="button" className="btn-danger" onClick={() => removeCreature(c.id)}>
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {visible.length === 0 && <p className="lede">Nothing in the library yet. Extract a creature or import a .asb file.</p>}
      </div>
      {speciesNames.length > 0 && (
        <p className="disclaimer">Species in this library: {speciesNames.join(', ')}.</p>
      )}
    </section>
  );
}
