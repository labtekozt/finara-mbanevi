import { prisma } from "./prisma";
import { generateTransactionNumber } from "./transaction-number";
import { Prisma } from "@prisma/client";
import logger from "@/lib/logger";
import { ensureActivePeriod } from "./period-management";

// Account codes (these should match your chart of accounts)
export const ACCOUNT_CODES = {
  // Assets
  CASH: "1001",
  ACCOUNTS_RECEIVABLE: "1002",
  INVENTORY: "1201",

  // Liabilities
  ACCOUNTS_PAYABLE: "2001",

  // Equity
  OWNER_EQUITY: "3001",
  RETAINED_EARNINGS: "3002",

  // Revenue
  SALES_REVENUE: "4001",
  OTHER_REVENUE: "4002",

  // Expenses
  COST_OF_GOODS_SOLD: "5001",
  SALARY_EXPENSE: "5002",
  UTILITY_EXPENSE: "5003",
  OTHER_EXPENSE: "5004",
};

// Get active accounting period
// Get active accounting period
export async function getActiveAccountingPeriod(
  tx?: Prisma.TransactionClient,
  userId?: string,
) {
  const client = tx || prisma;
  
  // Delegate to period-management implementation which handles auto-closing and new period creation correctly
  const periodeId = await ensureActivePeriod(
    new Date(), 
    userId || "SYSTEM", 
    tx // Pass transaction client if available
  );

  return await client.periodeAkuntansi.findUnique({
    where: { id: periodeId },
  });
}

// Get account by code
export async function getAccountByCode(
  code: string,
  tx?: Prisma.TransactionClient,
) {
  const client = tx || prisma;
  return await client.akun.findFirst({
    where: {
      kode: code,
      isActive: true,
    },
  });
}

// Create journal entry for POS transaction
export async function createJournalEntryForSale(
  transaksiKasirId: string,
  totalAmount: number,
  userId: string,
) {
  const periode = await getActiveAccountingPeriod(undefined, userId);
  if (!periode) {
    throw new Error("Tidak ada periode akuntansi aktif");
  }

  const cashAccount = await getAccountByCode(ACCOUNT_CODES.CASH);
  const salesRevenueAccount = await getAccountByCode(
    ACCOUNT_CODES.SALES_REVENUE,
  );

  if (!cashAccount || !salesRevenueAccount) {
    throw new Error("Akun kas atau pendapatan penjualan tidak ditemukan");
  }

  const nomorJurnal = generateTransactionNumber("JR");

  const jurnalEntry = await prisma.jurnalEntry.create({
    data: {
      nomorJurnal,
      tanggal: new Date(),
      deskripsi: `Penjualan POS - ${transaksiKasirId}`,
      referensi: transaksiKasirId,
      tipeReferensi: "SALE",
      periodeId: periode.id,
      userId,
      isPosted: true,
      details: {
        create: [
          // Debit Cash (Asset increases)
          {
            akunId: cashAccount.id,
            debit: totalAmount,
            kredit: 0,
            deskripsi: "Penerimaan kas dari penjualan",
          },
          // Credit Sales Revenue (Revenue increases)
          {
            akunId: salesRevenueAccount.id,
            debit: 0,
            kredit: totalAmount,
            deskripsi: "Pendapatan dari penjualan",
          },
        ],
      },
    },
    include: {
      details: {
        include: {
          akun: true,
        },
      },
    },
  });

  return jurnalEntry;
}

// Create journal entry for inventory purchase
export async function createJournalEntryForPurchase(
  transaksiMasukId: string,
  totalAmount: number,
  userId: string,
) {
  const periode = await getActiveAccountingPeriod(undefined, userId);
  if (!periode) {
    throw new Error("Tidak ada periode akuntansi aktif");
  }

  const inventoryAccount = await getAccountByCode(ACCOUNT_CODES.INVENTORY);
  const accountsPayableAccount = await getAccountByCode(
    ACCOUNT_CODES.ACCOUNTS_PAYABLE,
  );

  if (!inventoryAccount || !accountsPayableAccount) {
    throw new Error("Akun persediaan atau hutang tidak ditemukan");
  }

  const nomorJurnal = generateTransactionNumber("JR");

  const jurnalEntry = await prisma.jurnalEntry.create({
    data: {
      nomorJurnal,
      tanggal: new Date(),
      deskripsi: `Pembelian Barang - ${transaksiMasukId}`,
      referensi: transaksiMasukId,
      tipeReferensi: "PURCHASE",
      periodeId: periode.id,
      userId,
      isPosted: true,
      details: {
        create: [
          // Debit Inventory (Asset increases)
          {
            akunId: inventoryAccount.id,
            debit: totalAmount,
            kredit: 0,
            deskripsi: "Pembelian persediaan",
          },
          // Credit Accounts Payable (Liability increases)
          {
            akunId: accountsPayableAccount.id,
            debit: 0,
            kredit: totalAmount,
            deskripsi: "Hutang pembelian",
          },
        ],
      },
    },
    include: {
      details: {
        include: {
          akun: true,
        },
      },
    },
  });

  return jurnalEntry;
}

