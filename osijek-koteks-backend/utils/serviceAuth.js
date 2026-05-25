const crypto = require('crypto');

const HEADER_NAMES = {
  client: 'X-OK-Service-Client',
  timestamp: 'X-OK-Service-Timestamp',
  nonce: 'X-OK-Service-Nonce',
  bodyHash: 'X-OK-Service-Body-SHA256',
  signature: 'X-OK-Service-Signature',
};

const DEFAULT_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;
const DEFAULT_NONCE_TTL_SECONDS = 10 * 60;
const SUPPORTED_SERVICE_BODY_MEDIA_TYPES = new Set(['application/json']);
const nonceCache = new Map();

class ServiceAuthError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'ServiceAuthError';
    this.code = code;
  }
}

function serviceAuthHeadersPresent(req) {
  return Boolean(
    req.get(HEADER_NAMES.client) ||
      req.get(HEADER_NAMES.timestamp) ||
      req.get(HEADER_NAMES.nonce) ||
      req.get(HEADER_NAMES.bodyHash) ||
      req.get(HEADER_NAMES.signature)
  );
}

function createServiceAuthHeaders({
  method,
  pathWithQuery,
  bodyString = '',
  clientId,
  secret,
  timestamp = Math.floor(Date.now() / 1000).toString(),
  nonce = crypto.randomUUID(),
}) {
  if (!clientId || !secret) {
    throw new ServiceAuthError('missing_outgoing_config', 'service client id and secret are required');
  }

  const bodyHash = sha256Hex(bodyString);
  const canonical = canonicalRequest({
    method,
    pathWithQuery,
    timestamp,
    nonce,
    bodyHash,
  });

  return {
    [HEADER_NAMES.client]: clientId,
    [HEADER_NAMES.timestamp]: timestamp,
    [HEADER_NAMES.nonce]: nonce,
    [HEADER_NAMES.bodyHash]: bodyHash,
    [HEADER_NAMES.signature]: hmacSha256Hex(secret, canonical),
  };
}

async function verifyServiceRequest(req, options = {}) {
  const clientId = requiredHeader(req, HEADER_NAMES.client);
  const timestamp = requiredHeader(req, HEADER_NAMES.timestamp);
  const nonce = requiredHeader(req, HEADER_NAMES.nonce);
  const bodyHash = requiredHeader(req, HEADER_NAMES.bodyHash);
  const signature = requiredHeader(req, HEADER_NAMES.signature);
  const client = serviceClientConfig(clientId, options.clients);

  ensureAllowedPath(client, req.method, req.originalUrl || req.url || '/');
  ensureFreshTimestamp(timestamp, options.now || Date.now());
  ensureValidNonce(clientId, nonce, options.now || Date.now(), options.nonceTtlSeconds);
  ensureSupportedBodyContentType(req);
  ensureBodyHash(req, bodyHash);

  const canonical = canonicalRequest({
    method: req.method,
    pathWithQuery: req.originalUrl || req.url || '/',
    timestamp,
    nonce,
    bodyHash,
  });
  const expectedSignature = hmacSha256Hex(client.secret, canonical);

  if (!secureEqualHex(expectedSignature, signature)) {
    throw new ServiceAuthError('invalid_signature');
  }

  rememberNonce(clientId, nonce, options.now || Date.now(), options.nonceTtlSeconds);

  return client;
}

function configuredServiceClients() {
  return parseServiceClients(process.env.SERVICE_AUTH_CLIENTS_JSON || '');
}

function parseServiceClients(rawValue) {
  if (!rawValue || !rawValue.trim()) {
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new ServiceAuthError('invalid_service_auth_config', 'SERVICE_AUTH_CLIENTS_JSON is invalid JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new ServiceAuthError('invalid_service_auth_config', 'SERVICE_AUTH_CLIENTS_JSON must be an array');
  }

  return parsed.map((client) => normalizeServiceClient(client));
}

function canonicalRequest({ method, pathWithQuery, timestamp, nonce, bodyHash }) {
  return [
    method.toString().toUpperCase(),
    pathWithQuery || '/',
    timestamp.toString(),
    nonce.toString(),
    bodyHash.toString().toLowerCase(),
  ].join('\n');
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value || '', 'utf8').digest('hex');
}

function hmacSha256Hex(secret, value) {
  return crypto.createHmac('sha256', secret).update(value, 'utf8').digest('hex');
}

function rawBody(req) {
  if (Buffer.isBuffer(req.rawBody)) {
    return req.rawBody.toString('utf8');
  }

  if (typeof req.rawBody === 'string') {
    return req.rawBody;
  }

  if (requestDeclaresBody(req)) {
    throw new ServiceAuthError('missing_raw_body');
  }

  return '';
}

function ensureSupportedBodyContentType(req) {
  const contentType = req.get('content-type');
  if (!contentType) {
    return;
  }

  const mediaType = contentType.split(';')[0].trim().toLowerCase();
  if (!SUPPORTED_SERVICE_BODY_MEDIA_TYPES.has(mediaType)) {
    throw new ServiceAuthError('unsupported_service_body_type');
  }
}

