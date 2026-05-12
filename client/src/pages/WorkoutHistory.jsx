import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = '/api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayFromDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
};

export default function WorkoutHistory() {
  const [completed, setCompleted] = useState([]);

  useEffect(() => {
    fetch(`${API}/workouts/completed`)
      .then(r => r.json())
      .then(data => {
        const sorted = [...data].sort((a, b) => {
          const aDate = a.workout_snapshot?.workouts?.[0]?.date || a.completed_at || '';
          const bDate = b.workout_snapshot?.workouts?.[0]?.date || b.completed_at || '';
          return bDate.localeCompare(aDate);
        });
        setCompleted(sorted);
      });
  }, []);

  const formatDate = (d) => new Date(d.replace(' ', 'T') + 'Z').toLocaleDateString();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Workout History</h1>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {completed.map(c => {
            const snap = c.workout_snapshot || {};
            const workouts = snap.workouts || [];
            const first = workouts[0];
            const summary = first?.text?.split('\n').find(l => l.trim()) || 'Workout';
            return (
              <li key={c.id} className="p-4 hover:bg-slate-50">
                <Link to={`/history/${c.id}`} className="block">
                  <div className="font-medium">
                    {first?.date ? `${dayFromDate(first.date)} — ${first.date}` : formatDate(c.completed_at)}
                  </div>
                  <div className="text-sm text-slate-600 truncate">{summary}</div>
                </Link>
              </li>
            );
          })}
        </ul>
        {completed.length === 0 && (
          <p className="p-8 text-slate-500 text-center">No completed workouts yet.</p>
        )}
      </div>
    </div>
  );
}
