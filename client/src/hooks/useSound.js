import { useState, useCallback, useRef } from 'react';

function createAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  return Ctx ? new Ctx() : null;
}

export function useSound() {
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef(null);

  const unlock = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = createAudioContext();
    }
    const ctx = ctxRef.current;
    if (ctx?.state === 'suspended') {
      ctx.resume();
    }
  }, []);

  const playBeep = useCallback(({ frequency = 880, duration = 0.12, count = 1, gap = 0.15 } = {}) => {
    if (muted) return;
    unlock();
    const ctx = ctxRef.current;
    if (!ctx) return;

    for (let i = 0; i < count; i++) {
      const startAt = ctx.currentTime + i * (duration + gap);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.value = 0.25;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + duration);
    }
  }, [muted, unlock]);

  const playCountdownTick = useCallback((secondsLeft) => {
    if (secondsLeft <= 0) return;
    playBeep({ frequency: 880, duration: 0.1 });
  }, [playBeep]);

  const playWorkStart = useCallback(() => {
    playBeep({ frequency: 1046, duration: 0.18 });
  }, [playBeep]);

  const playRestStart = useCallback(() => {
    playBeep({ frequency: 523, duration: 0.18 });
  }, [playBeep]);

  const playRoundEnd = useCallback(() => {
    playBeep({ frequency: 740, duration: 0.1, count: 2, gap: 0.12 });
  }, [playBeep]);

  const playComplete = useCallback(() => {
    playBeep({ frequency: 880, duration: 0.2, count: 3, gap: 0.18 });
  }, [playBeep]);

  const toggleMute = useCallback(() => {
    setMuted(m => !m);
  }, []);

  return {
    muted,
    toggleMute,
    unlock,
    playBeep,
    playCountdownTick,
    playWorkStart,
    playRestStart,
    playRoundEnd,
    playComplete,
  };
}
