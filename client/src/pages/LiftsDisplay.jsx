import { useState, useEffect } from 'react';
import { useFullscreen } from '../hooks/useFullscreen';

const API = '/api';

export default function LiftsDisplay({ tv }) {
  const [lifts, setLifts] = useState([]);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  useEffect(() => {
    fetch(`${API}/lifts`).then(r => r.json()).then(setLifts);
  }, []);

  if (!tv) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 relative">
      <button
        onClick={toggleFullscreen}
        className="absolute top-6 right-8 px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
        title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
      >
        {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      </button>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold mb-12">Current Lifts</h1>
        <ul className="space-y-6">
          {lifts.map(l => (
            <li key={l.id} className="text-2xl md:text-4xl flex justify-between items-center">
              <span className="font-semibold">{l.name}</span>
              <span className="text-slate-300">
                {l.weight} lbs @ {l.volume_type}
              </span>
            </li>
          ))}
        </ul>
        {lifts.length === 0 && (
          <p className="text-slate-400 text-xl">No lifts added yet.</p>
        )}
      </div>
    </div>
  );
}
