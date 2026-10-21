import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRegistrySummary } from '../src/lib/contact-summary.ts';

test('registry total includes unassigned contacts without inventing ward assignments', () => {
  const summary = parseRegistrySummary({ total: 126445, wardBreakdown: [
    { ward: 'Ukia', count: 404 }, { ward: 'Unknown', count: 126041 },
  ] });
  assert.equal(summary.total, 126445);
  assert.equal(summary.byWard.Ukia, 404);
  assert.equal(summary.byWard.Unknown, 126041);
  assert.equal(summary.byWard.Wote, undefined);
});

test('genuine empty registry is valid and blank ward labels are retained as Unknown', () => {
  assert.equal(parseRegistrySummary({ total: 0, wardBreakdown: [] }).total, 0);
  const summary = parseRegistrySummary({ total: 3, wardBreakdown: [
    { ward: '', count: 1 }, { ward: 'Unknown', count: 2 },
  ] });
  assert.equal(summary.byWard.Unknown, 3);
});

test('missing, invalid or inconsistent data must not become zero counts', () => {
  for (const payload of [null, {}, { error: 'Unauthorized' },
    { total: 4 }, { total: '4', wardBreakdown: [] },
    { total: -1, wardBreakdown: [] },
    { total: 4, wardBreakdown: [{ ward: 'Ukia', count: 3 }] },
    { total: 4, wardBreakdown: [{ ward: 'Ukia', count: '4' }] },
    { total: 4, wardBreakdown: [null] },
  ]) assert.throws(() => parseRegistrySummary(payload), /incomplete contact counts/);
});
