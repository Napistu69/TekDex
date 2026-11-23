import { useMemo, useState, type KeyboardEvent } from 'react';
import { DISPLAY_ORDER, STAT_NAMES, STAT_SHORT, Stat, USUALLY_VISIBLE, isPercentageStat } from '../engine/ark';
import { applyChosen, extractLevels } from '../engine/extraction';
import { cryptoRandomId } from '../engine/asb';
import { parseExportIni } from '../engine/importIni';
import { calculateValue, formatStatValue } from '../engine/stats';
import { displaysStat, preferredSpecies, speciesByBlueprint, usesStat } from '../engine/values';
import type { Species } from '../engine/types';
import { SpeciesSelect } from '../components/SpeciesSelect';
import { useAppState } from '../state/AppState';
import { emptyLevels } from '../engine/types';
import { interpretStatInput, parsePastedStats } from '../engine/pasteStats';

type Kind = 'wild' | 'tamed' | 'bred';

export function ExtractPage() {
  const { species, multipliers, hideNoisy, addCreature, findSpecies } = useAppState();
  const defaultSpecies = useMemo(
    () => preferredSpecies(species, 'Rex') ?? species[0],
    [species],
  );
  const [current, setCurrent] = useState<Species | undefined>(undefined);
  const sp = current ?? defaultSpecies;
  const [kind, setKind] = useState<Kind>('tamed');
  const [level, setLevel] = useState(150);
  const [imprint, setImprint] = useState(0);
  const [teMin, setTeMin] = useState(80);
  const [teMax, setTeMax] = useState(80);
  const [values, setValues] = useState<number[]>(emptyLevels());
  const [chosen, setChosen] = useState<number[]>(Array(12).fill(0));
  const [name, setName] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [notice, setNotice] = useState<string | null>(null);
  const [iniName, setIniName] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const result = useMemo(() => {
    if (!sp) return null;
    const tamed = kind !== 'wild';
    const bred = kind === 'bred';
    return extractLevels({
      species: sp,
      level,
      statValues: values,
      tamed,
      bred,
      teMin: bred ? 1 : teMin / 100,
      teMax: bred ? 1 : kind === 'wild' ? 0 : teMax / 100,
      imprintingBonus: bred ? imprint / 100 : 0,
      multipliers,
      highPrecision: false,
    });
  }, [sp, kind, level, values, teMin, teMax, imprint, multipliers]);

  const applied = result ? applyChosen(result, chosen) : null;

  const setStat = (s: number, v: number) => {
    const next = values.slice();
    next[s] = v;
    setValues(next);
    setDirty(true);
    setChosen(Array(12).fill(0));
    setNotice(null);
  };

  const onIni = async (file: File) => {
    const text = await file.text();
    const parsed = parseExportIni(text);
    if (!parsed) {
      setNotice('That file does not look like an ASA/ASE creature export.');
      return;
    }
    const found =
      speciesByBlueprint(species, parsed.speciesBlueprint) ??
      findSpecies(parsed.speciesBlueprint);
    if (found) setCurrent(found);
    setValues(parsed.statValues.slice());
    setLevel(parsed.level || 1);
    setKind(parsed.isBred ? 'bred' : 'tamed');
    setImprint(Math.round(parsed.imprintingBonus * 1000) / 10);
    setName(parsed.name);
    setSex(parsed.sex);
    setIniName(file.name);
    setDirty(true);
    setChosen(Array(12).fill(0));
    setNotice(`Loaded ${file.name}${found ? ` as ${found.displayName}` : ' — species not found in the values files, pick one manually'}.`);
  };

  const visibleStats: number[] = sp
    ? DISPLAY_ORDER.filter((s) => usesStat(sp, s) && (displaysStat(sp, s) || USUALLY_VISIBLE[s] || s === Stat.Torpidity))
    : [];
  const pasteOrder = visibleStats.slice().sort((a, b) => a - b);

  const displayStat = (s: number): string => {
    if (drafts[s] != null) return drafts[s];
    const v = values[s] ?? 0;
    if (isPercentageStat(s)) return `${((v <= 10 ? v * 100 : v)).toFixed(v > 0 && v < 10 ? 2 : 1)}%`;
    return String(v);
  };

  const commitStat = (s: number, text: string) => {
    const n = interpretStatInput(s, text);
    if (Number.isFinite(n)) setStat(s, n);
    setDrafts((d) => {
      const next = { ...d };
      delete next[s];
      return next;
    });
  };

  const applyPaste = (text: string) => {
    const { values: next, filled } = parsePastedStats(text, pasteOrder);
    if (filled.length === 0) {
      setNotice('Could not read numbers in that paste. Use labels (Health 9900) or a list of values.');
      return;
    }
    const merged = values.slice();
    for (const s of filled) merged[s] = next[s];
    setValues(merged);
    setDrafts({});
    setDirty(true);
    setChosen(Array(12).fill(0));
    setPasteText('');
    setNotice(`Pasted ${filled.length} stat${filled.length === 1 ? '' : 's'}.`);
  };

  const onStatKey = (s: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    commitStat(s, (e.target as HTMLInputElement).value);
    const list = visibleStats;
    const i = list.indexOf(s);
    const next = e.shiftKey ? list[i - 1] : list[i + 1];
    if (next == null) return;
    const el = document.getElementById(`stat-${next}`);
    el?.focus();
  };

  const save = () => {
    if (!sp || !result?.ok || !applied) return;
    addCreature({
      id: cryptoRandomId(),
      schemaVersion: 1,
      game: 'ASA',
      speciesBlueprint: sp.blueprintPath,
      speciesName: sp.name,
      name: name.trim() || sp.displayName,
      sex,
      isBred: kind === 'bred',
      isTamed: kind !== 'wild',
      levelsWild: applied.wild,
      levelsDom: applied.dom,
      levelsMut: applied.mut,
      tamingEff: kind === 'bred' ? 1 : kind === 'wild' ? 0 : applied.te,
      imprintingBonus: kind === 'bred' ? imprint / 100 : 0,
      owner: '',
      tribe: '',
      mutationsMaternal: 0,
      mutationsPaternal: 0,
      note: iniName ? `Imported from ${iniName}` : '',
      colors: [0, 0, 0, 0, 0, 0],
      addedAt: new Date().toISOString(),
      tags: [],
    });
    setNotice(`Saved ${name.trim() || sp.displayName} to the library.`);
  };


  if (!sp) return <p className="lede">Loading species…</p>;

  return (
    <section id="extract-page">
      <div className="page-head">
        <div>
          <h1>Extract stats</h1>
          <p className="lede">
            Type or paste inventory numbers — Tab / Enter moves to the next stat, and melee or
            speed can be 230.4%, 230.4, or 2.304. There is no OCR; an ASA export .ini is the
            other supported way in.
          </p>
        </div>
        <label className="btn-primary">
          Import ASA .ini
          <input
            className="hidden-file"
            type="file"
            accept=".ini,text/plain"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onIni(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      <div className="card stack">
        <SpeciesSelect species={species} value={sp} onChange={setCurrent} hideNoisy={hideNoisy} />
        <div className="row">
          <div className="seg" role="group" aria-label="Creature type">
            {(['wild', 'tamed', 'bred'] as const).map((k) => (
              <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => { setKind(k); setDirty(true); }}>
                {k[0].toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid-2">
          <label className="field">
            Character level
            <input type="number" min={1} value={level} onChange={(e) => { setLevel(Number(e.target.value)); setDirty(true); }} />
          </label>
          {kind === 'tamed' && (
            <>
              <label className="field">
                TE min %
                <input type="number" min={0} max={100} step={0.1} value={teMin} onChange={(e) => setTeMin(Number(e.target.value))} />
              </label>
              <label className="field">
                TE max %
                <input type="number" min={0} max={100} step={0.1} value={teMax} onChange={(e) => setTeMax(Number(e.target.value))} />
              </label>
            </>
          )}
          {kind === 'bred' && (
            <label className="field">
              Imprint %
              <input type="number" min={0} max={100} step={0.1} value={imprint} onChange={(e) => setImprint(Number(e.target.value))} />
            </label>
          )}
        </div>
      </div>

      <div className="card" id="extract-values">
        <h2>Displayed values</h2>
        <p className="lede" style={{ marginTop: '0.35rem' }}>
          Paste a column or a line of numbers (inventory order: HP, Stamina, Torpor, Oxygen, Food,
          then used stats such as Weight, Melee, Speed). Labeled lines like “Health 9900.1” work too.
        </p>
        <label className="field" style={{ marginTop: '0.6rem' }}>
          Paste stats
          <textarea
            id="stat-paste"
            rows={3}
            value={pasteText}
            placeholder="Health 9900.1&#10;Stamina 1680&#10;… or 9900.1 1680 15407.5 450 9000 700 230.4 100"
            onChange={(e) => setPasteText(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (text && (text.includes('\n') || /[A-Za-z]/.test(text) || text.trim().split(/[\s,;]+/).length >= 3)) {
                e.preventDefault();
                applyPaste(text);
              }
            }}
          />
        </label>
        <div className="row" style={{ marginTop: '0.45rem' }}>
          <button type="button" className="btn-secondary" onClick={() => applyPaste(pasteText)} disabled={!pasteText.trim()}>
            Apply paste
          </button>
        </div>
        <div className="grid-stats" style={{ marginTop: '0.8rem' }}>
          {visibleStats.map((s) => (
            <label className="field" key={s}>
              {STAT_NAMES[s]}
              <input
                id={`stat-${s}`}
                inputMode="decimal"
                autoComplete="off"
                value={displayStat(s)}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setDrafts((d) => ({ ...d, [s]: e.target.value }))}
                onBlur={(e) => commitStat(s, e.target.value)}
                onKeyDown={(e) => onStatKey(s, e)}
              />
            </label>
          ))}
        </div>
      </div>

      {dirty && result && (
        <div className={`card banner ${result.ok ? (result.unique ? 'good' : 'warn') : 'bad'}`} id="extract-result">
          <strong>{result.ok ? (result.unique ? 'Unique split found.' : 'Several splits fit these numbers.') : 'No valid combination found.'}</strong>
          <p>{result.message}</p>
          {result.ok && applied && (
            <p>
              Wild+mut levels {result.wildMutSum}, domestic {result.domSum}, TE{' '}
              {(applied.te * 100).toFixed(1)}%.
            </p>
          )}
        </div>
      )}

      {result?.ok && applied && (
        <div className="card" id="extract-levels">
          <h2>Recovered levels</h2>
          <div className="table-wrap">
            <table className="library">
              <thead>
                <tr>
                  <th>Stat</th>
                  <th>Value</th>
                  <th>Wild</th>
                  <th>Mut</th>
                  <th>Dom</th>
                  {result.candidates.some((c) => c.length > 1) && <th>Pick</th>}
                </tr>
              </thead>
              <tbody>
                {DISPLAY_ORDER.filter((s) => usesStat(sp, s)).map((s) => {
                  const list = result.candidates[s];
                  const v = calculateValue(
                    sp, s, applied.wild[s], applied.mut[s], applied.dom[s],
                    kind !== 'wild', applied.te, kind === 'bred' ? imprint / 100 : 0, true, multipliers,
                  );
                  return (
                    <tr key={s}>
                      <td className="name">{STAT_SHORT[s]}</td>
                      <td>{formatStatValue(s, v)}</td>
                      <td>{applied.wild[s]}</td>
                      <td className={applied.mut[s] ? 'stat-mut' : ''}>{applied.mut[s]}</td>
                      <td>{applied.dom[s]}</td>
                      {result.candidates.some((c) => c.length > 1) && (
                        <td>
                          {list.length > 1 ? (
                            <select
                              className="cand-select"
                              value={chosen[s] ?? 0}
                              onChange={(e) => {
                                const next = chosen.slice();
                                next[s] = Number(e.target.value);
                                setChosen(next);
                              }}
                            >
                              {list.map((c, i) => (
                                <option key={i} value={i}>
                                  W{c.wild} M{c.mut} D{c.dom}
                                </option>
                              ))}
                            </select>
                          ) : (
                            '—'
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid-2" style={{ marginTop: '1rem' }}>
            <label className="field">
              Name
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={sp.displayName} />
            </label>
            <label className="field">
              Sex
              <select value={sex} onChange={(e) => setSex(e.target.value as typeof sex)}>
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>
          </div>
          <div className="row" style={{ marginTop: '0.8rem' }}>
            <button type="button" className="btn-primary" onClick={save}>
              Save to library
            </button>
          </div>
        </div>
      )}

      {notice && <p className="banner">{notice}</p>}
    </section>
  );
}
