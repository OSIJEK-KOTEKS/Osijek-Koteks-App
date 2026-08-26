const LEGACY_CREATOR_EMAIL_TO_ORIGIN_CODE = Object.freeze({
  'velicki.vaga@velicki-kamen.hr': 'VELIČKI KAMEN VELIČANKA',
  'vetovo.vaga@velicki-kamen.hr': 'VELIČKI KAMEN VETOVO',
  'vaga.fukinac@kamen-psunj.hr': 'KAMEN - PSUNJ',
  'vaga.molaris@osijek-koteks.hr': 'MOLARIS',
});

function normalizeQuarryCode(value) {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toUpperCase();
  return normalized || null;
}

function resolveCreatorQuarryCode(creator) {
  return normalizeQuarryCode(creator?.quarryCode);
}

function resolveCreatorOriginLocationCode(creator) {
  const normalizedEmail =
    typeof creator?.email === 'string' ? creator.email.trim().toLowerCase() : null;

  return (
    LEGACY_CREATOR_EMAIL_TO_ORIGIN_CODE[normalizedEmail] ||
    resolveCreatorQuarryCode(creator)
  );
}

module.exports = {
  LEGACY_CREATOR_EMAIL_TO_ORIGIN_CODE,
  normalizeQuarryCode,
  resolveCreatorOriginLocationCode,
  resolveCreatorQuarryCode,
};
