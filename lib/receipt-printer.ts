/**
 * Receipt Printer Utility for 58mm Thermal Paper
 *
 * Best practices for thermal receipt printing:
 * 1. Use monospace fonts for alignment
 * 2. Paper width: 50mm effective (58mm with margins) = ~28 characters
 * 3. Avoid colors (thermal printers are monochrome)
 * 4. Use CSS print media queries
 * 5. Keep font size readable (9-11pt)
 */

export interface ReceiptData {
  nomorTransaksi: string;
  tanggal: Date;
  kasir: string;
  metodePembayaran: string;
  items: Array<{
    nama: string;
    qty: number;
    harga: number;
    subtotal: number;
  }>;
  subtotal: number;
  pajak?: number;
  total: number;
  bayar: number;
  kembalian: number;
  catatan?: string;
  belumDiambil?: boolean;
  pelanggan?: {
    nama: string;
    nomorHp: string;
  };
}

export interface StoreSettings {
  namaToko: string;
  alamat?: string;
  nomorTelepon?: string;
  email?: string;
  tagline?: string;
  footerText?: string;
  pajak?: number;
  includePajak?: boolean;
}

/**
 * Generate HTML for thermal receipt (58mm width)
 */
export function generateReceiptHTML(
  data: ReceiptData,
  settings: StoreSettings,
): string {
  const {
    nomorTransaksi,
    tanggal,
    kasir,
    metodePembayaran,
    items,
    subtotal,
    pajak = 0,
    total,
    bayar,
    kembalian,
    catatan,
    belumDiambil,
    pelanggan,
  } = data;

  // Compact currency format for small paper width
  const formatCurrency = (amount: number, compact = false) => {
    const formatted = new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
    }).format(amount);
    
    // For compact mode (in tables), remove "Rp" to save space
    return compact ? formatted : `Rp${formatted}`;
  };

  // Get responsive font size class based on amount length
  const getAmountClass = (amount: number) => {
    const formatted = formatCurrency(amount, true);
    if (formatted.length > 12) return "x-small"; // > 999 juta
    if (formatted.length > 10) return "xx-small"; // > 99 juta
    if (formatted.length > 8) return "small"; // > 9 juta
    return "";
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  // Helper to pad text for alignment (50mm with margins = ~28 chars)
  const LINE_WIDTH = 28;
  const padLine = (left: string, right: string) => {
    const spaces = LINE_WIDTH - left.length - right.length;
    return left + " ".repeat(Math.max(0, spaces)) + right;
  };

  const separator = "=".repeat(LINE_WIDTH);
  const dashedLine = "-".repeat(LINE_WIDTH);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Struk - ${nomorTransaksi}</title>
  <style>
    @media print {
      @page {
        size: 50mm auto;
        margin: 0;
      }
      
      body {
        margin: 0;
        padding: 0;
      }
      
      .no-print {
        display: none !important;
      }
    }
    
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      font-weight: 600;
      line-height: 1.3;
      width: 50mm;
      margin: 0 auto;
      padding: 4mm 2mm;
      background: white;
      color: black;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .receipt {
      width: 100%;
    }
    
    .center {
      text-align: center;
    }
    
    .bold {
      font-weight: 700;
    }
    
    .large {
      font-size: 12pt;
      font-weight: 700;
    }
    
    .small {
      font-size: 8pt;
      font-weight: 600;
    }
    
    .x-small {
      font-size: 7pt;
      font-weight: 600;
    }
    
    .xx-small {
      font-size: 6pt;
      font-weight: 600;
    }
    
    .separator {
      margin: 3mm 0;
      border: none;
      border-top: 1px solid #000;
    }
    
    .dashed {
      border-top: 1px dashed #000;
    }
    
    .item-row {
      display: flex;
      justify-content: space-between;
      margin: 2mm 0;
    }
    
    .item-name {
      flex: 1;
      word-break: break-word;
    }
    
    .item-qty-price {
      font-size: 9pt;
      color: #333;
    }
    
    .item-total {
      text-align: right;
      word-break: break-word;
      max-width: 50%;
      line-height: 1.2;
    }
    
    .amount {
      font-weight: 700;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    .amount-cell {
      text-align: right;
      word-break: break-word;
      hyphens: none;
      min-width: 0;
    }
    
    .total-section {
      margin-top: 3mm;
      padding-top: 2mm;
      border-top: 2px solid #000;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin: 1mm 0;
      gap: 2mm;
    }
    
    .grand-total {
      font-size: 11pt;
      font-weight: bold;
      margin: 2mm 0;
    }
    
    .grand-total .amount-cell {
      font-size: 10pt;
    }
    
    .grand-total .x-small {
      font-size: 8pt;
    }
    
    .grand-total .xx-small {
      font-size: 7pt;
    }
    
    .footer {
      margin-top: 5mm;
      padding-top: 3mm;
      border-top: 1px dashed #000;
    }
    
    .print-button {
      margin: 10px auto;
      display: block;
      padding: 10px 30px;
      background: #000;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14pt;
    }
    
    .print-button:hover {
      background: #333;
    }
    
    .badge {
      display: inline-block;
      padding: 2px 6px;
      background: #000;
      color: white;
      font-size: 9pt;
      border-radius: 3px;
      margin: 2mm 0;
    }
  </style>
</head>
<body onload="setTimeout(() => window.print(), 100)">
  <button class="print-button no-print" onclick="window.print()">🖨️ Cetak Struk</button>
  
  <div class="receipt">
    <!-- Header -->
    <div class="center">
      <div class="bold large">${settings.namaToko}</div>
      ${settings.alamat ? `<div class="small">${settings.alamat}</div>` : ""}
      ${settings.nomorTelepon ? `<div class="small">Telp: ${settings.nomorTelepon}</div>` : ""}
      ${settings.email ? `<div class="small">${settings.email}</div>` : ""}
      ${settings.tagline ? `<div class="small" style="font-style: italic; margin-top: 2mm;">${settings.tagline}</div>` : ""}
    </div>
    
    <hr class="separator">
    
    <!-- Transaction Info -->
    <div class="small">
      <div>${padLine("No. Transaksi:", nomorTransaksi)}</div>
      <div>${padLine("Tanggal:", formatDate(tanggal))}</div>
      <div>${padLine("Kasir:", kasir)}</div>
      <div>${padLine("Pembayaran:", metodePembayaran.toUpperCase())}</div>
    </div>
    
    ${
      belumDiambil && pelanggan
        ? `
    <div class="center">
      <span class="badge">BELUM DIAMBIL</span>
    </div>
    <div class="small">
      <div>${padLine("Nama:", pelanggan.nama)}</div>
      <div>${padLine("HP:", pelanggan.nomorHp)}</div>
    </div>
    `
        : ""
    }
    
    <hr class="separator dashed">
    
    <!-- Items -->
    <div>
      ${items
        .map(
          (item) => `
        <div style="margin: 3mm 0;">
          <div class="bold">${item.nama}</div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 2mm;">
            <span class="small" style="flex-shrink: 0;">${item.qty} x ${formatCurrency(item.harga, true)}</span>
            <span class="amount amount-cell ${getAmountClass(item.subtotal)}" style="flex: 1;">Rp${formatCurrency(item.subtotal, true)}</span>
          </div>
        </div>
      `,
        )
        .join("")}
    </div>
    
    <hr class="separator">
    
    <!-- Totals -->
    <div class="total-section">
      <div class="total-row">
        <span>Subtotal:</span>
        <span class="amount amount-cell ${getAmountClass(subtotal)}">${formatCurrency(subtotal)}</span>
      </div>
      
      ${
        settings.includePajak && pajak > 0
          ? `
      <div class="total-row small">
        <span>Pajak (${settings.pajak}%):</span>
        <span class="amount-cell ${getAmountClass(pajak)}">${formatCurrency(pajak)}</span>
      </div>
      `
          : ""
      }
      
      <div class="total-row grand-total" style="align-items: flex-end;">
        <span style="flex-shrink: 0;">TOTAL:</span>
        <span class="amount-cell ${getAmountClass(total)}" style="flex: 1;">${formatCurrency(total)}</span>
      </div>
      
      ${
        metodePembayaran === "tunai"
          ? `
      <div class="total-row">
        <span style="flex-shrink: 0;">Bayar:</span>
        <span class="amount-cell ${getAmountClass(bayar)}" style="flex: 1;">${formatCurrency(bayar)}</span>
      </div>
      <div class="total-row bold" style="align-items: flex-end;">
        <span style="flex-shrink: 0;">Kembali:</span>
        <span class="amount-cell ${getAmountClass(kembalian)}" style="flex: 1;">${formatCurrency(kembalian)}</span>
      </div>
      `
          : ""
      }
    </div>
    
    ${
      catatan
        ? `
    <hr class="separator dashed">
    <div class="small">
      <div class="bold">Catatan:</div>
      <div>${catatan}</div>
    </div>
    `
        : ""
    }
    
    <!-- Footer -->
    <div class="footer center small">
      ${settings.footerText || "Terima kasih atas kunjungan Anda"}
      <div style="margin-top: 3mm;">
        Barang yang sudah dibeli tidak dapat<br>
        dikembalikan kecuali ada kesepakatan
      </div>
    </div>
    
    <div class="center" style="margin-top: 5mm;">
      <div class="small">*** SIMPAN STRUK INI ***</div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Open receipt in new window and trigger print dialog
 */
export function printReceipt(data: ReceiptData, settings: StoreSettings) {
  const html = generateReceiptHTML(data, settings);
  const printWindow = window.open("", "_blank", "width=300,height=600");

  if (!printWindow) {
    throw new Error(
      "Pop-up diblokir! Mohon izinkan pop-up untuk mencetak struk.",
    );
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load before printing
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();

      // Auto-close after printing (user can cancel)
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    }, 250);
  };
}

