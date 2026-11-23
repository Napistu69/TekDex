import { useEffect, useMemo, useState } from 'react';
import { cryptoRandomId } from '../engine/asb';
import { preferredSpecies } from '../engine/values';
import {
  adjustedTimes,
  formatClock,
  formatDuration,
  foodEstimateRemaining,
  nextMaturationMilestone,
  pauseTimer,
  resumeTimer,
  snapshot,
  stageAt,
  type SavedTimer,
  type TimerKind,
} from '../engine/timers';
import type { Species } from '../engine/types';
import { SpeciesSelect } from '../components/SpeciesSelect';
import { useAppState } from '../state/AppState';
import { DEMO_REX_BLUEPRINT } from '../sample/demoTribe';

const KINDS: { id: TimerKind; label: string }[] = [
  { id: 'incubation', label: 'Incubate / hatch' },
  { id: 'gestation', label: 'Gestation' },
  { id: 'maturation', label: 'Raising' },
  { id: 'cuddle', label: 'Imprint / cuddle' },
  { id: 'mating', label: 'Mating cooldown' },
];

export function TimersPage() {
  const { species, hideNoisy, multipliers, timers, addTimer, updateTimer, removeTimer, findSpecies } = useAppState();
  const fallback = findSpecies(DEMO_REX_BLUEPRINT) ?? preferredSpecies(species, 'Dodo') ?? preferredSpecies(species, 'Rex') ?? species[0];
  const [current, setCurrent] = useState<Species | undefined>(undefined);
  const sp = current ?? fallback;
  const [kind, setKind] = useState<TimerKind>('incubation');
  const [name, setName] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [notify, setNotify] = useState(false);
  const [notifyBefore, setNotifyBefore] = useState(5);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    for (const t of timers) {
      if (!t.notify) continue;
      const snap = snapshot(t, now);
      const soon = t.notifyMinutesBefore * 60 * 1000;
      if (snap.remainingMs <= 0 && !t.notifiedZero) {
        fireNotice(`${t.name} is ready`, `${t.speciesName} — ${labelKind(t.kind)} finished.`);
        updateTimer({ ...t, notifiedZero: true });
      } else if (snap.remainingMs > 0 && snap.remainingMs <= soon && !t.notifiedSoon) {
        fireNotice(`${t.name} in ${formatDuration(snap.remainingMs / 1000)}`, `${t.speciesName} — ${labelKind(t.kind)}.`);
        updateTimer({ ...t, notifiedSoon: true });
      }
    }
  }, [now, timers, updateTimer]);

  const times = useMemo(() => (sp ? adjustedTimes(sp, multipliers) : null), [sp, multipliers]);

  useEffect(() => {
    if (!times) return;
    if (kind === 'incubation' && times.hatchMode === 'gestation') setKind('gestation');
    if (kind === 'gestation' && times.hatchMode === 'incubation') setKind('incubation');
  }, [times, kind]);

  const start = async () => {
    if (!sp || !times) {
      setNotice('Pick a species that has breeding data in the bundled values files.');
      return;
    }
    let useNotify = notify;
    if (notify && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      useNotify = perm === 'granted';
      if (!useNotify) setNotice('Notifications were not allowed. The timer will still run on this device.');
    }
    const progress = Math.min(100, Math.max(0, progressPct)) / 100;
    const built = buildTimer({
      species: sp,
      times,
      kind,
      name: name.trim() || defaultName(sp, kind),
      progress,
      notify: useNotify,
      notifyMinutesBefore: notifyBefore,
    });
    if (!built) {
      setNotice('That species has no duration for this kind of timer in the values files.');
      return;
    }
    addTimer(built);
    setName('');
    setProgressPct(0);
    setNotice(null);
  };

  return (
    <section id="timers-page">
      <div className="page-head">
        <div>
          <h1>Timers</h1>
          <p className="lede">
            Incubation, gestation, maturation, cuddle, and mating times come from the bundled values
            fields <code>breeding.incubationTime</code>, <code>gestationTime</code>,{' '}
            <code>maturationTime</code>, and <code>matingCooldownMin/Max</code>, then honor the
            multipliers in Settings (Egg Hatch, Baby Mature, Cuddle Interval, Mating Interval,
            Imprint Amount). Finish times use this device’s local clock. Notifications are optional
            and only requested when you turn them on.
          </p>
        </div>
      </div>

      <div className="card" id="timer-composer">
        <h2>Start a timer</h2>
        <SpeciesSelect species={species} value={sp} onChange={setCurrent} hideNoisy={hideNoisy} breedableOnly />
        {times ? (
          <p className="lede" style={{ marginTop: '0.5rem' }}>
            {times.hatchMode === 'gestation'
              ? `Gestation ${formatDuration(times.gestationSec)}`
              : times.hatchMode === 'incubation'
                ? `Incubation ${formatDuration(times.incubationSec)}`
                : 'No hatch/gestation time'}
            {times.eggTempMin || times.eggTempMax
              ? ` · egg ${times.eggTempMin}–${times.eggTempMax} °C`
              : ''}
            {` · mature ${formatDuration(times.maturationSec)} (baby ${formatDuration(times.babySec)}, juv ${formatDuration(times.juvenileSec)}, ado ${formatDuration(times.adolescentSec)})`}
            {` · cuddle every ${formatDuration(times.cuddleIntervalSec)} (${Math.round(times.imprintPerCare * 1000) / 10}% each)`}
            {` · mating ${formatDuration(times.matingCooldownMinSec)}–${formatDuration(times.matingCooldownMaxSec)}`}
          </p>
        ) : (
          <p className="banner warn">No breeding block for this species in the values files.</p>
        )}
        <div className="seg wrap" role="group" aria-label="Timer kind" style={{ marginTop: '0.8rem', flexWrap: 'wrap' }}>
          {KINDS.map((k) => (
            <button key={k.id} type="button" className={kind === k.id ? 'on' : ''} onClick={() => setKind(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        <div className="grid-2" style={{ marginTop: '0.8rem' }}>
          <label className="field">
            Name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={sp ? defaultName(sp, kind) : 'Name'} />
          </label>
          {(kind === 'incubation' || kind === 'gestation' || kind === 'maturation') && (
            <label className="field">
              Already at %
              <input type="number" min={0} max={99.9} step={0.1} value={progressPct} onChange={(e) => setProgressPct(Number(e.target.value))} />
            </label>
          )}
          <label className="field">
            Warn minutes before
            <input type="number" min={0} max={180} value={notifyBefore} onChange={(e) => setNotifyBefore(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />{' '}
              Browser notification when this timer is due
            </span>
          </label>
        </div>
        <div className="row" style={{ marginTop: '0.8rem' }}>
          <button type="button" className="btn-primary" onClick={() => void start()} disabled={!times}>
            Start timer
          </button>
        </div>
        {notice && <p className="banner" style={{ marginTop: '0.7rem' }}>{notice}</p>}
      </div>

      {timers.length === 0 && (
        <p className="banner">No timers yet. They are saved in IndexedDB and will still be here after a reload.</p>
      )}

      <div className="timer-list" id="timer-list">
        {timers.map((t) => (
          <TimerCard
            key={t.id}
            timer={t}
            now={now}
            species={findSpecies(t.speciesBlueprint)}
            onUpdate={updateTimer}
            onRemove={removeTimer}
          />
        ))}
      </div>
    </section>
  );
}

function labelKind(kind: TimerKind): string {
  if (kind === 'incubation') return 'Incubation';
  if (kind === 'gestation') return 'Gestation';
  if (kind === 'maturation') return 'Raising';
  if (kind === 'cuddle') return 'Imprint / cuddle';
  return 'Mating cooldown';
}

function defaultName(sp: Species, kind: TimerKind): string {
  return `${sp.displayName} ${labelKind(kind).toLowerCase()}`;
}

function fireNotice(title: string, body: string) {
  try {
    new Notification(title, { body });
  } catch {
    // ignore
  }
}

function buildTimer(opts: {
  species: Species;
  times: NonNullable<ReturnType<typeof adjustedTimes>>;
  kind: TimerKind;
  name: string;
  progress: number;
  notify: boolean;
  notifyMinutesBefore: number;
}): SavedTimer | null {
  const { species, times, kind, name, progress, notify, notifyMinutesBefore } = opts;
  const now = new Date();
  let durationMs = 0;
  let durationMaxMs: number | undefined;
  if (kind === 'incubation') {
    if (times.incubationSec <= 0) return null;
    durationMs = (1 - progress) * times.incubationSec * 1000;
  } else if (kind === 'gestation') {
    if (times.gestationSec <= 0) return null;
    durationMs = (1 - progress) * times.gestationSec * 1000;
  } else if (kind === 'maturation') {
    if (times.maturationSec <= 0) return null;
    durationMs = (1 - progress) * times.maturationSec * 1000;
  } else if (kind === 'cuddle') {
    durationMs = times.cuddleIntervalSec * 1000;
  } else {
    durationMs = times.matingCooldownMinSec * 1000;
    durationMaxMs = times.matingCooldownMaxSec * 1000;
    if (durationMs <= 0) return null;
  }
  return {
    id: cryptoRandomId(),
    name,
    speciesBlueprint: species.blueprintPath,
    speciesName: species.displayName || species.name,
    kind,
    startedAt: now.toISOString(),
    durationMs,
    durationMaxMs,
    progressStart: kind === 'cuddle' || kind === 'mating' ? 0 : progress,
    pausedAt: null,
    remainingMsWhenPaused: null,
    notify,
    notifyMinutesBefore,
    notifiedZero: false,
    notifiedSoon: false,
    createdAt: now.toISOString(),
  };
}

function TimerCard({
  timer,
  now,
  species,
  onUpdate,
  onRemove,
}: {
  timer: SavedTimer;
  now: Date;
  species?: Species;
  onUpdate: (t: SavedTimer) => void;
  onRemove: (id: string) => void;
}) {
  const { multipliers } = useAppState();
  const snap = snapshot(timer, now);
  const times = species ? adjustedTimes(species, multipliers) : null;
  const matProgress = timer.kind === 'maturation' ? snap.progress : timer.kind === 'incubation' || timer.kind === 'gestation' ? snap.progress : 0;
  const stage = timer.kind === 'maturation' ? stageAt(matProgress) : null;
  const next = timer.kind === 'maturation' && times ? nextMaturationMilestone(matProgress) : null;
  const toNext = next && times ? (next.at - matProgress) * times.maturationSec : null;
  const food =
    timer.kind === 'maturation' && species && times
      ? foodEstimateRemaining(species, matProgress, multipliers, times.maturationSec)
      : null;

  const toggleNotify = async () => {
    if (!timer.notify && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
    }
    onUpdate({ ...timer, notify: !timer.notify, notifiedSoon: false, notifiedZero: false });
  };

  const cared = () => {
    if (!times) return;
    const start = new Date();
    onUpdate({
      ...timer,
      startedAt: start.toISOString(),
      durationMs: times.cuddleIntervalSec * 1000,
      pausedAt: null,
      remainingMsWhenPaused: null,
      notifiedZero: false,
      notifiedSoon: false,
    });
  };

  return (
    <article className={`card timer-card${snap.overdue ? ' due' : ''}`} data-kind={timer.kind}>
      <div className="pair-head">
        <div>
          <h2>{timer.name}</h2>
          <p className="lede">
            {timer.speciesName} · {labelKind(timer.kind)}
            {stage ? ` · ${stage}` : ''}
            {snap.running ? '' : snap.overdue ? ' · done' : ' · paused'}
          </p>
        </div>
        <div className="score timer-remain" title={snap.endsAt.toISOString()}>
          {snap.overdue ? 'Ready' : formatDuration(snap.remainingMs / 1000)}
        </div>
      </div>
      <p className="lede">
        {snap.overdue
          ? `Finished ${formatClock(snap.endsAt)}`
          : `Finishes ${formatClock(snap.endsAt)}`}
        {timer.kind === 'mating' && snap.endsAtMax
          ? ` · latest ${formatClock(snap.endsAtMax)} (${formatDuration((snap.remainingMaxMs ?? 0) / 1000)} left)`
          : ''}
      </p>
      {(timer.kind === 'maturation' || timer.kind === 'incubation' || timer.kind === 'gestation') && (
        <div className="meter" aria-label="Progress">
          <span style={{ width: `${Math.min(100, matProgress * 100)}%` }} />
        </div>
      )}
      {timer.kind === 'maturation' && (
        <div className="stat-pills">
          <span className="pill top">{Math.round(matProgress * 1000) / 10}%</span>
          {next && toNext != null && (
            <span className="pill">
              {next.name} in {formatDuration(toNext)}
            </span>
          )}
          {times && <span className="pill">adult {formatClock(new Date(now.getTime() + Math.max(0, (1 - matProgress) * times.maturationSec * 1000)))}</span>}
        </div>
      )}
      {timer.kind === 'incubation' && times && (times.eggTempMin || times.eggTempMax) && (
        <p className="lede">Egg temperature {times.eggTempMin}–{times.eggTempMax} °C (values field <code>breeding.eggTempMin/Max</code>).</p>
      )}
      {timer.kind === 'cuddle' && times && (
        <p className="lede">
          Each care is about {Math.round(times.imprintPerCare * 1000) / 10}% imprint at the current multipliers
          (wiki formula; 8 hour base interval × cuddle multiplier).
        </p>
      )}
      {food && (
        <p className="lede">
          About {Math.ceil(food.hungerUnits).toLocaleString()} hunger left
          {` · ~${Math.ceil(food.mejoberries)} mejoberries (30 each) or ~${Math.ceil(food.rawMeat)} raw meat (50 each)`}
          {` · ${food.perMinuteAtStart.toFixed(2)} hunger/min now`}
          {food.handFeedUntilJuvenile ? ' · hand-feed until juvenile (10%); troughs work after that.' : ''}.
        </p>
      )}
      <div className="toolbar" style={{ marginTop: '0.7rem' }}>
        {snap.overdue && timer.kind === 'cuddle' && (
          <button type="button" className="btn-primary" onClick={cared}>
            Logged care — start next
          </button>
        )}
        {!snap.overdue && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onUpdate(timer.pausedAt ? resumeTimer(timer, now) : pauseTimer(timer, now))}
          >
            {timer.pausedAt ? 'Resume' : 'Pause'}
          </button>
        )}
        <button type="button" className={`btn-secondary${timer.notify ? ' on' : ''}`} onClick={() => void toggleNotify()}>
          {timer.notify ? 'Alerts on' : 'Alerts off'}
        </button>
        <button type="button" className="btn-danger" onClick={() => onRemove(timer.id)}>
          Remove
        </button>
      </div>
    </article>
  );
}
