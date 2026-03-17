import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const API = '/api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayFromDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return DAY_NAMES[new Date(y, m - 1, d).getDay()];
};

export default function WorkoutHistoryDetail() {
  const { id } = useParams();
  const [workout, setWorkout] = useState(null);

  useEffect(() => {
    fetch(`${API}/workouts/completed/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(setWorkout);
  }, [id]);

  if (!workout) return <div className="p-8">Loading...</div>;

  const snap = workout.workout_snapshot || {};
  const days = snap.workouts || [];
  const day = days[0];

  return (
    <div className="space-y-6">
      <Link to="/history" className="text-slate-600 hover:underline">← Back to History</Link>
      <div className="bg-white rounded-xl shadow p-6">
        <h1 className="text-xl font-bold mb-1 text-slate-800">
          {new Date(workout.completed_at).toLocaleDateString()}
        </h1>
        {day?.date && <p className="text-slate-500 text-sm mb-4">{dayFromDate(day.date)}</p>}
        {workout.notes && <p className="text-slate-600 mb-4">{workout.notes}</p>}
        <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
          {day?.text || '(No workout details)'}
        </pre>
      </div>
    </div>
  );
}
