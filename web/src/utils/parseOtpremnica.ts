// Parses an "OTPREMNICA" (asphalt delivery note) PDF in the browser and
// extracts the fields needed to pre-fill the Asfalt item form.
//
// The PDF is a fixed template laid out as two left-column label/value pairs
// (label at x~30, value at x~158) plus an asphalt-spec table on the right
// (x>=319). We locate each label by text, then read the value sitting on the
// same horizontal line, just to the right of it.

// Legacy build keeps compatibility with the browsers react-scripts targets.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf');

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface OtpremnicaData {
  title: string; // <- Broj otpremnice
  code: string; // <- Lokacija isporuke (digits only, no letters)
  registracija: string; // <- Reg. oznaka vozila
  neto?: number; // <- Neto masa
  prijevoznik: string; // <- Prijevoznik
}

interface TextItem {
  str: string;
  x: number;
  y: number;
}

export async function parseOtpremnicaPdf(file: File): Promise<OtpremnicaData> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();

  const items: TextItem[] = content.items
    .map((it: any) => ({
      str: (it.str || '').trim(),
      x: it.transform[4],
      y: it.transform[5],
    }))
    .filter((it: TextItem) => it.str.length > 0);

  // Reads the value(s) on the same line as `label`, within the left column.
  const valueFor = (label: string): string => {
    const lab = items.find(it => it.str.toLowerCase().startsWith(label.toLowerCase()));
    if (!lab) return '';

    const Y_TOL = 11; // baseline tolerance in PDF points
    return items
      .filter(
        it =>
          it !== lab &&
          it.x > lab.x + 30 && // to the right of the label
          it.x < lab.x + 220 && // but still in the left column (table starts ~x319)
          Math.abs(it.y - lab.y) <= Y_TOL
      )
      .sort((a, b) => a.x - b.x)
      .map(it => it.str)
      .join(' ')
      .trim();
  };

  const brojOtpremnice = valueFor('Broj otpremnice');
  const lokacijaIsporuke = valueFor('Lokacija isporuke');
  const regOznaka = valueFor('Reg. oznaka vozila');
  const netoMasa = valueFor('Neto masa');
  const prijevoznik = valueFor('Prijevoznik');

  // RN: keep only the number from "25052-OSATINA VIŠKOVCI" -> "25052"
  const code = (lokacijaIsporuke.match(/\d+/) || [''])[0];

  // Neto: first numeric token from "32700 kg" -> 32700
  const netoToken = (netoMasa.match(/[\d.,]+/) || [''])[0]
    .replace(/\./g, '') // thousands separator
    .replace(',', '.'); // decimal comma
  const netoNum = parseFloat(netoToken);

  return {
    title: brojOtpremnice,
    code,
    registracija: regOznaka,
    neto: isNaN(netoNum) ? undefined : netoNum,
    prijevoznik,
  };
}
