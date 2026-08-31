// src/lib/level/calculator.ts

export type QuestionType = 'QCM' | 'OPEN' | 'EXERCICE';
export type AnswerEvaluation = 'CORRECT' | 'INCORRECT' | 'PARTIAL';
export type ChatMode = 'REVISE' | 'EXPLIQUE';

interface HistoryItem {
  timestamp: number;
  delta: number;
}

const MIN_LEVEL = 1.0;
const MAX_LEVEL = 5.0;

/**
 * Calculates the level decay based on time elapsed since last update.
 * If more than 14 days have passed, drops by 0.1 for every 7 days.
 */
export function calculateDecayedLevel(level: number, updatedAt: Date): number {
  const now = new Date().getTime();
  const diffMs = now - updatedAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 14) {
    return level;
  }

  const decayWeeks = Math.floor((diffDays - 14) / 7);
  if (decayWeeks <= 0) return level;

  const newLevel = level - (decayWeeks * 0.1);
  return Math.max(MIN_LEVEL, newLevel);
}

/**
 * Updates the student's level based on an answer evaluation.
 */
export function computeNextLevel(
  currentLevel: number,
  mode: ChatMode,
  qType: QuestionType | null,
  evaluation: AnswerEvaluation,
  rawHistory: any
): { newLevel: number, newHistory: HistoryItem[] } {
  let delta = 0;

  if (mode === 'EXPLIQUE') {
    // In EXPLIQUE mode, engagement gives a small bump, failure gives a small drop
    if (evaluation === 'CORRECT') delta = 0.1;
    else if (evaluation === 'PARTIAL') delta = 0.05;
    else if (evaluation === 'INCORRECT') delta = -0.05;
  } else {
    // REVISE Mode
    // Rules:
    // - Incorrect decreases MORE than Correct increases.
    // - OPEN (Cours): Up is low, Down is high.
    // - EXERCICE: Up is high, Down is low.
    // - QCM: Up is medium, Down is medium.
    
    // We also use a logarithmic factor based on currentLevel:
    // If you are level 4.5 and get an OPEN question wrong, you drop severely.
    // If you are level 1.5 and get an EXERCICE right, you gain a lot.

    const levelFactorUp = Math.max(0.1, (5.5 - currentLevel) / 4); // Higher level -> smaller gains
    const levelFactorDown = Math.max(0.1, (currentLevel - 0.5) / 4); // Higher level -> bigger drops

    let baseUp = 0;
    let baseDown = 0;

    if (qType === 'OPEN') {
      baseUp = 0.15;
      baseDown = 0.35;
    } else if (qType === 'EXERCICE') {
      baseUp = 0.35;
      baseDown = 0.15;
    } else {
      // QCM
      baseUp = 0.20;
      baseDown = 0.25;
    }

    if (evaluation === 'CORRECT') {
      delta = baseUp * levelFactorUp;
    } else if (evaluation === 'INCORRECT') {
      delta = -baseDown * levelFactorDown;
    } else { // PARTIAL
      delta = (baseUp * levelFactorUp) * 0.3; // tiny bump for partial success
    }
  }

  // Parse history
  let history: HistoryItem[] = [];
  try {
    if (Array.isArray(rawHistory)) {
      history = rawHistory;
    } else if (typeof rawHistory === 'string') {
      history = JSON.parse(rawHistory);
    }
  } catch (e) {
    history = [];
  }

  // Cap rolling sum of last 3 deltas at +/- 0.5
  history = history.slice(-2);
  const sumPastDeltas = history.reduce((sum, item) => sum + item.delta, 0);
  
  let totalRollingDelta = sumPastDeltas + delta;

  if (totalRollingDelta > 0.5) {
    delta = 0.5 - sumPastDeltas;
  } else if (totalRollingDelta < -0.5) {
    delta = -0.5 - sumPastDeltas;
  }

  // Calculate new level
  let newLevel = currentLevel + delta;
  
  // Bound check
  if (newLevel > MAX_LEVEL) {
    delta -= (newLevel - MAX_LEVEL); // adjust delta for history accurately
    newLevel = MAX_LEVEL;
  }
  if (newLevel < MIN_LEVEL) {
    delta += (MIN_LEVEL - newLevel); // adjust delta for history accurately
    newLevel = MIN_LEVEL;
  }

  // Add to history
  history.push({ timestamp: Date.now(), delta });

  return { newLevel, newHistory: history };
}