// Create journal entry for complete sales transaction (revenue + COGS)
export async function createJournalEntryForCompleteSale(
  transaksiKasirId: string,
  totalRevenue: number,
  items: Array<{ barangId: string; qty: number; costPrice: number }>,
  userId: string,
  paymentMethod: string = "tunai",
  tx?: Prisma.TransactionClient,
) {
  const client = tx || prisma;
  const periode = await getActiveAccountingPeriod(client, userId);
  if (!periode) {
    throw new Error("Tidak ada periode akuntansi aktif");
  }

  const cashAccount = await getAccountByCode(ACCOUNT_CODES.CASH, client);
  const accountsReceivableAccount = await getAccountByCode(
    ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
    client,
  );
  const salesRevenueAccount = await getAccountByCode(
    ACCOUNT_CODES.SALES_REVENUE,
    client,
  );
  const inventoryAccount = await getAccountByCode(
    ACCOUNT_CODES.INVENTORY,
    client,
  );
  const cogsAccount = await getAccountByCode(
    ACCOUNT_CODES.COST_OF_GOODS_SOLD,
    client,
  );

  if (
    !cashAccount ||
    !accountsReceivableAccount ||
    !salesRevenueAccount ||
    !inventoryAccount ||
    !cogsAccount
  ) {
    throw new Error("Salah satu akun tidak ditemukan");
  }

  // Determine debit account based on payment method
  const isCredit = paymentMethod === "kredit";
  const debitAccount = isCredit ? accountsReceivableAccount : cashAccount;
  const debitDescription = isCredit
    ? "Piutang usaha dari penjualan kredit"
    : "Penerimaan kas dari penjualan";

  // Calculate total COGS
  const totalCOGS = items.reduce(
    (sum, item) => sum + item.qty * item.costPrice,
    0,
  );

  const nomorJurnal = generateTransactionNumber("JR");

  const jurnalEntry = await client.jurnalEntry.create({
    data: {
      nomorJurnal,
      tanggal: new Date(),
      deskripsi: `Penjualan ${isCredit ? "Kredit" : "Tunai"} - ${transaksiKasirId}`,
      referensi: transaksiKasirId,
      tipeReferensi: "SALE",
      periodeId: periode.id,
      userId,
      isPosted: true,
      details: {
        create: [
          // Debit Cash or Accounts Receivable (Asset increases)
          {
            akunId: debitAccount.id,
            debit: totalRevenue,
            kredit: 0,
            deskripsi: debitDescription,
          },
          // Debit COGS (Expense increases)
          {
            akunId: cogsAccount.id,
            debit: totalCOGS,
            kredit: 0,
            deskripsi: "Harga pokok penjualan",
          },
          // Credit Sales Revenue (Revenue increases)
          {
            akunId: salesRevenueAccount.id,
            debit: 0,
            kredit: totalRevenue,
            deskripsi: "Pendapatan dari penjualan",
          },
          // Credit Inventory (Asset decreases)
          {
            akunId: inventoryAccount.id,
            debit: 0,
            kredit: totalCOGS,
            deskripsi: "Pengurangan persediaan akibat penjualan",
          },
        ],
      },
    },
    include: {
      details: {
        include: {
          akun: true,
        },
      },
    },
  });

  return jurnalEntry;
}

// Create journal entry for cost of goods sold (COGS)
export async function createJournalEntryForCOGS(
  barangId: string,
  quantity: number,
  costPrice: number,
  userId: string,
) {
  const periode = await getActiveAccountingPeriod(undefined, userId);
  if (!periode) {
    throw new Error("Tidak ada periode akuntansi aktif");
  }

  const inventoryAccount = await getAccountByCode(ACCOUNT_CODES.INVENTORY);
  const cogsAccount = await getAccountByCode(ACCOUNT_CODES.COST_OF_GOODS_SOLD);

  if (!inventoryAccount || !cogsAccount) {
    throw new Error("Akun persediaan atau HPP tidak ditemukan");
  }

  const totalCOGS = quantity * costPrice;
  const nomorJurnal = generateTransactionNumber("JR");

  const jurnalEntry = await prisma.jurnalEntry.create({
    data: {
      nomorJurnal,
      tanggal: new Date(),
      deskripsi: `HPP Penjualan - Barang ${barangId}`,
      referensi: `COGS-${barangId}`,
      tipeReferensi: "COGS",
      periodeId: periode.id,
      userId,
      isPosted: true,
      details: {
        create: [
          // Debit COGS (Expense increases)
          {
            akunId: cogsAccount.id,
            debit: totalCOGS,
            kredit: 0,
            deskripsi: `HPP ${quantity} unit @ Rp ${costPrice.toLocaleString("id-ID")}`,
          },
          // Credit Inventory (Asset decreases)
          {
            akunId: inventoryAccount.id,
            debit: 0,
            kredit: totalCOGS,
            deskripsi: "Pengurangan persediaan akibat penjualan",
          },
        ],
      },
    },
    include: {
      details: {
        include: {
          akun: true,
        },
      },
    },
  });

  return jurnalEntry;
}

