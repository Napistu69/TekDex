import { useState } from 'react';
import { STAT_NAMES, STATS_COUNT } from '../engine/ark';
import { officialAsaMultipliers, loadServerMultiplierPresets } from '../engine/values';
import { defaultMultipliers, type ServerMultipliers } from '../engine/types';
import { useAppState } from '../state/AppState';

const MULT_LABELS = ['Tame add (TaM)', 'Tame affinity (TmM)', 'Tamed level (IdM)', 'Wild level (IwM)'];

export function SettingsPage() {
  const { multipliers, setMultipliers, hideNoisy, setHideNoisy, clearLibrary, loadDemo, creatures, version } = useAppState();
  const [notice, setNotice] = useState<string | null>(null);

  const updateStat = (s: number, k: number, v: number) => {
    const next: ServerMultipliers = {
      ...multipliers,
      statMultipliers: multipliers.statMultipliers.map((row, i) => (i === s ? row.map((x, j) => (j === k ? v : x)) : row.slice())),
    };
    setMultipliers(next);
  };

  const updateField = <K extends keyof ServerMultipliers>(key: K, value: ServerMultipliers[K]) => {
    setMultipliers({ ...multipliers, [key]: value });
  };

  const applyOfficial = async (sp: boolean) => {
    const presets = await loadServerMultiplierPresets().catch(() => undefined);
    setMultipliers(officialAsaMultipliers(sp, presets));
    setNotice(sp ? 'Applied official ASA single-player multipliers.' : 'Applied official ASA multipliers.');
  };

  const applyOnes = () => {
    setMultipliers(defaultMultipliers());
    setNotice('All multipliers reset to 1×.');
  };

  return (
    <section id="settings-page">
      <div className="page-head">
        <div>
          <h1>Server settings</h1>
          <p className="lede">
            Extraction and timers use these multipliers. Official ASA applies the usual 0.14 / 0.44
            tame bonuses and official HP and melee values (hatch, mature, and cuddle stay at 1×
            unless you change them). Species data: {version || 'loading…'}.
          </p>
        </div>
      </div>
      <div className="card">
        <div className="toolbar">
          <button type="button" className="btn-primary" onClick={() => void applyOfficial(false)}>Official ASA</button>
          <button type="button" className="btn-secondary" onClick={() => void applyOfficial(true)}>Official single-player</button>
          <button type="button" className="btn-secondary" onClick={applyOnes}>All 1×</button>
        </div>
        {notice && <p className="banner good">{notice}</p>}
        <label className="field" style={{ marginTop: '0.6rem' }}>
          <span>
            <input type="checkbox" checked={multipliers.singlePlayerSettings} onChange={(e) => updateField('singlePlayerSettings', e.target.checked)} />{' '}
            Single-player settings flag
          </span>
        </label>
        <label className="field">
          <span>
            <input type="checkbox" checked={hideNoisy} onChange={(e) => setHideNoisy(e.target.checked)} />{' '}
            Hide noisy mission / event variants in species search
          </span>
        </label>
      </div>
      <div className="card table-wrap">
        <h2>Stat multipliers</h2>
        <table className="library" style={{ marginTop: '0.7rem' }}>
          <thead>
            <tr>
              <th className="name">Stat</th>
              {MULT_LABELS.map((l) => <th key={l}>{l}</th>)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: STATS_COUNT }, (_, s) => (
              <tr key={s}>
                <td className="name">{STAT_NAMES[s]}</td>
                {(multipliers.statMultipliers[s] ?? [1, 1, 1, 1]).map((v, k) => (
                  <td key={k}>
                    <input
                      type="number"
                      step={0.01}
                      value={v}
                      onChange={(e) => updateStat(s, k, Number(e.target.value))}
                      aria-label={`${STAT_NAMES[s]} ${MULT_LABELS[k]}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h2>Breeding & raising</h2>
        <div className="grid-2" style={{ marginTop: '0.7rem' }}>
          {(
            [
              ['tamingSpeedMultiplier', 'Taming speed'],
              ['matingIntervalMultiplier', 'Mating interval'],
              ['eggHatchSpeedMultiplier', 'Egg hatch / gestation'],
              ['babyMatureSpeedMultiplier', 'Baby mature'],
              ['babyCuddleIntervalMultiplier', 'Cuddle interval'],
              ['babyImprintingStatScaleMultiplier', 'Imprint stat scale'],
              ['babyImprintAmountMultiplier', 'Imprint amount'],
              ['babyFoodConsumptionSpeedMultiplier', 'Baby food consumption speed'],
              ['dinoCharacterFoodDrainMultiplier', 'Dino food drain'],
              ['tamedDinoCharacterFoodDrainMultiplier', 'Tamed dino food drain'],
            ] as const
          ).map(([key, label]) => (
            <label className="field" key={key}>
              {label}
              <input type="number" step={0.001} value={multipliers[key]} onChange={(e) => updateField(key, Number(e.target.value))} />
            </label>
          ))}
        </div>
      </div>
      <div className="card">
        <h2>Library on this device</h2>
        <p className="lede">{creatures.length} creatures stored in IndexedDB. Clearing this does not touch any files on disk.</p>
        <div className="toolbar" style={{ marginTop: '0.7rem' }}>
          <button type="button" className="btn-secondary" onClick={loadDemo}>Load demo Rex tribe</button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              if (window.confirm('Remove every creature from the library on this device?')) clearLibrary();
            }}
          >
            Clear library
          </button>
        </div>
      </div>
    </section>
  );
}
