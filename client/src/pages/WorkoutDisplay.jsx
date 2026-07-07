import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useFullscreen } from '../hooks/useFullscreen';
import WorkoutTimer from '../components/WorkoutTimer';
import { parseWodBody } from '../utils/wodBodyParser';

const API = '/api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayFromDate = (dateStr) => {
  if (!dateStr) return '';
  // Parse as local date to avoid UTC-offset shifting the day
  const [y, m, d] = dateStr.split('-').map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
};

const BASE_FONT_SIZE = 24;
const WOD_MODE_FONT_SIZE = Math.round(BASE_FONT_SIZE * 1.25);
const WOD_MODE_TIMER_WIDTH = 'calc(18rem * 0.85)'; // 15% narrower than w-72
const MOVEMENT_TWO_COLUMN_MIN = 7; // 1 column for typical WODs (≤6 movements)

export default function WorkoutDisplay({ tv }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [dayIndex, setDayIndex] = useState(Number(searchParams.get('day') ?? 0));
  const [completed, setCompleted] = useState(false);
  const [fontSize, setFontSize] = useState(BASE_FONT_SIZE);
  const [wodActive, setWodActive] = useState(false);
  const panelRefs = useRef([]);
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // Reset font size and view whenever the displayed day changes
  useEffect(() => {
    setFontSize(BASE_FONT_SIZE);
    setWodActive(false);
  }, [dayIndex]);

  // Larger starting font in WOD-only mode where more horizontal space is available
  useEffect(() => {
    if (!tv) return;
    setFontSize(wodActive ? WOD_MODE_FONT_SIZE : BASE_FONT_SIZE);
  }, [wodActive, tv]);

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
    const wodSection = sections.find(s => s.title === 'WOD') ?? sections.find(s => s.title == null);
    const wodText = wodSection?.body ?? '';
    panelRefs.current = [];

    const renderPanel = (s, key, { flex = 1, columns = 1 } = {}) => (
      <div
        key={key}
        className="bg-slate-800 rounded-xl p-5 flex flex-col overflow-hidden min-h-0"
        style={{ flex }}
      >
        {s.title && (
          <h2 className="text-lg font-bold text-white mb-3 uppercase tracking-widest flex-shrink-0">
            {s.title}
          </h2>
        )}
        <pre
          ref={el => { panelRefs.current.push(el); }}
          className="flex-1 overflow-hidden whitespace-pre-wrap font-sans"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.65, columnCount: columns, columnGap: '2.5rem' }}
        >
          {s.body}
        </pre>
      </div>
    );

    const renderWodPanel = (body, key, { flex = 2, formatInTitle = false } = {}) => {
      const parsed = parseWodBody(body);
      const title = 'WOD';

      if (!parsed.structured) {
        return renderPanel({ title, body: parsed.raw || body }, key, { flex, columns: 1 });
      }

      const movementColumns = parsed.movements.length >= MOVEMENT_TWO_COLUMN_MIN ? 2 : 1;

      const formatSize = Math.max(11, Math.round(fontSize * 0.88));
      const noteSize = Math.max(11, Math.round(fontSize * 0.82));
      const inlineFormat = parsed.format.replace(/\s*\n+\s*/g, ' · ').trim();

      return (
        <div
          key={key}
          className="bg-slate-800 rounded-xl p-5 flex flex-col overflow-hidden min-h-0"
          style={{ flex }}
        >
          <h2 className="text-lg font-bold text-white mb-3 tracking-widest flex-shrink-0 leading-snug">
            <span className="uppercase">{title}</span>
            {formatInTitle && inlineFormat && (
              <span className="normal-case tracking-normal text-slate-300 font-semibold">
                {' '}- {inlineFormat}
              </span>
            )}
          </h2>
          <div
            ref={el => { panelRefs.current.push(el); }}
            className="flex-1 min-h-0 overflow-hidden flex flex-col gap-3"
          >
            {!formatInTitle && parsed.format && (
              <pre
                className="whitespace-pre-wrap font-sans text-slate-400 flex-shrink-0"
                style={{ fontSize: `${formatSize}px`, lineHeight: 1.55 }}
              >
                {parsed.format}
              </pre>
            )}
            <div
              className={`grid gap-x-8 gap-y-2 content-start ${
                movementColumns === 2 ? 'grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {parsed.movements.map((movement, i) => (
                <div
                  key={i}
                  className="font-semibold text-white whitespace-pre-wrap font-sans min-w-0"
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.65 }}
                >
                  {movement}
                </div>
              ))}
            </div>
            {parsed.notes && (
              <p
                className="flex-shrink-0 text-slate-500 font-sans border-t border-slate-700/60 pt-2"
                style={{ fontSize: `${noteSize}px`, lineHeight: 1.55 }}
              >
                {parsed.notes}
              </p>
            )}
          </div>
        </div>
      );
    };

    const renderSection = (s, key, { flex = 1, columns = 1, formatInTitle = false } = {}) => {
      if (s.title === 'WOD' || (s.title == null && wodActive)) {
        return renderWodPanel(s.body, key, { flex, formatInTitle });
      }
      return renderPanel(s, key, { flex, columns });
    };

    return (
      <div className="h-screen bg-slate-900 text-white flex flex-col p-4 overflow-hidden">

        {/* Compact top bar: back arrow, title, WOD mode toggle, and fullscreen */}
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
            <button
              onClick={() => setWodActive(a => !a)}
              className={`px-3 py-2 rounded-lg text-base transition-colors ${
                wodActive
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white font-medium'
              }`}
            >
              {wodActive ? 'End WOD' : 'Start WOD'}
            </button>
            <button
              onClick={toggleFullscreen}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-base text-slate-300 transition-colors"
              title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
            >
              {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>

        {wodActive ? (
          <div className="flex flex-1 gap-4 min-h-0">
            {renderWodPanel(wodText || 'No WOD section found.', 'wod', {
              flex: 2,
              formatInTitle: true,
            })}
            <div
              className="flex-shrink-0 min-h-0 flex flex-col"
              style={{ width: WOD_MODE_TIMER_WIDTH }}
            >
              <WorkoutTimer key={dayIndex} wodText={wodText} layout="vertical" />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 gap-4 min-h-0">
            {sections.map((s, i) => {
              const isMain = s.title === 'WOD' || s.title == null;
              const columns = isMain && sections.length === 2 && s.title !== 'WOD' ? 2 : 1;
              return renderSection(s, i, {
                flex: isMain ? 2 : 1,
                columns,
              });
            })}
          </div>
        )}
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
