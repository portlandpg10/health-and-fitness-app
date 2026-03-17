import { Router } from 'express';
import { db } from '../db/schema.js';

const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM lifts ORDER BY name ASC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, weight, volume_type } = req.body;
  if (!name || weight == null) return res.status(400).json({ error: 'Name and weight required' });
  const vol = volume_type || '1x5';
  const stmt = db.prepare('INSERT INTO lifts (name, weight, volume_type) VALUES (?, ?, ?)');
  const result = stmt.run(name, weight, vol);
  res.json({ id: result.lastInsertRowid, name, weight, volume_type: vol });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, weight, volume_type } = req.body;
  const stmt = db.prepare('UPDATE lifts SET name=?, weight=?, volume_type=?, updated_at=CURRENT_TIMESTAMP WHERE id=?');
  stmt.run(name ?? '', weight ?? 0, volume_type ?? '1x5', id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM lifts WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

export default router;
