import { PDFDocument, StandardFonts } from 'pdf-lib';
import { Bill, Item } from '../types';
import { getImageUrl } from './api';

const PAGE_WIDTH = 595.28; // A4 width in points
const PAGE_HEIGHT = 841.89; // A4 height in points
const MARGIN = 40;

const toAscii = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, '');

const statusLabel = (status: Item['approvalStatus']) => {
  if (status === 'odobreno') return 'Odobreno';
  if (status === 'odbijen') return 'Odbijen';
  return 'Na cekanju';
};

const safeText = (value: string | number | undefined | null) =>
  value !== undefined && value !== null ? toAscii(String(value)) : 'N/A';

export const buildBillPrintPdf = async (bill: Bill, token: string) => {
  if (!token) {
    throw new Error('Missing auth token for fetching PDFs.');
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = null as ReturnType<PDFDocument['addPage']> | null;
  let y = PAGE_HEIGHT - MARGIN;

  const addPage = () => {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    return page;
  };

  const drawText = (text: string, x: number, size = 12, bold = false) => {
    const usedFont = bold ? boldFont : font;
    if (!page) addPage();
    // Type guard to satisfy TS
    const currentPage = page || addPage();
    currentPage.drawText(toAscii(text), { x, y, size, font: usedFont });
  };

  const nextLine = (gap = 16) => {
    y -= gap;
    if (!page || y < MARGIN + 40) {
      addPage();
    }
  };

  const columns = [
    { key: 'title', label: 'Dokument', width: 230 },
    { key: 'code', label: 'RN', width: 90 },
    { key: 'status', label: 'Status', width: 110 },
    { key: 'prijevoznik', label: 'Prijevoznik', width: 90 },
  ] as const;

  // Add original attachment before the table so it appears first
  if (bill.attachment?.url) {
    const attachmentUrl = getImageUrl(bill.attachment.url);
    const response = await fetch(attachmentUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Neuspjesno preuzimanje PDF priloga.');
    }

    const attachmentBytes = await response.arrayBuffer();
    const attachmentDoc = await PDFDocument.load(attachmentBytes);
    const pages = await pdfDoc.copyPages(attachmentDoc, attachmentDoc.getPageIndices());
    pages.forEach(p => pdfDoc.addPage(p));

    // Start a fresh page for the table after the attachment
    page = addPage();
    y = PAGE_HEIGHT - MARGIN;
  }

  const drawTableHeader = () => {
    if (!page) addPage();
    let x = MARGIN;
    columns.forEach(col => {
      drawText(col.label, x, 11, true);
      x += col.width;
    });
    nextLine(14);
  };

  drawText('Stavke', MARGIN, 14, true);
  nextLine(18);
  drawTableHeader();

  bill.items.forEach(item => {
    if (y < MARGIN + 20) {
      addPage();
      drawTableHeader();
    }

    let x = MARGIN;
    const cells = [
      safeText(item.title),
      safeText(item.code),
      statusLabel(item.approvalStatus),
      safeText(item.prijevoznik),
    ];

    cells.forEach((text, idx) => {
      const col = columns[idx];
      drawText(toAscii(text), x, 10, false);
      x += col.width;
    });

    nextLine(14);
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

export default buildBillPrintPdf;
