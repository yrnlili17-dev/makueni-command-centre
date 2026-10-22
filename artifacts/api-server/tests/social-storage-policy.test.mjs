import test from 'node:test';
import assert from 'node:assert/strict';
import { createSocialStorageInitializer, settleSocialHealthWrites, socialDatabaseErrorCode } from '../src/lib/social-storage-policy.ts';

test('missing feature tables initialize once even for concurrent scans', async () => {
  const statements = [];
  let inspections = 0;
  const ensure = createSocialStorageInitializer({
    inspect: async () => { inspections++; return { mentions: false, health: false }; },
    execute: async sql => { statements.push(sql); }, onHealthError: () => assert.fail('unexpected failure'),
  });
  const results = await Promise.all([ensure(), ensure(), ensure()]);
  assert.equal(inspections, 1);
  assert.equal(statements.length, 2);
  assert.ok(results.every(r => r.healthReady));
  await ensure(); assert.equal(statements.length, 2);
});

test('existing feature tables are not recreated or changed', async () => {
  const ensure = createSocialStorageInitializer({ inspect: async () => ({ mentions: true, health: true }), execute: async () => assert.fail('must not mutate existing tables'), onHealthError: () => {} });
  assert.deepEqual(await ensure(), { healthReady: true });
});

test('health setup failure leaves primary storage usable and is retried later', async () => {
  let attempts = 0; const errors = [];
  const ensure = createSocialStorageInitializer({
    inspect: async () => ({ mentions: true, health: false }),
    execute: async () => { if (++attempts === 1) throw new Error('health permissions'); },
    onHealthError: error => errors.push(error),
  });
  assert.deepEqual(await ensure(), { healthReady: false });
  assert.deepEqual(await ensure(), { healthReady: true });
  assert.equal(errors.length, 1);
});

test('primary storage errors fail honestly and allow retry', async () => {
  let attempts = 0;
  const ensure = createSocialStorageInitializer({ inspect: async () => ({ mentions: false, health: true }), execute: async () => { if (++attempts === 1) throw new Error('cannot save mentions'); }, onHealthError: () => {} });
  await assert.rejects(ensure(), /cannot save mentions/);
  assert.deepEqual(await ensure(), { healthReady: true });
});

test('optional health writes settle all failures without rejecting successful scan saves', async () => {
  const errors = []; const completed = [];
  const warnings = await settleSocialHealthWrites([
    async () => { throw new Error('missing health table'); },
    async () => { completed.push('logged'); },
    () => { throw new Error('synchronous health error'); },
  ], error => errors.push(error));
  assert.deepEqual(completed, ['logged']);
  assert.equal(errors.length, 2);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /Saved mentions remain available/);
  assert.deepEqual(await settleSocialHealthWrites([async () => {}], () => {}), []);
});

test('wrapped PostgreSQL failures are classified without needing SQL or credentials', () => {
  assert.equal(socialDatabaseErrorCode({ cause: { code: '42P01' } }), '42P01');
  assert.equal(socialDatabaseErrorCode({ code: '42501' }), '42501');
  assert.equal(socialDatabaseErrorCode(null), null);
  const cycle = {}; cycle.cause = cycle;
  assert.equal(socialDatabaseErrorCode(cycle), null);
});
