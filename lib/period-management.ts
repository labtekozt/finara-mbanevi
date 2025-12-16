/**
 * Automatic Accounting Period Management
 *
 * Best Practices Implementation:
 * 1. Auto-close expired periods when new transactions come in
 * 2. Auto-create new periods for the current fiscal year
 * 3. Transfer net income to retained earnings
 * 4. Copy opening balances (Balance Sheet accounts only)
 * 5. Reset temporary accounts (Income Statement accounts)
 *
 * Accounting Cycle:
 * - Permanent Accounts (Balance Sheet): Asset, Liability, Equity → Carry Forward
 * - Temporary Accounts (Income Statement): Revenue, Expense → Reset to 0
 */

import { prisma } from "@/lib/prisma";
import { generateTransactionNumber } from "@/lib/transaction-number";
import logger from "@/lib/logger";
import { Prisma } from "@prisma/client";

interface AutoClosingResult {
  oldPeriodId: string;
  newPeriodId: string;
  netIncome: number;
  closingEntriesCreated: number;
}

/**
 * Check if current active period needs to be closed and create new period
 * Call this before creating any new transaction
 */
export async function ensureActivePeriod(
  transactionDate: Date,
  userId: string,
): Promise<string> {
  try {
    // Get current active period
    const activePeriod = await prisma.periodeAkuntansi.findFirst({
      where: { isActive: true },
      orderBy: { tanggalMulai: "desc" },
    });

    // If no active period exists, create one for current year
    if (!activePeriod) {
      logger.info(
        "No active period found, creating new period for current year",
      );
      const newPeriod = await createNewYearPeriod(transactionDate, userId);
      return newPeriod.id;
    }

    // Check if transaction date is within active period
    const isWithinPeriod =
      transactionDate >= activePeriod.tanggalMulai &&
      transactionDate <= activePeriod.tanggalAkhir;

    if (isWithinPeriod) {
      // Transaction is within active period, no action needed
      return activePeriod.id;
    }

    // Check if transaction date is AFTER period end
    const isAfterPeriod = transactionDate > activePeriod.tanggalAkhir;

    if (isAfterPeriod) {
      logger.info(
        `Transaction date ${transactionDate.toISOString()} is after active period end ${activePeriod.tanggalAkhir.toISOString()}`,
      );
      logger.info("Auto-closing old period and creating new period");

      // Auto-close old period and create new period
      const result = await autoCloseAndCreateNewPeriod(
        activePeriod.id,
        transactionDate,
        userId,
      );

      return result.newPeriodId;
    }

    // If transaction is BEFORE active period, don't auto-close
    // This might be a backdated transaction
    logger.warn(
      `Transaction date ${transactionDate.toISOString()} is before active period start ${activePeriod.tanggalMulai.toISOString()}`,
    );
    logger.warn("Using active period for backdated transaction");
    return activePeriod.id;
  } catch (error) {
    logger.error("Error in ensureActivePeriod:", error);
    throw error;
  }
}

/**
 * Auto-close expired period and create new period
 */
async function autoCloseAndCreateNewPeriod(
  oldPeriodId: string,
  transactionDate: Date,
  userId: string,
): Promise<AutoClosingResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. Get old period
    const oldPeriod = await tx.periodeAkuntansi.findUnique({
      where: { id: oldPeriodId },
    });

    if (!oldPeriod) {
      throw new Error("Old period not found");
    }

    if (oldPeriod.isClosed) {
      logger.info("Period is already closed, skipping auto-close");
      // Just create new period
      const newPeriod = await createNewYearPeriod(transactionDate, userId);
      return {
        oldPeriodId: oldPeriod.id,
        newPeriodId: newPeriod.id,
        netIncome: 0,
        closingEntriesCreated: 0,
      };
    }

    // 2. Calculate net income for old period
    const netIncomeData = await calculateNetIncome(oldPeriodId, tx);

    // 3. Create closing entries
    const closingEntriesCount = await createClosingEntries(
      oldPeriod,
      netIncomeData,
      userId,
      tx,
    );

    // 4. Mark old period as closed
    await tx.periodeAkuntansi.update({
      where: { id: oldPeriodId },
      data: {
        isClosed: true,
        isActive: false,
      },
    });

    // 5. Create new period
    const newPeriod = await createNewYearPeriod(transactionDate, userId, tx);

    // 6. Copy opening balances (Balance Sheet accounts only)
    await copyOpeningBalances(oldPeriodId, newPeriod.id, tx);

    logger.info(
      `Auto-closed period ${oldPeriod.nama} and created new period ${newPeriod.nama}`,
    );

    return {
      oldPeriodId: oldPeriod.id,
      newPeriodId: newPeriod.id,
      netIncome: netIncomeData.netIncome,
      closingEntriesCreated: closingEntriesCount,
    };
  });
}

