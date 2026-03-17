import { Router } from 'express';
import { db } from '../db/schema.js';
import { generateWorkouts } from '../services/llmWorkoutGenerator.js';

const router = Router();

router.get('/preferences', (req, res) => {
  const row = db.prepare('SELECT * FROM workout_preferences ORDER BY id DESC LIMIT 1').get();
  res.json(row ? JSON.parse(row.preferences) : getDefaultPreferences());
});

router.put('/preferences', (req, res) => {
  const prefs = req.body;
  const existing = db.prepare('SELECT id FROM workout_preferences LIMIT 1').get();
  const stmt = existing
    ? db.prepare('UPDATE workout_preferences SET preferences=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    : db.prepare('INSERT INTO workout_preferences (preferences) VALUES (?)');
  if (existing) stmt.run(JSON.stringify(prefs), existing.id);
  else stmt.run(JSON.stringify(prefs));
  res.json({ success: true });
});

router.get('/templates', (req, res) => {
  const rows = db.prepare('SELECT * FROM workout_templates ORDER BY week_start_date DESC').all();
  res.json(rows.map(r => ({ ...r, workouts: JSON.parse(r.workouts) })));
});

router.get('/templates/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM workout_templates WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, workouts: JSON.parse(row.workouts) });
});

router.post('/templates', async (req, res) => {
  const { numWorkouts, weekStartDate } = req.body;
  try {
    const workouts = await generateWorkouts(numWorkouts || 5, weekStartDate);
    const weekStart = weekStartDate || getWeekStart();
    const prefsRow = db.prepare('SELECT preferences FROM workout_preferences ORDER BY id DESC LIMIT 1').get();
    const prefsSnapshot = prefsRow ? prefsRow.preferences : '{}';
    const stmt = db.prepare('INSERT INTO workout_templates (week_start_date, preferences_snapshot, workouts) VALUES (?, ?, ?)');
    const result = stmt.run(weekStart, prefsSnapshot, JSON.stringify(workouts));
    const inserted = db.prepare('SELECT * FROM workout_templates WHERE id=?').get(result.lastInsertRowid);
    res.json({ ...inserted, workouts: JSON.parse(inserted.workouts) });
  } catch (e) {
    console.error('Workout generation failed:', e);
    res.status(500).json({ error: 'Workout generation failed', message: e.message });
  }
});

router.put('/templates/:id', (req, res) => {
  const { workouts } = req.body;
  if (!workouts) return res.status(400).json({ error: 'workouts required' });
  db.prepare('UPDATE workout_templates SET workouts=? WHERE id=?').run(JSON.stringify(workouts), req.params.id);
  res.json({ success: true });
});

router.delete('/templates/:id', (req, res) => {
  const result = db.prepare('DELETE FROM workout_templates WHERE id=?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

router.get('/completed', (req, res) => {
  const rows = db.prepare('SELECT * FROM completed_workouts ORDER BY completed_at DESC').all();
  res.json(rows.map(r => ({
    ...r,
    workout_snapshot: r.workout_snapshot ? JSON.parse(r.workout_snapshot) : null,
    exercises_completed: r.exercises_completed ? JSON.parse(r.exercises_completed) : null,
  })));
});

router.get('/completed/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM completed_workouts WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({
    ...row,
    workout_snapshot: row.workout_snapshot ? JSON.parse(row.workout_snapshot) : null,
    exercises_completed: row.exercises_completed ? JSON.parse(row.exercises_completed) : null,
  });
});

router.post('/completed', (req, res) => {
  const { workout_template_id, workout_snapshot, notes, exercises_completed } = req.body;
  const stmt = db.prepare(`
    INSERT INTO completed_workouts (workout_template_id, workout_snapshot, notes, exercises_completed)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(
    workout_template_id ?? null,
    JSON.stringify(workout_snapshot || {}),
    notes ?? '',
    JSON.stringify(exercises_completed || [])
  );
  res.json({ id: result.lastInsertRowid, success: true });
});

function getDefaultPreferences() {
  return {
    instructions: '',
  };
}

function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function getWeekStart() {
  // Start from today rather than always rewinding to Monday of the current week
  return localDateStr(new Date());
}

export default router;