// Create journal entry for salary expense
export async function createJournalEntryForSalary(
  employeeName: string,
  amount: number,
  userId: string,
) {
  const periode = await getActiveAccountingPeriod(undefined, userId);
  if (!periode) {
    throw new Error("Tidak ada periode akuntansi aktif");
  }

  const salaryExpenseAccount = await getAccountByCode(
    ACCOUNT_CODES.SALARY_EXPENSE,
  );
  const cashAccount = await getAccountByCode(ACCOUNT_CODES.CASH);

  if (!salaryExpenseAccount || !cashAccount) {
    throw new Error("Akun gaji atau kas tidak ditemukan");
  }

  const nomorJurnal = generateTransactionNumber("JR");

  const jurnalEntry = await prisma.jurnalEntry.create({
    data: {
      nomorJurnal,
      tanggal: new Date(),
      deskripsi: `Pembayaran Gaji - ${employeeName}`,
      referensi: `SALARY-${employeeName}`,
      tipeReferensi: "EXPENSE",
      periodeId: periode.id,
      userId,
      isPosted: true,
      details: {
        create: [
          // Debit Salary Expense (Expense increases)
          {
            akunId: salaryExpenseAccount.id,
            debit: amount,
            kredit: 0,
            deskripsi: `Gaji ${employeeName}`,
          },
          // Credit Cash (Asset decreases)
          {
            akunId: cashAccount.id,
            debit: 0,
            kredit: amount,
            deskripsi: "Pembayaran gaji",
          },
        ],
      },
    },
    include: {
      details: {
        include: {
          akun: true,
        },
      },
    },
  });

  return jurnalEntry;
}

// Create journal entry for inventory adjustment (outgoing goods)
export async function createJournalEntryForInventoryAdjustment(
  transaksiKeluarId: string,
  totalAmount: number,
  userId: string,
) {
  const periode = await getActiveAccountingPeriod(undefined, userId);
  if (!periode) {
    throw new Error("Tidak ada periode akuntansi aktif");
  }

  const inventoryAccount = await getAccountByCode(ACCOUNT_CODES.INVENTORY);
  const otherExpenseAccount = await getAccountByCode(
    ACCOUNT_CODES.OTHER_EXPENSE,
  );

  if (!inventoryAccount || !otherExpenseAccount) {
    throw new Error("Akun persediaan atau beban lain tidak ditemukan");
  }

  const nomorJurnal = generateTransactionNumber("JR");

  const jurnalEntry = await prisma.jurnalEntry.create({
    data: {
      nomorJurnal,
      tanggal: new Date(),
      deskripsi: `Penyesuaian Persediaan - ${transaksiKeluarId}`,
      referensi: transaksiKeluarId,
      tipeReferensi: "ADJUSTMENT",
      periodeId: periode.id,
      userId,
      isPosted: true,
      details: {
        create: [
          // Debit Other Expense (Expense increases)
          {
            akunId: otherExpenseAccount.id,
            debit: totalAmount,
            kredit: 0,
            deskripsi: "Penyesuaian persediaan keluar",
          },
          // Credit Inventory (Asset decreases)
          {
            akunId: inventoryAccount.id,
            debit: 0,
            kredit: totalAmount,
            deskripsi: "Pengurangan persediaan",
          },
        ],
      },
    },
    include: {
      details: {
        include: {
          akun: true,
        },
      },
    },
  });

  return jurnalEntry;
}

// Reverse a journal entry (create opposite entries)
export async function reverseJournalEntry(
  tx: any,
  journalEntryId: string,
  userId: string,
) {
  const originalEntry = await tx.jurnalEntry.findUnique({
    where: { id: journalEntryId },
    include: { details: true },
  });

  if (!originalEntry) {
    throw new Error("Journal entry not found");
  }

  const nomorJurnal = generateTransactionNumber("JR");

  // Create reversing entry with opposite debits/credits
  await tx.jurnalEntry.create({
    data: {
      nomorJurnal,
      tanggal: new Date(),
      deskripsi: `Pembalikan: ${originalEntry.deskripsi}`,
      referensi: `REV-${originalEntry.id}`,
      tipeReferensi: "REVERSAL",
      periodeId: originalEntry.periodeId,
      userId,
      isPosted: true,
      details: {
        create: originalEntry.details.map((detail: any) => ({
          akunId: detail.akunId,
          debit: detail.kredit, // Swap debit and credit
          kredit: detail.debit,
          deskripsi: `Pembalikan: ${detail.deskripsi}`,
        })),
      },
    },
  });
}