/**
 * Calculate net income for a period
 */
async function calculateNetIncome(
  periodeId: string,
  tx: Prisma.TransactionClient,
): Promise<{
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  revenueBalances: Array<{ akunId: string; balance: number }>;
  expenseBalances: Array<{ akunId: string; balance: number }>;
}> {
  // Get all revenue accounts
  const revenueAccounts = await tx.akun.findMany({
    where: { tipe: "REVENUE", isActive: true },
  });

  // Get all expense accounts
  const expenseAccounts = await tx.akun.findMany({
    where: { tipe: "EXPENSE", isActive: true },
  });

  // Calculate revenue balances
  const revenueBalances = await Promise.all(
    revenueAccounts.map(async (akun) => {
      const details = await tx.jurnalDetail.findMany({
        where: {
          akunId: akun.id,
          jurnal: { periodeId, isPosted: true },
        },
        select: { debit: true, kredit: true },
      });

      // Revenue: Normal balance is CREDIT
      const balance = details.reduce(
        (sum, detail) => sum + Number(detail.kredit) - Number(detail.debit),
        0,
      );

      return { akunId: akun.id, balance };
    }),
  );

  // Calculate expense balances
  const expenseBalances = await Promise.all(
    expenseAccounts.map(async (akun) => {
      const details = await tx.jurnalDetail.findMany({
        where: {
          akunId: akun.id,
          jurnal: { periodeId, isPosted: true },
        },
        select: { debit: true, kredit: true },
      });

      // Expense: Normal balance is DEBIT
      const balance = details.reduce(
        (sum, detail) => sum + Number(detail.debit) - Number(detail.kredit),
        0,
      );

      return { akunId: akun.id, balance };
    }),
  );

  const totalRevenue = revenueBalances.reduce(
    (sum, item) => sum + item.balance,
    0,
  );
  const totalExpenses = expenseBalances.reduce(
    (sum, item) => sum + item.balance,
    0,
  );
  const netIncome = totalRevenue - totalExpenses;

  return {
    totalRevenue,
    totalExpenses,
    netIncome,
    revenueBalances,
    expenseBalances,
  };
}

/**
 * Create closing entries to transfer net income to retained earnings
 */
async function createClosingEntries(
  periode: any,
  netIncomeData: Awaited<ReturnType<typeof calculateNetIncome>>,
  userId: string,
  tx: Prisma.TransactionClient,
): Promise<number> {
  let entriesCreated = 0;

  // Find Retained Earnings account
  const retainedEarningsAccount = await tx.akun.findFirst({
    where: {
      tipe: "EQUITY",
      OR: [
        { nama: { contains: "Laba Ditahan", mode: "insensitive" } },
        { nama: { contains: "Retained Earnings", mode: "insensitive" } },
      ],
    },
  });

  if (!retainedEarningsAccount) {
    logger.warn(
      "Retained Earnings account not found, skipping closing entries",
    );
    return 0;
  }

  // Entry 1: Close Revenue accounts
  if (netIncomeData.totalRevenue > 0) {
    const revenueDetails = netIncomeData.revenueBalances
      .filter((item) => item.balance > 0)
      .map((item) => ({
        akunId: item.akunId,
        debit: item.balance, // Debit to close revenue
        kredit: 0,
      }));

    if (revenueDetails.length > 0) {
      await tx.jurnalEntry.create({
        data: {
          nomorJurnal: generateTransactionNumber("JR"),
          tanggal: periode.tanggalAkhir,
          deskripsi: `[AUTO] Penutupan akun pendapatan periode ${periode.nama}`,
          referensi: `AUTO-CLOSE-REV-${periode.nama}`,
          tipeReferensi: "PERIOD_CLOSING",
          periodeId: periode.id,
          userId,
          isPosted: true,
          details: {
            create: [
              ...revenueDetails,
              {
                akunId: retainedEarningsAccount.id,
                debit: 0,
                kredit: netIncomeData.totalRevenue, // Credit retained earnings
              },
            ],
          },
        },
      });
      entriesCreated++;
    }
  }

  // Entry 2: Close Expense accounts
  if (netIncomeData.totalExpenses > 0) {
    const expenseDetails = netIncomeData.expenseBalances
      .filter((item) => item.balance > 0)
      .map((item) => ({
        akunId: item.akunId,
        debit: 0,
        kredit: item.balance, // Credit to close expense
      }));

    if (expenseDetails.length > 0) {
      await tx.jurnalEntry.create({
        data: {
          nomorJurnal: generateTransactionNumber("JR"),
          tanggal: periode.tanggalAkhir,
          deskripsi: `[AUTO] Penutupan akun beban periode ${periode.nama}`,
          referensi: `AUTO-CLOSE-EXP-${periode.nama}`,
          tipeReferensi: "PERIOD_CLOSING",
          periodeId: periode.id,
          userId,
          isPosted: true,
          details: {
            create: [
              {
                akunId: retainedEarningsAccount.id,
                debit: netIncomeData.totalExpenses, // Debit retained earnings
                kredit: 0,
              },
              ...expenseDetails,
            ],
          },
        },
      });
      entriesCreated++;
    }
  }

  return entriesCreated;
}

