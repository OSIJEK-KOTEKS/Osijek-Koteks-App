import React, {useCallback, useState} from 'react';
import styled from 'styled-components';
import * as XLSX from 'xlsx';
import {Item} from '../types';
import {getFormattedCode} from '../utils/codeMapping';

const ExportButton = styled.button`
  width: 100%;
  padding: ${({theme}) => theme.spacing.medium};
  background-color: #228b22;
  color: ${({theme}) => theme.colors.white};
  border: none;
  border-radius: ${({theme}) => theme.borderRadius};
  font-size: 1rem;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    background-color: #006400;
  }

  &:disabled {
    background-color: ${({theme}) => theme.colors.disabled};
    cursor: not-allowed;
  }

  svg {
    width: 30px;
    height: 30px;
  }
`;

interface ExportExcelButtonProps {
  items?: Item[];
  item?: Item;
  totalItems?: number;
  totalWeight?: number;
  isLoading?: boolean;
  onExportAll?: () => Promise<Item[]>;
  dateRange?: string;
  selectedCode?: string;
  inTransitOnly?: boolean;
}

const ExportExcelButton: React.FC<ExportExcelButtonProps> = ({
  items,
  item,
  totalItems = 0,
  totalWeight,
  isLoading = false,
  onExportAll,
  dateRange,
  selectedCode,
  inTransitOnly,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const formatWeight = (weightInKg: number) => {
    const weightInTons = weightInKg / 1000;
    return weightInTons.toFixed(3).replace('.', ',');
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toFixed(decimals).replace('.', ',');
  };

  const generateFileName = () => {
    const timestamp = new Date()
      .toLocaleDateString('hr-HR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
      .replace(/\./g, '_');

    let fileName = `dokumenti_${timestamp}`;

    if (dateRange) {
      const cleanDateRange = dateRange
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '_');
      fileName = `dokumenti_${cleanDateRange}`;
    }

    if (selectedCode && selectedCode !== 'all') {
      fileName += `_${selectedCode}`;
    }

    if (inTransitOnly) {
      fileName += '_u_tranzitu';
    }

    return `${fileName}.xlsx`;
  };

  const prepareExcelData = (itemsToExport: Item[]) => {
    // Group items by code
    const itemsByCode = itemsToExport.reduce((acc, item) => {
      const code = item.code;
      if (!acc[code]) {
        acc[code] = [];
      }
      acc[code].push(item);
      return acc;
    }, {} as Record<string, Item[]>);

    // Sort codes for consistent ordering
    const sortedCodes = Object.keys(itemsByCode).sort((a, b) =>
      a.localeCompare(b, undefined, {numeric: true}),
    );

    // Prepare data for each code sheet
    const codeSheets = sortedCodes.map(code => {
      const codeItems = itemsByCode[code];
      const codeData = codeItems.map((item, index) => ({
        'Redni broj': index + 1,
        Naziv: item.title,
        RN: getFormattedCode(item.code),
        Registracija: item.registracija || '-',
        'Težina (t)': item.tezina !== undefined ? item.tezina / 1000 : null,
        'Razlika u vaganju (%)':
          item.approvalStatus === 'odobreno' && item.neto !== undefined
            ? item.neto > 1000
              ? '/'
              : item.neto
            : null,
        'Datum kreiranja': item.creationTime
          ? `${item.creationDate} ${item.creationTime}`
          : item.creationDate,
        Status: item.approvalStatus,
        'U tranzitu': item.in_transit ? 'Da' : 'Ne',
        Odobrio: item.approvedBy
          ? `${item.approvedBy.firstName} ${item.approvedBy.lastName}`
          : '-',
        'Datum odobrenja': item.approvalDate || '-',
        'Lokacija - Širina':
          item.approvalLocation?.coordinates?.latitude || null,
        'Lokacija - Dužina':
          item.approvalLocation?.coordinates?.longitude || null,
        'Lokacija - Točnost (m)': item.approvalLocation?.accuracy
          ? Math.round(item.approvalLocation.accuracy)
          : null,
      }));

      // Calculate totals for this code
      const codeWeight = codeItems.reduce(
        (sum, item) => sum + (item.tezina || 0),
        0,
      );
      const codeCount = codeItems.length;
      const codePending = codeItems.filter(
        item => item.approvalStatus === 'na čekanju',
      ).length;
      const codeApproved = codeItems.filter(
        item => item.approvalStatus === 'odobreno',
      ).length;
      const codeRejected = codeItems.filter(
        item => item.approvalStatus === 'odbijen',
      ).length;
      const codeInTransit = codeItems.filter(item => item.in_transit).length;

      return {
        code,
        data: codeData,
        totals: {
          count: codeCount,
          weight: codeWeight / 1000, // Convert to tons
          pending: codePending,
          approved: codeApproved,
          rejected: codeRejected,
          inTransit: codeInTransit,
        },
      };
    });

    // Overall summary data
    const summaryData = [
      ['SAŽETAK SVIH DOKUMENATA', ''],
      ['', ''],
      ['Ukupan broj dokumenta:', itemsToExport.length],
      ['Ukupna težina (t):', totalWeight ? totalWeight / 1000 : 0],
      ['Broj različitih RN:', sortedCodes.length],
      ['', ''],
      ['UKUPNE STATISTIKE PO STATUSU', ''],
      [
        'Na čekanju:',
        itemsToExport.filter(item => item.approvalStatus === 'na čekanju')
          .length,
      ],
      [
        'Odobreno:',
        itemsToExport.filter(item => item.approvalStatus === 'odobreno').length,
      ],
      [
        'Odbijeno:',
        itemsToExport.filter(item => item.approvalStatus === 'odbijen').length,
      ],
      ['U tranzitu:', itemsToExport.filter(item => item.in_transit).length],
      ['', ''],
      ['SAŽETAK PO RADNIM NALOZIMA', ''],
      [
        'RN',
        'Broj dokumenata',
        'Težina (t)',
        'Na čekanju',
        'Odobreno',
        'Odbijeno',
        'U tranzitu',
      ],
      ...codeSheets.map(sheet => [
        getFormattedCode(sheet.code),
        sheet.totals.count,
        sheet.totals.weight,
        sheet.totals.pending,
        sheet.totals.approved,
        sheet.totals.rejected,
        sheet.totals.inTransit,
      ]),
      ['', ''],
      [
        'Datum izvoza:',
        new Date().toLocaleDateString('hr-HR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      ],
      ['Filter - Period:', dateRange || 'Svi dokumenti'],
      [
        'Filter - RN:',
        selectedCode === 'all'
          ? 'Svi radni nalozi'
          : selectedCode || 'Svi radni nalozi',
      ],
      ['Filter - U tranzitu:', inTransitOnly ? 'Da' : 'Ne'],
    ];

    return {codeSheets, summaryData};
  };

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);

      // Determine which items to export
      let itemsToExport: Item[] = [];

      if (item) {
        // Single item export
        itemsToExport = [item];
      } else if (onExportAll) {
        // Export all items using the provided function
        itemsToExport = await onExportAll();
      } else if (items) {
        // Export provided items
        itemsToExport = items;
      }

      if (!itemsToExport.length) {
        alert('Nema dokumenata za izvoz');
        return;
      }

      const {codeSheets, summaryData} = prepareExcelData(itemsToExport);

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Helper function to format numeric columns in a worksheet
      const formatNumericColumns = (worksheet: any) => {
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

        for (let row = 1; row <= range.e.r; row++) {
          // Start from row 1 (skip header)
          // Format Težina (t) column (column E, index 4)
          const weightCell = XLSX.utils.encode_cell({r: row, c: 4});
          if (
            worksheet[weightCell] &&
            typeof worksheet[weightCell].v === 'number'
          ) {
            worksheet[weightCell].z = '#,##0.000';
          }

          // Format Razlika u vaganju column (column F, index 5)
          const percentCell = XLSX.utils.encode_cell({r: row, c: 5});
          if (
            worksheet[percentCell] &&
            typeof worksheet[percentCell].v === 'number'
          ) {
            worksheet[percentCell].z = '#,##0.00';
          }

          // Format Lokacija - Širina column (column L, index 11)
          const latCell = XLSX.utils.encode_cell({r: row, c: 11});
          if (worksheet[latCell] && typeof worksheet[latCell].v === 'number') {
            worksheet[latCell].z = '#,##0.000000';
          }

          // Format Lokacija - Dužina column (column M, index 12)
          const lngCell = XLSX.utils.encode_cell({r: row, c: 12});
          if (worksheet[lngCell] && typeof worksheet[lngCell].v === 'number') {
            worksheet[lngCell].z = '#,##0.000000';
          }

          // Format Lokacija - Točnost column (column N, index 13)
          const accCell = XLSX.utils.encode_cell({r: row, c: 13});
          if (worksheet[accCell] && typeof worksheet[accCell].v === 'number') {
            worksheet[accCell].z = '#,##0';
          }
        }
      };

      // Set standard column widths for data sheets
      const standardColWidths = [
        {wch: 8}, // Redni broj
        {wch: 40}, // Naziv
        {wch: 25}, // RN
        {wch: 15}, // Registracija
        {wch: 12}, // Težina
        {wch: 18}, // Razlika u vaganju
        {wch: 20}, // Datum kreiranja
        {wch: 12}, // Status
        {wch: 12}, // U tranzitu
        {wch: 20}, // Odobrio
        {wch: 15}, // Datum odobrenja
        {wch: 15}, // Lokacija - Širina
        {wch: 15}, // Lokacija - Dužina
        {wch: 15}, // Lokacija - Točnost
      ];

      // Create summary worksheet first
      const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWorksheet['!cols'] = [
        {wch: 25},
        {wch: 20},
        {wch: 15},
        {wch: 12},
        {wch: 12},
        {wch: 12},
        {wch: 12},
      ];
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Sažetak');

      // Create individual sheets for each code
      codeSheets.forEach(codeSheet => {
        const worksheet = XLSX.utils.json_to_sheet(codeSheet.data);

        // Format numeric columns
        formatNumericColumns(worksheet);

        // Set column widths
        worksheet['!cols'] = standardColWidths;

        // Create a valid sheet name (Excel has restrictions on sheet names)
        let sheetName = codeSheet.code;

        // Excel sheet name restrictions: max 31 chars, no special chars
        sheetName = sheetName.replace(/[\\\/\?\*\[\]:]/g, '_');
        if (sheetName.length > 31) {
          sheetName = sheetName.substring(0, 31);
        }

        // Add sheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      // Generate filename and download
      const fileName = generateFileName();
      XLSX.writeFile(workbook, fileName);

      console.log(`Excel file exported: ${fileName}`);
    } catch (error) {
      console.error('Error exporting Excel file:', error);
      alert('Greška pri izvozu Excel datoteke');
    } finally {
      setIsExporting(false);
    }
  }, [
    item,
    items,
    onExportAll,
    totalWeight,
    dateRange,
    selectedCode,
    inTransitOnly,
  ]);

  return (
    <ExportButton
      onClick={handleExport}
      disabled={isLoading || isExporting || (!item && totalItems === 0)}
      title="Izvezi Excel datoteku">
      {isExporting ? (
        <>
          <div
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid #ffffff',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          Priprema izvoza...
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10,9 9,9 8,9" />
          </svg>
          Izvezi Excel
        </>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </ExportButton>
  );
};

export default ExportExcelButton;
