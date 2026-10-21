export interface PlayerMatchStats {
  kills: number;
  deaths: number;
  headshots: number;
  damageDealt: number;
  shotsFired: number;
  shotsHit: number;
  isWinner: boolean;
}

export interface MatchOutcome {
  isFinished: boolean;
  winner: 'alpha' | 'bravo' | 'draw' | null;
  reason?: string;
}

export const RANKS = [
  { minLevel: 1, name: 'Recruit' },
  { minLevel: 3, name: 'Specialist' },
  { minLevel: 6, name: 'Sergeant' },
  { minLevel: 10, name: 'Lieutenant' },
  { minLevel: 15, name: 'Captain' },
  { minLevel: 22, name: 'Major' },
  { minLevel: 30, name: 'Colonel' },
  { minLevel: 40, name: 'General' },
  { minLevel: 50, name: 'Apex Legend' }
];

export function calculateLevelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  // Level curve: Level 1 = 0 XP, Level 2 = 1000 XP, progressive square root curve
  const level = Math.floor(1 + Math.sqrt(xp / 250));
  return Math.min(100, Math.max(1, level));
}

export function calculateXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(250 * Math.pow(level - 1, 2));
}

export function calculateRankFromLevel(level: number): string {
  let matchedRank = RANKS[0].name;
  for (const rank of RANKS) {
    if (level >= rank.minLevel) {
      matchedRank = rank.name;
    }
  }
  return matchedRank;
}

export function calculateScore(stats: PlayerMatchStats): number {
  const killScore = stats.kills * 100;
  const headshotBonus = stats.headshots * 50;
  const damageScore = Math.floor(stats.damageDealt * 0.5);
  const winBonus = stats.isWinner ? 500 : 150;
  return killScore + headshotBonus + damageScore + winBonus;
}

export function calculateAccuracy(shotsFired: number, shotsHit: number): number {
  if (shotsFired <= 0) return 0;
  return Math.min(100, Math.round((shotsHit / shotsFired) * 100));
}

export function checkMatchOutcome(
  scoreAlpha: number,
  scoreBravo: number,
  timeRemainingSec: number,
  targetKills: number = 25
): MatchOutcome {
  if (scoreAlpha >= targetKills) {
    return { isFinished: true, winner: 'alpha', reason: 'Target kills achieved!' };
  }
  if (scoreBravo >= targetKills) {
    return { isFinished: true, winner: 'bravo', reason: 'Target kills achieved!' };
  }
  if (timeRemainingSec <= 0) {
    if (scoreAlpha > scoreBravo) {
      return { isFinished: true, winner: 'alpha', reason: 'Time expired - Victory by points!' };
    } else if (scoreBravo > scoreAlpha) {
      return { isFinished: true, winner: 'bravo', reason: 'Time expired - Victory by points!' };
    } else {
      return { isFinished: true, winner: 'draw', reason: 'Time expired - Stalemate Draw!' };
    }
  }
  return { isFinished: false, winner: null };
}
