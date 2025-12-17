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

const parseDateValue = (value: any): Date | null => {
  if (!value) return null;
  const parsed = value && typeof value === 'object' && '$date' in value ? (value as any).$date : value;
  const date = new Date(parsed);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateOnly = (value: any) => {
  const date = parseDateValue(value);
  if (!date) return safeText(value);
  return date.toLocaleDateString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Zagreb',
  });
};

const formatDateAndTime = (creationDate: any, creationTime?: string) => {
  const date = parseDateValue(creationDate);
  if (!date && !creationTime) return 'N/A';
  const datePart = date
    ? date.toLocaleDateString('hr-HR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Europe/Zagreb',
      })
    : safeText(creationDate);
  return creationTime ? `${datePart} ${creationTime}` : datePart;
};

const formatTimeOnly = (dateValue: any, explicitTime?: string) => {
  if (explicitTime) return safeText(explicitTime);
  const date = parseDateValue(dateValue);
  if (!date) return 'N/A';
  return date.toLocaleTimeString('hr-HR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zagreb',
  });
};

const formatApprovalDate = (approvalDate: any) => {
  const date = parseDateValue(approvalDate);
  if (!date) return safeText(approvalDate);
  return date.toLocaleString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zagreb',
  });
};

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
    { key: 'title', label: 'Dokument', width: 210 },
    { key: 'code', label: 'RN', width: 90 },
    { key: 'status', label: 'Status', width: 90 },
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

export const buildBillItemsDetailPdf = async (bill: Bill) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const nextLine = (gap = 16) => {
    y -= gap;
    if (y < MARGIN + 60) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const drawLabelValue = (label: string, value: string) => {
    page.drawText(toAscii(label), { x: MARGIN, y, size: 11, font: boldFont });
    page.drawText(toAscii(value), { x: MARGIN + 140, y, size: 11, font });
    nextLine(14);
  };

  page.drawText(toAscii('Stavke računa'), { x: MARGIN, y, size: 16, font: boldFont });
  nextLine(22);
  page.drawText(toAscii(`Račun: ${safeText(bill.title)}`), { x: MARGIN, y, size: 12, font });
  nextLine(18);

  bill.items.forEach((item, index) => {
    page.drawText(`#${index + 1} ${safeText(item.title)}`, {
      x: MARGIN,
      y,
      size: 13,
      font: boldFont,
    });
    nextLine(18);
    drawLabelValue('RN', safeText(item.code));
    drawLabelValue('Registracija', safeText(item.registracija));
    const weightValue =
      typeof item.tezina === 'number'
        ? `${(item.tezina / 1000).toFixed(3)} t`
        : typeof item.neto === 'number'
        ? `${item.neto} kg`
        : 'N/A';
    drawLabelValue('Težina', weightValue);
    drawLabelValue('Datum kreiranja', formatDateAndTime(item.creationDate, item.creationTime));
    drawLabelValue('Vrijeme kreiranja', formatTimeOnly(item.creationDate, item.creationTime));
    drawLabelValue('Status', statusLabel(item.approvalStatus));
    const approvedByName = item.approvedBy
      ? `${safeText(item.approvedBy.firstName)} ${safeText(item.approvedBy.lastName)}`
      : 'N/A';
    drawLabelValue('Odobrio', approvedByName);
    drawLabelValue('Datum odobrenja', formatApprovalDate(item.approvalDate));
    nextLine(14);
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

export default buildBillPrintPdf;
