import { useState, useMemo } from 'react';
import { parseWorkoutTimer, formatTimerLabel, formatTime } from '../utils/workoutTimerParser';
import { useSound } from '../hooks/useSound';
import { useWorkoutTimer } from '../hooks/useWorkoutTimer';

const TIMER_TYPES = [
  { value: 'amrap', label: 'AMRAP' },
  { value: 'emom', label: 'EMOM' },
  { value: 'tabata', label: 'Tabata' },
  { value: 'forTime', label: 'For Time' },
  { value: 'countdown', label: 'Countdown' },
];

function buildManualConfig(type, { durationMin, rounds, intervalMin, workSec, restSec, restMin }) {
  switch (type) {
    case 'amrap': {
      const mins = Math.max(1, Number(durationMin) || 15);
      const numRounds = Math.max(1, Number(rounds) || 1);
      const restMinutes = Math.max(0, Number(restMin) || 0);
      if (numRounds > 1 || restMinutes > 0) {
        return {
          type: 'amrapRounds',
          rounds: numRounds,
          workSec: mins * 60,
          restSec: restMinutes * 60,
        };
      }
      return { type: 'amrap', durationSec: mins * 60 };
    }
    case 'countdown':
      return { type: 'countdown', durationSec: Math.max(1, Number(durationMin) || 15) * 60 };
    case 'emom':
      return {
        type: 'emom',
        rounds: Math.max(1, Number(rounds) || 18),
        intervalSec: Math.max(1, Number(intervalMin) || 1) * 60,
      };
    case 'tabata':
      return {
        type: 'tabata',
        rounds: Math.max(1, Number(rounds) || 8),
        workSec: Math.max(1, Number(workSec) || 20),
        restSec: Math.max(1, Number(restSec) || 10),
      };
    case 'forTime':
      return { type: 'forTime' };
    default:
      return { type: 'forTime' };
  }
}

