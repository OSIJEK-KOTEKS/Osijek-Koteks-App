const { randomUUID } = require('node:crypto');

const {
  loadDeliveryNoteTargets,
  loadDeliveryNoteWorkerConfig,
} = require('../config/deliveryNoteTargets');
const { createServiceJsonClient } = require('../utils/serviceJsonClient');
const { createDeliveryNoteOutboxRepository } = require('./deliveryNoteOutboxRepository');

const DELIVERY_NOTE_EVENT_PATH = '/api/v1/integrations/osijek-koteks/delivery-note-events';

function retryDelayMs(attemptNumber, { retryBaseMs, retryMaxMs }) {
  const exponent = Math.max(0, Math.min(attemptNumber - 1, 30));
  return Math.min(retryMaxMs, retryBaseMs * 2 ** exponent);
}

function safeDeliveryError(error) {
  const status = error?.response?.status;
  if (Number.isInteger(status)) return `HTTP ${status}`;
  if (typeof error?.code === 'string' && error.code.trim()) return error.code.trim().slice(0, 200);
  if (typeof error?.name === 'string' && error.name.trim()) return error.name.trim().slice(0, 200);
  return 'delivery_failed';
}

function createDeliveryNoteWorker({
  targets = loadDeliveryNoteTargets(),
  config = loadDeliveryNoteWorkerConfig(),
  repository = createDeliveryNoteOutboxRepository(),
  clientFactory = createServiceJsonClient,
  now = () => new Date(),
  logger = console,
} = {}) {
  const enabledTargets = targets.filter(target => target.enabled);
  const clients = new Map(
    enabledTargets.map(target => [
      target.name,
      clientFactory({
        baseUrl: target.url,
        clientId: target.clientId,
        secret: target.secret,
      }),
    ])
  );
  let stopping = false;
  let loopPromise = null;
  const pollWakeups = new Set();

  async function deliverOne(target) {
    const claimTime = now();
    const job = await repository.claimNext({
      target: target.name,
      now: claimTime,
      leaseUntil: new Date(claimTime.getTime() + config.leaseMs),
      leaseToken: randomUUID(),
    });
    if (!job) return false;

    try {
      await clients.get(target.name).requestJson(DELIVERY_NOTE_EVENT_PATH, {
        method: 'POST',
        body: job.event,
        timeout: config.httpTimeoutMs,
      });
      await repository.markDelivered({
        ...job,
        deliveredAt: now(),
      });
    } catch (error) {
      const attemptNumber = job.attemptCount + 1;
      const failedAt = now();
      const lastError = safeDeliveryError(error);
      await repository.markFailed({
        ...job,
        lastError,
        nextAttemptAt: new Date(failedAt.getTime() + retryDelayMs(attemptNumber, config)),
      });
      logger.warn('Delivery-note event delivery failed', {
        target: target.name,
        error: lastError,
        attemptCount: attemptNumber,
      });
    }
    return true;
  }

  async function runTargetBatch(target) {
    let processed = 0;
    for (let index = 0; index < config.batchSize && !stopping; index += 1) {
      const claimed = await deliverOne(target);
      if (!claimed) break;
      processed += 1;
    }
    return processed;
  }

  async function runOnce() {
    const processed = await Promise.all(enabledTargets.map(runTargetBatch));
    return processed.reduce((total, count) => total + count, 0);
  }

  function waitForNextPoll() {
    return new Promise(resolve => {
      const wake = () => {
        clearTimeout(timer);
        pollWakeups.delete(wake);
        resolve();
      };
      const timer = setTimeout(wake, config.pollIntervalMs);
      pollWakeups.add(wake);
    });
  }

  async function runLoop(target) {
    while (!stopping) {
      try {
        await runTargetBatch(target);
      } catch (error) {
        logger.error('Delivery-note worker cycle failed', {
          target: target.name,
          error: safeDeliveryError(error),
        });
      }
      if (!stopping) await waitForNextPoll();
    }
  }

  function start() {
    if (loopPromise) return loopPromise;
    stopping = false;
    loopPromise = Promise.all(enabledTargets.map(runLoop));
    return loopPromise;
  }

  async function stop() {
    stopping = true;
    for (const wake of pollWakeups) wake();
    await loopPromise;
    loopPromise = null;
  }

  return { runOnce, start, stop };
}

module.exports = {
  DELIVERY_NOTE_EVENT_PATH,
  createDeliveryNoteWorker,
  retryDelayMs,
  safeDeliveryError,
};
