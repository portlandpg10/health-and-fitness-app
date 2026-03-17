import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/health.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS daily_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    steps INTEGER NOT NULL DEFAULT 0,
    bad_calories INTEGER NOT NULL DEFAULT 0,
    weight REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS lifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    weight REAL NOT NULL,
    volume_type TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS workout_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    preferences TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS workout_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start_date TEXT NOT NULL,
    preferences_snapshot TEXT,
    workouts TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS completed_workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_template_id INTEGER,
    workout_snapshot TEXT NOT NULL,
    completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    exercises_completed TEXT,
    FOREIGN KEY (workout_template_id) REFERENCES workout_templates(id)
  );

  CREATE INDEX IF NOT EXISTS idx_daily_entries_date ON daily_entries(date);
  CREATE INDEX IF NOT EXISTS idx_completed_workouts_completed_at ON completed_workouts(completed_at);
`);