export default function WorkoutTimer({ wodText, layout = 'vertical' }) {
  const parsed = useMemo(() => parseWorkoutTimer(wodText), [wodText]);
  const [manualType, setManualType] = useState('forTime');
  const [durationMin, setDurationMin] = useState(15);
  const [rounds, setRounds] = useState(18);
  const [intervalMin, setIntervalMin] = useState(1);
  const [workSec, setWorkSec] = useState(20);
  const [restSec, setRestSec] = useState(10);
  const [restMin, setRestMin] = useState(1);
  const [useManual, setUseManual] = useState(parsed.config.type === 'unknown');
  const [editOpen, setEditOpen] = useState(false);

  const openEdit = () => {
    if (parsed.config.type !== 'unknown' && !useManual) {
      const c = parsed.config;
      if (c.type === 'amrap') {
        setManualType('amrap');
        setDurationMin(c.durationSec / 60);
        setRounds(1);
        setRestMin(0);
      } else if (c.type === 'amrapRounds') {
        setManualType('amrap');
        setDurationMin(c.workSec / 60);
        setRounds(c.rounds);
        setRestMin(c.restSec / 60);
      } else if (c.type === 'emom') {
        setManualType('emom');
        setRounds(c.rounds);
        setIntervalMin(c.intervalSec / 60);
      } else if (c.type === 'tabata') {
        setManualType('tabata');
        setRounds(c.rounds);
        setWorkSec(c.workSec);
        setRestSec(c.restSec);
      } else if (c.type === 'countdown') {
        setManualType('countdown');
        setDurationMin(c.durationSec / 60);
      } else if (c.type === 'forTime') {
        setManualType('forTime');
      }
    }
    setEditOpen(true);
  };

  const handleManualTypeChange = (type) => {
    setManualType(type);
    if (type === 'amrap') {
      setDurationMin(15);
      setRounds(1);
      setRestMin(0);
    } else if (type === 'emom') {
      setRounds(18);
      setIntervalMin(1);
    } else if (type === 'tabata') {
      setRounds(8);
      setWorkSec(20);
      setRestSec(10);
    } else if (type === 'countdown') {
      setDurationMin(15);
    }
  };

  const handleManualOverrideToggle = (enabled) => {
    setUseManual(enabled);
    if (!enabled) return;

    const c = parsed.config;
    if (c.type === 'amrap') {
      setManualType('amrap');
      setDurationMin(c.durationSec / 60);
      setRounds(1);
      setRestMin(0);
    } else if (c.type === 'amrapRounds') {
      setManualType('amrap');
      setDurationMin(c.workSec / 60);
      setRounds(c.rounds);
      setRestMin(c.restSec / 60);
    } else if (c.type === 'emom') {
      setManualType('emom');
      setRounds(c.rounds);
      setIntervalMin(c.intervalSec / 60);
    } else if (c.type === 'tabata') {
      setManualType('tabata');
      setRounds(c.rounds);
      setWorkSec(c.workSec);
      setRestSec(c.restSec);
    } else if (c.type === 'countdown') {
      setManualType('countdown');
      setDurationMin(c.durationSec / 60);
    } else if (c.type === 'forTime') {
      setManualType('forTime');
    }
  };

  const activeConfig = useMemo(() => {
    if (useManual || parsed.config.type === 'unknown') {
      return buildManualConfig(manualType, { durationMin, rounds, intervalMin, workSec, restSec, restMin });
    }
    return parsed.config;
  }, [useManual, parsed.config, manualType, durationMin, rounds, intervalMin, workSec, restSec, restMin]);

  const sounds = useSound();
  const timer = useWorkoutTimer(activeConfig, sounds);

  const isWorkRest = activeConfig.type === 'tabata' || activeConfig.type === 'amrapRounds';

  const accentClass =
    isWorkRest && timer.state.subPhase === 'rest'
      ? 'text-blue-300'
      : isWorkRest && timer.state.phase === 'running'
        ? 'text-amber-300'
        : timer.state.phase === 'getReady'
          ? 'text-yellow-300'
          : timer.state.phase === 'complete'
            ? 'text-green-300'
            : 'text-white';

  const handleStartPause = () => {
    if (timer.state.phase === 'complete') {
      timer.reset();
      timer.start();
      return;
    }
    if (timer.running) {
      timer.pause();
    } else if (timer.state.phase === 'idle') {
      timer.start();
    } else {
      timer.resume();
    }
  };

  const showManualForm = useManual || parsed.config.type === 'unknown';

  const renderManualForm = () => (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {parsed.config.type !== 'unknown' && (
        <label className="flex items-center gap-2 text-slate-400">
          <input
            type="checkbox"
            checked={useManual}
            onChange={e => handleManualOverrideToggle(e.target.checked)}
            className="rounded"
          />
          Manual override
        </label>
      )}

      {showManualForm && (
        <>
          <select
            value={manualType}
            onChange={e => handleManualTypeChange(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-200"
          >
            {TIMER_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {manualType === 'amrap' && (
            <>
              <label className="flex items-center gap-2 text-slate-400">
                Minutes
                <input
                  type="number"
                  min={1}
                  value={durationMin}
                  onChange={e => setDurationMin(e.target.value)}
                  className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-slate-200"
                />
              </label>
              <label className="flex items-center gap-2 text-slate-400">
                Rounds
                <input
                  type="number"
                  min={1}
                  value={rounds}
                  onChange={e => setRounds(e.target.value)}
                  className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-slate-200"
                />
              </label>
              <label className="flex items-center gap-2 text-slate-400">
                Rest (min)
                <input
                  type="number"
                  min={0}
                  value={restMin}
                  onChange={e => setRestMin(e.target.value)}
                  className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-slate-200"
                />
              </label>
            </>
          )}

          {manualType === 'countdown' && (
            <label className="flex items-center gap-2 text-slate-400">
              Minutes
              <input
                type="number"
                min={1}
                value={durationMin}
                onChange={e => setDurationMin(e.target.value)}
                className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-slate-200"
              />
            </label>
          )}

          {manualType === 'emom' && (
            <>
              <label className="flex items-center gap-2 text-slate-400">
                Rounds
                <input
                  type="number"
                  min={1}
                  value={rounds}
                  onChange={e => setRounds(e.target.value)}
                  className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-slate-200"
                />
              </label>
              <label className="flex items-center gap-2 text-slate-400">
                Every (min)
                <input
                  type="number"
                  min={1}
                  value={intervalMin}
                  onChange={e => setIntervalMin(e.target.value)}
                  className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-slate-200"
                />
              </label>
            </>
          )}

          {manualType === 'tabata' && (
            <>
              <label className="flex items-center gap-2 text-slate-400">
                Rounds
                <input
                  type="number"
                  min={1}
                  value={rounds}
                  onChange={e => setRounds(e.target.value)}
                  className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-slate-200"
                />
              </label>
              <label className="flex items-center gap-2 text-slate-400">
                Work (s)
                <input
                  type="number"
                  min={1}
                  value={workSec}
                  onChange={e => setWorkSec(e.target.value)}
                  className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-slate-200"
                />
              </label>
              <label className="flex items-center gap-2 text-slate-400">
                Rest (s)
                <input
                  type="number"
                  min={1}
                  value={restSec}
                  onChange={e => setRestSec(e.target.value)}
                  className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-slate-200"
                />
              </label>
            </>
          )}
        </>
      )}
    </div>
  );

  const renderStatus = (vertical = false) => {
    const { state, statusLine } = timer;

    if (state.phase === 'running' && isWorkRest) {
      if (vertical) {
        return (
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-2xl font-bold text-white tabular-nums">
              Round {state.round} / {activeConfig.rounds}
            </span>
            <span className={`text-xl font-bold uppercase tracking-widest ${accentClass}`}>
              {state.subPhase === 'work' ? 'Work' : 'Rest'}
            </span>
          </div>
        );
      }
      return (
        <div className="flex items-baseline gap-5">
          <span className="text-3xl font-bold text-white tabular-nums">
            Round {state.round} / {activeConfig.rounds}
          </span>
          <span className={`text-3xl font-bold uppercase tracking-widest ${accentClass}`}>
            {state.subPhase === 'work' ? 'Work' : 'Rest'}
          </span>
        </div>
      );
    }

    if (state.phase === 'running' && activeConfig.type === 'emom') {
      return (
        <span className={`${vertical ? 'text-2xl' : 'text-3xl'} font-bold text-white tabular-nums text-center`}>
          Round {state.round} / {activeConfig.rounds}
        </span>
      );
    }

    return (
      <span className={`${vertical ? 'text-lg' : 'text-2xl'} font-semibold text-slate-300 text-center`}>
        {statusLine}
      </span>
    );
  };

  const controlButtons = (vertical = false) => {
    const btn = vertical
      ? 'px-2 py-1.5 rounded-lg text-xs'
      : 'px-3 py-2 rounded-lg text-sm';
    const secondary = `${btn} bg-slate-700 hover:bg-slate-600 text-slate-300`;
    const primary = vertical
      ? `${btn} bg-emerald-600 hover:bg-emerald-500 text-white font-medium`
      : 'px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-base font-medium';

    return (
      <>
        {(activeConfig.type === 'emom' || isWorkRest) && timer.state.phase === 'running' && (
          <button onClick={timer.skip} className={secondary}>
            Skip
          </button>
        )}
        <button onClick={handleStartPause} className={primary}>
          {timer.running ? 'Pause' : timer.state.phase === 'complete' ? 'Restart' : 'Start'}
        </button>
        <button onClick={timer.reset} className={secondary}>
          Reset
        </button>
        <button onClick={openEdit} className={secondary} title="Edit timer settings">
          Edit
        </button>
      </>
    );
  };

  if (layout === 'vertical') {
    return (
      <>
        <div className="bg-slate-800 rounded-xl px-3 py-3 flex flex-col h-full min-h-0">
          <div className="text-xs uppercase tracking-widest text-slate-400 text-center flex-shrink-0 leading-tight">
            {formatTimerLabel(activeConfig)}
            {useManual && parsed.config.type !== 'unknown' && (
              <span className="normal-case tracking-normal text-slate-500 ml-1">· custom</span>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-0 py-2">
            {renderStatus(true)}
            <div className={`text-6xl font-mono font-bold tabular-nums leading-none ${accentClass}`}>
              {formatTime(timer.displaySec)}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 flex-shrink-0 pt-1">
            {controlButtons(true)}
          </div>
        </div>

        {editOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setEditOpen(false)}
          >
            <div
              className="bg-slate-800 rounded-xl p-5 w-full max-w-lg border border-slate-600 shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Timer settings</h3>
                <button
                  onClick={() => setEditOpen(false)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300"
                >
                  Done
                </button>
              </div>
              {renderManualForm()}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
    <div className="bg-slate-800 rounded-xl px-5 py-2 mb-3 flex-shrink-0">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex flex-col justify-center gap-0.5">
          <div className="text-sm uppercase tracking-widest text-slate-400">
            {formatTimerLabel(activeConfig)}
            {useManual && parsed.config.type !== 'unknown' && (
              <span className="normal-case tracking-normal text-slate-500 ml-2">· custom</span>
            )}
          </div>
          {renderStatus(false)}
        </div>

        <div className={`text-5xl font-mono font-bold tabular-nums ${accentClass}`}>
          {formatTime(timer.displaySec)}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {controlButtons(false)}
        </div>
      </div>
    </div>

    {editOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={() => setEditOpen(false)}
      >
        <div
          className="bg-slate-800 rounded-xl p-5 w-full max-w-lg border border-slate-600 shadow-xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Timer settings</h3>
            <button
              onClick={() => setEditOpen(false)}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300"
            >
              Done
            </button>
          </div>
          {renderManualForm()}
        </div>
      </div>
    )}
    </>
  );
}
