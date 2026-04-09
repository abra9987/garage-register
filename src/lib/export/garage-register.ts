import ExcelJS from "exceljs";

// ---- Types ----

export interface VehicleExportData {
  jobNumber: string | null;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  color: string | null;
  odometer: number | null;
  sellerName: string | null;
  sellerAddress: string | null;
  buyerName: string | null;
  buyerAddress: string | null;
  purchaseDate: string | null; // "YYYY-MM-DD" from Drizzle date column
  saleDate: string | null; // "YYYY-MM-DD" from Drizzle date column
}

// ---- Constants ----

/** Cell formatting matching Ministry of Transportation Ontario Garage Register template */
const BORDER_COLOR: Partial<ExcelJS.Color> = { argb: "FF000000" }; // indexed 64 = automatic/black

const DATA_CELL_STYLE: Partial<ExcelJS.Style> = {
  font: { name: "Aptos Narrow", size: 12 },
  border: {
    left: { style: "thin", color: BORDER_COLOR },
    right: { style: "thin", color: BORDER_COLOR },
    top: { style: "thin", color: BORDER_COLOR },
    bottom: { style: "thin", color: BORDER_COLOR },
  },
};

const DATE_NUM_FMT = "mm-dd-yy";

/** Column widths matching Ministry template (17 columns, A through Q) */
const COLUMN_WIDTHS = [
  7.5, // A: spacer
  9.66, // B: notes
  17.66, // C: Internal # (jobNumber)
  37.33, // D: Purchased From - Name
  48.66, // E: Purchased From - Address
  14.83, // F: Make
  43.83, // G: Style/Model
  6.5, // H: Year
  23.33, // I: Serial No. (VIN)
  14.83, // J: Colour
  11.33, // K: Odometer Reading
  0.33, // L: Plate No. (hidden)
  12.83, // M: Date into Stock
  12.83, // N: Re-sale/wrecking
  14.33, // O: Date out of Stock
  38.0, // P: Sold To - Name
  81.83, // Q: Sold To - Address
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ---- Helpers ----

/**
 * Convert an ISO date string ("YYYY-MM-DD") to a JavaScript Date object for Excel.
 * Pitfall 1: ExcelJS needs Date objects (not strings) to write proper date cells with numFmt.
 * Adding T00:00:00 prevents timezone shift issues.
 */
function parseExcelDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

/**
 * Format odometer as "N km" with comma-separated thousands.
 * Pitfall 3: Ministry template uses text like "43,588 km", not a numeric field.
 */
function formatOdometer(odometer: number): string {
  return odometer.toLocaleString() + " km";
}

/**
 * Build the 17-value row array for a single vehicle record.
 * Shared between generateNew and appendToExisting to avoid duplication.
 */
function buildRowValues(
  record: VehicleExportData,
): (string | number | Date | null)[] {
  return [
    null, // Col A: spacer
    null, // Col B: notes (empty for auto-export)
    record.jobNumber, // Col C: Internal #
    record.sellerName, // Col D: Purchased From - Name
    record.sellerAddress, // Col E: Purchased From - Address
    record.make, // Col F: Make
    record.model, // Col G: Style/Model
    record.year, // Col H: Year (number type)
    record.vin, // Col I: Serial No.
    record.color, // Col J: Colour
    record.odometer !== null ? formatOdometer(record.odometer) : null, // Col K: Odometer
    null, // Col L: Plate No. (always empty)
    record.purchaseDate ? parseExcelDate(record.purchaseDate) : null, // Col M: Date into Stock
    "Export", // Col N: always "Export" for AD Auto
    record.saleDate ? parseExcelDate(record.saleDate) : null, // Col O: Date out of Stock
    record.buyerName, // Col P: Sold To - Name
    record.buyerAddress, // Col Q: Sold To - Address
  ];
}

/**
 * Apply Ministry data cell formatting to every cell in a row.
 */
function applyDataCellStyle(row: ExcelJS.Row): void {
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = { ...DATA_CELL_STYLE.font } as ExcelJS.Font;
    cell.border = { ...DATA_CELL_STYLE.border } as ExcelJS.Borders;
    // Date formatting for purchase date (col 13) and sale date (col 15)
    if (colNumber === 13 || colNumber === 15) {
      cell.numFmt = DATE_NUM_FMT;
    }
  });
}

