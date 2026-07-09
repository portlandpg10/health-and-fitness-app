import { useState, useEffect, useRef, useCallback } from 'react';

const GET_READY_SEC = 3;

function isWorkRestType(type) {
  return type === 'tabata' || type === 'amrapRounds';
}

function shouldPlayFifteenSecWarning(cfg, prev) {
  if (cfg.type === 'forTime') return false;
  if (isWorkRestType(cfg.type) && prev.subPhase === 'rest') return false;
  return true;
}

function initialStateForConfig(config) {
  const base = {
    phase: 'idle',
    round: 1,
    subPhase: null,
    remainingSec: 0,
    elapsedSec: 0,
    getReadySec: GET_READY_SEC,
  };

  switch (config.type) {
    case 'amrap':
    case 'countdown':
      return { ...base, remainingSec: config.durationSec };
    case 'emom':
      return { ...base, remainingSec: config.intervalSec, round: 1 };
    case 'tabata':
    case 'amrapRounds':
      return { ...base, remainingSec: config.workSec, subPhase: 'work', round: 1 };
    case 'forTime':
      return { ...base, elapsedSec: 0 };
    default:
      return base;
  }
}

function startingRemainingSec(cfg) {
  if (cfg.type === 'amrap' || cfg.type === 'countdown') return cfg.durationSec;
  if (cfg.type === 'emom') return cfg.intervalSec;
  if (isWorkRestType(cfg.type)) return cfg.workSec;
  return 0;
}

function advanceWorkRest(cfg, prev, sounds) {
  if (prev.subPhase === 'work') {
    if (prev.round >= cfg.rounds) {
      sounds.playComplete();
      return { state: { ...prev, phase: 'complete', remainingSec: 0, subPhase: null }, complete: true };
    }
    if (cfg.restSec <= 0) {
      sounds.playRoundEnd();
      return {
        state: {
          ...prev,
          round: prev.round + 1,
          subPhase: 'work',
          remainingSec: cfg.workSec,
          phase: 'running',
        },
        complete: false,
      };
    }
    sounds.playRestStart();
    return {
      state: {
        ...prev,
        subPhase: 'rest',
        remainingSec: cfg.restSec,
        phase: 'running',
      },
      complete: false,
    };
  }

  sounds.playWorkStart();
  return {
    state: {
      ...prev,
      round: prev.round + 1,
      subPhase: 'work',
      remainingSec: cfg.workSec,
      phase: 'running',
    },
    complete: false,
  };
}

