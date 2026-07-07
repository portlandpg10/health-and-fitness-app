const MINUTE_RE = /(\d+)\s*[-–]?\s*(?:minute|min(?:ute)?s?)\b/i;

function parseMinutes(text) {
  const m = text.match(MINUTE_RE);
  return m ? Number(m[1]) * 60 : null;
}

function firstMeaningfulLine(text) {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)[0] ?? '';
}

function matchTabata(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const detailed = line.match(
      /(\d+)\s*rounds?\s*[/:]\s*(\d+)\s*sec(?:ond)?s?\s*work\s*[/:]\s*(\d+)\s*sec(?:ond)?s?\s*rest/i
    );
    if (detailed) {
      return {
        config: {
          type: 'tabata',
          rounds: Number(detailed[1]),
          workSec: Number(detailed[2]),
          restSec: Number(detailed[3]),
        },
        confidence: 'high',
        matchedLine: line,
      };
    }

    if (/tabata/i.test(line)) {
      const roundsMatch = line.match(/(\d+)\s*rounds?/i);
      const workMatch = line.match(/(\d+)\s*sec(?:ond)?s?\s*work/i);
      const restMatch = line.match(/(\d+)\s*sec(?:ond)?s?\s*rest/i);
      return {
        config: {
          type: 'tabata',
          rounds: roundsMatch ? Number(roundsMatch[1]) : 8,
          workSec: workMatch ? Number(workMatch[1]) : 20,
          restSec: restMatch ? Number(restMatch[1]) : 10,
        },
        confidence: 'high',
        matchedLine: line,
      };
    }
  }

  return null;
}


function parseRestSec(text) {
  const sec = text.match(/(\d+)\s*sec(?:ond)?s?\s*rest/i);
  if (sec) return Number(sec[1]);
  const min = text.match(/(\d+)\s*min(?:ute)?s?\s*rest/i);
  if (min) return Number(min[1]) * 60;
  return null;
}

function matchAmrapRounds(text) {
  const normalized = text.replace(/\s+/g, ' ');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const minutesOn = line.match(
      /(\d+)\s*rounds?\s*[-–—,]\s*(\d+)\s*min(?:ute)?s?\s*on,?\s*(\d+)\s*min(?:ute)?s?\s*rest/i
    );
    if (minutesOn) {
      return {
        config: {
          type: 'amrapRounds',
          rounds: Number(minutesOn[1]),
          workSec: Number(minutesOn[2]) * 60,
          restSec: Number(minutesOn[3]) * 60,
        },
        confidence: 'high',
        matchedLine: line,
      };
    }

    const eachRound = line.match(
      /(\d+)\s*rounds?,?\s+each\s+round\s+is\s+a\s+(\d+)\s*[-–]?\s*(?:minute|min(?:ute)?s?)\s*AMRAP\s+with\s+(\d+)\s*sec(?:ond)?s?\s*rest/i
    );
    if (eachRound) {
      return {
        config: {
          type: 'amrapRounds',
          rounds: Number(eachRound[1]),
          workSec: Number(eachRound[2]) * 60,
          restSec: Number(eachRound[3]),
        },
        confidence: 'high',
        matchedLine: line,
      };
    }

    const slashFormat = line.match(
      /(\d+)\s*rounds?\s*[/:]\s*(\d+)\s*[-–]?\s*(?:minute|min(?:ute)?s?)\s*AMRAP\s*[/:]\s*(\d+)\s*sec(?:ond)?s?\s*rest/i
    );
    if (slashFormat) {
      return {
        config: {
          type: 'amrapRounds',
          rounds: Number(slashFormat[1]),
          workSec: Number(slashFormat[2]) * 60,
          restSec: Number(slashFormat[3]),
        },
        confidence: 'high',
        matchedLine: line,
      };
    }
  }

  const roundsMatch = normalized.match(/(\d+)\s*rounds?/i);
  const amrapMatch = normalized.match(/(\d+)\s*[-–]?\s*(?:minute|min(?:ute)?s?)\s*[-–]?\s*AMRAP/i);
  const onMatch = normalized.match(/(\d+)\s*min(?:ute)?s?\s*on/i);
  const restSec = parseRestSec(normalized);
  if (roundsMatch && restSec != null && Number(roundsMatch[1]) > 1) {
    const workMins = amrapMatch ? Number(amrapMatch[1]) : onMatch ? Number(onMatch[1]) : null;
    if (workMins) {
      const matchedLine = lines.find(l => /rounds?/i.test(l)) ?? lines[0];
      return {
        config: {
          type: 'amrapRounds',
          rounds: Number(roundsMatch[1]),
          workSec: workMins * 60,
          restSec,
        },
        confidence: 'medium',
        matchedLine,
      };
    }
  }

  const fullTextOn = normalized.match(
    /(\d+)\s*rounds?\s*[-–—,]\s*(\d+)\s*min(?:ute)?s?\s*on,?\s*(\d+)\s*min(?:ute)?s?\s*rest/i
  );
  if (fullTextOn) {
    return {
      config: {
        type: 'amrapRounds',
        rounds: Number(fullTextOn[1]),
        workSec: Number(fullTextOn[2]) * 60,
        restSec: Number(fullTextOn[3]) * 60,
      },
      confidence: 'high',
      matchedLine: lines[0] ?? normalized,
    };
  }

  return null;
}