// Create journal entry for expense
export async function createJournalEntryForExpense(
  tx: any,
  pengeluaran: any,
  userId: string,
) {
  const periode = await tx.periodeAkuntansi.findFirst({
    where: { isActive: true },
  });

  if (!periode) {
    throw new Error("Tidak ada periode akuntansi aktif");
  }

  // Map expense categories to account codes
  const expenseAccountMap: { [key: string]: string } = {
    GAJI_KARYAWAN: ACCOUNT_CODES.SALARY_EXPENSE,
    UTILITAS: ACCOUNT_CODES.UTILITY_EXPENSE,
    SEWA: "5005", // Rent expense
    PERLENGKAPAN_KANTOR: "5006", // Office supplies
    TRANSPORTASI: "5007", // Transportation
    PERBAIKAN: "5008", // Repairs and maintenance
    IKLAN_PROMOSI: "5009", // Advertising and promotion
    PAJAK: "5010", // Taxes
    ASURANSI: "5011", // Insurance
    LAINNYA: ACCOUNT_CODES.OTHER_EXPENSE,
  };

  const expenseAccountCode =
    expenseAccountMap[pengeluaran.kategori] || ACCOUNT_CODES.OTHER_EXPENSE;

  const expenseAccount = await tx.akun.findFirst({
    where: {
      kode: expenseAccountCode,
      isActive: true,
    },
  });

  const cashAccount = await tx.akun.findFirst({
    where: {
      kode: ACCOUNT_CODES.CASH,
      isActive: true,
    },
  });

  if (!expenseAccount || !cashAccount) {
    throw new Error("Akun pengeluaran atau kas tidak ditemukan");
  }

  const nomorJurnal = generateTransactionNumber("JR");

  const jurnalEntry = await tx.jurnalEntry.create({
    data: {
      nomorJurnal,
      tanggal: pengeluaran.tanggal,
      deskripsi: `Pengeluaran: ${pengeluaran.deskripsi}`,
      referensi: `EXP-${pengeluaran.id}`,
      tipeReferensi: "EXPENSE",
      periodeId: periode.id,
      userId,
      isPosted: true,
      details: {
        create: [
          // Debit Expense (Expense increases)
          {
            akunId: expenseAccount.id,
            debit: pengeluaran.jumlah,
            kredit: 0,
            deskripsi: pengeluaran.deskripsi,
          },
          // Credit Cash (Asset decreases)
          {
            akunId: cashAccount.id,
            debit: 0,
            kredit: pengeluaran.jumlah,
            deskripsi: `Pembayaran ke ${pengeluaran.penerima}`,
          },
        ],
      },
    },
    include: {
      details: {
        include: {
          akun: true,
        },
      },
    },
  });

  return jurnalEntry;
}

// Create journal entry for outgoing transactions based on purpose
export async function createJournalEntryForOutgoingTransaction(
  transaksiKeluarId: string,
  totalAmount: number,
  tujuan: string,
  userId: string,
  tx?: Prisma.TransactionClient,
) {
  const client = tx || prisma;
  const periode = await getActiveAccountingPeriod(client, userId);
  if (!periode) {
    throw new Error("Tidak ada periode akuntansi aktif");
  }

  const inventoryAccount = await getAccountByCode(
    ACCOUNT_CODES.INVENTORY,
    client,
  );
  const cashAccount = await getAccountByCode(ACCOUNT_CODES.CASH, client);
  const cogsAccount = await getAccountByCode(
    ACCOUNT_CODES.COST_OF_GOODS_SOLD,
    client,
  );
  const otherExpenseAccount = await getAccountByCode(
    ACCOUNT_CODES.OTHER_EXPENSE,
    client,
  );
  const otherRevenueAccount = await getAccountByCode("4002", client); // Other Revenue

  if (!inventoryAccount) {
    throw new Error("Akun persediaan tidak ditemukan");
  }

  // Determine transaction type based on purpose
  const purpose = tujuan.toLowerCase();

  // Transfer between warehouses - no journal entry needed
  if (
    purpose.includes("transfer") ||
    purpose.includes("pindah") ||
    purpose.includes("gudang")
  ) {
    return null; // No accounting entry for warehouse transfers
  }

  // Sales (non-cashier) - treat as sale
  if (
    purpose.includes("jual") ||
    purpose.includes("penjualan") ||
    purpose.includes("customer")
  ) {
    if (!cashAccount || !cogsAccount) {
      throw new Error("Akun kas atau HPP tidak ditemukan");
    }

    const nomorJurnal = generateTransactionNumber("JR");

    const jurnalEntry = await client.jurnalEntry.create({
      data: {
        nomorJurnal,
        tanggal: new Date(),
        deskripsi: `Penjualan Non-Kasir - ${transaksiKeluarId}`,
        referensi: transaksiKeluarId,
        tipeReferensi: "SALE",
        periodeId: periode.id,
        userId,
        isPosted: true,
        details: {
          create: [
            // Debit Cash (Asset increases)
            {
              akunId: cashAccount.id,
              debit: totalAmount,
              kredit: 0,
              deskripsi: "Penerimaan kas dari penjualan",
            },
            // Debit COGS (Expense increases)
            {
              akunId: cogsAccount.id,
              debit: totalAmount,
              kredit: 0,
              deskripsi: "Harga pokok penjualan",
            },
            // Credit Inventory (Asset decreases)
            {
              akunId: inventoryAccount.id,
              debit: 0,
              kredit: totalAmount,
              deskripsi: "Pengurangan persediaan akibat penjualan",
            },
          ],
        },
      },
      include: {
        details: {
          include: {
            akun: true,
          },
        },
      },
    });

    return jurnalEntry;
  }

  // Default: Adjustment/Loss - treat as expense
  if (!otherExpenseAccount) {
    throw new Error("Akun beban lain tidak ditemukan");
  }

  const nomorJurnal = generateTransactionNumber("JR");

  const jurnalEntry = await client.jurnalEntry.create({
    data: {
      nomorJurnal,
      tanggal: new Date(),
      deskripsi: `Penyesuaian Persediaan - ${transaksiKeluarId}`,
      referensi: transaksiKeluarId,
      tipeReferensi: "ADJUSTMENT",
      periodeId: periode.id,
      userId,
      isPosted: true,
      details: {
        create: [
          // Debit Other Expense (Expense increases)
          {
            akunId: otherExpenseAccount.id,
            debit: totalAmount,
            kredit: 0,
            deskripsi: "Penyesuaian persediaan keluar",
          },
          // Credit Inventory (Asset decreases)
          {
            akunId: inventoryAccount.id,
            debit: 0,
            kredit: totalAmount,
            deskripsi: "Pengurangan persediaan",
          },
        ],
      },
    },
    include: {
      details: {
        include: {
          akun: true,
        },
      },
    },
  });

  return jurnalEntry;
}

