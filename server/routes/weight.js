import { Router } from 'express';
import { db } from '../db/schema.js';

const router = Router();

function multivariateRegression(X, y) {
  const n = X.length;
  const XWithIntercept = X.map((row) => [1, ...row]);
  const XtX = XWithIntercept[0].map((_, i) =>
    XWithIntercept[0].map((_, j) =>
      XWithIntercept.reduce((s, row) => s + row[i] * row[j], 0)
    )
  );
  const Xty = XWithIntercept[0].map((_, i) =>
    XWithIntercept.reduce((s, row, k) => s + row[i] * y[k], 0)
  );
  const inv = invertMatrix(XtX);
  const beta = inv.map((row) => row.reduce((s, v, j) => s + v * Xty[j], 0));
  return { coefficients: beta, intercept: beta[0], m: beta.slice(1) };
}

function invertMatrix(M) {
  const n = M.length;
  const aug = M.map((row, i) => [...row, ...(Array(n).fill(0).map((_, j) => i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    let max = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(aug[k][i]) > Math.abs(aug[max][i])) max = k;
    [aug[i], aug[max]] = [aug[max], aug[i]];
    const pivot = aug[i][i];
    if (Math.abs(pivot) < 1e-10) throw new Error('Singular matrix');
    for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
    for (let k = 0; k < n; k++) if (k !== i) {
      const f = aug[k][i];
      for (let j = 0; j < 2 * n; j++) aug[k][j] -= f * aug[i][j];
    }
  }
  return aug.map(row => row.slice(n));
}

router.get('/', (req, res) => {
  const { start, end } = req.query;
  let query = 'SELECT * FROM daily_entries ORDER BY date DESC';
  const params = [];
  if (start && end) {
    query = 'SELECT * FROM daily_entries WHERE date >= ? AND date <= ? ORDER BY date ASC';
    params.push(start, end);
  } else if (start) {
    query = 'SELECT * FROM daily_entries WHERE date >= ? ORDER BY date ASC';
    params.push(start);
  } else if (end) {
    query = 'SELECT * FROM daily_entries WHERE date <= ? ORDER BY date ASC';
    params.push(end);
  }
  const stmt = db.prepare(query);
  const rows = params.length ? stmt.all(...params) : stmt.all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { date, steps, bad_calories, weight, measurements } = req.body;
  if (!date) return res.status(400).json({ error: 'Date required' });
  const stmt = db.prepare(`
    INSERT INTO daily_entries (date, steps, bad_calories, weight, measurements)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET steps=excluded.steps, bad_calories=excluded.bad_calories, weight=excluded.weight, measurements=excluded.measurements
  `);
  stmt.run(date, steps ?? 0, bad_calories ?? 0, weight ?? null, measurements ?? null);
  res.json({ success: true });
});

router.get('/model', (req, res) => {
  const rows = db.prepare('SELECT steps, bad_calories, weight FROM daily_entries WHERE weight IS NOT NULL AND weight > 0 ORDER BY date ASC').all();
  if (rows.length < 3) {
    return res.json({ error: 'Need at least 3 entries with weight to compute model', dataPoints: rows.length });
  }
  const X = rows.map(r => [r.steps / 1000, r.bad_calories / 100]);
  const y = rows.map(r => r.weight);
  try {
    const reg = multivariateRegression(X, y);
    const m1 = reg.m[0];
    const m2 = reg.m[1];
    const b = reg.intercept;
    const predictions = X.map((x, i) => m1 * x[0] + m2 * x[1] + b);
    const ssRes = y.reduce((s, yi, i) => s + (yi - predictions[i]) ** 2, 0);
    const meanY = y.reduce((a, b) => a + b, 0) / y.length;
    const ssTot = y.reduce((s, yi) => s + (yi - meanY) ** 2, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    res.json({
      coefficients: {
        stepsPer1k: m1,
        badCaloriesPer100: m2,
        intercept: b,
      },
      r2,
      interpretation: {
        stepsEffect: `For every 1k more steps, weight tends to ${m1 < 0 ? 'decrease' : 'increase'} by ${Math.abs(m1).toFixed(3)} lbs`,
        badCaloriesEffect: `For every 100 more bad calories, weight tends to ${m2 > 0 ? 'increase' : 'decrease'} by ${Math.abs(m2).toFixed(3)} lbs`,
      },
      dataPoints: rows.length,
    });
  } catch (e) {
    res.status(500).json({ error: 'Model computation failed', message: e.message });
  }
});

export default router;
