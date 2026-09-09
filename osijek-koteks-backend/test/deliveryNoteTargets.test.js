const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_WORKER_CONFIG,
  enabledTargetNames,
  loadDeliveryNoteTargets,
  loadDeliveryNoteWorkerConfig,
} = require('../config/deliveryNoteTargets');

test('loads production and staging independently without exposing secret values in errors', () => {
  const targets = loadDeliveryNoteTargets({
    DELIVERY_NOTE_TARGET_PRODUCTION_ENABLED: 'true',
    DELIVERY_NOTE_TARGET_PRODUCTION_URL: 'https://production.example/events',
    DELIVERY_NOTE_TARGET_PRODUCTION_CLIENT_ID: 'old-backend-production',
    DELIVERY_NOTE_TARGET_PRODUCTION_SECRET: 'production-secret',
    DELIVERY_NOTE_TARGET_STAGING_ENABLED: 'false',
  });

  assert.deepEqual(enabledTargetNames(targets), ['PRODUCTION']);
  assert.equal(targets[0].clientId, 'old-backend-production');
  assert.equal(targets[1].url, null);

  assert.throws(
    () =>
      loadDeliveryNoteTargets({
        DELIVERY_NOTE_TARGET_STAGING_ENABLED: 'true',
        DELIVERY_NOTE_TARGET_STAGING_URL: 'not-a-url-containing-secret-value',
        DELIVERY_NOTE_TARGET_STAGING_CLIENT_ID: 'staging-client',
        DELIVERY_NOTE_TARGET_STAGING_SECRET: 'do-not-print-this',
      }),
    error => !error.message.includes('do-not-print-this') && /URL is invalid/.test(error.message)
  );
});

test('requires complete credentials only for enabled targets', () => {
  assert.doesNotThrow(() => loadDeliveryNoteTargets({}));
  assert.throws(
    () =>
      loadDeliveryNoteTargets({
        DELIVERY_NOTE_TARGET_PRODUCTION_ENABLED: 'yes',
        DELIVERY_NOTE_TARGET_PRODUCTION_URL: 'https://production.example/events',
      }),
    /missing: clientId, secret/
  );
});

test('loads bounded worker configuration without accepting invalid numbers', () => {
  assert.deepEqual(loadDeliveryNoteWorkerConfig({}), DEFAULT_WORKER_CONFIG);
  assert.equal(
    loadDeliveryNoteWorkerConfig({ DELIVERY_NOTE_WORKER_BATCH_SIZE: '10' }).batchSize,
    10
  );
  assert.throws(
    () => loadDeliveryNoteWorkerConfig({ DELIVERY_NOTE_WORKER_LEASE_MS: '0' }),
    /positive integer/
  );
  assert.throws(
    () =>
      loadDeliveryNoteWorkerConfig({
        DELIVERY_NOTE_WORKER_RETRY_BASE_MS: '10000',
        DELIVERY_NOTE_WORKER_RETRY_MAX_MS: '5000',
      }),
    /must not be less/
  );
});
