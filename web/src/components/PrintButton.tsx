import React, {useRef} from 'react';
import styled from 'styled-components';
import {Item} from '../types';
import PrintableItem from './PrintableItem';

interface PrintButtonProps {
  item: Item;
}

const PrintIconButton = styled.button`
  background-color: ${({theme}) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({theme}) => theme.borderRadius};
  padding: 0.5rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({theme}) => theme.colors.primaryDark};
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && printContainerRef.current) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print - ${item.title}</title>
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
      `);

      // Wait for images to load before printing
      printWindow.document.addEventListener(
        'load',
        () => {
          printWindow.print();
          printWindow.close();
        },
        {once: true},
      );
    }
  };

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
