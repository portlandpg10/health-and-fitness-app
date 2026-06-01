import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useFullscreen } from '../hooks/useFullscreen';

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
  const panelRefs = useRef([]);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // Reset font size whenever the displayed day changes
  useEffect(() => { setFontSize(24); }, [dayIndex]);

  // Shrink font one pixel at a time until neither panel overflows its container
  useEffect(() => {
    if (!tv) return;
    const panels = panelRefs.current.filter(Boolean);
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
    const res = await fetch(`${API}/workouts/completed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        workout_template_id: workout.id,
        workout_snapshot: { workouts: [day] },
        exercises_completed: [],
      }),
    });
    if (!res.ok) return;

    const remainingWorkouts = workout.workouts.filter((_, i) => i !== dayIndex);
    if (remainingWorkouts.length === 0) {
      await fetch(`${API}/workouts/templates/${workout.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    } else {
      await fetch(`${API}/workouts/templates/${workout.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workouts: remainingWorkouts }),
      });
    }
    navigate('/workouts');
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

  // Strict, anchored headers so body lines (e.g. "EMOM 18", "Strength work")
  // are never mistaken for a new section header.
  const warmupPattern = /^Warm-?Up\b/i;
  const liftsPattern = /^LIFTS\b/i;
  const wodPattern = /^WOD\b/i;

  const headerTitle = (line) => {
    const t = line.trim();
    if (warmupPattern.test(t)) return 'Warm-Up';
    if (liftsPattern.test(t)) return 'LIFTS';
    if (wodPattern.test(t)) return 'WOD';
    return null;
  };

  // Split the day text into ordered sections by header line. A single day may
  // contain any combination of Warm-Up / WOD / LIFTS (e.g. a blended day with
  // all three). The header line itself is dropped — its title labels the panel.
  const parseSections = (text) => {
    if (!text) return [];
    const lines = text.split('\n');
    const sections = [];
    let current = null;
    for (const line of lines) {
      const title = headerTitle(line);
      if (title) {
        current = { title, body: [] };
        sections.push(current);
      } else if (current) {
        current.body.push(line);
      } else {
        current = { title: null, body: [line] };
        sections.push(current);
      }
    }

    let result = sections
      .map(s => ({ title: s.title, body: s.body.join('\n').trim() }))
      .filter(s => s.body || s.title);

    // Legacy fallback: an old workout with only a Warm-Up header but un-headered
    // working sets after it — split at the first blank-line gap so the working
    // sets get their own panel instead of living inside the warm-up.
    if (result.length === 1 && result[0].title === 'Warm-Up') {
      const gap = result[0].body.indexOf('\n\n');
      if (gap !== -1) {
        result = [
          { title: 'Warm-Up', body: result[0].body.slice(0, gap).trim() },
          { title: 'WOD', body: result[0].body.slice(gap + 2).trim() },
        ];
      }
    }
    return result;
  };

  if (tv) {
    const sections = parseSections(dayText(day));
    panelRefs.current = [];
    return (
      <div className="h-screen bg-slate-900 text-white flex flex-col p-4 overflow-hidden">

        {/* Compact top bar: back arrow, title, day nav, and fullscreen */}
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
          <div className="flex items-center gap-2">
            {days.length > 1 && (
              <>
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
              </>
            )}
            <button
              onClick={toggleFullscreen}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-base text-slate-300 transition-colors"
              title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
            >
              {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>

        {/* One panel per section, in order — min-h-0 lets flex children shrink.
            WOD is the bulkiest, so it gets double the width of Warm-Up/LIFTS. */}
        <div className="flex flex-1 gap-4 min-h-0">
          {sections.map((s, i) => {
            const isMain = s.title === 'WOD' || s.title == null;
            const columns = isMain && sections.length === 2 ? 2 : 1;
            return (
              <div
                key={i}
                className="bg-slate-800 rounded-xl p-5 flex flex-col overflow-hidden"
                style={{ flex: isMain ? 2 : 1 }}
              >
                {s.title && (
                  <h2 className="text-lg font-bold text-white mb-3 uppercase tracking-widest flex-shrink-0">
                    {s.title}
                  </h2>
                )}
                <pre
                  ref={el => { panelRefs.current[i] = el; }}
                  className="flex-1 overflow-hidden whitespace-pre-wrap font-sans"
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.65, columnCount: columns, columnGap: '2.5rem' }}
                >
                  {s.body}
                </pre>
              </div>
            );
          })}
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
