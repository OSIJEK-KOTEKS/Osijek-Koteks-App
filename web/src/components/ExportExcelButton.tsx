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

  // One row per item, shared by the RN sheets and the per-material sheets
  // so the two can never drift apart.
  const buildItemRows = (rows: Item[]) =>
    rows.map((item, index) => ({
      'Redni broj': index + 1,
      'Broj otpremnice': item.title,
      'Radni nalog': getFormattedCode(item.code),
      Dobavljač: getDisplayNameForUser(item),
      Prijevoznik: item.prijevoznik || '-',
      Registracija: item.registracija || '-',
      Roba: item.roba || '-',
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

  // Groups the export by material. Items backfilled before the material was
  // being read, and asfalt loads whose otpremnica has no "Roba:" block, land
  // in one "Bez robe" group rather than being dropped.
  const groupByRoba = (itemsToExport: Item[]) =>
    itemsToExport.reduce((acc, item) => {
      const roba = item.roba && item.roba.trim() ? item.roba.trim() : 'Bez robe';
      if (!acc[roba]) acc[roba] = [];
      acc[roba].push(item);
      return acc;
    }, {} as Record<string, Item[]>);

  const prepareExcelData = (itemsToExport: Item[], includeRobaSheets: boolean) => {
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
      const codeData = buildItemRows(codeItems);

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

    // One sheet per material, in the same shape as the RN sheets, plus a
    // matching block in the summary. Only when asked for, so an export that
    // declines the prompt is byte-for-byte what it was before.
    const robaSheets = includeRobaSheets
      ? Object.entries(groupByRoba(itemsToExport))
          .sort(([a], [b]) => a.localeCompare(b, 'hr'))
          .map(([roba, robaItems]) => ({
            roba,
            data: buildItemRows(robaItems),
            totals: {
              count: robaItems.length,
              weight: formatNumber(
                robaItems.reduce((sum, item) => sum + (item.tezina || 0), 0) / 1000,
                3
              ),
            },
          }))
      : [];

    if (includeRobaSheets && robaSheets.length > 0) {
      summaryData.push(
        ['', ''],
        ['SAŽETAK PO ROBI', ''],
        ['Roba', 'Broj dokumenata', 'Težina (t)'],
        ...robaSheets.map(sheet => [sheet.roba, sheet.totals.count, sheet.totals.weight])
      );
    }

    return { codeSheets, summaryData, robaSheets };
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

      // Only worth asking when there is something to group by.
      const robaTypes = Object.keys(groupByRoba(itemsToExport)).filter(roba => roba !== 'Bez robe');
      const includeRobaSheets =
        robaTypes.length > 0 &&
        window.confirm(
          [
            'Želite li da izvještaj sadrži i zaseban list za svaku vrstu robe?',
            '',
            `Pronađeno vrsta robe: ${robaTypes.length}. Postojeći listovi ostaju nepromijenjeni.`,
          ].join('\n')
        );

      const { codeSheets, summaryData, robaSheets } = prepareExcelData(
        itemsToExport,
        includeRobaSheets
      );

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Number formats are looked up by column heading rather than by a fixed
      // index: the columns have shifted before when one was inserted, and the
      // formats silently followed the wrong data.
      const WEIGHT_HEADING = 'Težina (t)';

      const numericFormats: Record<string, string> = {
        [WEIGHT_HEADING]: '#,##0.000',
        'Razlika u vaganju (%)': '#,##0.00',
        'Lokacija - Širina': '#,##0.000000',
        'Lokacija - Dužina': '#,##0.000000',
        'Lokacija - Točnost': '#,##0',
      };

      const formatNumericColumns = (worksheet: any) => {
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

        const columnOf = new Map<string, number>();
        for (let col = range.s.c; col <= range.e.c; col += 1) {
          const header = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: col })];
          if (header && typeof header.v === 'string') columnOf.set(header.v, col);
        }

        Object.entries(numericFormats).forEach(([heading, format]) => {
          const col = columnOf.get(heading);
          if (col === undefined) return;

          for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
            if (cell && typeof cell.v === 'number') cell.z = format;
          }
        });
      };

      // Excel rejects a duplicate sheet name and silently mangles the illegal
      // characters, so every name goes through here. Material names are long
      // enough that two of them can collide once trimmed to 31 characters.
      const usedSheetNames = new Set<string>();
      const ILLEGAL_SHEET_CHARS = [String.fromCharCode(92), '/', '?', '*', '[', ']', ':'];
      const uniqueSheetName = (base: string) => {
        let name =
          ILLEGAL_SHEET_CHARS.reduce((acc, ch) => acc.split(ch).join('_'), base || 'List').trim() ||
          'List';
        if (name.length > 31) name = name.substring(0, 31);
        if (!usedSheetNames.has(name)) {
          usedSheetNames.add(name);
          return name;
        }

        for (let suffix = 2; ; suffix += 1) {
          const tail = `_${suffix}`;
          const candidate = name.substring(0, 31 - tail.length) + tail;
          if (!usedSheetNames.has(candidate)) {
            usedSheetNames.add(candidate);
            return candidate;
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
        { wch: 32 }, // Roba
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
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, uniqueSheetName('Sažetak'));

      // Closing line on every data sheet: how many documents it holds and what
      // they weigh in total. Written as a real number, not text, so it can be
      // read straight into another calculation; formatNumericColumns picks up
      // the weight format for it because it sits in the Težina column.
      const appendTotalsRow = (worksheet: any, rows: any[]) => {
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

        let weightColumn = -1;
        for (let col = range.s.c; col <= range.e.c; col += 1) {
          const header = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: col })];
          if (header && header.v === WEIGHT_HEADING) {
            weightColumn = col;
            break;
          }
        }

        // Rounded to the gram: summing tonnes converted from kg leaves float
        // noise (900.4799999999999), which the cell format hides but the
        // formula bar does not.
        const totalWeight =
          Math.round(
            rows.reduce(
              (sum, row) =>
                sum + (typeof row[WEIGHT_HEADING] === 'number' ? row[WEIGHT_HEADING] : 0),
              0
            ) * 1000
          ) / 1000;

        // null leaves a cell untouched rather than writing an empty string.
        const totals: (string | number | null)[] = new Array(range.e.c + 1).fill(null);
        totals[0] = 'UKUPNO';
        totals[1] = `${rows.length} dok.`;
        if (weightColumn >= 0) totals[weightColumn] = totalWeight;

        XLSX.utils.sheet_add_aoa(worksheet, [totals], { origin: -1 });
      };

      const appendDataSheet = (rows: any[], name: string) => {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        appendTotalsRow(worksheet, rows);
        formatNumericColumns(worksheet);
        worksheet['!cols'] = standardColWidths;
        XLSX.utils.book_append_sheet(workbook, worksheet, uniqueSheetName(name));
      };

      // One sheet per RN, exactly as before.
      codeSheets.forEach(codeSheet => appendDataSheet(codeSheet.data, codeSheet.code));

      // Then one per material, when the export was asked for them.
      robaSheets.forEach(robaSheet => appendDataSheet(robaSheet.data, robaSheet.roba));

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
