const TARGET_NAMES = Object.freeze(['PRODUCTION', 'STAGING']);

function enabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
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

module.exports = {
  TARGET_NAMES,
  enabledTargetNames,
  loadDeliveryNoteTargets,
};