function matchAmrap(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const durationFirst = line.match(
      /(\d+)\s*[-–]?\s*(?:minute|min(?:ute)?s?)\s*[-–]?\s*AMRAP/i
    );
    if (durationFirst) {
      return {
        config: { type: 'amrap', durationSec: Number(durationFirst[1]) * 60 },
        confidence: 'high',
        matchedLine: line,
      };
    }

    const amrapFirst = line.match(
      /AMRAP\s*[-–:]?\s*(\d+)\s*[-–]?\s*(?:minute|min(?:ute)?s?)/i
    );
    if (amrapFirst) {
      return {
        config: { type: 'amrap', durationSec: Number(amrapFirst[1]) * 60 },
        confidence: 'high',
        matchedLine: line,
      };
    }

    if (/AMRAP/i.test(line)) {
      const mins = parseMinutes(line);
      if (mins) {
        return {
          config: { type: 'amrap', durationSec: mins },
          confidence: 'medium',
          matchedLine: line,
        };
      }
    }
  }

  return null;
}

function matchEmom(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const normalized = text.replace(/\s+/g, ' ');

  for (const line of lines) {
    const shorthand = line.match(/\bE(\d+)?MOM\s*(\d+)\b/i);
    if (shorthand) {
      const everyN = shorthand[1] ? Number(shorthand[1]) : 1;
      return {
        config: {
          type: 'emom',
          rounds: Number(shorthand[2]),
          intervalSec: everyN * 60,
        },
        confidence: 'high',
        matchedLine: line,
      };
    }

    const everyMinute = line.match(
      /every\s+minute\s+on\s+the\s+minute\s+for\s+(\d+)\s*min(?:ute)?s?/i
    );
    if (everyMinute) {
      return {
        config: {
          type: 'emom',
          rounds: Number(everyMinute[1]),
          intervalSec: 60,
        },
        confidence: 'high',
        matchedLine: line,
      };
    }

    const everyNMinutes = line.match(
      /every\s+(\d+)\s*min(?:ute)?s?\s+on\s+the\s+minute\s+for\s+(\d+)\s*min(?:ute)?s?/i
    );
    if (everyNMinutes) {
      const everyN = Number(everyNMinutes[1]);
      return {
        config: {
          type: 'emom',
          rounds: Number(everyNMinutes[2]),
          intervalSec: everyN * 60,
        },
        confidence: 'high',
        matchedLine: line,
      };
    }

    const emomFor = line.match(/emom\s+for\s+(\d+)\s*min(?:ute)?s?/i);
    if (emomFor) {
      return {
        config: {
          type: 'emom',
          rounds: Number(emomFor[1]),
          intervalSec: 60,
        },
        confidence: 'high',
        matchedLine: line,
      };
    }

    const minutesEmom = line.match(/(\d+)\s*[-–]?\s*min(?:ute)?s?\s+emom/i);
    if (minutesEmom) {
      return {
        config: {
          type: 'emom',
          rounds: Number(minutesEmom[1]),
          intervalSec: 60,
        },
        confidence: 'medium',
        matchedLine: line,
      };
    }
  }

  const fullTextEveryMinute = normalized.match(
    /every\s+minute\s+on\s+the\s+minute\s+for\s+(\d+)\s*min(?:ute)?s?/i
  );
  if (fullTextEveryMinute) {
    return {
      config: {
        type: 'emom',
        rounds: Number(fullTextEveryMinute[1]),
        intervalSec: 60,
      },
      confidence: 'high',
      matchedLine: lines[0] ?? normalized,
    };
  }

  return null;
}

