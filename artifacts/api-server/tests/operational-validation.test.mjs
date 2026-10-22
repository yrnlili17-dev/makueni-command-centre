import test from 'node:test';
import assert from 'node:assert/strict';
import { isCalendarDate, isNonNegativeInteger } from '../src/lib/operational-validation.ts';
import { getMakueniGovernorHistory } from '../src/data/makueni-governor-history.ts';
test('calendar validation rejects rolled-over dates and accepts actual leap days', () => {
  assert.equal(isCalendarDate('2024-02-29'), true);
  for (const date of ['2027-02-29', '2027-04-31', '2027-13-01', '', undefined, '2027-8-10']) assert.equal(isCalendarDate(date), false);
});
test('negative, fractional and non-finite session counts are invalid', () => {
  assert.equal(isNonNegativeInteger(0), true);
  for (const count of [-1, 1.5, NaN, Infinity, '12']) assert.equal(isNonNegativeInteger(count), false);
});
test('governor history uses gubernatorial candidates and keeps unverified turnout unavailable', () => {
  const history = getMakueniGovernorHistory();
  assert.equal(history.office, 'Governor');
  assert.equal(history.geography, 'Makueni County');
  assert.equal(history.candidates.length, 5);
  assert.equal(history.candidateVoteSum, 289490);
  assert.equal(history.turnoutPercent, null);
  assert.equal(history.ballotsCast, null);
  assert.ok(history.sources.some(source => source.url.includes('kenyalaw.org')));
  assert.match(history.note, /not a result for Prof. Philip Kaloki/);
});
