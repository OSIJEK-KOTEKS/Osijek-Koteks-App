const assert = require('node:assert/strict');
const test = require('node:test');

const { createServiceJsonClient } = require('../utils/serviceJsonClient');
const { sha256Hex } = require('../utils/serviceAuth');

test('sends the exact signed JSON string through an injected HTTP client', async () => {
  const body = { sourceId: '68ac3ff2b7f6b982644a77a1', quarryCode: '23453' };
  const calls = [];
  const client = createServiceJsonClient({
    baseUrl: 'https://receiver.example/',
    clientId: 'old-backend',
    secret: 'test-secret',
    httpClient: {
      async request(options) {
        calls.push(options);
        return { data: { outcome: 'APPLIED' } };
      },
    },
  });

  const response = await client.requestJson('/events?source=old%20backend', {
    method: 'POST',
    body,
    timeout: 3210,
  });

  assert.deepEqual(response, { outcome: 'APPLIED' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://receiver.example/events?source=old%20backend');
  assert.equal(calls[0].data, JSON.stringify(body));
  assert.equal(calls[0].headers['X-OK-Service-Body-SHA256'], sha256Hex(JSON.stringify(body)));
  assert.equal(calls[0].timeout, 3210);
});
