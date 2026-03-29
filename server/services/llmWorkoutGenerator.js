import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/schema.js';

export async function generateWorkouts(numWorkouts, weekStartDate) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add your Anthropic API key to the .env file ' +
      '(ANTHROPIC_API_KEY=sk-ant-...) and restart the server.'
    );
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const prefsRow = db.prepare('SELECT preferences FROM workout_preferences ORDER BY id DESC LIMIT 1').get();
  const prefs = prefsRow ? JSON.parse(prefsRow.preferences) : {};
  const instructions = prefs.instructions ?? '';

  const historyRows = db.prepare(`
    SELECT workout_snapshot, completed_at FROM completed_workouts
    ORDER BY completed_at DESC
    LIMIT 6
  `).all();

  const historySummary = historyRows.map(r => {
    const snap = JSON.parse(r.workout_snapshot || '{}');
    const days = snap.workouts || [];
    return days.map(d => `${d.date || ''}: ${d.text ? d.text.slice(0, 120) : ''}`).join('\n');
  }).filter(Boolean).join('\n---\n');

  const days = getDates(weekStartDate, numWorkouts);

  const prompt = `You are a fitness coach. Create ${numWorkouts} workout(s) for the following dates: ${days.map(d => `${d.day} ${d.date}`).join(', ')}.

## User instructions (follow these carefully):
${instructions || '(No specific instructions provided. Use general fitness best practices.)'}

## Recent workout history (last ~6 sessions — ensure variety):
Avoid repeating the same movements, workout types, or structures from the sessions below. Prioritise exercises and formats not seen recently.
${historySummary || 'No recent history'}

## Output format
Return a JSON array with one object per workout day. Each object must have exactly these fields:
- "day": the day name (e.g. "Monday")
- "date": the date in YYYY-MM-DD format
- "text": the full freeform workout written as plain text. Use line breaks to separate items. Do NOT use markdown (no **, ##, or -). Plain text only.

CRITICAL formatting rules — follow these exactly or the display will break:

1. Do NOT put the day name, date, or a title (like "Heavy Lifting Day") anywhere in the text. Those are stored separately.

2. The text must have EXACTLY TWO sections: "Warm-Up" and "WOD". No other top-level labels.

3. The first line of the text must be exactly: Warm-Up (X min)
   Under it, write only the GENERAL warm-up movements (cardio, mobility, activation). Do NOT put any lift-specific ramp-up sets here.

4. After the warm-up, leave one blank line, then write the main workout.
   For conditioning days, start this section with: WOD (or WOD - subtitle)
   For lifting days, start with the first lift name (e.g. "Back Squat") — no need to write "WOD".
   Either way, there must be exactly one blank line separating the warm-up from the working sets.

5. For lifting days: ramp-up sets (e.g. "Empty Bar x 10, 50% x 5") belong under the lift name in the main section. Do NOT create a separate "Warm-Up" label for each lift.

6. There must be exactly ONE "Warm-Up" line in the entire text. Do not use the word "Warm-Up" anywhere else.

Example — conditioning day:
Warm-Up (8 min)
2 Rounds
200m Easy Run
10 Air Squats
10 Push-Ups

WOD - Engine Builder
15-Minute AMRAP
12 Kettlebell Swings (55 lb)
10 Box Jumps
8 Pull-Ups
200m Run

Example — lifting day:
Warm-Up (10 min)
400m Easy Run
10 Banded Good Mornings
10 Shoulder Pass-Throughs
10 Hip Circles each direction

WOD - Heavy Day
Back Squat
Empty Bar x 10, 50% x 5, 65% x 3, 80% x 2
5 x 5 — build to a heavy 5-rep set

Strict Shoulder Press
Empty Bar x 10, 50% x 5, 65% x 3
5 x 5 — no leg drive, full lockout

Deadlift
50% x 5, 65% x 3, 80% x 2
5 x 3 — build to a heavy triple, reset each rep

Cooldown
2 min easy walk
10 Cat-Cow, 30 sec Pigeon each side

Return ONLY the JSON array. No markdown, no explanation.`;

  const requestPayload = {
    model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
    max_tokens: 8192,
    temperature: 0.7,
    messages: [{ role: 'user', content: prompt }],
  };

  console.log('[Anthropic API] Sending request for', numWorkouts, 'workouts');
  console.log('[Anthropic API] Instructions from DB:', instructions || '(none)');
  console.log('[Anthropic API] Full prompt:\n---\n' + prompt + '\n---');

  try {
    const message = await anthropic.messages.create(requestPayload);

    const textBlock = message.content.find(b => b.type === 'text');
    const rawContent = textBlock?.text?.trim() || '[]';
    console.log('[Anthropic API] Response usage:', message.usage);
    console.log('[Anthropic API] Raw response:\n' + rawContent);

    const json = rawContent.replace(/^```json?\s*|\s*```$/g, '');
    const workouts = JSON.parse(json);
    if (!Array.isArray(workouts)) throw new Error('Invalid response format');
    return workouts;
  } catch (e) {
    if (e.status === 401 || e.message?.includes('API key') || e.message?.includes('auth')) {
      throw new Error(
        'Anthropic API authentication failed (401). Your ANTHROPIC_API_KEY is set but invalid or expired. ' +
        'Check the key in your .env file and make sure it matches a valid key in the Anthropic console (https://console.anthropic.com).'
      );
    }
    if (e.status === 429) {
      throw new Error(
        'Anthropic API rate limit exceeded (429). You have hit your usage limit or are sending requests too quickly. ' +
        'Check your plan and usage at https://console.anthropic.com.'
      );
    }
    if (e.status === 400) {
      throw new Error(
        `Anthropic API rejected the request (400). This usually means the model name is invalid. ` +
        `Current model: "${process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'}". ` +
        `Valid models include: claude-sonnet-4-6, claude-opus-4-6, claude-haiku-4-5-20251001, claude-3-5-sonnet-20241022. ` +
        `Details: ${e.message}`
      );
    }
    if (e.message?.includes('JSON') || e.message?.includes('parse') || e.message === 'Invalid response format') {
      throw new Error(
        'The AI returned a response that could not be parsed as valid workout JSON. ' +
        'This can happen occasionally — try generating again. ' +
        `Raw error: ${e.message}`
      );
    }
    throw new Error(`Workout generation failed: ${e.message}`);
  }
}

// Parse a YYYY-MM-DD string as LOCAL midnight — avoids the UTC-shift bug where
// new Date("2026-03-09") resolves to March 8 at 7 PM in US timezones.
function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Format a Date using local fields (not UTC) so the date string is always correct.
function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Default: return the next N Mon/Wed/Fri dates starting from today.
// Cycles into following weeks if more than 3 are requested.
function getUpcomingMWF(num) {
  const MWF = [1, 3, 5]; // Monday, Wednesday, Friday
  const results = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (results.length < num) {
    if (MWF.includes(cursor.getDay())) {
      results.push({ day: DAY_NAMES[cursor.getDay()], date: localDateStr(cursor) });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return results;
}

function getDates(weekStartDate, num) {
  // If an explicit start date is provided, generate consecutive days from it.
  if (weekStartDate) {
    const start = parseLocalDate(weekStartDate);
    return Array.from({ length: num }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { day: DAY_NAMES[d.getDay()], date: localDateStr(d) };
    });
  }
  // Default: upcoming Mon/Wed/Fri
  return getUpcomingMWF(num);
}
