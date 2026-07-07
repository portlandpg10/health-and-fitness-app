function subHeaderKey(line) {
  const t = line.trim().replace(/:$/, '');
  if (/^FORMAT$/i.test(t)) return 'format';
  if (/^MOVEMENTS$/i.test(t)) return 'movements';
  if (/^NOTES$/i.test(t)) return 'notes';
  return null;
}

function isNoteLine(line) {
  const t = line.trim();
  return /^score\b/i.test(t)
    || /^rest\b/i.test(t)
    || /^note:/i.test(t)
    || /^aim to\b/i.test(t)
    || /^repeat\b/i.test(t);
}

function isMovementLine(line) {
  const t = line.trim();
  if (!t || isNoteLine(t) || isFormatLine(t)) return false;
  if (/^minute\s+\d+\s*:/i.test(t)) return true;
  if (/^station\s+\d+\s*:/i.test(t)) return true;
  if (/^part\s+\d+\s*:/i.test(t)) return true;
  if (/^max\s+/i.test(t)) return true;
  if (/^\d+m\s+\S/i.test(t)) return true;
  // Rep count + exercise name (exclude "4 Rounds", "3 Minutes", etc.)
  if (/^\d+\s+(?!rounds?\b|minutes?\b|min\b)\S/i.test(t)) return true;
  return false;
}

function isFormatLine(line) {
  const t = line.trim();
  if (!t || isNoteLine(t)) return false;
  if (/^(\d+)\s*rounds?$/i.test(t)) return true;
  if (/^\d+\s*rounds?\s*[—–-]/i.test(t)) return true;
  if (/^minutes?\s+on,/i.test(t)) return true;
  if (/seconds?\s+rest/i.test(t)) return true;
  if (/\b(amrap|emom|tabata|for\s*time)\b/i.test(t)) return true;
  if (/\be\d*mom\b/i.test(t)) return true;
  if (/every\s+minute\s+on\s+the\s+minute/i.test(t)) return true;
  if (/minutes?\s+on,/i.test(t)) return true;
  if (/^in each/i.test(t)) return true;
  if (/^\d+\s*[-–]?\s*min(?:ute)?s?\b/i.test(t)) return true;
  if (/^\d+\s*[-–]?\s*min(?:ute)?s?\s*(?:running\s*)?clock/i.test(t)) return true;
  return false;
}

function parseStructuredWodBody(text) {
  const lines = text.split('\n');
  const sections = { format: [], movements: [], notes: [] };
  let current = null;
  let sawMovementsHeader = false;

  for (const line of lines) {
    const key = subHeaderKey(line);
    if (key) {
      current = key;
      if (key === 'movements') sawMovementsHeader = true;
      continue;
    }

    if (!current) {
      if (line.trim()) sections.format.push(line);
      continue;
    }

    sections[current].push(line);
  }

  if (!sawMovementsHeader) return null;

  return {
    structured: true,
    format: sections.format.join('\n').trim(),
    movements: sections.movements.map(l => l.trim()).filter(Boolean),
    notes: sections.notes.join('\n').trim(),
  };
}

function parseLegacyWodBody(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const classified = lines.map(line => {
    if (isNoteLine(line)) return { type: 'note', line };
    if (isFormatLine(line)) return { type: 'format', line };
    if (isMovementLine(line)) return { type: 'movement', line };
    return { type: 'unknown', line };
  });

  const firstMovementIdx = classified.findIndex(c => c.type === 'movement');
  if (firstMovementIdx === -1) return null;

  const format = [];
  const movements = [];
  const notes = [];

  for (let i = 0; i < classified.length; i++) {
    const { type, line } = classified[i];
    if (type === 'note') notes.push(line);
    else if (type === 'movement') movements.push(line);
    else if (type === 'format') format.push(line);
    else if (i < firstMovementIdx) format.push(line);
    else movements.push(line);
  }

  return {
    structured: true,
    format: format.join('\n').trim(),
    movements,
    notes: notes.join('\n').trim(),
  };
}

export function parseWodBody(text) {
  if (!text?.trim()) {
    return { structured: false, raw: '' };
  }

  const structured = parseStructuredWodBody(text);
  if (structured) return structured;

  const legacy = parseLegacyWodBody(text);
  if (legacy) return legacy;

  return { structured: false, raw: text.trim() };
}