/**
 * Generate receipt data from transaction
 */
export function formatReceiptData(
  transaction: any,
  storeSettings: StoreSettings,
): ReceiptData {
  // Handle both items (from frontend state) and itemTransaksi (from API response)
  const rawItems = transaction.items || transaction.itemTransaksi || [];

  const subtotal = rawItems.reduce(
    (sum: number, item: any) => sum + (Number(item.subtotal) || 0),
    0,
  );

  const pajakAmount = storeSettings.includePajak
    ? (subtotal * (storeSettings.pajak || 0)) / 100
    : 0;

  const total = subtotal + pajakAmount;

  return {
    nomorTransaksi: transaction.nomorTransaksi,
    tanggal: new Date(transaction.tanggal),
    kasir: transaction.kasir?.nama || "Kasir",
    metodePembayaran: transaction.metodePembayaran,
    items: rawItems.map((item: any) => ({
      nama: item.namaBarang || item.barang?.nama || item.nama,
      qty: item.qty,
      harga: Number(item.hargaSatuan) || Number(item.harga) || 0,
      subtotal: Number(item.subtotal) || 0,
    })),
    subtotal,
    pajak: pajakAmount,
    total,
    bayar:
      Number(transaction.bayar) || Number(transaction.jumlahBayar) || total,
    kembalian: Number(transaction.kembalian) || 0,
    catatan: transaction.catatan,
    belumDiambil: transaction.belumDiambil,
    pelanggan:
      transaction.pelangganNama || transaction.namaPelanggan
        ? {
            nama: transaction.pelangganNama || transaction.namaPelanggan,
            nomorHp:
              transaction.pelangganHp || transaction.nomorHpPelanggan || "",
          }
        : undefined,
  };
}