function matchForTime(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (/for\s*time/i.test(line)) {
      return {
        config: { type: 'forTime' },
        confidence: 'high',
        matchedLine: line,
      };
    }
  }

  return null;
}

function matchCountdown(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const clockMatch = line.match(
      /(\d+)\s*[-–]?\s*(?:minute|min(?:ute)?s?)\s*(?:running\s*)?clock/i
    );
    if (clockMatch) {
      return {
        config: { type: 'countdown', durationSec: Number(clockMatch[1]) * 60 },
        confidence: 'high',
        matchedLine: line,
      };
    }

    const plainClock = line.match(
      /(\d+)\s*[-–]?\s*(?:minute|min(?:ute)?s?)\s*clock/i
    );
    if (plainClock) {
      return {
        config: { type: 'countdown', durationSec: Number(plainClock[1]) * 60 },
        confidence: 'high',
        matchedLine: line,
      };
    }

    const durationOnly = line.match(/^(\d+)\s*[-–]?\s*(?:minute|min(?:ute)?s?)\s*$/i);
    if (durationOnly) {
      return {
        config: { type: 'countdown', durationSec: Number(durationOnly[1]) * 60 },
        confidence: 'medium',
        matchedLine: line,
      };
    }
  }

  return null;
}

export function parseWorkoutTimer(wodText) {
  if (!wodText?.trim()) {
    return {
      config: { type: 'unknown' },
      confidence: 'none',
      matchedLine: null,
    };
  }

  const detectors = [matchTabata, matchAmrapRounds, matchAmrap, matchEmom, matchForTime, matchCountdown];

  for (const detect of detectors) {
    const result = detect(wodText);
    if (result) return result;
  }

  return {
    config: { type: 'unknown' },
    confidence: 'none',
    matchedLine: firstMeaningfulLine(wodText),
  };
}

export function formatTimerLabel(config) {
  switch (config.type) {
    case 'amrap':
      return `${Math.round(config.durationSec / 60)}-MIN AMRAP`;
    case 'amrapRounds':
      return `${config.rounds}×${Math.round(config.workSec / 60)}-MIN AMRAP / ${config.restSec}s REST`;
    case 'emom': {
      const every = config.intervalSec / 60;
      return every === 1 ? `EMOM ${config.rounds}` : `E${every}MOM ${config.rounds}`;
    }
    case 'tabata':
      return `TABATA ${config.rounds}×${config.workSec}/${config.restSec}`;
    case 'forTime':
      return 'FOR TIME';
    case 'countdown':
      return `${Math.round(config.durationSec / 60)}-MIN CLOCK`;
    default:
      return 'TIMER';
  }
}

export function formatTime(totalSec) {
  const sec = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