/**
 * Create new year period
 */
async function createNewYearPeriod(
  referenceDate: Date,
  userId: string,
  tx?: Prisma.TransactionClient,
): Promise<any> {
  const year = referenceDate.getFullYear();
  const nama = `Tahun Buku ${year}`;
  const tanggalMulai = new Date(year, 0, 1); // January 1
  const tanggalAkhir = new Date(year, 11, 31, 23, 59, 59); // December 31

  const createPeriod = async (client: any) => {
    // Deactivate other active periods
    await client.periodeAkuntansi.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new period
    const newPeriod = await client.periodeAkuntansi.create({
      data: {
        nama,
        tanggalMulai,
        tanggalAkhir,
        isActive: true,
        isClosed: false,
      },
    });

    // Log activity
    await client.activityLog.create({
      data: {
        userId,
        userName: "System Auto-Close",
        action: "CREATE",
        entity: "PERIODE_AKUNTANSI",
        entityId: newPeriod.id,
        description: `[AUTO] Created new accounting period: ${nama}`,
      },
    });

    return newPeriod;
  };

  if (tx) {
    return await createPeriod(tx);
  } else {
    return await createPeriod(prisma);
  }
}

/**
 * Copy opening balances from old period to new period
 * Only for Balance Sheet accounts (Asset, Liability, Equity)
 */
async function copyOpeningBalances(
  oldPeriodId: string,
  newPeriodId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  // Get all Balance Sheet accounts
  const balanceSheetAccounts = await tx.akun.findMany({
    where: {
      tipe: { in: ["ASSET", "LIABILITY", "EQUITY"] },
      isActive: true,
    },
  });

  // Calculate ending balance for each account in old period
  const openingBalances = await Promise.all(
    balanceSheetAccounts.map(async (akun) => {
      const details = await tx.jurnalDetail.findMany({
        where: {
          akunId: akun.id,
          jurnal: { periodeId: oldPeriodId, isPosted: true },
        },
        select: { debit: true, kredit: true },
      });

      // Calculate balance based on account type
      let balance = 0;
      if (akun.tipe === "ASSET") {
        // Asset: Debit increases, Credit decreases
        balance = details.reduce(
          (sum, detail) => sum + Number(detail.debit) - Number(detail.kredit),
          0,
        );
      } else {
        // Liability & Equity: Credit increases, Debit decreases
        balance = details.reduce(
          (sum, detail) => sum + Number(detail.kredit) - Number(detail.debit),
          0,
        );
      }

      return {
        akunId: akun.id,
        periodeId: newPeriodId,
        saldo: balance,
      };
    }),
  );

  // Filter out zero balances
  const nonZeroBalances = openingBalances.filter((item) => item.saldo !== 0);

  // Create opening balance records
  if (nonZeroBalances.length > 0) {
    await tx.saldoAwal.createMany({
      data: nonZeroBalances,
      skipDuplicates: true,
    });

    logger.info(
      `Copied ${nonZeroBalances.length} opening balances to new period`,
    );
  }
}
