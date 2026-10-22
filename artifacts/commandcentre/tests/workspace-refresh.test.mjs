import test from 'node:test';
import assert from 'node:assert/strict';
import { installWorkspaceRefresh, isWorkspaceWrite, WORKSPACE_CHANGED } from '../src/lib/workspace-refresh.ts';
test('only successful same-origin workspace writes trigger refresh and never publish payloads', async () => {
  const origin = 'https://makueni.example';
  assert.equal(isWorkspaceWrite('/api/events', { method: 'POST' }, origin), true);
  assert.equal(isWorkspaceWrite(new Request(`${origin}/api/events`, { method: 'PATCH' }), undefined, origin), true);
  for (const [url, method] of [['/api/events','GET'], ['/api/auth/login','POST'], ['https://elsewhere.example/api/events','POST'], ['/not-api','POST']]) assert.equal(isWorkspaceWrite(url, { method }, origin), false);
  const previousWindow = globalThis.window;
  const previousChannel = globalThis.BroadcastChannel;
  const target = new EventTarget();
  let ok = true, refreshes = 0, signals = 0;
  const sent = [];
  const fetcher = async () => new Response(null, { status: ok ? 204 : 400 });
  globalThis.window = Object.assign(target, { fetch: fetcher, location: { origin } });
  globalThis.BroadcastChannel = class { postMessage(value) { sent.push(value); } close() {} };
  const cleanup = installWorkspaceRefresh(() => refreshes++);
  target.addEventListener(WORKSPACE_CHANGED, () => signals++);
  try {
    await window.fetch('/api/events', { method: 'POST', body: 'private data' });
    await window.fetch('/api/events', { method: 'PATCH' });
    ok = false;
    await window.fetch('/api/events', { method: 'DELETE' });
    await new Promise(resolve => setTimeout(resolve, 260));
    assert.equal(refreshes, 1);
    assert.equal(signals, 1);
    assert.deepEqual(sent, ['changed', 'changed']);
  } finally { cleanup(); assert.equal(window.fetch, fetcher); globalThis.window = previousWindow; globalThis.BroadcastChannel = previousChannel; }
});
