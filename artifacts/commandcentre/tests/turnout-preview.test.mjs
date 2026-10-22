import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTurnoutPreview } from '../src/lib/turnout-preview.ts';
const wards = [
  { ward: 'Wote', registered: 1000, expectedTurnoutRate: 60, supportShare: 50 },
  { ward: 'Kee', registered: 3000, expectedTurnoutRate: 80, supportShare: 25 },
];
test('unsaved turnout edits update the row, sum and weighted turnout immediately', () => {
  const result = calculateTurnoutPreview(wards, { Wote: { turnout: 80, support: 50 } });
  assert.equal(result.wards[0].predictedVotes, 800);
  assert.equal(result.totals.predictedVotes, 3200);
  assert.equal(result.totals.predictedTurnoutRate, 80);
  assert.equal(result.totals.predictedCandidateVotes, 1000);
  assert.equal(result.totals.predictedCandidateShare, 31.25);
});
test('support edits change candidate total without changing turnout', () => {
  const result = calculateTurnoutPreview(wards, { Wote: { turnout: 60, support: 100 } });
  assert.equal(result.totals.predictedVotes, 3000);
  assert.equal(result.totals.predictedCandidateVotes, 1200);
  assert.equal(result.totals.predictedCandidateShare, 40);
  assert.equal(wards[0].supportShare, 50);
});
test('the shift applies to the shown edit, clamps at 100 and resets to saved values', () => {
  const result = calculateTurnoutPreview(wards, { Wote: { turnout: 95, support: 100 } }, 20);
  assert.equal(result.wards[0].turnoutRate, 100);
  assert.equal(result.totals.predictedVotes, 4000);
  const reset = calculateTurnoutPreview(wards, {});
  assert.equal(reset.totals.predictedVotes, 3000);
  assert.equal(reset.totals.predictedCandidateVotes, 900);
});
test('zero turnout and an empty register have defined totals, never NaN', () => {
  assert.deepEqual(calculateTurnoutPreview([], {}).totals, { registered: 0, predictedVotes: 0, predictedCandidateVotes: 0, predictedTurnoutRate: 0, predictedCandidateShare: 0 });
  assert.equal(calculateTurnoutPreview([wards[0]], { Wote: { turnout: 0, support: 100 } }).totals.predictedCandidateShare, 0);
});
