import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyMultipliersToSpecies,
  loadServerMultiplierPresets,
  loadSpeciesIndex,
  officialAsaMultipliers,
} from '../engine/values';
import { defaultMultipliers, type Creature, type ServerMultipliers, type Species } from '../engine/types';
import { normalizeCreature } from '../engine/schema';
import type { SavedTimer } from '../engine/timers';
import {
  loadCreatures,
  loadSettings,
  loadTimers,
  migrateLegacyIfNeeded,
  saveCreatures,
  saveSettings,
  saveTimers,
} from '../storage/db';
import { demoTribe } from '../sample/demoTribe';

function fillMultipliers(m: ServerMultipliers): ServerMultipliers {
  const base = defaultMultipliers();
  return {
    ...base,
    ...m,
    statMultipliers: m.statMultipliers?.length ? m.statMultipliers : base.statMultipliers,
  };
}

interface AppStateValue {
  ready: boolean;
  error: string | null;
  version: string;
  species: Species[];
  speciesByBlueprint: Map<string, Species>;
  multipliers: ServerMultipliers;
  creatures: Creature[];
  timers: SavedTimer[];
  demoSeeded: boolean;
  hideNoisy: boolean;
  setMultipliers: (m: ServerMultipliers) => void;
  setHideNoisy: (v: boolean) => void;
  addCreature: (c: Creature) => void;
  updateCreature: (c: Creature) => void;
  removeCreature: (id: string) => void;
  replaceCreatures: (list: Creature[], opts?: { merge?: boolean }) => void;
  loadDemo: () => void;
  clearLibrary: () => void;
  findSpecies: (blueprint: string) => Species | undefined;
  addTimer: (t: SavedTimer) => void;
  updateTimer: (t: SavedTimer) => void;
  removeTimer: (id: string) => void;
  replaceTimers: (list: SavedTimer[]) => void;
}

const Ctx = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState('');
  const [rawSpecies, setRawSpecies] = useState<Species[]>([]);
  const [multipliers, setMultipliersState] = useState<ServerMultipliers>(officialAsaMultipliers());
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [timers, setTimers] = useState<SavedTimer[]>([]);
  const [demoSeeded, setDemoSeeded] = useState(false);
  const [hideNoisy, setHideNoisyState] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await migrateLegacyIfNeeded();
        const [index, presets, storedCreatures, storedSettings, storedTimers] = await Promise.all([
          loadSpeciesIndex(),
          loadServerMultiplierPresets().catch(() => undefined),
          loadCreatures(),
          loadSettings(),
          loadTimers(),
        ]);
        if (cancelled) return;
        setRawSpecies(index.species);
        setVersion(index.version);
        const official = officialAsaMultipliers(false, presets);
        if (storedSettings?.multipliers) {
          setMultipliersState(fillMultipliers(storedSettings.multipliers));
        } else {
          setMultipliersState(official);
        }
        setHideNoisyState(storedSettings?.hideNoisy ?? true);
        setTimers(storedTimers ?? []);
        if (storedCreatures.length > 0) {
          const normalized = storedCreatures.map(normalizeCreature);
          setCreatures(normalized);
          setDemoSeeded(storedSettings?.demoSeeded ?? false);
        } else if (!storedSettings?.demoSeeded) {
          const demo = demoTribe().map(normalizeCreature);
          setCreatures(demo);
          setDemoSeeded(true);
          await saveCreatures(demo);
          await saveSettings({
            multipliers: storedSettings?.multipliers ?? official,
            demoSeeded: true,
            hideNoisy: storedSettings?.hideNoisy ?? true,
          });
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSettings = useCallback(
    (m: ServerMultipliers, seeded: boolean, noisy: boolean) => {
      void saveSettings({ multipliers: m, demoSeeded: seeded, hideNoisy: noisy });
    },
    [],
  );

  const setMultipliers = useCallback(
    (m: ServerMultipliers) => {
      const filled = fillMultipliers(m);
      setMultipliersState(filled);
      persistSettings(filled, demoSeeded, hideNoisy);
    },
    [demoSeeded, hideNoisy, persistSettings],
  );

  const setHideNoisy = useCallback(
    (v: boolean) => {
      setHideNoisyState(v);
      persistSettings(multipliers, demoSeeded, v);
    },
    [multipliers, demoSeeded, persistSettings],
  );

  const writeCreatures = useCallback((list: Creature[]) => {
    const normalized = list.map(normalizeCreature);
    setCreatures(normalized);
    void saveCreatures(normalized);
  }, []);

  const addCreature = useCallback(
    (c: Creature) => writeCreatures([...creatures.filter((x) => x.id !== c.id), normalizeCreature(c)]),
    [creatures, writeCreatures],
  );
  const updateCreature = useCallback(
    (c: Creature) => writeCreatures(creatures.map((x) => (x.id === c.id ? normalizeCreature(c) : x))),
    [creatures, writeCreatures],
  );
  const removeCreature = useCallback(
    (id: string) => writeCreatures(creatures.filter((x) => x.id !== id)),
    [creatures, writeCreatures],
  );
  const replaceCreatures = useCallback(
    (list: Creature[], opts?: { merge?: boolean }) => {
      const incoming = list.map(normalizeCreature);
      if (opts?.merge) {
        const byId = new Map(creatures.map((c) => [c.id, c]));
        for (const c of incoming) byId.set(c.id, c);
        writeCreatures([...byId.values()]);
      } else {
        writeCreatures(incoming);
      }
    },
    [creatures, writeCreatures],
  );
  const loadDemo = useCallback(() => {
    const demo = demoTribe().map(normalizeCreature);
    writeCreatures(demo);
    setDemoSeeded(true);
    persistSettings(multipliers, true, hideNoisy);
  }, [hideNoisy, multipliers, persistSettings, writeCreatures]);
  const clearLibrary = useCallback(() => {
    writeCreatures([]);
  }, [writeCreatures]);

  const writeTimers = useCallback((list: SavedTimer[]) => {
    setTimers(list);
    void saveTimers(list);
  }, []);
  const addTimer = useCallback((t: SavedTimer) => writeTimers([t, ...timers]), [timers, writeTimers]);
  const updateTimer = useCallback(
    (t: SavedTimer) => writeTimers(timers.map((x) => (x.id === t.id ? t : x))),
    [timers, writeTimers],
  );
  const removeTimer = useCallback(
    (id: string) => writeTimers(timers.filter((x) => x.id !== id)),
    [timers, writeTimers],
  );
  const replaceTimers = useCallback((list: SavedTimer[]) => writeTimers(list), [writeTimers]);

  const species = useMemo(
    () => rawSpecies.map((s) => applyMultipliersToSpecies(s, multipliers)),
    [rawSpecies, multipliers],
  );
  const speciesByBlueprint = useMemo(
    () => new Map(species.map((s) => [s.blueprintPath, s])),
    [species],
  );
  const findSpecies = useCallback(
    (blueprint: string) => speciesByBlueprint.get(blueprint),
    [speciesByBlueprint],
  );

  const value: AppStateValue = {
    ready,
    error,
    version,
    species,
    speciesByBlueprint,
    multipliers,
    creatures,
    timers,
    demoSeeded,
    hideNoisy,
    setMultipliers,
    setHideNoisy,
    addCreature,
    updateCreature,
    removeCreature,
    replaceCreatures,
    loadDemo,
    clearLibrary,
    findSpecies,
    addTimer,
    updateTimer,
    removeTimer,
    replaceTimers,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
