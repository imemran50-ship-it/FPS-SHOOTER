import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRankFromLevel,
  calculateLevelFromXP,
  checkMatchOutcome,
  calculateScore
} from './rules.ts';
import type { PlayerMatchStats } from './rules.ts';

test('rules: calculateLevelFromXP and calculateRankFromLevel progression works accurately', () => {
  const recruitLevel = calculateLevelFromXP(0);
  assert.equal(recruitLevel, 1);
  assert.equal(calculateRankFromLevel(1), 'Recruit');

  const veteranLevel = calculateLevelFromXP(5500);
  assert.ok(veteranLevel >= 5);
  const rank = calculateRankFromLevel(veteranLevel);
  assert.ok(typeof rank === 'string' && rank.length > 0);

  const apexLevel = calculateLevelFromXP(650000);
  assert.equal(calculateRankFromLevel(apexLevel), 'Apex Legend');
});

test('rules: calculateScore computes kills, headshots, and win bonuses', () => {
  const stats: PlayerMatchStats = {
    kills: 12,
    deaths: 4,
    headshots: 5,
    damageDealt: 1450,
    shotsFired: 120,
    shotsHit: 48,
    isWinner: true
  };

  const score = calculateScore(stats);
  assert.ok(score > 1500, 'Score should reflect kills, headshots, and victory');
  const kdRatio = stats.deaths > 0 ? stats.kills / stats.deaths : stats.kills;
  assert.equal(kdRatio, 3.0);
});

test('rules: checkMatchOutcome evaluates score target and time limits', () => {
  const targetKills = 25;
  const outcome1 = checkMatchOutcome(25, 18, 120, targetKills);
  assert.equal(outcome1.isFinished, true);
  assert.equal(outcome1.winner, 'alpha');

  const outcome2 = checkMatchOutcome(14, 25, 90, targetKills);
  assert.equal(outcome2.isFinished, true);
  assert.equal(outcome2.winner, 'bravo');

  const outcomeTimeOut = checkMatchOutcome(15, 12, 0, targetKills);
  assert.equal(outcomeTimeOut.isFinished, true);
  assert.equal(outcomeTimeOut.winner, 'alpha');

  const outcomeOngoing = checkMatchOutcome(12, 10, 80, targetKills);
  assert.equal(outcomeOngoing.isFinished, false);
  assert.equal(outcomeOngoing.winner, null);
});
