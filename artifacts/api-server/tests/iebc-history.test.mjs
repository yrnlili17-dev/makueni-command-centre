import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getIebcHistory, turnoutPercent, getIebcContext, buildIebcSwot } from '../src/data/iebc-history.ts';

test('turnout includes rejected ballots and uses the declaration denominator', () => {
  const h = getIebcHistory();
  assert.equal(h.makueni.candidates.reduce((n, c) => n + c.votes, 0), h.makueni.validVotes);
  assert.equal(h.makueni.ballotsCast, 292727);
  assert.equal(h.makueni.turnoutPercent, 61.05);
  assert.equal(h.makueni.registered - h.makueni.registerSnapshot.registered, 115);
  assert.notEqual(turnoutPercent(290819, 1908, 479401), h.makueni.turnoutPercent);
});

test('invalid or impossible counts are unavailable rather than a turnout percentage', () => {
  for (const args of [[1, 1, 0], [-1, 0, 10], [10, 1, 10], [NaN, 0, 10], [1.5, 0, 10], [1, -1, 10]]) assert.equal(turnoutPercent(...args), null);
  assert.equal(turnoutPercent(0, 0, 10), 0);
});

test('national and local scopes, dates and incomplete verification stay explicit', () => {
  const h = getIebcHistory();
  assert.equal(h.makueni.office, 'President');
  assert.equal(h.makueni.status, 'indexed-extract');
  assert.ok(h.national.every(r => r.scope === 'Kenya'));
  assert.deepEqual(h.sources.find(s => s.id === 'evaluation-2017').electionDates, ['2017-08-08', '2017-10-26']);
  assert.ok(h.sources.every(s => new URL(s.url).hostname.endsWith('iebc.or.ke')));
  assert.match(getIebcContext(), /115 difference is unresolved/);
  assert.match(getIebcContext(), /not local rates/);
  assert.match(buildIebcSwot().note, /not a candidate-strength assessment/);
});

test('AI fallback answers election questions from the evidence module', () => {
  const text = readFileSync(new URL('../src/routes/makueni-free-ai.ts', import.meta.url), 'utf8');
  assert.match(text, /return getIebcContext\(\)/);
  const turnout = readFileSync(new URL('../src/routes/turnout.ts', import.meta.url), 'utf8');
  assert.match(turnout, /actualCandidateVotes: null/);
  assert.match(turnout, /actualTurnoutRate: null/);
  assert.doesNotMatch(turnout, /sum\(\$\{tallyResultsTable.votes\}/);
});
