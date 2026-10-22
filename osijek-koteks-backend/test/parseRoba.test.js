const assert = require('node:assert/strict');
const test = require('node:test');

const { extractRobaFromLines, scopeToRobaColumn, buildLines } = require('../utils/parseRoba');

// The lines a real vagarska potvrda produces, in page order. Note the "* Šifra:"
// lines under Dobavljač and Kupac that sit *above* the Roba block — the parser
// must not reach back and grab one of those.
const TICKET_LINES = [
  'VELIČKI KAMEN',
  'Industrijska ulica 6 * 34330 Velika',
  'VAGARSKA POTVRDA-OTPREMA BR. 83812/2026',
  'Dobavljač:',
  '* VELIČKI KAMEN d. o. o.',
  '* Šifra: 11339',
  '* Mjesto:',
  'Kupac:',
  '* OSIJEK-KOTEKS d.d.',
  '* Šifra: 1',
  'Roba:',
  '* V-K AGREGAT DOLOM. 0/32 (TAMPON)',
  '* Šifra: 05030180',
  'Vozač: KURUZOVIĆ ANTONIO -',
  'Reg.Vozila: ZG 2227 KK / SB 636 JO',
  'Prijevoznik:',
  '* IKAR d.o.o.',
  '* Šifra:',
  'Odredište:',
  '* OBILAZNICA GRADA VUKOVARA #24010#',
  '* Šifra: 04741',
];

test('reads naziv and šifra from a real ticket', () => {
  assert.deepEqual(extractRobaFromLines(TICKET_LINES), {
    roba: 'V-K AGREGAT DOLOM. 0/32 (TAMPON)',
    robaSifra: '05030180',
  });
});

test('reads a different material from the same template', () => {
  const lines = TICKET_LINES.map(line =>
    line === '* V-K AGREGAT DOLOM. 0/32 (TAMPON)'
      ? '* V-K AGREGAT DOLOM. 16/32 mm'
      : line === '* Šifra: 05030180'
      ? '* Šifra: 05030029'
      : line
  );

  assert.deepEqual(extractRobaFromLines(lines), {
    roba: 'V-K AGREGAT DOLOM. 16/32 mm',
    robaSifra: '05030029',
  });
});

test('anchors on Roba and ignores the šifra of earlier sections', () => {
  const { robaSifra } = extractRobaFromLines(TICKET_LINES);
  assert.notEqual(robaSifra, '11339'); // Dobavljač
  assert.notEqual(robaSifra, '1'); // Kupac
  assert.notEqual(robaSifra, '04741'); // Odredište
});

test('joins a naziv that wraps onto a second line', () => {
  const lines = ['Roba:', '* V-K AGREGAT DOLOM. 0/32', '(TAMPON) PRANI', '* Šifra: 05030180'];

  assert.deepEqual(extractRobaFromLines(lines), {
    roba: 'V-K AGREGAT DOLOM. 0/32 (TAMPON) PRANI',
    robaSifra: '05030180',
  });
});

test('returns the naziv even when the block carries no šifra', () => {
  const lines = ['Roba:', '* V-K AGREGAT DOLOM. 0/32 (TAMPON)', 'Vozač: NETKO -'];

  assert.deepEqual(extractRobaFromLines(lines), {
    roba: 'V-K AGREGAT DOLOM. 0/32 (TAMPON)',
    robaSifra: null,
  });
});

test('handles an empty šifra value', () => {
  const lines = ['Roba:', '* V-K AGREGAT DOLOM. 0/32 (TAMPON)', '* Šifra:'];

  assert.deepEqual(extractRobaFromLines(lines), {
    roba: 'V-K AGREGAT DOLOM. 0/32 (TAMPON)',
    robaSifra: null,
  });
});

test('returns nulls when there is no Roba block', () => {
  const lines = ['Dobavljač:', '* VELIČKI KAMEN d. o. o.', '* Šifra: 11339'];

  assert.deepEqual(extractRobaFromLines(lines), { roba: null, robaSifra: null });
});

test('returns nulls when the Roba label is the last thing on the page', () => {
  assert.deepEqual(extractRobaFromLines(['Kupac:', '* OSIJEK-KOTEKS d.d.', 'Roba:']), {
    roba: null,
    robaSifra: null,
  });
});

test('does not mistake a label that merely starts with "Roba" for the block', () => {
  const lines = ['Robapromet d.o.o.:', '* NEŠTO DRUGO', '* Šifra: 999'];

  assert.deepEqual(extractRobaFromLines(lines), { roba: null, robaSifra: null });
});

