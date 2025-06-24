// src/components/PrintAllButton.tsx
import React, {useCallback, useState} from 'react';
import styled from 'styled-components';
import ReactDOMServer from 'react-dom/server';
import {Item} from '../types';
import PrintableItem from './PrintableItem';

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

interface PrintAllButtonProps {
  items: Item[];
  totalItems: number;
  totalWeight: number; // NEW: Add total weight prop
  isLoading: boolean;
  onPrintAll: () => Promise<Item[]>;
}

const PrintAllButton: React.FC<PrintAllButtonProps> = ({
  totalItems,
  totalWeight, // NEW: Destructure total weight
  isLoading,
  onPrintAll,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);

  // NEW: Format weight function
  const formatWeight = (weightInKg: number) => {
    const weightInTons = weightInKg / 1000;
    return weightInTons.toFixed(3);
  };

  const handlePrintAll = useCallback(async () => {
    try {
      setIsPrinting(true);
      const allItems = await onPrintAll();

      if (!allItems.length) {
        alert('Nema dokumenata za ispis');
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const printStyles = `
        .print-container {
          padding: 20px;
          max-width: 100%;
          margin: 0 auto;
          font-family: Arial, sans-serif;
          color: #000;
        }

        .print-header {
          margin-bottom: 30px;
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
        }

        .print-logo {
          height: 60px;
          margin-bottom: 10px;
        }

        .print-title {
          font-size: 24px;
          margin: 10px 0;
        }

        .print-info-section {
          margin-bottom: 20px;
        }

        .print-info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }

        .print-info-item {
          margin-bottom: 10px;
        }

        .print-label {
          font-weight: bold;
          margin-right: 10px;
        }

        .print-value {
          color: #333;
        }

        .print-photos-section {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 20px;
          page-break-inside: avoid;
        }

        .print-photo-container {
          text-align: center;
        }

        .print-photo {
          max-width: 100%;
          height: auto;
          margin-bottom: 10px;
          border: 1px solid #ccc;
        }

        .print-photo-caption {
          font-size: 14px;
          color: #666;
          margin: 5px 0;
        }

        .print-location-section {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #ccc;
          page-break-inside: avoid;
        }

        .print-footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ccc;
          text-align: center;
          font-size: 12px;
          color: #666;
        }

        /* NEW: Styles for total weight summary */
        .total-weight-summary {
          margin-top: 40px;
          padding: 20px;
          background-color: #f8f9fa;
          border: 2px solid #2196F3;
          border-radius: 8px;
          text-align: center;
          page-break-inside: avoid;
        }

        .total-weight-title {
          font-size: 18px;
          font-weight: bold;
          color: #2196F3;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .total-weight-value {
          font-size: 32px;
          font-weight: bold;
          color: #2196F3;
          margin: 15px 0;
        }

        .total-weight-details {
          font-size: 14px;
          color: #666;
          margin-top: 10px;
        }

        .summary-divider {
          height: 2px;
          background-color: #2196F3;
          margin: 20px 0;
        }

        @media print {
          body { 
            margin: 0;
            padding: 0;
          }
          * { 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page-break { 
            page-break-before: always;
          }
          .total-weight-summary {
            background-color: #f8f9fa !important;
            border: 2px solid #2196F3 !important;
          }
        }
      `;

      // Generate HTML for each PrintableItem component
      const itemsHtml = allItems
        .map((item, index) => {
          const itemHtml = ReactDOMServer.renderToStaticMarkup(
            <PrintableItem item={item} />,
          );
          return `
          ${index > 0 ? '<div class="page-break"></div>' : ''}
          <div id="item-${item._id}">
            ${itemHtml}
          </div>
        `;
        })
        .join('');

      // NEW: Generate total weight summary HTML
      const totalWeightSummaryHtml = `
        <div class="page-break"></div>
        <div class="total-weight-summary">
          <div class="total-weight-title">Sažetak ukupne težine</div>
          <div class="summary-divider"></div>
          <div class="total-weight-value">${formatWeight(totalWeight)} T</div>
          <div class="total-weight-details">
            Ukupna težina ${totalItems} ${
        totalItems === 1 ? 'kamion' : totalItems < 5 ? 'kamion' : 'kamion'
      }
          </div>
          <div class="total-weight-details">
            Datum ispisa: ${new Date().toLocaleDateString('hr-HR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      `;

      // Prepare the content
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ispis dokumenata</title>
            <style>${printStyles}</style>
          </head>
          <body>
            <div class="print-container">
              ${itemsHtml}
              ${totalWeight > 0 ? totalWeightSummaryHtml : ''}
            </div>
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
      console.error('Error printing all items:', error);
      alert('Greška pri ispisu dokumenata');
    } finally {
      setIsPrinting(false);
    }
  }, [onPrintAll, totalWeight, totalItems, formatWeight]);

  return (
    <PrintButton
      onClick={handlePrintAll}
      disabled={isLoading || isPrinting || totalItems === 0}>
      {isPrinting ? 'Priprema ispisa...' : `Ispiši sve (${totalItems})`}
    </PrintButton>
  );
};

export default PrintAllButton;
