// Modified PrintTableButton.tsx that can handle both item and items props
import React, {useCallback, useRef, useState} from 'react';
import ReactDOMServer from 'react-dom/server';
import styled from 'styled-components';
import {Item} from '../types';

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
  totalWeight,
}: {
  items: Item[];
  totalWeight?: number;
}) => {
  // NEW: Format weight function
  const formatWeight = (weightInKg: number) => {
    const weightInTons = weightInKg / 1000;
    return weightInTons.toFixed(3);
  };

  return (
    <div className="print-container">
      <div className="print-header">
        <img
          src="/images/logo.png"
          alt="Osijek-Koteks Logo"
          className="print-logo"
        />
        <h1 className="print-title">Pregled dokumenata</h1>
        <p className="print-date">
          Datum ispisa: {new Date().toLocaleDateString('hr-HR')}
        </p>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th>Naziv</th>
            <th>RN</th>
            <th>Registracija</th>
            <th>Težina</th>
            <th>Razlika u vaganju</th>
            <th>Datum kreiranja</th>
            <th>Status</th>
            <th>Odobrio</th>
            <th>Datum odobrenja</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item._id}>
              <td>{item.title}</td>
              <td>{item.code}</td>
              <td>{item.registracija || '-'}</td>
              <td>
                {item.tezina !== undefined
                  ? `${(item.tezina / 1000).toFixed(3)} T`
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
        {/* NEW: Add total weight row at the bottom of the table */}
        {totalWeight !== undefined && totalWeight > 0 && (
          <tfoot>
            <tr className="total-weight-row">
              <td colSpan={3} className="total-weight-label">
                <strong>UKUPNA TEŽINA:</strong>
              </td>
              <td className="total-weight-value">
                <strong>{formatWeight(totalWeight)} T</strong>
              </td>
              <td colSpan={5} className="total-weight-details">
                ({items.length}{' '}
                {items.length === 1
                  ? 'dokument'
                  : items.length < 5
                  ? 'dokumenta'
                  : 'dokumenata'}
                )
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      <div className="print-footer">
        <p>© Osijek-Koteks d.d. Sva prava pridržana.</p>
      </div>

      <style>
        {`
          @media print {
            .print-container {
              padding: 20px;
              font-family: Arial, sans-serif;
            }

            .print-header {
              text-align: center;
              margin-bottom: 30px;
            }

            .print-logo {
              height: 60px;
              margin-bottom: 10px;
            }

            .print-title {
              font-size: 24px;
              margin: 10px 0;
            }

            .print-date {
              color: #666;
              font-size: 14px;
            }

            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              font-size: 12px;
            }

            .print-table th,
            .print-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }

            .print-table th {
              background-color: #f5f5f5;
              font-weight: bold;
            }

            .print-table tr:nth-child(even) {
              background-color: #f9f9f9;
            }

            /* NEW: Styles for total weight row */
            .total-weight-row {
              background-color: #e3f2fd !important;
              border-top: 3px solid #2196F3 !important;
            }

            .total-weight-row td {
              border-top: 3px solid #2196F3 !important;
              padding: 12px 8px !important;
              font-size: 13px !important;
            }

            .total-weight-label {
              background-color: #2196F3 !important;
              color: white !important;
              text-align: right !important;
            }

            .total-weight-value {
              background-color: #1976D2 !important;
              color: white !important;
              text-align: center !important;
              font-size: 14px !important;
            }

            .total-weight-details {
              background-color: #e3f2fd !important;
              color: #1976D2 !important;
              text-align: left !important;
              font-style: italic;
            }

            .print-footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }

            @page {
              size: landscape;
              margin: 1cm;
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
  totalWeight?: number; // NEW: Add total weight prop
  isLoading?: boolean;
  onPrintAll?: () => Promise<Item[]>;
}

const PrintTableButton: React.FC<PrintTableButtonProps> = ({
  items,
  item,
  totalItems = 0,
  totalWeight, // NEW: Destructure total weight
  isLoading = false,
  onPrintAll,
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

      // NEW: Pass totalWeight to PrintableTable
      const printableTableHtml = ReactDOMServer.renderToStaticMarkup(
        <PrintableTable items={allItems} totalWeight={totalWeight} />,
      );

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Pregled dokumenata - Ispis</title>
          </head>
          <body>
            ${printableTableHtml}
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
        <PrintableTable items={itemsToDisplay} totalWeight={totalWeight} />
      </div>
    </>
  );
};

export default PrintTableButton;