// Create journal entry for purchase return (supplier)
export async function createJournalEntryForPurchaseReturn(
  returnId: string,
  totalAmount: number,
  isCashPurchase: boolean,
  userId: string,
  tx?: Prisma.TransactionClient,
) {
  const client = tx || prisma;
  const periode = await getActiveAccountingPeriod(client, userId);
  if (!periode) {
    throw new Error("Tidak ada periode akuntansi aktif");
  }

  const salesRevenueAccount = await getAccountByCode(
    ACCOUNT_CODES.SALES_REVENUE,
    client,
  );
  const accountsPayableAccount = await getAccountByCode(
    ACCOUNT_CODES.ACCOUNTS_PAYABLE,
    client,
  );
  const cashAccount = await getAccountByCode(ACCOUNT_CODES.CASH, client);

  if (!salesRevenueAccount) {
    throw new Error("Akun pendapatan penjualan tidak ditemukan");
  }

  if (!isCashPurchase && !accountsPayableAccount) {
    throw new Error("Akun hutang tidak ditemukan");
  }

  if (isCashPurchase && !cashAccount) {
    throw new Error("Akun kas tidak ditemukan");
  }

  const nomorJurnal = generateTransactionNumber("JR");

  logger.log("Creating Purchase Return Journal (Revenue Correction):", {
    returnId,
    totalAmount,
    isCashPurchase,
    userId,
  });

  const jurnalEntry = await client.jurnalEntry.create({
    data: {
      nomorJurnal,
      tanggal: new Date(),
      deskripsi: `Retur Pembelian (Koreksi Pendapatan) ${isCashPurchase ? "Tunai" : "Kredit"} - ${returnId}`,
      referensi: returnId,
      tipeReferensi: "PURCHASE_RETURN",
      periodeId: periode.id,
      userId,
      isPosted: true,
      details: {
        create: isCashPurchase
          ? [
              // Jika pembelian tunai: Debit Sales Revenue, Credit Cash (mengurangi pendapatan dan kas)
              {
                akunId: salesRevenueAccount.id,
                debit: totalAmount,
                kredit: 0,
                deskripsi:
                  "Koreksi pendapatan dari pembelian yang salah dicatat",
              },
              {
                akunId: cashAccount!.id,
                debit: 0,
                kredit: totalAmount,
                deskripsi: "Pengembalian kas dari supplier",
              },
            ]
          : [
              // Jika pembelian kredit: Debit Sales Revenue, Credit Accounts Payable (mengurangi pendapatan dan hutang)
              {
                akunId: salesRevenueAccount.id,
                debit: totalAmount,
                kredit: 0,
                deskripsi:
                  "Koreksi pendapatan dari pembelian yang salah dicatat",
              },
              {
                akunId: accountsPayableAccount!.id,
                debit: 0,
                kredit: totalAmount,
                deskripsi: "Pengurangan hutang supplier",
              },
            ],
      },
    },
    include: {
      details: {
        include: {
          akun: true,
        },
      },
    },
  });

  return jurnalEntry;
}