/**
 * Get year and month key from an ISO date string for grouping.
 * Returns { year, month, key } or null if date is missing.
 */
function getMonthKey(dateStr: string | null): {
  year: number;
  month: number;
  key: string;
} | null {
  if (!dateStr) return null;
  const [yearStr, monthStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  return { year, month, key: `${year}-${month}` };
}

/**
 * Set column widths on a worksheet to match Ministry template.
 */
function setColumnWidths(ws: ExcelJS.Worksheet): void {
  ws.columns = COLUMN_WIDTHS.map((width) => ({ width }));
}

// ---- Header Rows ----

/**
 * Add Ministry header rows to a new worksheet.
 * Row 1: Title merged across C1:Q1
 * Row 4-5: Column headers with merged cells
 */
function addHeaderRows(ws: ExcelJS.Worksheet): void {
  // Row 1: Title
  const titleRow = ws.getRow(1);
  titleRow.height = 29;
  ws.mergeCells("C1:Q1");
  const titleCell = ws.getCell("C1");
  titleCell.value = "GARAGE REGISTER / INSCRIPTION DE GARAGE";
  titleCell.font = { name: "Aptos Narrow", size: 14, bold: true };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  // Row 3: Notes row (merged C3:M3)
  ws.mergeCells("C3:M3");

  // Row 4-5: Column headers (merged cells for group headers)
  // Group merges
  ws.mergeCells("B4:B5"); // notes col header
  ws.mergeCells("C4:C5"); // Internal #
  ws.mergeCells("D4:E4"); // Purchased From group
  ws.mergeCells("F4:J4"); // Vehicle Details group
  ws.mergeCells("K4:K5"); // Odometer
  ws.mergeCells("L4:L5"); // Plate No
  ws.mergeCells("M4:M5"); // Date into Stock
  ws.mergeCells("N4:N5"); // Re-sale/wrecking
  ws.mergeCells("O4:O5"); // Date out of Stock
  ws.mergeCells("P4:Q4"); // Sold To group

  const headerFont: Partial<ExcelJS.Font> = {
    name: "Aptos Narrow",
    size: 12,
    bold: true,
  };
  const headerBorder: Partial<ExcelJS.Borders> = {
    left: { style: "thin", color: BORDER_COLOR },
    right: { style: "thin", color: BORDER_COLOR },
    top: { style: "thin", color: BORDER_COLOR },
    bottom: { style: "thin", color: BORDER_COLOR },
  };
  const headerAlign: Partial<ExcelJS.Alignment> = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  // Row 4: Group headers
  const row4 = ws.getRow(4);
  const row4Headers: Record<number, string> = {
    3: "Internal #",
    4: "Purchased From",
    6: "Vehicle Details",
    11: "Odometer\nReading",
    12: "Plate\nNo.",
    13: "Date into\nStock",
    14: "Re-sale/\nwrecking/\nConsignment",
    15: "Date out\nof Stock",
    16: "Sold To",
  };

  for (const [col, text] of Object.entries(row4Headers)) {
    const cell = row4.getCell(parseInt(col, 10));
    cell.value = text;
    cell.font = headerFont;
    cell.border = headerBorder;
    cell.alignment = headerAlign;
  }

  // Row 5: Sub-headers (only for groups that have sub-columns)
  const row5 = ws.getRow(5);
  const row5Headers: Record<number, string> = {
    4: "Name / Nom",
    5: "Address / Adresse",
    6: "Make / Marque",
    7: "Style / Modele",
    8: "Year",
    9: "Serial No. / No de serie",
    10: "Colour",
    16: "Name / Nom",
    17: "Address / Adresse",
  };

  for (const [col, text] of Object.entries(row5Headers)) {
    const cell = row5.getCell(parseInt(col, 10));
    cell.value = text;
    cell.font = headerFont;
    cell.border = headerBorder;
    cell.alignment = headerAlign;
  }

  // Apply borders to empty merged cells in rows 4-5 for consistent grid
  for (let col = 3; col <= 17; col++) {
    const cell4 = row4.getCell(col);
    if (!cell4.font?.bold) {
      cell4.font = headerFont;
      cell4.border = headerBorder;
      cell4.alignment = headerAlign;
    }
    const cell5 = row5.getCell(col);
    if (!cell5.font?.bold) {
      cell5.font = headerFont;
      cell5.border = headerBorder;
      cell5.alignment = headerAlign;
    }
  }
}

/**
 * Add a month separator row with yellow fill.
 * Format: "YYYY MonthName" in column C.
 */
function addMonthSeparator(
  ws: ExcelJS.Worksheet,
  year: number,
  month: number,
): void {
  const label = `${year} ${MONTH_NAMES[month - 1]}`;
  const rowValues: (string | null)[] = new Array(17).fill(null);
  rowValues[2] = label; // Col C (index 2 in 0-based, but addRow uses 1-based via array index)

  const row = ws.addRow([null, null, label]);
  row.eachCell({ includeEmpty: false }, (cell) => {
    cell.font = { name: "Aptos Narrow", size: 12 };
  });

  // Apply yellow fill to entire row span (cols 1-17)
  for (let col = 1; col <= 17; col++) {
    const cell = row.getCell(col);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFF00" },
    };
    cell.font = { name: "Aptos Narrow", size: 12 };
  }
}

