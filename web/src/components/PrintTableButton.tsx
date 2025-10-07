import React, {useCallback, useRef, useState} from 'react';
import ReactDOMServer from 'react-dom/server';
import styled from 'styled-components';
import {Item} from '../types';
import {getFormattedCode} from '../utils/codeMapping';

const PrintButton = styled.button`
  width: 100%;
  padding: ${({theme}) => theme.spacing.medium};
  background-color: ${({theme}) => theme.colors.primary};
  color: ${({theme}) => theme.colors.white};
  border: none;
  border-radius: ${({theme}) => theme.borderRadius};
  font-size: 1rem;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    background-color: ${({theme}) => theme.colors.primaryDark};
  }

  &:disabled {
    background-color: ${({theme}) => theme.colors.disabled};
    cursor: not-allowed;
  }
`;

const getDisplayNameForUser = (item: Item): string => {
  if (!item.createdBy) return 'Nepoznato';

  if (
    item.createdBy.email === 'vetovo.vaga@velicki-kamen.hr' ||
    item.createdBy.email === 'velicki.vaga@velicki-kamen.hr'
  ) {
    return 'VELIČKI KAMEN d.o.o.';
  }

  if (item.createdBy.email === 'vaga.fukinac@kamen-psunj.hr') {
    return 'KAMEN - PSUNJ d.o.o.';
  }

  if (item.createdBy.email === 'vaga.molaris@osijek-koteks.hr') {
    return 'MOLARIS d.o.o.';
  }

  return `${item.createdBy.firstName} ${item.createdBy.lastName}`;
};

// FIXED: Date formatting functions for consistent DD/MM/YYYY display
const safeParseDate = (dateInput: any): string => {
  if (!dateInput) return 'N/A';

  let date: Date;

  try {
    // Handle MongoDB date objects with $date property
    if (typeof dateInput === 'object' && dateInput.$date) {
      date = new Date(dateInput.$date);
    }
    // Handle Date objects
    else if (dateInput instanceof Date) {
      date = dateInput;
    }
    // Handle string inputs
    else if (typeof dateInput === 'string') {
      // If it's already a Croatian formatted date (DD.MM.YYYY or DD.M.YYYY or D.MM.YYYY), return as is
      if (dateInput.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
        return dateInput;
      }

      // For ISO strings or other date formats, parse them
      date = new Date(dateInput);
    }
    // Handle any other type by converting to string and trying to parse
    else {
      date = new Date(String(dateInput));
    }

    // Check if parsing was successful
    if (isNaN(date.getTime())) {
      console.warn('Failed to parse date:', dateInput);
      return String(dateInput); // Return as string for debugging
    }

    // Always format to Croatian format consistently
    return date.toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Zagreb',
    });
  } catch (error) {
    console.error('Error parsing date:', dateInput, error);
    return String(dateInput);
  }
};

const formatDateAndTime = (
  creationDate: any,
  creationTime?: string,
): string => {
  const formattedDate = safeParseDate(creationDate);

  if (!formattedDate || formattedDate === 'N/A') {
    console.warn('formatDateAndTime - failed to format date:', creationDate);
    const fallback = String(creationDate);
    return creationTime ? `${fallback} ${creationTime}` : fallback;
  }

  return creationTime ? `${formattedDate} ${creationTime}` : formattedDate;
};

const formatApprovalDate = (approvalDate: any): string => {
  if (!approvalDate) return '-';

  let date: Date;

  try {
    if (typeof approvalDate === 'object' && approvalDate.$date) {
      date = new Date(approvalDate.$date);
    } else if (typeof approvalDate === 'string') {
      // If it's already formatted Croatian datetime (DD.MM.YYYY HH:MM), return as is
      if (approvalDate.match(/^\d{1,2}\.\d{1,2}\.\d{4} \d{1,2}:\d{2}$/)) {
        return approvalDate;
      }
      date = new Date(approvalDate);
    } else {
      date = new Date(approvalDate);
    }

    if (isNaN(date.getTime())) {
      return String(approvalDate);
    }

    return date.toLocaleString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Zagreb',
    });
  } catch (error) {
    console.error('Error formatting approval date:', approvalDate, error);
    return String(approvalDate);
  }
};

