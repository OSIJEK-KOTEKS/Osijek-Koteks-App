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
  originalUrl = '/api/test/integration',
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
    get: name => normalizedHeaders[name.toLowerCase()],
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
    pathWithQuery: '/api/test/integration',
    bodyString,
    clientId: 'integration-test-client',
    secret: 'test-secret',
    timestamp: fixedTimestamp,
    nonce: 'nonce-1234567890',
  });
  const clients = parseServiceClients(
    JSON.stringify([
      {
        clientId: 'integration-test-client',
        secret: 'test-secret',
        actorUserId: '507f1f77bcf86cd799439011',
        allowed: [{ method: 'POST', pathPrefix: '/api/test/integration' }],
      },
    ])
  );

  assert.equal(serviceAuthHeadersPresent(request({ headers })), true);

  const client = await verifyServiceRequest(request({ bodyString, headers }), {
    clients,
    now: fixedNowMs,
  });

  assert.equal(client.clientId, 'integration-test-client');
  assert.equal(client.actorUserId, '507f1f77bcf86cd799439011');
});

test('rejects body tampering', async () => {
  clearNonceCache();
  const headers = createServiceAuthHeaders({
    method: 'POST',
    pathWithQuery: '/api/test/integration',
    bodyString: '{"ok":true}',
    clientId: 'integration-test-client',
    secret: 'test-secret',
    timestamp: fixedTimestamp,
    nonce: 'nonce-1234567891',
  });
  const clients = parseServiceClients(
    JSON.stringify([
      {
        clientId: 'integration-test-client',
        secret: 'test-secret',
        actorUserId: '507f1f77bcf86cd799439011',
        allowed: [{ method: 'POST', pathPrefix: '/api/test/integration' }],
      },
    ])
  );

  await assert.rejects(
    () =>
      verifyServiceRequest(request({ bodyString: '{"ok":false}', headers }), {
        clients,
        now: fixedNowMs,
      }),
    { code: 'body_hash_mismatch' }
  );
});

test('rejects replayed nonces', async () => {
  clearNonceCache();
  const bodyString = '';
  const headers = createServiceAuthHeaders({
    method: 'GET',
    pathWithQuery: '/api/integrations/delivery-note-sync-state',
    bodyString,
    clientId: 'integration-test-client',
    secret: 'test-secret',
    timestamp: fixedTimestamp,
    nonce: 'nonce-1234567892',
  });
  const clients = parseServiceClients(
    JSON.stringify([
      {
        clientId: 'integration-test-client',
        secret: 'test-secret',
        actorUserId: '507f1f77bcf86cd799439011',
        allowed: [{ method: 'GET', pathPrefix: '/api/integrations/delivery-note-sync-state' }],
      },
    ])
  );

  await verifyServiceRequest(
    request({
      method: 'GET',
      originalUrl: '/api/integrations/delivery-note-sync-state',
      bodyString,
      headers,
    }),
    {
      clients,
      now: fixedNowMs,
    }
  );

  await assert.rejects(
    () =>
      verifyServiceRequest(
        request({
          method: 'GET',
          originalUrl: '/api/integrations/delivery-note-sync-state',
          bodyString,
          headers,
        }),
        {
          clients,
          now: fixedNowMs,
        }
      ),
    { code: 'replayed_nonce' }
  );
});

test('rejects disallowed paths', async () => {
  clearNonceCache();
  const headers = createServiceAuthHeaders({
    method: 'GET',
    pathWithQuery: '/api/bills',
    clientId: 'integration-test-client',
    secret: 'test-secret',
    timestamp: fixedTimestamp,
    nonce: 'nonce-1234567893',
  });
  const clients = parseServiceClients(
    JSON.stringify([
      {
        clientId: 'integration-test-client',
        secret: 'test-secret',
        actorUserId: '507f1f77bcf86cd799439011',
        allowed: [{ method: 'GET', pathPrefix: '/api/integrations/delivery-note-sync-state' }],
      },
    ])
  );

  await assert.rejects(
    () =>
      verifyServiceRequest(
        request({ method: 'GET', originalUrl: '/api/bills', bodyString: '', headers }),
        { clients, now: fixedNowMs }
      ),
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
    clientId: 'integration-test-client',
    secret: 'test-secret',
    timestamp: fixedTimestamp,
    nonce: 'nonce-1234567894',
  });
  const clients = parseServiceClients(
    JSON.stringify([
      {
        clientId: 'integration-test-client',
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
    pathWithQuery: '/api/test/integration',
    bodyString: '',
    clientId: 'integration-test-client',
    secret: 'test-secret',
    timestamp: fixedTimestamp,
    nonce: 'nonce-1234567895',
  });
  const clients = parseServiceClients(
    JSON.stringify([
      {
        clientId: 'integration-test-client',
        secret: 'test-secret',
        actorUserId: '507f1f77bcf86cd799439011',
        allowed: [{ method: 'POST', pathPrefix: '/api/test/integration' }],
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

test('verifies a reconciliation GET signature with encoded query parameters', async () => {
  clearNonceCache();
  const pathWithQuery =
    '/api/integrations/delivery-note-sync-state?updatedAfter=2026-08-24T08%3A00%3A00Z&limit=100';
  const headers = createServiceAuthHeaders({
    method: 'GET',
    pathWithQuery,
    bodyString: '',
    clientId: 'transport-backend',
    secret: 'test-secret',
    timestamp: fixedTimestamp,
    nonce: 'nonce-reconciliation-01',
  });
  const clients = parseServiceClients(
    JSON.stringify([
      {
        clientId: 'transport-backend',
        secret: 'test-secret',
        actorUserId: '507f1f77bcf86cd799439011',
        allowed: [{ method: 'GET', pathPrefix: '/api/integrations/delivery-note-sync-state' }],
      },
    ])
  );

  const client = await verifyServiceRequest(
    request({ method: 'GET', originalUrl: pathWithQuery, bodyString: '', headers }),
    { clients, now: fixedNowMs }
  );

  assert.equal(client.clientId, 'transport-backend');
});
