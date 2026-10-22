/**
 * Reads the "Roba:" block out of a vagarska potvrda (the scale ticket PDF that
 * rides along with every non-asfalt item).
 *
 * Suppliers run two different scale programs, so there are two layouts.
 *
 * VELIČKI KAMEN / MOLARIS — one left-aligned column, the label alone on its
 * line and bulleted values underneath it:
 *
 *   Roba:
 *   * V-K AGREGAT DOLOM. 0/32 (TAMPON)      <- naziv
 *   * Šifra: 05030180                       <- šifra
 *   Vozač: KURUZOVIĆ ANTONIO -
 *
 * KAMEN-PSUNJ — two columns, the value inline with its label, the šifra
 * labelled by section, and an internal line number before the naziv:
 *
 *   Roba: 16 K-P-KAMENE FRAKCIJE 0-8 MM     <- naziv, after the "16"
 *   * Šifra robe: 05040147                  <- šifra
 *   Vozač: ILIJA KARAMATIĆ
 *
 * Both are handled by anchoring on the "Roba" label and reading its own
 * column until that block's šifra. Anchoring matters: "* Šifra..." lines sit
 * under Dobavljač, Kupac, Prijevoznik and Odredište as well, and on the
 * two-column tickets a measurement from the right-hand column can share a
 * baseline with the block.
 *
 * A third supplier would likely bring a third layout, so this stays best
 * effort: an unfamiliar ticket yields nulls rather than an exception, and the
 * caller carries on without the material.
 */

// The legacy build is the one that runs under Node; the modern ESM build
// expects browser globals. Same library the web app parses otpremnice with.
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { getGoogleDriveDownloadUrl, fetchPdfBuffer } = require('./pdfDownload');

const EMPTY = { roba: null, robaSifra: null };

// Text runs whose baselines sit within this many points belong to one line.
const LINE_Y_TOL = 3;

// How far below the "Roba" label we are willing to look for its values.
const MAX_LINES_IN_BLOCK = 4;

// How far sideways from the "Roba" label a run may sit and still count as
// part of its column. Comfortably wider than the gap between runs of one
// line, far narrower than the ~250pt gap to the second column.
const COLUMN_TOL = 150;

// "Roba:" alone, or "Roba: <naziv>" — the capture is the inline naziv.
const ROBA_LINE = /^roba\s*:\s*(.*)$/i;

// "* Šifra: 05030180" and "* Šifra robe: 05040147" both close the block.
const SIFRA_LINE = /^\*\s*[ŠS]ifra\b[^:]*:?\s*(.*)$/i;

// "Vozač: ...", "Reg.Vozila: ...", "Prijevoznik:" — a short label followed by
// a colon starts a new field. Material names never contain one, so this is
// what tells a wrapped naziv apart from the end of the block.
const FIELD_LINE = /^[^:]{1,30}:/;

const BULLET = /^\*\s*/;

// KAMEN-PSUNJ writes an internal line number before the naziv ("16 K-P-KAMENE
// FRAKCIJE 0-8 MM"). Only a bare leading integer goes — a size that is part of
// the name ("0/32", "16/32 mm") has no space after its digits and is kept.
const LEADING_INDEX = /^\d{1,3}\s+(?=\D)/;

/**
 * Group positioned text runs into visual lines, ordered top of page downwards.
 */
function buildLines(items) {
  const rows = [];

  for (const item of items) {
    const row = rows.find(r => Math.abs(r.y - item.y) <= LINE_Y_TOL);
    if (row) {
      row.items.push(item);
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }

  return rows
    .sort((a, b) => b.y - a.y)
    .map(row =>
      row.items
        .sort((a, b) => a.x - b.x)
        .map(item => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(text => text.length > 0);
}

/**
 * Narrow positioned runs to the column the "Roba" label sits in, so a
 * measurement from a second column cannot be read as part of the block.
 * Returns the runs unchanged when the label cannot be located.
 */
function scopeToRobaColumn(items) {
  const label = items.find(item => ROBA_LINE.test(item.str));
  if (!label) return items;

  return items.filter(item => Math.abs(item.x - label.x) <= COLUMN_TOL);
}

/**
 * Pull naziv + šifra out of already-built lines. Exported for testing.
 */
function extractRobaFromLines(lines) {
  let labelIndex = -1;
  let inlineNaziv = '';

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(ROBA_LINE);
    if (match) {
      labelIndex = i;
      inlineNaziv = match[1].trim();
      break;
    }
  }

  if (labelIndex === -1) return { ...EMPTY };

  const nazivParts = inlineNaziv ? [inlineNaziv] : [];
  let sifra = null;

  const lastIndex = Math.min(lines.length - 1, labelIndex + MAX_LINES_IN_BLOCK);
  for (let i = labelIndex + 1; i <= lastIndex; i++) {
    const line = lines[i];

    // The block's own šifra closes it. Anything past this belongs to the
    // next section, and a second material would start its own naziv here.
    const sifraMatch = line.match(SIFRA_LINE);
    if (sifraMatch) {
      sifra = sifraMatch[1].trim() || null;
      break;
    }

    const text = line.replace(BULLET, '').trim();

    // Ran straight into the next field ("Vozač:", "Prijevoznik:") without
    // finding a šifra — the block is over.
    if (FIELD_LINE.test(text)) break;

    nazivParts.push(text);
  }

  const roba = nazivParts.join(' ').replace(/\s+/g, ' ').replace(LEADING_INDEX, '').trim();

  return {
    roba: roba.length > 0 ? roba : null,
    robaSifra: sifra,
  };
}

/**
 * Read the material straight out of PDF bytes.
 */
async function extractRobaFromPdfBuffer(buffer) {
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise;

  try {
    // The Roba block is always on the ticket's single first page.
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();

    const items = content.items
      .map(item => ({
        str: (item.str || '').trim(),
        x: item.transform[4],
        y: item.transform[5],
      }))
      .filter(item => item.str.length > 0);

    return extractRobaFromLines(buildLines(scopeToRobaColumn(items)));
  } finally {
    await pdf.destroy();
  }
}

/**
 * Download an item's PDF and read the material off it.
 *
 * Returns nulls for anything we cannot read. Network and parse failures are
 * raised to the caller, which decides whether a missing material is fatal
 * (it never is — see the item create route and scripts/backfill-roba.js).
 */
async function parseRobaFromPdfUrl(pdfUrl, { timeout = 15000 } = {}) {
  if (!pdfUrl || !/^https?:/i.test(pdfUrl)) return { ...EMPTY };

  const buffer = await fetchPdfBuffer(getGoogleDriveDownloadUrl(pdfUrl), { timeout });
  return extractRobaFromPdfBuffer(buffer);
}

module.exports = {
  parseRobaFromPdfUrl,
  extractRobaFromPdfBuffer,
  extractRobaFromLines,
  scopeToRobaColumn,
  buildLines,
};
