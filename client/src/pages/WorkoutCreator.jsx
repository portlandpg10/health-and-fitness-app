import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = '/api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayFromDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
};

export default function WorkoutCreator() {
  const [preferences, setPreferences] = useState({ instructions: '' });
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [draftInstructions, setDraftInstructions] = useState('');
  const [instructionsSaved, setInstructionsSaved] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [editingDay, setEditingDay] = useState(null); // { templateId, dayIndex, workouts }
  const [numWorkouts, setNumWorkouts] = useState(3);
  const [generating, setGenerating] = useState(false);

  const fetchTemplates = () => {
    fetch(`${API}/workouts/templates`, { credentials: 'include' })
      .then(r => r.json())
      .then(setTemplates);
  };

  useEffect(() => {
    fetch(`${API}/workouts/preferences`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.instructions !== undefined) {
          setPreferences(data);
        } else {
          setPreferences({ instructions: '' });
        }
      });
    fetchTemplates();
  }, []);

  const startEditingInstructions = () => {
    setDraftInstructions(preferences.instructions ?? '');
    setEditingInstructions(true);
  };

  const cancelEditingInstructions = () => {
    setEditingInstructions(false);
    setDraftInstructions('');
  };

  const savePreferences = async () => {
    const updated = { ...preferences, instructions: draftInstructions };
    await fetch(`${API}/workouts/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updated),
    });
    setPreferences(updated);
    setEditingInstructions(false);
    setDraftInstructions('');
    setInstructionsSaved(true);
    setTimeout(() => setInstructionsSaved(false), 2000);
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API}/workouts/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ numWorkouts }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.message || data.error);
      fetchTemplates();
    } catch (e) {
      alert(e.message || 'Failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const deleteTemplate = async (id) => {
    const res = await fetch(`${API}/workouts/templates/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || `Delete failed (${res.status})`);
      return;
    }
    fetchTemplates();
    if (editingDay?.templateId === id) setEditingDay(null);
  };

  const deleteDay = async (t, dayIndex) => {
    const newWorkouts = t.workouts.filter((_, i) => i !== dayIndex);
    if (newWorkouts.length === 0) {
      await deleteTemplate(t.id);
      return;
    }
    const res = await fetch(`${API}/workouts/templates/${t.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ workouts: newWorkouts }),
    });
    if (!res.ok) { alert('Failed to delete day'); return; }
    fetchTemplates();
    if (editingDay?.templateId === t.id) setEditingDay(null);
  };

  const openEditDay = (t, dayIndex) => {
    setEditingDay({ templateId: t.id, dayIndex, workouts: t.workouts.map(w => ({ ...w })) });
  };

  const saveEditDay = async () => {
    if (!editingDay) return;
    const res = await fetch(`${API}/workouts/templates/${editingDay.templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ workouts: editingDay.workouts }),
    });
    if (!res.ok) { alert('Failed to save'); return; }
    fetchTemplates();
    setEditingDay(null);
  };

  const updateEditText = (text) => {
    setEditingDay(d => {
      const workouts = d.workouts.map((w, i) => i === d.dayIndex ? { ...w, text } : w);
      return { ...d, workouts };
    });
  };

  const updateEditDate = (date) => {
    setEditingDay(d => {
      const workouts = d.workouts.map((w, i) => i === d.dayIndex ? { ...w, date } : w);
      return { ...d, workouts };
    });
  };

  const markComplete = async (t, dayIndex) => {
    const day = t.workouts?.[dayIndex];
    const res = await fetch(`${API}/workouts/completed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        workout_template_id: t.id,
        workout_snapshot: { workouts: [day] },
        exercises_completed: [],
      }),
    });
    if (!res.ok) return;
    await deleteDay(t, dayIndex);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Workout Creator</h1>

      {/* Instructions */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-slate-700">Instructions</h2>
            <p className="text-sm text-slate-500">Tell the AI what you want: goals, equipment, style, duration, etc.</p>
          </div>
          <div className="flex items-center gap-2">
            {instructionsSaved && <span className="text-green-600 text-sm">Saved</span>}
            {!editingInstructions && (
              <button
                onClick={startEditingInstructions}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {editingInstructions ? (
          <>
            <textarea
              autoFocus
              value={draftInstructions}
              onChange={e => setDraftInstructions(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[140px] resize-y text-sm"
              placeholder="e.g. 3 strength days + 2 conditioning days. Full gym. 45-60 min. Focus on compound lifts. Include a warm-up each day."
            />
            <div className="flex gap-2 mt-3">
              <button onClick={savePreferences} className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-sm font-medium">
                Save
              </button>
              <button onClick={cancelEditingInstructions} className="px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-700 whitespace-pre-wrap min-h-[2rem]">
            {preferences.instructions?.trim()
              ? preferences.instructions
              : <span className="text-slate-400 italic">No instructions set. Click Edit to add some.</span>
            }
          </p>
        )}
      </div>

      {/* Generate */}
      <div className="bg-white rounded-xl shadow p-5 flex flex-wrap gap-4 items-center">
        <select
          value={numWorkouts}
          onChange={e => setNumWorkouts(+e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          {[1, 2, 3, 6].map(n => <option key={n} value={n}>{n} workout{n !== 1 ? 's' : ''}</option>)}
        </select>
        <button
          onClick={generate}
          disabled={generating}
          className="px-5 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {/* Single-day edit panel */}
      {editingDay && (() => {
        const day = editingDay.workouts[editingDay.dayIndex];
        return (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 flex justify-between items-center border-b">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-700">
                  Editing: {dayFromDate(day.date)}
                </span>
                <input
                  type="date"
                  value={day.date ?? ''}
                  onChange={e => updateEditDate(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-sm text-slate-700"
                />
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/workout/${editingDay.templateId}/display?day=${editingDay.dayIndex}`}
                  className="px-3 py-1.5 text-sm bg-slate-600 text-white rounded"
                >
                  View on TV
                </Link>
                <button onClick={saveEditDay} className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded">
                  Save
                </button>
                <button onClick={() => setEditingDay(null)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded">
                  Cancel
                </button>
              </div>
            </div>
            <div className="p-4">
              <textarea
                value={day.text ?? (day.exercises?.map(ex => `${ex.name}${ex.sets ? `  ${ex.sets}×${ex.reps}` : ''}${ex.weight ? ` @ ${ex.weight} lbs` : ''}`).join('\n') ?? '')}
                onChange={e => updateEditText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[280px] resize-y text-sm font-mono"
              />
            </div>
          </div>
        );
      })()}

      {/* Workout list — one row per day */}
      {templates.length > 0 && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <h2 className="font-semibold text-slate-700 p-4 border-b">Your workouts</h2>
          <ul className="divide-y divide-slate-100">
            {templates.flatMap(t =>
              (t.workouts || []).map((day, i) => {
                const isEditing = editingDay?.templateId === t.id && editingDay?.dayIndex === i;
                return (
                  <li key={`${t.id}-${i}`} className="flex items-center justify-between p-4">
                    <span className="text-slate-800 font-medium">
                      {dayFromDate(day.date)} <span className="text-slate-400 font-normal text-sm">— {day.date}</span>
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => isEditing ? setEditingDay(null) : openEditDay(t, i)}
                        className="text-sm text-slate-600 hover:underline"
                      >
                        {isEditing ? 'Cancel' : 'Edit'}
                      </button>
                      <Link to={`/workout/${t.id}/display?day=${i}`} className="text-sm text-slate-600 hover:underline">
                        View on TV
                      </Link>
                      <button
                        type="button"
                        onClick={() => markComplete(t, i)}
                        className="text-sm text-slate-600 hover:underline"
                      >
                        Mark Complete
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDay(t, i)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {templates.length === 0 && !generating && (
        <p className="text-slate-500 text-sm">No workouts yet. Set your instructions above and click Generate.</p>
      )}
    </div>
  );
}
