import { useState, useCallback, useRef, useEffect } from 'react';

function createAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  return Ctx ? new Ctx() : null;
}

function playSilentBuffer(ctx) {
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
}

export function useSound() {
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef(null);
  const unlockedRef = useRef(false);

  const unlock = useCallback(async () => {
    if (!ctxRef.current) {
      ctxRef.current = createAudioContext();
    }
    const ctx = ctxRef.current;
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // iOS/WebKit requires a buffer play during the user gesture to fully unlock.
    if (ctx.state === 'running' && !unlockedRef.current) {
      playSilentBuffer(ctx);
      unlockedRef.current = true;
    }

    return ctx.state === 'running';
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) unlock();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [unlock]);

  const playBeep = useCallback(async ({ frequency = 880, duration = 0.12, count = 1, gap = 0.15 } = {}) => {
    if (muted) return;
    const ready = await unlock();
    const ctx = ctxRef.current;
    if (!ready || !ctx || ctx.state !== 'running') return;

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
    void playBeep({ frequency: 880, duration: 0.1 });
  }, [playBeep]);

  const playWorkStart = useCallback(() => {
    void playBeep({ frequency: 1046, duration: 0.18 });
  }, [playBeep]);

  const playRestStart = useCallback(() => {
    void playBeep({ frequency: 523, duration: 0.18 });
  }, [playBeep]);

  const playRoundEnd = useCallback(() => {
    void playBeep({ frequency: 740, duration: 0.1, count: 2, gap: 0.12 });
  }, [playBeep]);

  const playComplete = useCallback(() => {
    void playBeep({ frequency: 880, duration: 0.2, count: 3, gap: 0.18 });
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
