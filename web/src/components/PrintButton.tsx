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

const PrintContainer = styled.div`
  display: none;
`;

const PrintButton: React.FC<PrintButtonProps> = ({item}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);

  const tryPrint = useCallback(
    (
      printWindow: Window,
      totalImages: number,
      loadedImages: {current: number},
    ) => {
      if (loadedImages.current === totalImages) {
        printWindow.print();
        printWindow.close();
      }
    },
    [],
  );

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !printContainerRef.current) return;

    const printContent = `
      <html>
        <head>
          <title>Ispis - ${item.title}</title>
          <link rel="stylesheet" href="/print-styles.css">
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          </style>
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

    if (totalImages > 0) {
      Array.from(images).forEach(img => {
        if (img.complete) {
          loadedImages.current += 1;
        } else {
          img.onload = () => {
            loadedImages.current += 1;
            tryPrint(printWindow, totalImages, loadedImages);
          };
          img.onerror = () => {
            loadedImages.current += 1;
            tryPrint(printWindow, totalImages, loadedImages);
          };
        }
      });
      tryPrint(printWindow, totalImages, loadedImages);
    } else {
      printWindow.print();
      printWindow.close();
    }
  }, [item.title, tryPrint]);

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

      <PrintContainer ref={printContainerRef}>
        <PrintableItem item={item} />
      </PrintContainer>
    </>
  );
};

export default PrintButton;