// ---- Public Functions ----

/**
 * Generate a new Garage Register XLSX from scratch with Ministry formatting.
 * D-41 mode 1: Creates a fresh workbook with headers, month separators, and data rows.
 *
 * Records are sorted by purchaseDate ascending and grouped by month.
 * Each month group is preceded by a yellow separator row.
 */
export async function generateNewGarageRegister(
  records: VehicleExportData[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "AD Auto Garage Register";
  const ws = wb.addWorksheet("Garage Register");

  // Set column widths to match Ministry template
  setColumnWidths(ws);

  // Add header rows (title, column headers at rows 4-5)
  addHeaderRows(ws);

  // Sort records by purchaseDate ascending (null dates go last)
  const sorted = [...records].sort((a, b) => {
    if (!a.purchaseDate && !b.purchaseDate) return 0;
    if (!a.purchaseDate) return 1;
    if (!b.purchaseDate) return -1;
    return a.purchaseDate.localeCompare(b.purchaseDate);
  });

  // Group by month and add separator rows
  let currentMonthKey: string | null = null;

  for (const record of sorted) {
    const monthInfo = getMonthKey(record.purchaseDate);
    const monthKey = monthInfo?.key ?? "unknown";

    // Add month separator if this is a new month
    if (monthKey !== currentMonthKey && monthInfo) {
      addMonthSeparator(ws, monthInfo.year, monthInfo.month);
      currentMonthKey = monthKey;
    }

    // Add data row
    const rowValues = buildRowValues(record);
    const row = ws.addRow(rowValues);
    applyDataCellStyle(row);
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Append vehicle records to an existing Garage Register XLSX.
 * D-41 mode 2, D-42, D-43: Loads existing file, appends rows to last sheet,
 * copies styles from the last existing data row for consistent formatting.
 *
 * Pitfall 2: ExcelJS addRow() does not inherit styles -- styles must be copied explicitly.
 */
export async function appendToExistingRegister(
  existingBuffer: Buffer,
  records: VehicleExportData[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ExcelJS types expect old Buffer, TS 5.9+ has Buffer<ArrayBufferLike>
  await wb.xlsx.load(existingBuffer as any);

  // Get the last worksheet (typically current year data sheet)
  const ws = wb.worksheets[wb.worksheets.length - 1];

  // Get last row for style reference
  const lastRowNum = ws.lastRow?.number ?? 7;
  const styleRefRow = ws.getRow(lastRowNum);

  for (const record of records) {
    const rowValues = buildRowValues(record);
    const newRow = ws.addRow(rowValues);

    // Copy styles from reference row (Pitfall 2: addRow doesn't inherit styles)
    styleRefRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const newCell = newRow.getCell(colNumber);
      newCell.style = { ...cell.style };
    });

    // Explicitly set numFmt on date cells (style copy may not preserve numFmt)
    if (newRow.getCell(13).value) {
      newRow.getCell(13).numFmt = DATE_NUM_FMT;
    }
    if (newRow.getCell(15).value) {
      newRow.getCell(15).numFmt = DATE_NUM_FMT;
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
