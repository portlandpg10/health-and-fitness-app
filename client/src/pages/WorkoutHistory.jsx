import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = '/api';

export default function WorkoutHistory() {
  const [completed, setCompleted] = useState([]);

  useEffect(() => {
    fetch(`${API}/workouts/completed`).then(r => r.json()).then(setCompleted);
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
                  <div className="font-medium">{formatDate(c.completed_at)}</div>
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