// PrintableTable component with fixed date formatting
const PrintableTable = ({
  items,
  dateRange,
}: {
  items: Item[];
  dateRange?: string;
}) => {
  return (
    <div className="print-container">
      <div className="print-header">
        <img
          src="/images/logo.png"
          alt="Osijek-Koteks Logo"
          className="print-logo"
        />
        <div className="company-info">
          <p>Osijek-Koteks d.d.</p>
          <p>Šamaćka 11, 31000 Osijek, Hrvatska</p>
          <p>Tel: +385 31 227 700 | Fax: +385 31 227 777</p>
          <p>Email: info@osijek-koteks.hr | Web: www.osijek-koteks.hr</p>
        </div>
        <h1 className="print-title">Pregled dokumenata</h1>
        {dateRange && <p className="print-date-range">Period: {dateRange}</p>}
        <p className="print-date">
          Datum ispisa:{' '}
          {new Date().toLocaleDateString('hr-HR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Europe/Zagreb',
          })}
        </p>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th>Broj otpremnice</th>
            <th>Radni nalog</th>
            <th>Dobavljač</th>
            <th>Prijevoznik</th>
            <th>Registracija</th>
            <th>Težina (t)</th>
            <th>Razlika u vaganju (%)</th>
            <th>Datum kreiranja</th>
            <th>Status</th>
            <th>Odobrio</th>
            <th>Datum odobrenja</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: Item, index: number) => (
            <tr key={item._id}>
              <td>{item.title}</td>
              <td>{getFormattedCode(item.code)}</td>
              <td>{getDisplayNameForUser(item)}</td>
              <td>{item.prijevoznik || '-'}</td>
              <td>{item.registracija || '-'}</td>
              <td>
                {item.tezina !== undefined
                  ? (item.tezina / 1000).toFixed(3)
                  : '-'}
              </td>
              <td>
                {item.approvalStatus === 'odobreno' && item.neto !== undefined
                  ? item.neto > 1000
                    ? '/'
                    : `${item.neto}%`
                  : '-'}
              </td>
              <td>
                {/* FIXED: Use consistent date formatting */}
                {formatDateAndTime(item.creationDate, item.creationTime)}
              </td>
              <td>{item.approvalStatus}</td>
              <td>
                {item.approvedBy
                  ? `${item.approvedBy.firstName} ${item.approvedBy.lastName}`
                  : '-'}
              </td>
              <td>
                {/* FIXED: Use consistent approval date formatting */}
                {formatApprovalDate(item.approvalDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-footer">
        <p>© Osijek-Koteks d.d. Sva prava pridržana.</p>
      </div>

      <style>
        {`
          @media print {
            .print-container {
              padding: 10px;
              font-family: Arial, sans-serif;
            }

            .print-header {
              text-align: center;
              margin-bottom: 20px;
            }

            .print-logo {
              height: 40px;
              margin-bottom: 5px;
            }

            .company-info {
              text-align: center;
              font-size: 10px;
              color: #666;
              margin: 5px 0;
              line-height: 1.2;
            }

            .company-info p {
              margin: 2px 0;
            }

            .print-title {
              font-size: 18px;
              margin: 5px 0;
            }

            .print-date-range {
              color: #333;
              font-size: 12px;
              font-weight: 600;
              margin: 3px 0;
            }

            .print-date {
              color: #666;
              font-size: 10px;
            }

            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              font-size: 9px;
              line-height: 1.1;
            }

            .print-table th,
            .print-table td {
              border: 1px solid #ddd;
              padding: 3px 5px;
              text-align: left;
              vertical-align: middle;
            }

            .print-table th {
              background-color: #f5f5f5;
              font-weight: bold;
            }

            .print-table tr {
              page-break-inside: avoid;
            }

            .print-table tr:nth-child(even) {
              background-color: #f9f9f9;
            }

            .print-table th:nth-child(1),
            .print-table td:nth-child(1) { width: 13%; } /* Broj otpremnice */
            .print-table th:nth-child(2),
            .print-table td:nth-child(2) { width: 9%; }  /* Radni nalog */
            .print-table th:nth-child(3),
            .print-table td:nth-child(3) { width: 12%; } /* Dobavljač */
            .print-table th:nth-child(4),
            .print-table td:nth-child(4) { width: 10%; } /* Prijevoznik */
            .print-table th:nth-child(5),
            .print-table td:nth-child(5) { width: 9%; }  /* Registracija */
            .print-table th:nth-child(6),
            .print-table td:nth-child(6) { width: 7%; }  /* Težina */
            .print-table th:nth-child(7),
            .print-table td:nth-child(7) { width: 8%; }  /* Razlika u vaganju */
            .print-table th:nth-child(8),
            .print-table td:nth-child(8) { width: 12%; } /* Datum kreiranja */
            .print-table th:nth-child(9),
            .print-table td:nth-child(9) { width: 8%; }  /* Status */
            .print-table th:nth-child(10),
            .print-table td:nth-child(10) { width: 8%; } /* Odobrio */
            .print-table th:nth-child(11),
            .print-table td:nth-child(11) { width: 8%; } /* Datum odobrenja */

            .print-footer {
              margin-top: 15px;
              text-align: center;
              font-size: 9px;
              color: #666;
            }

            @page {
              size: landscape;
              margin: 0.5cm;
            }
          }
        `}
      </style>
    </div>
  );
};

// Updated interface to handle both a single item or an array of items
interface PrintTableButtonProps {
  items?: Item[];
  item?: Item;
  totalItems?: number;
  totalWeight?: number;
  isLoading?: boolean;
  onPrintAll?: () => Promise<Item[]>;
  dateRange?: string;
}

const PrintTableButton: React.FC<PrintTableButtonProps> = ({
  items,
  item,
  totalItems = 0,
  totalWeight,
  isLoading = false,
  onPrintAll,
  dateRange,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Convert single item to array if needed
  const itemsToDisplay = item ? [item] : items || [];

  const handlePrint = useCallback(async () => {
    if (!itemsToDisplay.length && totalItems === 0) return;

    try {
      setIsPrinting(true);

      let allItems = itemsToDisplay;

      // If we need to fetch all items for printing
      if (onPrintAll && totalItems > itemsToDisplay.length) {
        try {
          allItems = await onPrintAll();
        } catch (error) {
          console.error('Error fetching all items for printing:', error);
          alert('Greška pri dohvaćanju svih dokumenata za ispis');
          return;
        }
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Molimo omogućite pop-up prozore za ispis');
        return;
      }

      // Generate the printable table HTML
      const printableTableHtml = ReactDOMServer.renderToString(
        <PrintableTable items={allItems} dateRange={dateRange} />,
      );

      // Generate total weight summary if available
      const totalWeightSummaryHtml = totalWeight
        ? `
        <div style="
          margin-top: 20px;
          padding: 15px;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 5px;
          text-align: center;
        ">
          <div style="
            font-size: 14px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
          ">
            Ukupna težina: ${(totalWeight / 1000).toFixed(3)} t
          </div>
          <div style="
            font-size: 12px;
            color: #666;
          ">
            Ukupno ${allItems.length} ${
            allItems.length === 1
              ? 'kamion'
              : allItems.length < 5
              ? 'kamiona'
              : 'kamiona'
          }
          </div>
          <div style="
            font-size: 10px;
            color: #666;
            margin-top: 5px;
          ">
            Datum ispisa: ${new Date().toLocaleDateString('hr-HR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      `
        : '';

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Pregled dokumenata - Ispis</title>
            <style>
              @media print {
                * { 
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
            </style>
          </head>
          <body>
            ${printableTableHtml}
            ${totalWeightSummaryHtml}
          </body>
        </html>
      `;

      printWindow.document.write(printContent);

      // Track loaded images
      const images = printWindow.document.getElementsByTagName('img');
      const loadedImages = {current: 0};
      const totalImages = images.length;

      const tryPrint = () => {
        if (loadedImages.current === totalImages) {
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
      };

      if (totalImages > 0) {
        Array.from(images).forEach(img => {
          if (img.complete) {
            loadedImages.current += 1;
            tryPrint();
          } else {
            img.onload = () => {
              loadedImages.current += 1;
              tryPrint();
            };
            img.onerror = () => {
              loadedImages.current += 1;
              tryPrint();
            };
          }
        });
      } else {
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    } catch (error) {
      console.error('Error printing table:', error);
      alert('Greška pri ispisu tablice');
    } finally {
      setIsPrinting(false);
    }
  }, [
    item,
    items,
    itemsToDisplay,
    onPrintAll,
    totalWeight,
    dateRange,
    totalItems,
  ]);

  return (
    <>
      <PrintButton
        onClick={handlePrint}
        disabled={isLoading || isPrinting || (!item && totalItems === 0)}>
        {isPrinting ? 'Priprema ispisa...' : 'Ispiši tablicu'}
      </PrintButton>

      <div style={{display: 'none'}} ref={printContainerRef}>
        <PrintableTable items={itemsToDisplay} dateRange={dateRange} />
      </div>
    </>
  );
};

export default PrintTableButton;
