const assert = require('node:assert/strict');
const test = require('node:test');

const requireServiceClient = require('../middleware/requireServiceClient');

test('allows only requests authenticated as an HMAC service client', () => {
  let nextCalled = false;
  requireServiceClient(
    { serviceClient: { clientId: 'transport-backend' } },
    {},
    () => (nextCalled = true)
  );
  assert.equal(nextCalled, true);
});

test('rejects a bearer-authenticated request without a service identity', () => {
  let statusCode;
  let body;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      body = value;
    },
  };

  requireServiceClient({ user: { role: 'admin' } }, response, () => {});

  assert.equal(statusCode, 401);
  assert.deepEqual(body, { message: 'Service authentication required' });
});
