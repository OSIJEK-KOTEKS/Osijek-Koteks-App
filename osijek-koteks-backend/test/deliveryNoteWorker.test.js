const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DELIVERY_NOTE_EVENT_PATH,
  createDeliveryNoteWorker,
  retryDelayMs,
  safeDeliveryError,
} = require('../services/deliveryNoteWorker');

const NOW = new Date('2026-08-26T10:00:00.000Z');
const CONFIG = {
  pollIntervalMs: 60_000,
  batchSize: 25,
  retryBaseMs: 5000,
  retryMaxMs: 15 * 60 * 1000,
  leaseMs: 30_000,
  httpTimeoutMs: 15_000,
};
const TARGETS = [
  {
    name: 'PRODUCTION',
    enabled: true,
    url: 'https://production.example',
    clientId: 'production-client',
    secret: 'production-secret',
  },
  {
    name: 'STAGING',
    enabled: true,
    url: 'https://staging.example',
    clientId: 'staging-client',
    secret: 'staging-secret',
  },
];

function event() {
  return {
    eventId: '9d7ba94e-ce87-4ba4-b6b8-1225070c6c6d',
    eventType: 'UPSERT',
    sourceId: '68ac3ff2b7f6b982644a77a1',
  };
}

test('delivers production and staging independently and retries only the failure', async () => {
  const pending = new Map([
    ['PRODUCTION', [{ outboxId: 'outbox-1', event: event(), attemptCount: 0 }]],
    ['STAGING', [{ outboxId: 'outbox-1', event: event(), attemptCount: 0 }]],
  ]);
  const delivered = [];
  const failed = [];
  const requests = [];
  const repository = {
    async claimNext({ target, leaseToken }) {
      const job = pending.get(target).shift();
      return job ? { ...job, target, leaseToken } : null;
    },
    async markDelivered(result) {
      delivered.push(result);
    },
    async markFailed(result) {
      failed.push(result);
    },
  };
  const worker = createDeliveryNoteWorker({
    targets: TARGETS,
    config: CONFIG,
    repository,
    now: () => NOW,
    logger: { warn() {}, error() {} },
    clientFactory: ({ clientId }) => ({
      async requestJson(path, options) {
        requests.push({ clientId, path, options });
        if (clientId === 'production-client') {
          const error = new Error('response contained sensitive details');
          error.response = { status: 503, data: { secret: 'must-not-be-stored' } };
          throw error;
        }
      },
    }),
  });

  assert.equal(await worker.runOnce(), 2);

  assert.equal(requests[0].path, DELIVERY_NOTE_EVENT_PATH);
  assert.equal(requests[0].options.method, 'POST');
  assert.deepEqual(requests[0].options.body, event());
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].target, 'STAGING');
  assert.equal(failed.length, 1);
  assert.equal(failed[0].target, 'PRODUCTION');
  assert.equal(failed[0].lastError, 'HTTP 503');
  assert.equal(failed[0].nextAttemptAt.toISOString(), '2026-08-26T10:00:05.000Z');
  assert.doesNotMatch(failed[0].lastError, /sensitive|secret/);
});

test('uses bounded exponential retry delays', () => {
  assert.equal(retryDelayMs(1, CONFIG), 5000);
  assert.equal(retryDelayMs(2, CONFIG), 10_000);
  assert.equal(retryDelayMs(9, CONFIG), 15 * 60 * 1000);
  assert.equal(retryDelayMs(100, CONFIG), 15 * 60 * 1000);
});

test('sanitizes errors without retaining HTTP bodies or messages', () => {
  assert.equal(safeDeliveryError({ response: { status: 400, data: 'private body' } }), 'HTTP 400');
  assert.equal(safeDeliveryError({ code: 'ECONNRESET', message: 'private URL' }), 'ECONNRESET');
});

test('clean shutdown waits for an in-flight delivery', async () => {
  let releaseRequest;
  let claimed = false;
  let stopFinished = false;
  const repository = {
    async claimNext({ target, leaseToken }) {
      if (claimed) return null;
      claimed = true;
      return { outboxId: 'outbox-1', event: event(), attemptCount: 0, target, leaseToken };
    },
    async markDelivered() {},
    async markFailed() {},
  };
  const worker = createDeliveryNoteWorker({
    targets: [TARGETS[0]],
    config: CONFIG,
    repository,
    logger: { warn() {}, error() {} },
    clientFactory: () => ({
      requestJson: () => new Promise(resolve => (releaseRequest = resolve)),
    }),
  });

  worker.start();
  await new Promise(resolve => setImmediate(resolve));
  const stopping = worker.stop().then(() => {
    stopFinished = true;
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(stopFinished, false);

  releaseRequest({ outcome: 'APPLIED' });
  await stopping;
  assert.equal(stopFinished, true);
});
