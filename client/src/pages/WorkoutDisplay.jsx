import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';

const API = '/api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayFromDate = (dateStr) => {
  if (!dateStr) return '';
  // Parse as local date to avoid UTC-offset shifting the day
  const [y, m, d] = dateStr.split('-').map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
};

export default function WorkoutDisplay({ tv }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [dayIndex, setDayIndex] = useState(Number(searchParams.get('day') ?? 0));
  const [completed, setCompleted] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);

  // Reset font size whenever the displayed day changes
  useEffect(() => { setFontSize(24); }, [dayIndex]);

  // Shrink font one pixel at a time until neither panel overflows its container
  useEffect(() => {
    if (!tv) return;
    const panels = [leftPanelRef.current, rightPanelRef.current].filter(Boolean);
    const overflowing = panels.some(el => el.scrollHeight > el.clientHeight + 2);
    if (overflowing && fontSize > 11) setFontSize(f => f - 1);
  });

  useEffect(() => {
    fetch(`${API}/workouts/templates/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(setWorkout);
  }, [id]);

  const handleComplete = async () => {
    const day = workout?.workouts?.[dayIndex];
    if (!day) return;
    await fetch(`${API}/workouts/completed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        workout_template_id: workout.id,
        workout_snapshot: { workouts: [day] },
        exercises_completed: [],
      }),
    });
    setCompleted(true);
  };

  if (!workout) return <div className="p-8">Loading...</div>;

  const days = workout.workouts || [];
  const day = days[dayIndex];

  const dayText = (d) => {
    if (d?.text) return d.text;
    if (d?.exercises?.length) {
      return d.exercises.map(ex => {
        let line = ex.name;
        if (ex.sets && ex.reps) line += `  ${ex.sets}×${ex.reps}`;
        if (ex.weight) line += ` @ ${ex.weight} lbs`;
        if (ex.notes) line += `  (${ex.notes})`;
        return line;
      }).join('\n');
    }
    return '';
  };

  const warmupPattern = /^Warm-?Up/i;
  const wodPattern = /^WOD\b|(💥\s*)?(Workout|Strength|Conditioning|MetCon|AMRAP|EMOM|For Time|Circuit)/i;

  const stripLeadingHeader = (text, pattern) => {
    const lines = text.split('\n');
    if (pattern.test(lines[0]?.trim())) return lines.slice(1).join('\n').trimStart();
    return text;
  };

  const splitPanels = (text) => {
    if (!text) return { left: '', right: '' };
    const lines = text.split('\n');

    // Primary split: explicit WOD/Strength/etc. header
    const explicitIdx = lines.findIndex((l, i) => i > 0 && wodPattern.test(l.trim()));
    if (explicitIdx !== -1) {
      const leftRaw = lines.slice(0, explicitIdx).join('\n').trim();
      const rightRaw = lines.slice(explicitIdx).join('\n').trim();
      return {
        left: stripLeadingHeader(leftRaw, warmupPattern),
        right: stripLeadingHeader(rightRaw, wodPattern),
      };
    }

    // Fallback: if the text starts with a Warm-Up section, split at the first
    // blank line that follows it — works for lifting days where Claude doesn't
    // write an explicit WOD header but does separate warm-up from working sets.
    const warmupIdx = lines.findIndex(l => warmupPattern.test(l.trim()));
    if (warmupIdx !== -1) {
      const blankAfterWarmup = lines.findIndex((l, i) => i > warmupIdx && l.trim() === '');
      if (blankAfterWarmup !== -1) {
        const nextContentIdx = lines.findIndex((l, i) => i > blankAfterWarmup && l.trim() !== '');
        if (nextContentIdx !== -1) {
          const leftRaw = lines.slice(warmupIdx, blankAfterWarmup).join('\n').trim();
          const rightRaw = lines.slice(nextContentIdx).join('\n').trim();
          return {
            left: stripLeadingHeader(leftRaw, warmupPattern),
            right: rightRaw,
          };
        }
      }
    }

    // No warm-up found at all — show everything in the right panel
    return { left: '', right: text };
  };

  if (tv) {
    const { left, right } = splitPanels(dayText(day));
    return (
      <div className="h-screen bg-slate-900 text-white flex flex-col p-4 overflow-hidden">

        {/* Compact top bar: back arrow, title, and day nav all on one line */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="text-slate-400 hover:text-white text-2xl transition-colors"
            >
              &#8592;
            </button>
            <h1 className="text-2xl font-bold">{dayFromDate(day?.date)} — {day?.date}</h1>
          </div>
          {days.length > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setDayIndex(Math.max(0, dayIndex - 1))}
                disabled={dayIndex === 0}
                className="px-4 py-2 bg-slate-700 rounded-lg text-base disabled:opacity-30"
              >
                ← Prev
              </button>
              <span className="px-3 py-2 text-slate-400 text-base self-center">
                {dayIndex + 1} / {days.length}
              </span>
              <button
                onClick={() => setDayIndex(Math.min(days.length - 1, dayIndex + 1))}
                disabled={dayIndex === days.length - 1}
                className="px-4 py-2 bg-slate-700 rounded-lg text-base disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Two-panel layout — min-h-0 is critical to allow flex children to shrink */}
        <div className="flex flex-1 gap-4 min-h-0">
          {left ? (
            <>
              <div className="w-1/3 bg-slate-800 rounded-xl p-5 flex flex-col overflow-hidden">
                <h2 className="text-lg font-bold text-white mb-3 uppercase tracking-widest flex-shrink-0">
                  Warm-Up
                </h2>
                <pre
                  ref={leftPanelRef}
                  className="flex-1 overflow-hidden whitespace-pre-wrap font-sans"
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.65 }}
                >
                  {left}
                </pre>
              </div>
              <div className="w-2/3 bg-slate-800 rounded-xl p-5 flex flex-col overflow-hidden">
                <h2 className="text-lg font-bold text-white mb-3 uppercase tracking-widest flex-shrink-0">
                  WOD
                </h2>
                <pre
                  ref={rightPanelRef}
                  className="flex-1 overflow-hidden whitespace-pre-wrap font-sans"
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.65, columnCount: 2, columnGap: '2.5rem' }}
                >
                  {right}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex-1 bg-slate-800 rounded-xl p-5 flex flex-col overflow-hidden">
              <pre
                ref={rightPanelRef}
                className="flex-1 overflow-hidden whitespace-pre-wrap font-sans"
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.65 }}
              >
                {right}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/workouts" className="text-slate-600 hover:underline">← Back to Workouts</Link>
      {days.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {days.map((d, i) => (
            <button
              key={i}
              onClick={() => setDayIndex(i)}
              className={`px-4 py-2 rounded-lg text-sm ${dayIndex === i ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}
            >
              {d.day}
            </button>
          ))}
        </div>
      )}
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-xl font-bold mb-4 text-slate-800">{dayFromDate(day?.date)} — {day?.date}</h1>
        <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
          {dayText(day)}
        </pre>
        <div className="mt-6 flex gap-3 flex-wrap">
          <Link to={`/workout/${id}/display`} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm">
            View on TV
          </Link>
          {!completed ? (
            <button onClick={handleComplete} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">
              Mark complete
            </button>
          ) : (
            <span className="text-green-600 font-medium py-2">Completed!</span>
          )}
        </div>
      </div>
    </div>
  );
}