// Create journal entry for sales return (customer)
export async function createJournalEntryForSalesReturn(
  returnId: string,
  totalRevenue: number,
  totalCOGS: number,
  paymentMethod: string,
  userId: string,
  tx?: Prisma.TransactionClient,
) {
  const client = tx || prisma;
  const periode = await getActiveAccountingPeriod(client, userId);
  if (!periode) {
    throw new Error("Tidak ada periode akuntansi aktif");
  }

  const cashAccount = await getAccountByCode(ACCOUNT_CODES.CASH, client);
  const accountsReceivableAccount = await getAccountByCode(
    ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
    client,
  );
  const salesRevenueAccount = await getAccountByCode(
    ACCOUNT_CODES.SALES_REVENUE,
    client,
  );
  const inventoryAccount = await getAccountByCode(
    ACCOUNT_CODES.INVENTORY,
    client,
  );
  const cogsAccount = await getAccountByCode(
    ACCOUNT_CODES.COST_OF_GOODS_SOLD,
    client,
  );

  if (!salesRevenueAccount || !inventoryAccount || !cogsAccount) {
    throw new Error("Akun pendapatan, persediaan, atau HPP tidak ditemukan");
  }

  // Determine which account to use for refund based on payment method
  const isCashSale =
    paymentMethod.toLowerCase().includes("tunai") ||
    paymentMethod.toLowerCase().includes("cash") ||
    paymentMethod === "tunai";

  const refundAccount = isCashSale ? cashAccount : accountsReceivableAccount;

  if (!refundAccount) {
    throw new Error(`Akun ${isCashSale ? "kas" : "piutang"} tidak ditemukan`);
  }

  const nomorJurnal = generateTransactionNumber("JR");

  const jurnalEntry = await client.jurnalEntry.create({
    data: {
      nomorJurnal,
      tanggal: new Date(),
      deskripsi: `Retur Penjualan ${isCashSale ? "Tunai" : "Kredit"} - ${returnId}`,
      referensi: returnId,
      tipeReferensi: "SALES_RETURN",
      periodeId: periode.id,
      userId,
      isPosted: true,
      details: {
        create: [
          // Debit Sales Revenue (Revenue decreases)
          {
            akunId: salesRevenueAccount.id,
            debit: totalRevenue,
            kredit: 0,
            deskripsi: "Pengurangan pendapatan penjualan",
          },
          // Debit Inventory (Asset increases - goods returned)
          {
            akunId: inventoryAccount.id,
            debit: totalCOGS,
            kredit: 0,
            deskripsi: "Barang dikembalikan ke persediaan",
          },
          // Credit Cash/Accounts Receivable (Asset/Liability decreases - refund)
          {
            akunId: refundAccount.id,
            debit: 0,
            kredit: totalRevenue,
            deskripsi: `Pengembalian ${isCashSale ? "uang tunai" : "piutang"} ke pelanggan`,
          },
          // Credit COGS (Expense decreases - reverse COGS)
          {
            akunId: cogsAccount.id,
            debit: 0,
            kredit: totalCOGS,
            deskripsi: "Pembatalan harga pokok penjualan",
          },
        ],
      },
    },
    include: {
      details: {
        include: {
          akun: true,
        },
      },
    },
  });

  return jurnalEntry;
}

// Create journal entry for stock adjustment (stock opname)
export async function createJournalEntryForStockAdjustment(
  adjustmentId: string,
  adjustmentAmount: number, // Positive = increase, Negative = decrease
  isIncrease: boolean,
  userId: string,
  tx?: Prisma.TransactionClient,
) {
  const client = tx || prisma;
  const periode = await getActiveAccountingPeriod(client, userId);
  if (!periode) {
    throw new Error("Tidak ada periode akuntansi aktif");
  }

  const inventoryAccount = await getAccountByCode(
    ACCOUNT_CODES.INVENTORY,
    client,
  );
  const otherExpenseAccount = await getAccountByCode(
    ACCOUNT_CODES.OTHER_EXPENSE,
    client,
  );
  const otherRevenueAccount = await getAccountByCode("4002", client); // Other Revenue

  if (!inventoryAccount || !otherExpenseAccount || !otherRevenueAccount) {
    throw new Error(
      "Akun persediaan, beban lain, atau pendapatan lain tidak ditemukan",
    );
  }

  const nomorJurnal = generateTransactionNumber("JR");
  const absAmount = Math.abs(adjustmentAmount);

  const jurnalEntry = await client.jurnalEntry.create({
    data: {
      nomorJurnal,
      tanggal: new Date(),
      deskripsi: `Penyesuaian Stok Opname - ${adjustmentId}`,
      referensi: adjustmentId,
      tipeReferensi: "STOCK_ADJUSTMENT",
      periodeId: periode.id,
      userId,
      isPosted: true,
      details: {
        create: isIncrease
          ? [
              // Stock increase (found extra stock)
              // Debit Inventory (Asset increases)
              {
                akunId: inventoryAccount.id,
                debit: absAmount,
                kredit: 0,
                deskripsi: "Penambahan persediaan dari stock opname",
              },
              // Credit Other Revenue (Revenue increases)
              {
                akunId: otherRevenueAccount.id,
                debit: 0,
                kredit: absAmount,
                deskripsi: "Pendapatan dari penyesuaian persediaan",
              },
            ]
          : [
              // Stock decrease (missing stock)
              // Debit Other Expense (Expense increases)
              {
                akunId: otherExpenseAccount.id,
                debit: absAmount,
                kredit: 0,
                deskripsi: "Beban susut persediaan",
              },
              // Credit Inventory (Asset decreases)
              {
                akunId: inventoryAccount.id,
                debit: 0,
                kredit: absAmount,
                deskripsi: "Pengurangan persediaan dari stock opname",
              },
            ],
      },
    },
    include: {
      details: {
        include: {
          akun: true,
        },
      },
    },
  });

  return jurnalEntry;
}

