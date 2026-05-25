const assert = require('node:assert/strict');
const test = require('node:test');

const {
  clearNonceCache,
  createServiceAuthHeaders,
  parseServiceClients,
  serviceAuthHeadersPresent,
  verifyServiceRequest,
} = require('../utils/serviceAuth');

const fixedNowMs = 1_700_000_000_000;
const fixedTimestamp = Math.floor(fixedNowMs / 1000).toString();

function request({
  method = 'POST',
  originalUrl = '/api/transport-requests',
  bodyString = '{"ok":true}',
  rawBody = bodyString,
  includeRawBody = true,
  headers,
}) {
  const normalizedHeaders = {};
  Object.entries(headers || {}).forEach(([key, value]) => {
    normalizedHeaders[key.toLowerCase()] = value;
  });

  const req = {
    method,
    originalUrl,
    get: (name) => normalizedHeaders[name.toLowerCase()],
  };

  if (includeRawBody) {
    req.rawBody = rawBody;
  }

  return req;
}

test('verifies a signed service request', async () => {
  clearNonceCache();
  const bodyString = '{"ok":true}';
  const headers = createServiceAuthHeaders({
    method: 'POST',
    pathWithQuery: '/api/transport-requests',
    bodyString,
    clientId: 'prijevoz',
    secret: 'test-secret',
    timestamp: fixedTimestamp,
    nonce: 'nonce-1234567890',
  });
  const clients = parseServiceClients(
    JSON.stringify([
      {
        clientId: 'prijevoz',
        secret: 'test-secret',
        actorUserId: '507f1f77bcf86cd799439011',
        allowed: [{ method: 'POST', pathPrefix: '/api/transport-requests' }],
      },
    ])
  );

  assert.equal(serviceAuthHeadersPresent(request({ headers })), true);

  const client = await verifyServiceRequest(request({ bodyString, headers }), {
    clients,
    now: fixedNowMs,
  });

  assert.equal(client.clientId, 'prijevoz');
  assert.equal(client.actorUserId, '507f1f77bcf86cd799439011');
});

test('rejects body tampering', async () => {
  clearNonceCache();
  const headers = createServiceAuthHeaders({
    method: 'POST',
    pathWithQuery: '/api/transport-requests',
    bodyString: '{"ok":true}',
    clientId: 'prijevoz',
    secret: 'test-secret',
    timestamp: fixedTimestamp,
    nonce: 'nonce-1234567891',
  });
  const clients = parseServiceClients(
    JSON.stringify([
      {
        clientId: 'prijevoz',
        secret: 'test-secret',
        actorUserId: '507f1f77bcf86cd799439011',
        allowed: [{ method: 'POST', pathPrefix: '/api/transport-requests' }],
      },
    ])
  );

  await assert.rejects(
    () => verifyServiceRequest(request({ bodyString: '{"ok":false}', headers }), { clients, now: fixedNowMs }),
    { code: 'body_hash_mismatch' }
  );
});

test('rejects replayed nonces', async () => {
  clearNonceCache();
  const bodyString = '';
  const headers = createServiceAuthHeaders({
    method: 'GET',
    pathWithQuery: '/api/users/prijevoz/access',
    bodyString,
    clientId: 'prijevoz',
    secret: 'test-secret',
    timestamp: fixedTimestamp,
    nonce: 'nonce-1234567892',
  });
  const clients = parseServiceClients(
    JSON.stringify([
      {
        clientId: 'prijevoz',
        secret: 'test-secret',
        actorUserId: '507f1f77bcf86cd799439011',
        allowed: [{ method: 'GET', pathPrefix: '/api/users/prijevoz/access' }],
      },
    ])
  );

  await verifyServiceRequest(request({ method: 'GET', originalUrl: '/api/users/prijevoz/access', bodyString, headers }), {
    clients,
    now: fixedNowMs,
  });

  await assert.rejects(
    () =>
      verifyServiceRequest(request({ method: 'GET', originalUrl: '/api/users/prijevoz/access', bodyString, headers }), {
        clients,
        now: fixedNowMs,
      }),
    { code: 'replayed_nonce' }
  );
});

test('rejects disallowed paths', async () => {
  clearNonceCache();
  const headers = createServiceAuthHeaders({
    method: 'GET',
    pathWithQuery: '/api/bills',
    clientId: 'prijevoz',
    secret: 'test-secret',
    timestamp: fixedTimestamp,
    nonce: 'nonce-1234567893',
  });
  const clients = parseServiceClients(
    JSON.stringify([
      {
        clientId: 'prijevoz',
        secret: 'test-secret',
        actorUserId: '507f1f77bcf86cd799439011',
        allowed: [{ method: 'GET', pathPrefix: '/api/transport-requests' }],
      },
    ])
  );

  await assert.rejects(
    () => verifyServiceRequest(request({ method: 'GET', originalUrl: '/api/bills', bodyString: '', headers }), { clients, now: fixedNowMs }),
    { code: 'service_path_not_allowed' }
  );
});

test('rejects multipart service requests before accepting an empty body signature', async () => {
  clearNonceCache();
  const pathWithQuery = '/api/items/507f1f77bcf86cd799439011/approval';
  const headers = createServiceAuthHeaders({
    method: 'PATCH',
    pathWithQuery,
    bodyString: '',
    clientId: 'prijevoz',
    secret: 'test-secret',
    timestamp: fixedTimestamp,
    nonce: 'nonce-1234567894',
  });
  const clients = parseServiceClients(
    JSON.stringify([
      {
        clientId: 'prijevoz',
        secret: 'test-secret',
        actorUserId: '507f1f77bcf86cd799439011',
        allowed: [{ method: 'PATCH', pathPrefix: '/api/items' }],
      },
    ])
  );

  await assert.rejects(
    () =>
      verifyServiceRequest(
        request({
          method: 'PATCH',
          originalUrl: pathWithQuery,
          includeRawBody: false,
          headers: {
            ...headers,
            'Content-Type': 'multipart/form-data; boundary=approval-boundary',
            'Content-Length': '128',
          },
        }),
        { clients, now: fixedNowMs }
      ),
    { code: 'unsupported_service_body_type' }
  );
});

test('rejects service requests with a declared body that was not captured', async () => {
  clearNonceCache();
  const headers = createServiceAuthHeaders({
    method: 'POST',
    pathWithQuery: '/api/transport-requests',
    bodyString: '',
    clientId: 'prijevoz',
    secret: 'test-secret',
    timestamp: fixedTimestamp,
    nonce: 'nonce-1234567895',
  });
  const clients = parseServiceClients(
    JSON.stringify([
      {
        clientId: 'prijevoz',
        secret: 'test-secret',
        actorUserId: '507f1f77bcf86cd799439011',
        allowed: [{ method: 'POST', pathPrefix: '/api/transport-requests' }],
      },
    ])
  );

  await assert.rejects(
    () =>
      verifyServiceRequest(
        request({
          includeRawBody: false,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Content-Length': '11',
          },
        }),
        { clients, now: fixedNowMs }
      ),
    { code: 'missing_raw_body' }
  );
});
