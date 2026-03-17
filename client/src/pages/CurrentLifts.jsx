import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = '/api';
const VOLUME_PRESETS = ['1x5', '3x3', '5x5', '3x8', '4x6', '2x10'];

export default function CurrentLifts() {
  const [lifts, setLifts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', weight: '', volume_type: '5x5' });

  useEffect(() => {
    fetch(`${API}/lifts`).then(r => r.json()).then(setLifts);
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.weight) return;
    const res = await fetch(`${API}/lifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        weight: parseFloat(form.weight),
        volume_type: form.volume_type,
      }),
    });
    const data = await res.json();
    setLifts([...lifts, data]);
    setForm({ name: '', weight: '', volume_type: '5x5' });
  };

  const handleUpdate = async (id) => {
    const lift = lifts.find(l => l.id === id);
    if (!lift) return;
    await fetch(`${API}/lifts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: lift.name,
        weight: lift.weight,
        volume_type: lift.volume_type,
      }),
    });
    setEditing(null);
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/lifts/${id}`, { method: 'DELETE' });
    setLifts(lifts.filter(l => l.id !== id));
  };

  const updateLift = (id, field, value) => {
    setLifts(lifts.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Current Lifts</h1>
        <Link to="/lifts/display" className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm">
          View on TV
        </Link>
      </div>

      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow p-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[8rem]">
          <label className="block text-sm text-slate-600 mb-1">Lift name</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg"
            placeholder="e.g. Bench Press"
          />
        </div>
        <div className="w-24">
          <label className="block text-sm text-slate-600 mb-1">Weight (lbs)</label>
          <input
            type="number"
            step="0.5"
            value={form.weight}
            onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Volume</label>
          <select
            value={form.volume_type}
            onChange={e => setForm(f => ({ ...f, volume_type: e.target.value }))}
            className="px-4 py-2 border rounded-lg"
          >
            {VOLUME_PRESETS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button type="submit" className="px-6 py-2 bg-slate-800 text-white rounded-lg font-medium">
          Add
        </button>
      </form>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {lifts.map(l => (
            <li key={l.id} className="p-4 flex flex-wrap gap-4 items-center">
              {editing === l.id ? (
                <>
                  <input
                    value={l.name}
                    onChange={e => updateLift(l.id, 'name', e.target.value)}
                    className="flex-1 min-w-[8rem] px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="number"
                    step="0.5"
                    value={l.weight}
                    onChange={e => updateLift(l.id, 'weight', parseFloat(e.target.value) || 0)}
                    className="w-20 px-3 py-2 border rounded-lg"
                  />
                  <select
                    value={l.volume_type}
                    onChange={e => updateLift(l.id, 'volume_type', e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  >
                    {VOLUME_PRESETS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <button onClick={() => handleUpdate(l.id)} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm">
                    Save
                  </button>
                  <button onClick={() => setEditing(null)} className="text-slate-600">Cancel</button>
                </>
              ) : (
                <>
                  <span className="font-medium flex-1">{l.name}</span>
                  <span className="text-slate-600">{l.weight} lbs @ {l.volume_type}</span>
                  <button onClick={() => setEditing(l.id)} className="text-slate-600 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(l.id)} className="text-red-600 hover:underline">Delete</button>
                </>
              )}
            </li>
          ))}
        </ul>
        {lifts.length === 0 && (
          <p className="p-8 text-slate-500 text-center">No lifts yet. Add one above.</p>
        )}
      </div>
    </div>
  );
}