export function useWorkoutTimer(config, sounds) {
  const [state, setState] = useState(() => initialStateForConfig(config));
  const [running, setRunning] = useState(false);
  const lastTickRef = useRef(null);
  const lastCountdownBeepRef = useRef(null);
  const lastFifteenSecBeepRef = useRef(false);
  const configRef = useRef(config);
  configRef.current = config;

  const reset = useCallback(() => {
    setRunning(false);
    setState(initialStateForConfig(configRef.current));
    lastTickRef.current = null;
    lastCountdownBeepRef.current = null;
    lastFifteenSecBeepRef.current = false;
  }, []);

  useEffect(() => {
    reset();
  }, [config, reset]);

  const start = useCallback(() => {
    void sounds.unlock();
    setRunning(true);
    lastTickRef.current = null;
    lastCountdownBeepRef.current = null;
    lastFifteenSecBeepRef.current = false;
    setState(s => {
      if (s.phase === 'complete') {
        return { ...initialStateForConfig(configRef.current), phase: 'getReady', getReadySec: GET_READY_SEC };
      }
      if (s.phase === 'idle') {
        return { ...s, phase: 'getReady', getReadySec: GET_READY_SEC };
      }
      return s;
    });
  }, [sounds]);

  const pause = useCallback(() => {
    setRunning(false);
    lastTickRef.current = null;
  }, []);

  const resume = useCallback(() => {
    void sounds.unlock();
    setRunning(true);
    lastTickRef.current = null;
  }, [sounds]);

  const stopRunning = useCallback(() => {
    setRunning(false);
    lastTickRef.current = null;
  }, []);

  const skip = useCallback(() => {
    const cfg = configRef.current;
    let didComplete = false;

    setState(s => {
      if (s.phase === 'complete' || s.phase === 'idle') return s;

      if (cfg.type === 'emom') {
        if (s.round >= cfg.rounds) {
          sounds.playComplete();
          didComplete = true;
          return { ...s, phase: 'complete', remainingSec: 0 };
        }
        sounds.playRoundEnd();
        return {
          ...s,
          round: s.round + 1,
          remainingSec: cfg.intervalSec,
          phase: 'running',
        };
      }

      if (isWorkRestType(cfg.type)) {
        const result = advanceWorkRest(cfg, s, sounds);
        if (result.complete) didComplete = true;
        return result.state;
      }

      return s;
    });

    if (didComplete) stopRunning();
    lastCountdownBeepRef.current = null;
    lastFifteenSecBeepRef.current = false;
  }, [sounds, stopRunning]);

  useEffect(() => {
    if (!running) return;

    let shouldStop = false;

    const interval = setInterval(() => {
      const now = Date.now();
      const cfg = configRef.current;

      setState(prev => {
        if (prev.phase === 'getReady') {
          if (lastTickRef.current == null) {
            lastTickRef.current = now;
            sounds.playCountdownTick(prev.getReadySec);
            lastCountdownBeepRef.current = prev.getReadySec;
            return prev;
          }

          const delta = (now - lastTickRef.current) / 1000;
          if (delta < 1) return prev;

          lastTickRef.current = now;
          const next = prev.getReadySec - 1;

          if (next > 0) {
            if (lastCountdownBeepRef.current !== next) {
              sounds.playCountdownTick(next);
              lastCountdownBeepRef.current = next;
            }
            return { ...prev, getReadySec: next };
          }

          lastCountdownBeepRef.current = null;
          sounds.playWorkStart();

          if (cfg.type === 'forTime') {
            return { ...prev, phase: 'running', elapsedSec: 0, getReadySec: 0 };
          }

          return {
            ...prev,
            phase: 'running',
            getReadySec: 0,
            remainingSec: startingRemainingSec(cfg),
            subPhase: isWorkRestType(cfg.type) ? 'work' : prev.subPhase,
          };
        }

        if (prev.phase !== 'running') return prev;

        if (lastTickRef.current == null) {
          lastTickRef.current = now;
          return prev;
        }

        const delta = (now - lastTickRef.current) / 1000;
        if (delta < 1) return prev;
        lastTickRef.current = now;

        if (cfg.type === 'forTime') {
          return { ...prev, elapsedSec: prev.elapsedSec + 1 };
        }

        const nextRemaining = prev.remainingSec - 1;

        if (nextRemaining > 0) {
          if (
            nextRemaining === 15
            && shouldPlayFifteenSecWarning(cfg, prev)
            && !lastFifteenSecBeepRef.current
          ) {
            sounds.playFifteenSecondsLeft();
            lastFifteenSecBeepRef.current = true;
          }
          if (nextRemaining <= 3 && lastCountdownBeepRef.current !== nextRemaining) {
            sounds.playCountdownTick(nextRemaining);
            lastCountdownBeepRef.current = nextRemaining;
          }
          return { ...prev, remainingSec: nextRemaining };
        }

        lastCountdownBeepRef.current = null;
        lastFifteenSecBeepRef.current = false;

        if (cfg.type === 'amrap' || cfg.type === 'countdown') {
          sounds.playComplete();
          shouldStop = true;
          return { ...prev, phase: 'complete', remainingSec: 0 };
        }

        if (cfg.type === 'emom') {
          if (prev.round >= cfg.rounds) {
            sounds.playComplete();
            shouldStop = true;
            return { ...prev, phase: 'complete', remainingSec: 0 };
          }
          sounds.playRoundEnd();
          return {
            ...prev,
            round: prev.round + 1,
            remainingSec: cfg.intervalSec,
          };
        }

        if (isWorkRestType(cfg.type)) {
          const result = advanceWorkRest(cfg, prev, sounds);
          if (result.complete) shouldStop = true;
          return result.state;
        }

        return prev;
      });

      if (shouldStop) stopRunning();
    }, 100);

    return () => clearInterval(interval);
  }, [running, sounds, stopRunning]);

  const displaySec =
    state.phase === 'getReady'
      ? state.getReadySec
      : config.type === 'forTime'
        ? state.elapsedSec
        : state.remainingSec;

  const statusLine = (() => {
    if (state.phase === 'getReady') return 'Get ready';
    if (state.phase === 'complete') return 'Complete';
    if (state.phase === 'idle') return 'Ready';

    if (config.type === 'emom') {
      return `Round ${state.round} / ${config.rounds}`;
    }
    if (isWorkRestType(config.type)) {
      return `Round ${state.round} / ${config.rounds} · ${state.subPhase === 'work' ? 'WORK' : 'REST'}`;
    }
    if (config.type === 'forTime') {
      return 'Elapsed';
    }
    return 'Remaining';
  })();

  return {
    state,
    running,
    displaySec,
    statusLine,
    start,
    pause,
    resume,
    reset,
    skip,
  };
}
