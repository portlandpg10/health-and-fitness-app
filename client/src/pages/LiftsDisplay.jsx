import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFullscreen } from '../hooks/useFullscreen';

const API = '/api';

const roundTo = (n, step = 2.5) => Math.round(n / step) * step;

export default function LiftsDisplay({ tv }) {
  const [allLifts, setAllLifts] = useState([]);
  const [searchParams] = useSearchParams();
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  useEffect(() => {
    fetch(`${API}/lifts`).then(r => r.json()).then(setAllLifts);
  }, []);

  if (!tv) return null;

  // ?ids=1,3,5 limits the display to the selected lifts; absent shows all.
  const idsParam = searchParams.get('ids');
  const selectedIds = idsParam
    ? idsParam.split(',').map(Number).filter(n => !Number.isNaN(n))
    : null;
  const lifts = selectedIds
    ? allLifts.filter(l => selectedIds.includes(l.id))
    : allLifts;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 relative">
      <button
        onClick={toggleFullscreen}
        className="absolute top-6 right-8 px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
        title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
      >
        {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      </button>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold mb-12">Current Lifts</h1>
        {lifts.length > 0 && (
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-10 md:gap-x-16 items-baseline">
            <div className="text-sm md:text-lg uppercase tracking-widest text-slate-500 pb-4">Lift</div>
            <div className="text-sm md:text-lg uppercase tracking-widest text-slate-500 pb-4 text-right">Working</div>
            <div className="text-sm md:text-lg uppercase tracking-widest text-slate-500 pb-4 text-right">50%</div>
            <div className="text-sm md:text-lg uppercase tracking-widest text-slate-500 pb-4 text-right">80%</div>
            {lifts.map(l => (
              <div key={l.id} className="contents">
                <div className="text-2xl md:text-4xl font-semibold py-4 border-t border-slate-800">{l.name}</div>
                <div className="text-2xl md:text-4xl font-bold text-white text-right tabular-nums py-4 border-t border-slate-800">{l.weight}</div>
                <div className="text-2xl md:text-4xl text-slate-400 text-right tabular-nums py-4 border-t border-slate-800">{roundTo(l.weight * 0.5)}</div>
                <div className="text-2xl md:text-4xl text-slate-400 text-right tabular-nums py-4 border-t border-slate-800">{roundTo(l.weight * 0.8)}</div>
              </div>
            ))}
          </div>
        )}
        {lifts.length === 0 && (
          <p className="text-slate-400 text-xl">No lifts added yet.</p>
        )}
      </div>
    </div>
  );
}