test('buildLines groups text runs by baseline and orders them down the page', () => {
  // Deliberately out of order, with two runs sharing a baseline.
  const items = [
    { str: 'Šifra: 05030180', x: 60, y: 473.8 },
    { str: 'Roba:', x: 23.6, y: 499.6 },
    { str: '*', x: 23.2, y: 473.8 },
    { str: '* V-K AGREGAT DOLOM. 0/32 (TAMPON)', x: 23.3, y: 487.3 },
  ];

  assert.deepEqual(buildLines(items), [
    'Roba:',
    '* V-K AGREGAT DOLOM. 0/32 (TAMPON)',
    '* Šifra: 05030180',
  ]);
});

test('buildLines tolerates small baseline jitter within one line', () => {
  const items = [
    { str: 'Roba:', x: 23.6, y: 499.6 },
    { str: 'DOLOM.', x: 80, y: 487.1 },
    { str: '* V-K AGREGAT', x: 23.3, y: 487.3 },
  ];

  assert.deepEqual(buildLines(items), ['Roba:', '* V-K AGREGAT DOLOM.']);
});

// --- KAMEN-PSUNJ template: two columns, naziv inline with the label, the
// --- šifra labelled by section, and an internal line number before the naziv.

const PSUNJ_LINES = [
  'KAMEN PSUNJ',
  'VAGARSKA POTVRDA-OTPREMA BR. 34041/2026',
  'Dobavljač: KAMEN-PSUNJ D.O.O',
  '* Šifra dobavljača: 3702',
  'Kupac: OSIJEK-KOTEKS d.d.',
  '* Šifra kupca: 4862',
  'Roba: 16 K-P-KAMENE FRAKCIJE 0-8 MM',
  '* Šifra robe: 05040147',
  'Vozač: ILIJA KARAMATIĆ',
  'Reg.Vozila: NG 695 DE',
  'Prijevoznik: KARAMATIĆ TRANSPORTI D.O.O.',
  '* Šifra prijevoznika:',
  'Odredište: NOVSKA #25015#',
  '* Šifra odredišta 08',
];

test('reads a naziv written inline with the Roba label', () => {
  assert.deepEqual(extractRobaFromLines(PSUNJ_LINES), {
    roba: 'K-P-KAMENE FRAKCIJE 0-8 MM',
    robaSifra: '05040147',
  });
});

test('takes the šifra of the Roba block, not of the other sections', () => {
  const { robaSifra } = extractRobaFromLines(PSUNJ_LINES);
  assert.equal(robaSifra, '05040147');
  assert.notEqual(robaSifra, '3702'); // Šifra dobavljača
  assert.notEqual(robaSifra, '4862'); // Šifra kupca
});

test('strips a bare leading line number from the naziv', () => {
  const { roba } = extractRobaFromLines(['Roba: 7 TUCANIK 0-63', '* Šifra robe: 5090004']);
  assert.equal(roba, 'TUCANIK 0-63');
});

test('keeps a leading size that belongs to the naziv', () => {
  // "16/32" and "0/32" are the material, not a line number — no space splits
  // the digits from the rest, so they must survive.
  assert.equal(
    extractRobaFromLines(['Roba:', '* 16/32 mm V-K AGREGAT', '* Šifra: 1']).roba,
    '16/32 mm V-K AGREGAT'
  );
  assert.equal(
    extractRobaFromLines(['Roba: 0/32 (TAMPON)', '* Šifra robe: 2']).roba,
    '0/32 (TAMPON)'
  );
});

test('scopeToRobaColumn drops runs from the second column', () => {
  const items = [
    { str: 'Roba: 16 K-P-KAMENE FRAKCIJE 0-8 MM', x: 74.0, y: 442.2 },
    { str: '* Šifra robe: 05040147', x: 80.9, y: 426.1 },
    // Right-hand column: a measurement sharing the block's baselines.
    { str: 'BRUTO .......... 55700 kg', x: 358.4, y: 442.2 },
    { str: 'Datum i Vrijeme: 21.10.2026. 12:48', x: 324.2, y: 426.1 },
  ];

  assert.deepEqual(
    scopeToRobaColumn(items).map(item => item.str),
    ['Roba: 16 K-P-KAMENE FRAKCIJE 0-8 MM', '* Šifra robe: 05040147']
  );
});

test('a second column cannot leak into the naziv', () => {
  const items = [
    { str: 'Roba:', x: 23.6, y: 499.6 },
    { str: '* TUCANIK 0-63', x: 23.3, y: 487.3 },
    { str: '* Šifra: 5090004', x: 23.2, y: 473.8 },
    { str: 'Broj mjerenja: 34041', x: 324.6, y: 487.3 },
  ];

  assert.deepEqual(extractRobaFromLines(buildLines(scopeToRobaColumn(items))), {
    roba: 'TUCANIK 0-63',
    robaSifra: '5090004',
  });
});

test('scopeToRobaColumn passes everything through when there is no Roba label', () => {
  const items = [{ str: 'Dobavljač: KAMEN-PSUNJ D.O.O', x: 74, y: 672 }];
  assert.deepEqual(scopeToRobaColumn(items), items);
});
