import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRegistryWardFilter } from '../src/data/registry-ward-filter.ts';

const wards = ['Kee', 'Ukia', 'Kiima Kiu/Kalanzoni'];

test('directory links round-trip names containing spaces and slashes', () => {
  for (const ward of wards) {
    const href = '/voters-db?' + new URLSearchParams({ ward });
    const requested = new URL(href, 'https://example.test').searchParams.get('ward');
    assert.deepEqual(parseRegistryWardFilter(requested, wards), { kind: 'known', ward });
  }
});

test('Unknown is a separate read-only filter, not an invented ward', () => {
  assert.deepEqual(parseRegistryWardFilter('unknown', wards), { kind: 'unknown' });
  assert.deepEqual(parseRegistryWardFilter(undefined, wards), { kind: 'all' });
  assert.deepEqual(parseRegistryWardFilter('', wards), { kind: 'all' });
});

test('invalid and repeated query values cannot silently broaden to all records', () => {
  for (const value of ['Matungulu', 'unknown OR 1=1', ['Kee', 'Ukia'], 42, {}, null]) {
    assert.deepEqual(parseRegistryWardFilter(value, wards), { kind: 'invalid' });
  }
});