// Create journal entry for stock addition based on reason
export async function createJournalEntryForStockAddition(
  transaksiMasukId: string,
  totalAmount: number,
  reason: "PURCHASE" | "STOCK_OPNAME_SURPLUS" | "INTERNAL_ADJUSTMENT",
  userId: string,
  paymentMethod?: "CASH" | "CREDIT",
  tx?: Prisma.TransactionClient,
) {
  const client = tx || prisma;
  const periode = await getActiveAccountingPeriod(client, userId);
  if (!periode) {
    throw new Error("Tidak ada periode akuntansi aktif");
  }

  const inventoryAccount = await getAccountByCode(
    ACCOUNT_CODES.INVENTORY,
    client,
  );
  const cashAccount = await getAccountByCode(ACCOUNT_CODES.CASH, client);
  const accountsPayableAccount = await getAccountByCode(
    ACCOUNT_CODES.ACCOUNTS_PAYABLE,
    client,
  );
  const otherRevenueAccount = await getAccountByCode(
    ACCOUNT_CODES.OTHER_REVENUE,
    client,
  );

  if (!inventoryAccount) {
    throw new Error("Akun persediaan tidak ditemukan");
  }

  const nomorJurnal = generateTransactionNumber("JR");

  let jurnalEntry;

  switch (reason) {
    case "PURCHASE":
      // Pembelian: Persediaan (Dr) + Kas/Utang (Cr)
      if (!cashAccount || !accountsPayableAccount) {
        throw new Error("Akun kas atau hutang tidak ditemukan");
      }

      const creditAccount =
        paymentMethod === "CASH" ? cashAccount : accountsPayableAccount;

      jurnalEntry = await client.jurnalEntry.create({
        data: {
          nomorJurnal,
          tanggal: new Date(),
          deskripsi: `Pembelian Barang - ${transaksiMasukId}`,
          referensi: transaksiMasukId,
          tipeReferensi: "PURCHASE",
          periodeId: periode.id,
          userId,
          isPosted: true,
          details: {
            create: [
              // Debit Inventory (Asset increases)
              {
                akunId: inventoryAccount.id,
                debit: totalAmount,
                kredit: 0,
                deskripsi: "Pembelian persediaan",
              },
              // Credit Cash or Accounts Payable
              {
                akunId: creditAccount.id,
                debit: 0,
                kredit: totalAmount,
                deskripsi:
                  paymentMethod === "CASH"
                    ? "Pembayaran tunai"
                    : "Hutang pembelian",
              },
            ],
          },
        },
        include: {
          details: {
            include: {
              akun: true,
            },
          },
        },
      });
      break;

    case "STOCK_OPNAME_SURPLUS":
      // Stock Opname Surplus: Persediaan (Dr) + Pendapatan Lain-lain (Cr)
      if (!otherRevenueAccount) {
        throw new Error("Akun pendapatan lain-lain tidak ditemukan");
      }

      jurnalEntry = await client.jurnalEntry.create({
        data: {
          nomorJurnal,
          tanggal: new Date(),
          deskripsi: `Penyesuaian Stok Surplus - ${transaksiMasukId}`,
          referensi: transaksiMasukId,
          tipeReferensi: "STOCK_ADJUSTMENT",
          periodeId: periode.id,
          userId,
          isPosted: true,
          details: {
            create: [
              // Debit Inventory (Asset increases)
              {
                akunId: inventoryAccount.id,
                debit: totalAmount,
                kredit: 0,
                deskripsi: "Penambahan persediaan surplus",
              },
              // Credit Other Revenue
              {
                akunId: otherRevenueAccount.id,
                debit: 0,
                kredit: totalAmount,
                deskripsi: "Pendapatan dari penyesuaian stok surplus",
              },
            ],
          },
        },
        include: {
          details: {
            include: {
              akun: true,
            },
          },
        },
      });
      break;

    case "INTERNAL_ADJUSTMENT":
      // Internal Adjustment: Persediaan (Dr) + Beban Penyesuaian (Cr)
      // For internal adjustments, we might need a specific expense account
      // For now, we'll use OTHER_EXPENSE, but this could be customized
      const otherExpenseAccount = await getAccountByCode(
        ACCOUNT_CODES.OTHER_EXPENSE,
        client,
      );

      if (!otherExpenseAccount) {
        throw new Error("Akun beban lain-lain tidak ditemukan");
      }

      jurnalEntry = await client.jurnalEntry.create({
        data: {
          nomorJurnal,
          tanggal: new Date(),
          deskripsi: `Penyesuaian Internal - ${transaksiMasukId}`,
          referensi: transaksiMasukId,
          tipeReferensi: "INTERNAL_ADJUSTMENT",
          periodeId: periode.id,
          userId,
          isPosted: true,
          details: {
            create: [
              // Debit Inventory (Asset increases)
              {
                akunId: inventoryAccount.id,
                debit: totalAmount,
                kredit: 0,
                deskripsi: "Penambahan persediaan internal",
              },
              // Credit Other Expense (could be production cost, etc.)
              {
                akunId: otherExpenseAccount.id,
                debit: 0,
                kredit: totalAmount,
                deskripsi: "Beban penyesuaian internal",
              },
            ],
          },
        },
        include: {
          details: {
            include: {
              akun: true,
            },
          },
        },
      });
      break;

    default:
      throw new Error(`Tipe penambahan stok tidak valid: ${reason}`);
  }

  return jurnalEntry;
}

