import test from 'node:test';
import assert from 'node:assert/strict';
import { MAKUENI_MONITORING_KEYWORDS, matchMakueniMonitoringKeywords as match, makueniMonitoringQueries } from '../src/data/makueni-monitoring-keywords.ts';

test('requested keywords and corrected spelling variants are retained', () => {
  assert.deepEqual(MAKUENI_MONITORING_KEYWORDS.requested, ['Pro.Philip kaloki', 'Makueni Governer 2027', 'Kaloki', 'UDA', 'Ukambani']);
  for (const text of ['Pro.Philip kaloki', 'PROF. PHILIP KALOKI', 'Philip Kyalo Kaloki', 'Makueni Governer 2027', 'Makueni Governor 2027', 'Makueni 2027 Governor']) assert.ok(match(text).matched, text);
});

test('broad keywords require explicit local context and word boundaries', () => {
  for (const text of ['Kaloki attended an event in Makueni', 'UDA Makueni update', 'Ukambani discussion about Makueni']) assert.ok(match(text).matched, text);
  for (const text of ['Kaloki Nairobi', 'UDA national update', 'Ukambani general news', 'Sudan Makueni update', 'Kalokian Makueni', 'UDA Makuenian']) assert.equal(match(text).matched, false, text);
});

test('mentions are never treated as verified authorship', () => {
  const result = match('A newspaper mentions Philip Kaloki');
  assert.ok(result.matched);
  assert.ok(result.requiresAuthorshipVerification);
  assert.ok(result.matchedTerms.includes('Philip Kaloki'));
  assert.equal(match('').matched, false);
});

test('broad search queries remain Makueni-scoped and continuous collection is not claimed', () => {
  const queries = makueniMonitoringQueries();
  assert.equal(queries.length, new Set(queries).size);
  for (const term of MAKUENI_MONITORING_KEYWORDS.broadTerms) assert.ok(queries.includes(`"${term}" Makueni`));
  assert.match(MAKUENI_MONITORING_KEYWORDS.coverage, /manual public-web scan/);
  assert.match(MAKUENI_MONITORING_KEYWORDS.coverage, /not activated/);
});
