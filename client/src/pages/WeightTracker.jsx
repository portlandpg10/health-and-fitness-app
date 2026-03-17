import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
const API = '/api';

export default function WeightTracker() {
  const [entries, setEntries] = useState([]);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);

  const todayLocal = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const [form, setForm] = useState({
    date: todayLocal(),
    steps: 10,
    bad_calories: 0,
    weight: '',
  });

  useEffect(() => {
    fetch(`${API}/weight`).then(r => r.json()).then(setEntries).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch(`${API}/weight/model`).then(r => r.json()).then(data => {
      if (!data.error) setModel(data);
    });
  }, [entries]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetch(`${API}/weight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: form.date,
        steps: form.steps * 1000,
        bad_calories: form.bad_calories * 100,
        weight: form.weight ? parseFloat(form.weight) : null,
      }),
    });
    const updated = await fetch(`${API}/weight`).then(r => r.json());
    setEntries(updated);
    setForm(f => ({ ...f, weight: '' }));
  };

  const stepsOptions = Array.from({ length: 51 }, (_, i) => i);
  const caloriesOptions = Array.from({ length: 21 }, (_, i) => i); // 0–20 → 0–2000 cal

  const chartData = entries.slice().reverse().map(e => ({
    date: e.date,
    steps: e.steps / 1000,
    bad_calories: e.bad_calories / 100,
    weight: e.weight,
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Weight Tracker</h1>

      {/* Mobile-friendly daily entry form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-semibold text-slate-700">Daily Entry</h2>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Steps (1k)</label>
          <select
            value={form.steps}
            onChange={e => setForm(f => ({ ...f, steps: +e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-lg"
          >
            {stepsOptions.map(n => (
              <option key={n} value={n}>{n}k</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Bad Calories (100)</label>
          <select
            value={form.bad_calories}
            onChange={e => setForm(f => ({ ...f, bad_calories: +e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-lg"
          >
            {caloriesOptions.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-600 mb-1">Weight (lbs)</label>
          <input
            type="number"
            step="0.1"
            value={form.weight}
            onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
            placeholder="Optional"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg"
          />
        </div>
        <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700">
          Save
        </button>
      </form>

      {/* Mobile: last 3 entries for confirmation */}
      {entries.length > 0 && (
        <div className="md:hidden bg-white rounded-xl shadow overflow-hidden">
          <h2 className="font-semibold text-slate-700 p-4 border-b border-slate-100">Recent entries</h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 text-slate-500 font-medium">Date</th>
                <th className="text-right px-4 py-2 text-slate-500 font-medium">Steps</th>
                <th className="text-right px-4 py-2 text-slate-500 font-medium">Bad Cal</th>
                <th className="text-right px-4 py-2 text-slate-500 font-medium">Weight</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 3).map((e, i) => (
                <tr key={e.id} className={i > 0 ? 'border-t border-slate-100' : ''}>
                  <td className="px-4 py-3">{e.date}</td>
                  <td className="px-4 py-3 text-right">{(e.steps / 1000).toFixed(0)}k</td>
                  <td className="px-4 py-3 text-right">{e.bad_calories / 100}</td>
                  <td className="px-4 py-3 text-right">{e.weight ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Desktop: Table and Graphs */}
      <div className="hidden md:block space-y-6">
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <h2 className="font-semibold text-slate-700 p-4">History</h2>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-right p-3">Steps</th>
                    <th className="text-right p-3">Bad Cal</th>
                    <th className="text-right p-3">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} className="border-t border-slate-100">
                      <td className="p-3">{e.date}</td>
                      <td className="p-3 text-right">{(e.steps / 1000).toFixed(0)}k</td>
                      <td className="p-3 text-right">{e.bad_calories}</td>
                      <td className="p-3 text-right">{e.weight ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold text-slate-700 mb-4">Trends</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="steps" stroke="#3b82f6" name="Steps (k)" />
                    <Line yAxisId="left" type="monotone" dataKey="bad_calories" stroke="#f59e0b" name="Bad Cal (100)" />
                    <Line yAxisId="right" type="monotone" dataKey="weight" stroke="#10b981" name="Weight (lbs)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {model && !model.error && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold text-slate-700 mb-2">Model: Steps & Bad Calories → Weight</h2>
              <p className="text-slate-600 text-sm mb-2">R² = {model.r2?.toFixed(3)} ({model.dataPoints} data points)</p>
              <p className="text-slate-700">{model.interpretation?.stepsEffect}</p>
              <p className="text-slate-700">{model.interpretation?.badCaloriesEffect}</p>
            </div>
          )}
      </div>
    </div>
  );
}