// Create journal entry for debt payment (Hutang)
export async function createJournalEntryForDebtPayment(
  hutangId: string,
  amount: number,
  userId: string,
  paymentMethod: string = "tunai",
  tx?: Prisma.TransactionClient,
) {
  const client = tx || prisma;
  const periode = await getActiveAccountingPeriod(client, userId);
  if (!periode) {
    throw new Error("Tidak ada periode akuntansi aktif");
  }

  const accountsPayableAccount = await getAccountByCode(
    ACCOUNT_CODES.ACCOUNTS_PAYABLE,
    client,
  );
  const cashAccount = await getAccountByCode(ACCOUNT_CODES.CASH, client);

  if (!accountsPayableAccount || !cashAccount) {
    throw new Error("Akun hutang atau kas tidak ditemukan");
  }

  const nomorJurnal = generateTransactionNumber("JR");

  const jurnalEntry = await client.jurnalEntry.create({
    data: {
      nomorJurnal,
      tanggal: new Date(),
      deskripsi: `Pembayaran Hutang - ${hutangId}`,
      referensi: hutangId,
      tipeReferensi: "DEBT_PAYMENT",
      periodeId: periode.id,
      userId,
      isPosted: true,
      details: {
        create: [
          // Debit Accounts Payable (Liability decreases)
          {
            akunId: accountsPayableAccount.id,
            debit: amount,
            kredit: 0,
            deskripsi: "Pembayaran hutang usaha",
          },
          // Credit Cash (Asset decreases)
          {
            akunId: cashAccount.id,
            debit: 0,
            kredit: amount,
            deskripsi: `Pembayaran hutang via ${paymentMethod}`,
          },
        ],
      },
    },
    include: {
      details: {
        include: {
          akun: true,
        },
      },
    },
  });

  return jurnalEntry;
}

// Create journal entry for receivable payment (Piutang)
export async function createJournalEntryForReceivablePayment(
  piutangId: string,
  amount: number,
  userId: string,
  paymentMethod: string = "tunai",
  tx?: Prisma.TransactionClient,
) {
  const client = tx || prisma;
  const periode = await getActiveAccountingPeriod(client, userId);
  if (!periode) {
    throw new Error("Tidak ada periode akuntansi aktif");
  }

  const accountsReceivableAccount = await getAccountByCode(
    ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
    client,
  );
  const cashAccount = await getAccountByCode(ACCOUNT_CODES.CASH, client);

  if (!accountsReceivableAccount || !cashAccount) {
    throw new Error("Akun piutang atau kas tidak ditemukan");
  }

  const nomorJurnal = generateTransactionNumber("JR");

  const jurnalEntry = await client.jurnalEntry.create({
    data: {
      nomorJurnal,
      tanggal: new Date(),
      deskripsi: `Penerimaan Piutang - ${piutangId}`,
      referensi: piutangId,
      tipeReferensi: "RECEIVABLE_PAYMENT",
      periodeId: periode.id,
      userId,
      isPosted: true,
      details: {
        create: [
          // Debit Cash (Asset increases)
          {
            akunId: cashAccount.id,
            debit: amount,
            kredit: 0,
            deskripsi: `Penerimaan piutang via ${paymentMethod}`,
          },
          // Credit Accounts Receivable (Asset decreases)
          {
            akunId: accountsReceivableAccount.id,
            debit: 0,
            kredit: amount,
            deskripsi: "Pelunasan piutang usaha",
          },
        ],
      },
    },
    include: {
      details: {
        include: {
          akun: true,
        },
      },
    },
  });

  return jurnalEntry;
}


