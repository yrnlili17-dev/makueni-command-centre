import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { makueniPwa } from '../pwa/build-plugin.mjs';
function build(base = '/') {
  const files = new Map();
  makueniPwa(base).generateBundle.call({ emitFile(file) { files.set(file.fileName, file.source); } }, {}, { 'index.html': {}, 'assets/app-abcd.js': {}, 'assets/style-abcd.css': {}, 'assets/app.js.map': {} });
  return files;
}
function harness() {
  const files = build();
  const handlers = new Map(), stored = new Map(), requests = [];
  const cache = { async addAll(paths) { for (const path of paths) stored.set('https://makueni.test' + path, new Response('cached ' + path)); }, async put(request, response) { stored.set(request.url ?? request, response); } };
  const deleted = []; let offline = false, skipped = 0, claimed = 0;
  const scope = { location: { origin: 'https://makueni.test' }, clients: { async claim() { claimed++; } }, skipWaiting() { skipped++; }, addEventListener(name, callback) { handlers.set(name, callback); } };
  vm.runInNewContext(files.get('sw.js'), { self: scope, URL, Response, AbortController, setTimeout, clearTimeout,
    caches: { async open() { return cache; }, async match(request) { const r = stored.get(request.url ?? request); return r?.clone(); }, async keys() { return ['other-app-cache', 'makueni-shell-old']; }, async delete(key) { deleted.push(key); } },
    async fetch(request) { requests.push(request.url ?? request); if (offline) throw new Error('offline'); return new Response('live'); },
  });
  return { handlers, requests, stored, deleted, setOffline(value) { offline = value; }, get claimed() { return claimed; }, get skipped() { return skipped; } };
}
async function event(h, name, extra = {}) {
  let result;
  h.handlers.get(name)({ ...extra, waitUntil(value) { result = value; }, respondWith(value) { result = value; } });
  return await result;
}
test('generated app worker caches the built shell and respects a subdirectory base', () => {
  const files = build('/county/');
  assert.ok(files.get('sw.js').includes('/county/index.html'));
  assert.ok(files.get('sw.js').includes('/county/offline.html'));
  assert.ok(!files.get('sw.js').includes('app.js.map'));
  assert.ok(!files.get('sw.js').includes('__BUILD_'));
  assert.match(files.get('offline.html'), /<base href="\/county\/">/);
});
test('static files are served without another download after installation', async () => {
  const h = harness(); await event(h, 'install');
  const r = await event(h, 'fetch', { request: { method: 'GET', mode: 'cors', url: 'https://makueni.test/assets/app-abcd.js' } });
  assert.equal(await r.text(), 'cached /assets/app-abcd.js');
  assert.equal(h.requests.length, 0);
});
test('API calls, writes, external requests and uploads are never intercepted or cached', async () => {
  const h = harness(); await event(h, 'install');
  for (const request of [
    { method: 'GET', url: 'https://makueni.test/api/members' },
    { method: 'GET', url: 'https://makueni.test/api/auth/me' },
    { method: 'POST', url: 'https://makueni.test/api/field-ops/visits' },
    { method: 'GET', url: 'https://external.test/assets/app-abcd.js' },
    { method: 'GET', url: 'https://makueni.test/uploads/private-file.jpg' },
    { method: 'GET', url: 'https://makueni.test/s/private-link' },
  ]) assert.equal(await event(h, 'fetch', { request }), undefined);
});
test('offline navigation serves a clear offline screen, not a stale authenticated dashboard', async () => {
  const h = harness(); await event(h, 'install');
  h.setOffline(true);
  const r = await event(h, 'fetch', { request: { method: 'GET', mode: 'navigate', url: 'https://makueni.test/field-ops/session' } });
  assert.equal(await r.text(), 'cached /offline.html');
});
test('updates clean only this app caches and activate early only on request', async () => {
  const h = harness(); await event(h, 'activate');
  assert.deepEqual(h.deleted, ['makueni-shell-old']); assert.equal(h.claimed, 1); assert.equal(h.skipped, 0);
  await event(h, 'message', { data: 'unrecognized' }); assert.equal(h.skipped, 0);
  await event(h, 'message', { data: 'SKIP_WAITING' }); assert.equal(h.skipped, 1);
});
test('manifest includes installable icons and leaves orientation and zoom unrestricted', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url)));
  assert.equal(manifest.display, 'standalone'); assert.equal(manifest.start_url, './dashboard');
  assert.equal(manifest.orientation, undefined);
  for (const icon of manifest.icons) {
    const bytes = readFileSync(new URL('../public/' + icon.src, import.meta.url));
    const size = Number(icon.sizes.split('x')[0]);
    assert.equal(bytes.readUInt32BE(16), size); assert.equal(bytes.readUInt32BE(20), size);
  }
  assert.ok(!readFileSync(new URL('../index.html', import.meta.url), 'utf8').includes('maximum-scale'));
});
