import React, {useRef, useCallback} from 'react';
import styled from 'styled-components';
import {Item} from '../types';
import PrintableItem from './PrintableItem';

interface PrintButtonProps {
  item: Item;
}

const PrintIconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex: 1;
  min-width: auto;
  padding: 8px 16px;
  font-size: 0.9rem;
  background-color: ${({theme}) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({theme}) => theme.borderRadius};
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background-color: ${({theme}) => theme.colors.primaryDark};
    opacity: 0.9;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const PrintButton: React.FC<PrintButtonProps> = ({item}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !printContainerRef.current) return;

    // Define print styles
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

      @media print {
        body { margin: 0; padding: 0; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ispis - ${item.title}</title>
          <style>${printStyles}</style>
        </head>
        <body>
          ${printContainerRef.current.innerHTML}
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
  }, [item.title]);

  return (
    <>
      <PrintIconButton onClick={handlePrint} title="Ispiši dokument">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Ispiši
      </PrintIconButton>

      <div style={{display: 'none'}} ref={printContainerRef}>
        <PrintableItem item={item} />
      </div>
    </>
  );
};

export default PrintButton;
