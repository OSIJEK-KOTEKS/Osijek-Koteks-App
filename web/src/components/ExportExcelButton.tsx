import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import * as XLSX from 'xlsx';
import { Item } from '../types';
import { getFormattedCode } from '../utils/codeMapping';

const ExportButton = styled.button`
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #218838 0%, #1ea085 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
  }

  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  svg {
    width: 35px;
    height: 35px;
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
      const cleanDateRange = dateRange.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
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
      a.localeCompare(b, undefined, { numeric: true })
    );

    // Prepare data for each code sheet
    const codeSheets = sortedCodes.map(code => {
      const codeItems = itemsByCode[code];
      const codeData = codeItems.map((item, index) => ({
        'Redni broj': index + 1,
        'Broj otpremnice': item.title,
        'Radni nalog': getFormattedCode(item.code),
        Dobavljač: getDisplayNameForUser(item),
        Prijevoznik: item.prijevoznik || '-',
        Registracija: item.registracija || '-',
        'Težina (t)': item.tezina !== undefined ? item.tezina / 1000 : null,
        'Razlika u vaganju (%)':
          item.approvalStatus === 'odobreno' && item.neto !== undefined
            ? item.neto > 1000
              ? '/'
              : item.neto
            : null,
        'Datum kreiranja otpremnice': item.creationTime
          ? `${item.creationDate} ${item.creationTime}`
          : item.creationDate,
        Status: item.approvalStatus,
        'Plaćen Prijevoz': item.isPaid ? 'Da' : 'Ne',
        'U tranzitu': item.in_transit ? 'Da' : 'Ne',
        Odobrio: item.approvedBy ? `${item.approvedBy.firstName} ${item.approvedBy.lastName}` : '-',
        'Datum odobrenja': item.approvalDate || '-',
        'Lokacija - Širina': item.approvalLocation?.coordinates?.latitude || null,
        'Lokacija - Dužina': item.approvalLocation?.coordinates?.longitude || null,
        'Lokacija - Točnost': item.approvalLocation?.accuracy || null,
      }));

      // Calculate totals for this code
      const totals = {
        count: codeItems.length,
        weight: formatNumber(
          codeItems.reduce((sum, item) => sum + (item.tezina || 0), 0) / 1000,
          3
        ),
        pending: codeItems.filter(item => item.approvalStatus === 'na čekanju').length,
        approved: codeItems.filter(item => item.approvalStatus === 'odobreno').length,
        rejected: codeItems.filter(item => item.approvalStatus === 'odbijen').length,
        inTransit: codeItems.filter(item => item.in_transit).length,
      };

      return {
        code,
        data: codeData,
        totals,
      };
    });

    // Prepare summary data
    const summaryData = [
      ['IZVJEŠTAJ O DOKUMENTIMA', ''],
      ['', ''],
      ['UKUPNI PODACI', ''],
      ['Ukupan broj dokumenata:', itemsToExport.length],
      [
        'Ukupna težina (t):',
        totalWeight
          ? formatNumber(totalWeight / 1000, 3)
          : formatNumber(
              itemsToExport.reduce((sum, item) => sum + (item.tezina || 0), 0) / 1000,
              3
            ),
      ],
      ['Broj različitih RN:', sortedCodes.length],
      ['', ''],
      ['UKUPNE STATISTIKE PO STATUSU', ''],
      ['Na čekanju:', itemsToExport.filter(item => item.approvalStatus === 'na čekanju').length],
      ['Odobreno:', itemsToExport.filter(item => item.approvalStatus === 'odobreno').length],
      ['Odbijeno:', itemsToExport.filter(item => item.approvalStatus === 'odbijen').length],
      ['U tranzitu:', itemsToExport.filter(item => item.in_transit).length],
      ['', ''],
      ['SAŽETAK PO RADNIM NALOZIMA', ''],
      ['RN', 'Broj dokumenata', 'Težina (t)', 'Na čekanju', 'Odobreno', 'Odbijeno', 'U tranzitu'],
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
        selectedCode === 'all' ? 'Svi radni nalozi' : selectedCode || 'Svi radni nalozi',
      ],
      ['Filter - U tranzitu:', inTransitOnly ? 'Da' : 'Ne'],
    ];

    return { codeSheets, summaryData };
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

      const { codeSheets, summaryData } = prepareExcelData(itemsToExport);

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Helper function to format numeric columns in a worksheet
      const formatNumericColumns = (worksheet: any) => {
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

        for (let row = 1; row <= range.e.r; row++) {
          // Format Težina (t) column (now column G, index 6)
          const weightCell = XLSX.utils.encode_cell({ r: row, c: 6 });
          if (worksheet[weightCell] && typeof worksheet[weightCell].v === 'number') {
            worksheet[weightCell].z = '#,##0.000';
          }

          // Format Razlika u vaganju column (now column H, index 7)
          const percentCell = XLSX.utils.encode_cell({ r: row, c: 7 });
          if (worksheet[percentCell] && typeof worksheet[percentCell].v === 'number') {
            worksheet[percentCell].z = '#,##0.00';
          }

          // Format Lokacija - Širina column (now column N, index 13)
          const latCell = XLSX.utils.encode_cell({ r: row, c: 13 });
          if (worksheet[latCell] && typeof worksheet[latCell].v === 'number') {
            worksheet[latCell].z = '#,##0.000000';
          }

          // Format Lokacija - Dužina column (now column O, index 14)
          const lngCell = XLSX.utils.encode_cell({ r: row, c: 14 });
          if (worksheet[lngCell] && typeof worksheet[lngCell].v === 'number') {
            worksheet[lngCell].z = '#,##0.000000';
          }

          // Format Lokacija - Točnost column (now column P, index 15)
          const accCell = XLSX.utils.encode_cell({ r: row, c: 15 });
          if (worksheet[accCell] && typeof worksheet[accCell].v === 'number') {
            worksheet[accCell].z = '#,##0';
          }
        }
      };

      // Set standard column widths for data sheets (updated with Prijevoznik column)
      const standardColWidths = [
        { wch: 8 }, // Redni broj
        { wch: 10 }, // Naziv
        { wch: 25 }, // RN
        { wch: 15 }, // Dobavljač (NEW COLUMN)
        { wch: 30 }, // Prijevoznik
        { wch: 15 }, // Registracija
        { wch: 12 }, // Težina
        { wch: 18 }, // Razlika u vaganju
        { wch: 20 }, // Datum kreiranja
        { wch: 12 }, // Status
        { wch: 10 }, // Plaćeno
        { wch: 12 }, // U tranzitu
        { wch: 20 }, // Odobrio
        { wch: 15 }, // Datum odobrenja
        { wch: 15 }, // Lokacija - Širina
        { wch: 15 }, // Lokacija - Dužina
        { wch: 15 }, // Lokacija - Točnost
      ];
      // Create summary worksheet first
      const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWorksheet['!cols'] = [
        { wch: 25 },
        { wch: 20 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
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
  }, [item, items, onExportAll, totalWeight, dateRange, selectedCode, inTransitOnly]);

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
