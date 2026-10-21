import assert from 'node:assert/strict';
import test from 'node:test';
import { isPublicApiRoute, requiredApiAccess, API_MODULES } from '../src/lib/api-access.ts';

test('public participation and authenticated provider callbacks retain only intended verbs', () => {
  for (const [method, path] of [
    ['GET', '/healthz'], ['POST', '/volunteers/register'],
    ['GET', '/surveys/public/polls/12'], ['POST', '/surveys/polls/12/vote'],
    ['POST', '/surveys/public/participant-registration'],
    ['GET', '/insights/p/token'], ['POST', '/insights/p/token/submit'],
    ['POST', '/insights/p/token/event'], ['GET', '/insights/share/token'],
    ['POST', '/messages/webhooks/twilio'], ['POST', '/messages/webhooks/africastalking'],
    ['POST', '/fundraising/mpesa/callback'],
  ]) {
    assert.equal(isPublicApiRoute(method, path), true, `${method} ${path}`);
    assert.equal(isPublicApiRoute('DELETE', path), false, path);
  }
});

test('contact exports, poll results and management operations never bypass authorization', () => {
  for (const path of ['/members', '/surveys/polls', '/surveys/polls/12/results',
    '/surveys/participant-registrations', '/volunteers', '/messages/providers',
    '/fundraising/mpesa/transactions', '/insights/polls/1/responses',
    '/insights/p/token/submit/extra', '/volunteers/register/extra']) {
    for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
      assert.equal(isPublicApiRoute(method, path), false, `${method} ${path}`);
    }
  }
});

test('every known module requires read access for reads and write access for mutations', () => {
  for (const [prefix, module] of Object.entries(API_MODULES)) {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      assert.deepEqual(requiredApiAccess(method, `/${prefix}/123`), { module, level: 'read' });
    }
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      assert.deepEqual(requiredApiAccess(method, `/${prefix}/123`), { module, level: 'write' });
    }
  }
  assert.equal(requiredApiAccess('GET', '/unknown').module, undefined);
  assert.equal(isPublicApiRoute('HEAD', '/healthz'), true);
  assert.equal(isPublicApiRoute('GET', '/messages/webhooks/twilio'), false);
});
