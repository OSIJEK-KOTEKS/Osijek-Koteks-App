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
          <p>Šamačka 11, 31000 Osijek, Hrvatska</p>
          <p>Tel: +385 31 227 700 | Fax: +385 31 227 777</p>
          <p>Email: info@osijek-koteks.hr | Web: www.osijek-koteks.hr</p>
        </div>
        <h1 className="print-title">Pregled dokumenata</h1>
        {dateRange && <p className="print-date-range">Period: {dateRange}</p>}
        <p className="print-date">
          Datum ispisa: {new Date().toLocaleDateString('hr-HR')}
        </p>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th>Broj otpremnice</th>
            <th>Radni nalog</th>
            <th>Registracija</th>
            <th>Težina</th>
            <th>Razlika u vaganju</th>
            <th>Datum kreiranja otpremnice</th>
            <th>Status</th>
            <th>Odobrio</th>
            <th>Datum odobrenja</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item._id}>
              <td>{item.title}</td>
              <td>{getFormattedCode(item.code)}</td>
              <td>{item.registracija || '-'}</td>
              <td>
                {item.tezina !== undefined
                  ? `${(item.tezina / 1000).toFixed(3)} t`
                  : '-'}
              </td>
              <td>
                {item.approvalStatus === 'odobreno' &&
                item.neto !== undefined ? (
                  item.neto > 1000 ? (
                    <span>/</span>
                  ) : (
                    <span
                      style={{
                        color:
                          item.neto < -5
                            ? '#f44336'
                            : item.neto > 5
                            ? '#4caf50'
                            : '#000',
                        fontWeight:
                          item.neto < -5 || item.neto > 5 ? 'bold' : 'normal',
                      }}>
                      {item.neto}%
                    </span>
                  )
                ) : (
                  '-'
                )}
              </td>
              <td>
                {item.creationTime
                  ? `${item.creationDate} ${item.creationTime}`
                  : item.creationDate}
              </td>
              <td>{item.approvalStatus}</td>
              <td>
                {item.approvedBy
                  ? `${item.approvedBy.firstName} ${item.approvedBy.lastName}`
                  : '-'}
              </td>
              <td>{item.approvalDate || '-'}</td>
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
            .print-table td:nth-child(1) { width: 15%; }
            .print-table th:nth-child(2),
            .print-table td:nth-child(2) { width: 10%; }
            .print-table th:nth-child(3),
            .print-table td:nth-child(3) { width: 10%; }
            .print-table th:nth-child(4),
            .print-table td:nth-child(4) { width: 8%; }
            .print-table th:nth-child(5),
            .print-table td:nth-child(5) { width: 8%; }
            .print-table th:nth-child(6),
            .print-table td:nth-child(6) { width: 15%; }
            .print-table th:nth-child(7),
            .print-table td:nth-child(7) { width: 10%; }
            .print-table th:nth-child(8),
            .print-table td:nth-child(8) { width: 12%; }
            .print-table th:nth-child(9),
            .print-table td:nth-child(9) { width: 12%; }

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
    try {
      setIsPrinting(true);

      // If we have a single item, just use that
      // Otherwise, if we have onPrintAll function, use that to get all items
      // Otherwise, just use the items we have
      let allItems = item
        ? [item]
        : onPrintAll
        ? await onPrintAll()
        : itemsToDisplay;

      if (!allItems.length) {
        alert('Nema dokumenata za ispis');
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      // Format weight function
      const formatWeight = (weightInKg: number) => {
        const weightInTons = weightInKg / 1000;
        return weightInTons.toFixed(3);
      };

      // Generate the main table
      const printableTableHtml = ReactDOMServer.renderToStaticMarkup(
        <PrintableTable items={allItems} dateRange={dateRange} />,
      );

      // Generate total weight summary separately (only once, at the end)
      const totalWeightSummaryHtml =
        totalWeight !== undefined && totalWeight > 0
          ? `
        <div style="
          margin-top: 20px;
          padding: 10px;
          background-color: #f8f9fa;
          border: 2px solid #2196F3;
          border-radius: 4px;
          text-align: center;
          page-break-inside: avoid;
        ">
          <div style="
            font-size: 14px;
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 1px;
          ">
            Ukupna težina
          </div>
          <div style="
            height: 2px;
            background-color: #2196F3;
            margin: 10px 0;
          "></div>
          <div style="
            font-size: 20px;
            font-weight: bold;
            color: #2196F3;
            margin: 8px 0;
          ">
            ${formatWeight(totalWeight)} t
          </div>
          <div style="
            font-size: 10px;
            color: #666;
            margin-top: 5px;
          ">
            Ukupno ${allItems.length} ${
              allItems.length === 1
                ? 'kamion'
                : allItems.length < 2
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
  }, [item, items, itemsToDisplay, onPrintAll, totalWeight]);

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
