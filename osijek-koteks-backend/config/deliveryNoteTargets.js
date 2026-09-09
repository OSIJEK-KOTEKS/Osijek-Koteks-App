const TARGET_NAMES = Object.freeze(['PRODUCTION', 'STAGING']);
const DEFAULT_WORKER_CONFIG = Object.freeze({
  pollIntervalMs: 5000,
  batchSize: 25,
  retryBaseMs: 5000,
  retryMaxMs: 15 * 60 * 1000,
  leaseMs: 30 * 1000,
  httpTimeoutMs: 15 * 1000,
});

function enabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(
    String(value || '')
      .trim()
      .toLowerCase()
  );
}

function loadDeliveryNoteTargets(env = process.env) {
  return TARGET_NAMES.map(name => {
    const prefix = `DELIVERY_NOTE_TARGET_${name}`;
    const target = {
      name,
      enabled: enabled(env[`${prefix}_ENABLED`]),
      url: env[`${prefix}_URL`]?.trim() || null,
      clientId: env[`${prefix}_CLIENT_ID`]?.trim() || null,
      secret: env[`${prefix}_SECRET`] || null,
    };

    if (target.enabled) {
      const missing = ['url', 'clientId', 'secret'].filter(field => !target[field]);
      if (missing.length > 0) {
        throw new Error(
          `${name} delivery-note target is enabled but missing: ${missing.join(', ')}`
        );
      }

      let parsedUrl;
      try {
        parsedUrl = new URL(target.url);
      } catch {
        throw new Error(`${name} delivery-note target URL is invalid`);
      }
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error(`${name} delivery-note target URL must use HTTP or HTTPS`);
      }
    }

    return Object.freeze(target);
  });
}

function enabledTargetNames(targets) {
  return targets.filter(target => target.enabled).map(target => target.name);
}

function positiveInteger(env, name, defaultValue) {
  const rawValue = env[name];
  if (rawValue === undefined || rawValue === '') return defaultValue;

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function loadDeliveryNoteWorkerConfig(env = process.env) {
  const config = {
    pollIntervalMs: positiveInteger(
      env,
      'DELIVERY_NOTE_WORKER_POLL_INTERVAL_MS',
      DEFAULT_WORKER_CONFIG.pollIntervalMs
    ),
    batchSize: positiveInteger(
      env,
      'DELIVERY_NOTE_WORKER_BATCH_SIZE',
      DEFAULT_WORKER_CONFIG.batchSize
    ),
    retryBaseMs: positiveInteger(
      env,
      'DELIVERY_NOTE_WORKER_RETRY_BASE_MS',
      DEFAULT_WORKER_CONFIG.retryBaseMs
    ),
    retryMaxMs: positiveInteger(
      env,
      'DELIVERY_NOTE_WORKER_RETRY_MAX_MS',
      DEFAULT_WORKER_CONFIG.retryMaxMs
    ),
    leaseMs: positiveInteger(env, 'DELIVERY_NOTE_WORKER_LEASE_MS', DEFAULT_WORKER_CONFIG.leaseMs),
    httpTimeoutMs: positiveInteger(
      env,
      'DELIVERY_NOTE_WORKER_HTTP_TIMEOUT_MS',
      DEFAULT_WORKER_CONFIG.httpTimeoutMs
    ),
  };

  if (config.retryMaxMs < config.retryBaseMs) {
    throw new Error('DELIVERY_NOTE_WORKER_RETRY_MAX_MS must not be less than retry base');
  }
  return Object.freeze(config);
}

module.exports = {
  DEFAULT_WORKER_CONFIG,
  TARGET_NAMES,
  enabledTargetNames,
  loadDeliveryNoteTargets,
  loadDeliveryNoteWorkerConfig,
};