function requestDeclaresBody(req) {
  const contentLength = req.get('content-length');
  if (contentLength) {
    const parsedLength = Number.parseInt(contentLength, 10);
    return Number.isFinite(parsedLength) && parsedLength > 0;
  }

  return Boolean(req.get('transfer-encoding'));
}

function requiredHeader(req, headerName) {
  const value = req.get(headerName);
  if (!value) {
    throw new ServiceAuthError('missing_service_auth_header');
  }

  return value;
}

function serviceClientConfig(clientId, explicitClients) {
  const clients = explicitClients || configuredServiceClients();
  const client = clients.find((candidate) => candidate.clientId === clientId);
  if (!client) {
    throw new ServiceAuthError('unknown_service_client');
  }

  return client;
}

function normalizeServiceClient(client) {
  if (!client || typeof client !== 'object') {
    throw new ServiceAuthError('invalid_service_auth_config', 'service client must be an object');
  }

  const clientId = stringField(client, 'clientId');
  const secret = stringField(client, 'secret');
  const actorUserId = stringField(client, 'actorUserId');
  const allowed = Array.isArray(client.allowed) ? client.allowed : [];

  return {
    clientId,
    secret,
    actorUserId,
    allowed: allowed.map((entry) => ({
      method: stringField(entry, 'method').toUpperCase(),
      pathPrefix: stringField(entry, 'pathPrefix'),
    })),
  };
}

function stringField(object, key) {
  const value = object && object[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ServiceAuthError('invalid_service_auth_config', `${key} is required`);
  }

  return value.trim();
}

function ensureAllowedPath(client, method, originalUrl) {
  const pathname = pathFromOriginalUrl(originalUrl);
  const normalizedMethod = method.toUpperCase();
  const allowed = client.allowed.some((entry) => {
    return (
      (entry.method === '*' || entry.method === normalizedMethod) &&
      pathname.startsWith(entry.pathPrefix)
    );
  });

  if (!allowed) {
    throw new ServiceAuthError('service_path_not_allowed');
  }
}

function pathFromOriginalUrl(originalUrl) {
  try {
    return new URL(originalUrl || '/', 'http://service-auth.local').pathname;
  } catch {
    return '/';
  }
}

function ensureFreshTimestamp(timestamp, nowMs) {
  if (!/^\d+$/.test(timestamp)) {
    throw new ServiceAuthError('invalid_timestamp');
  }

  const timestampMs = Number(timestamp) * 1000;
  const toleranceSeconds = positiveIntegerEnv(
    'SERVICE_AUTH_TIMESTAMP_TOLERANCE_SECONDS',
    DEFAULT_TIMESTAMP_TOLERANCE_SECONDS
  );

  if (!Number.isFinite(timestampMs) || Math.abs(nowMs - timestampMs) > toleranceSeconds * 1000) {
    throw new ServiceAuthError('stale_timestamp');
  }
}

function ensureValidNonce(clientId, nonce, nowMs, nonceTtlSeconds) {
  if (!/^[A-Za-z0-9._:-]{16,128}$/.test(nonce)) {
    throw new ServiceAuthError('invalid_nonce');
  }

  cleanupNonceCache(nowMs);
  const cacheKey = nonceCacheKey(clientId, nonce);
  if (nonceCache.has(cacheKey)) {
    throw new ServiceAuthError('replayed_nonce');
  }
}

function rememberNonce(clientId, nonce, nowMs, nonceTtlSeconds) {
  const ttlSeconds =
    nonceTtlSeconds || positiveIntegerEnv('SERVICE_AUTH_NONCE_TTL_SECONDS', DEFAULT_NONCE_TTL_SECONDS);
  nonceCache.set(nonceCacheKey(clientId, nonce), nowMs + ttlSeconds * 1000);
}

function cleanupNonceCache(nowMs) {
  for (const [key, expiresAt] of nonceCache.entries()) {
    if (expiresAt <= nowMs) {
      nonceCache.delete(key);
    }
  }
}

function nonceCacheKey(clientId, nonce) {
  return `${clientId}:${nonce}`;
}

function ensureBodyHash(req, bodyHash) {
  if (!/^[a-f0-9]{64}$/i.test(bodyHash)) {
    throw new ServiceAuthError('invalid_body_hash');
  }

  if (sha256Hex(rawBody(req)) !== bodyHash.toLowerCase()) {
    throw new ServiceAuthError('body_hash_mismatch');
  }
}

function secureEqualHex(left, right) {
  if (!/^[a-f0-9]{64}$/i.test(right)) {
    return false;
  }

  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function positiveIntegerEnv(key, defaultValue) {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
}

function clearNonceCache() {
  nonceCache.clear();
}

module.exports = {
  HEADER_NAMES,
  ServiceAuthError,
  canonicalRequest,
  clearNonceCache,
  createServiceAuthHeaders,
  parseServiceClients,
  serviceAuthHeadersPresent,
  sha256Hex,
  verifyServiceRequest,
};
