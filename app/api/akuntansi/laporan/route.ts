import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import logger from "@/lib/logger";

// GET /api/akuntansi/laporan - Generate financial reports
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canAccessTransaksi")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tipe = searchParams.get("tipe"); // BALANCE_SHEET, INCOME_STATEMENT, TRIAL_BALANCE
    const periodeId = searchParams.get("periodeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!tipe) {
      return NextResponse.json(
        { error: "Report type is required" },
        { status: 400 },
      );
    }

    let reportData: any = {};
    let reportTitle = "";

    switch (tipe) {
      case "TRIAL_BALANCE":
        reportData = await generateTrialBalance(periodeId, startDate, endDate);
        reportTitle = "Neraca Saldo";
        break;

      case "BALANCE_SHEET":
        reportData = await generateBalanceSheet(periodeId, startDate, endDate);
        reportTitle = "Neraca";
        break;

      case "INCOME_STATEMENT":
        reportData = await generateIncomeStatement(
          periodeId,
          startDate,
          endDate,
        );
        reportTitle = "Laporan Laba Rugi";
        break;

      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 },
        );
    }

    // Save report to database
    const laporan = await prisma.laporanKeuangan.create({
      data: {
        tipe: tipe as any,
        periodeId: periodeId || "system",
        data: reportData,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      id: laporan.id,
      title: reportTitle,
      type: tipe,
      generatedAt: laporan.tanggalGenerate,
      data: reportData,
    });
  } catch (error) {
    logger.error("Error generating financial report:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Generate Trial Balance
async function generateTrialBalance(
  periodeId?: string | null,
  startDate?: string | null,
  endDate?: string | null,
) {
  const where: any = {};

  if (periodeId) {
    where.periodeId = periodeId;
  } else if (startDate && endDate) {
    where.tanggal = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  // Get all journal entries with details
  const entries = await prisma.jurnalEntry.findMany({
    where: {
      ...where,
      isPosted: true,
    },
    include: {
      details: {
        include: {
          akun: true,
        },
      },
    },
  });

  // Calculate balances by account
  const accountBalances: { [key: string]: any } = {};

  for (const entry of entries) {
    for (const detail of entry.details) {
      const akunId = detail.akunId;

      if (!accountBalances[akunId]) {
        accountBalances[akunId] = {
          akun: detail.akun,
          debit: 0,
          kredit: 0,
          saldo: 0,
        };
      }

      accountBalances[akunId].debit += detail.debit;
      accountBalances[akunId].kredit += detail.kredit;
    }
  }

  // Calculate net balance for each account
  const trialBalance = Object.values(accountBalances).map((balance: any) => ({
    kode: balance.akun.kode,
    nama: balance.akun.nama,
    tipe: balance.akun.tipe,
    debit: balance.debit,
    kredit: balance.kredit,
    saldo: balance.debit - balance.kredit,
  }));

  // Calculate totals
  const totalDebit = trialBalance.reduce((sum, item) => sum + item.debit, 0);
  const totalKredit = trialBalance.reduce((sum, item) => sum + item.kredit, 0);

  return {
    accounts: trialBalance.sort((a, b) => a.kode.localeCompare(b.kode)),
    totals: {
      debit: totalDebit,
      kredit: totalKredit,
      difference: Math.abs(totalDebit - totalKredit),
    },
    isBalanced: Math.abs(totalDebit - totalKredit) < 0.01,
  };
}

// Generate Balance Sheet
async function generateBalanceSheet(
  periodeId?: string | null,
  startDate?: string | null,
  endDate?: string | null,
) {
  const trialBalance = await generateTrialBalance(
    periodeId,
    startDate,
    endDate,
  );

  const assets = trialBalance.accounts.filter(
    (acc: any) => acc.tipe === "ASSET",
  );
  const liabilities = trialBalance.accounts.filter(
    (acc: any) => acc.tipe === "LIABILITY",
  );
  const equity = trialBalance.accounts.filter(
    (acc: any) => acc.tipe === "EQUITY",
  );

  const totalAssets = assets.reduce(
    (sum: number, acc: any) => sum + acc.saldo,
    0,
  );
  const totalLiabilities = liabilities.reduce(
    (sum: number, acc: any) => sum + Math.abs(acc.saldo),
    0,
  );
  const totalEquity = equity.reduce(
    (sum: number, acc: any) => sum + Math.abs(acc.saldo),
    0,
  );

  return {
    assets: {
      accounts: assets,
      total: totalAssets,
    },
    liabilities: {
      accounts: liabilities,
      total: totalLiabilities,
    },
    equity: {
      accounts: equity,
      total: totalEquity,
    },
    totals: {
      assets: totalAssets,
      liabilitiesAndEquity: totalLiabilities + totalEquity,
      difference: Math.abs(totalAssets - (totalLiabilities + totalEquity)),
    },
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  };
}

// Generate Income Statement
async function generateIncomeStatement(
  periodeId?: string | null,
  startDate?: string | null,
  endDate?: string | null,
) {
  const trialBalance = await generateTrialBalance(
    periodeId,
    startDate,
    endDate,
  );

  const revenues = trialBalance.accounts.filter(
    (acc: any) => acc.tipe === "REVENUE",
  );
  const expenses = trialBalance.accounts.filter(
    (acc: any) => acc.tipe === "EXPENSE",
  );

  const totalRevenues = revenues.reduce(
    (sum: number, acc: any) => sum + Math.abs(acc.saldo),
    0,
  );
  const totalExpenses = expenses.reduce(
    (sum: number, acc: any) => sum + acc.saldo,
    0,
  );

  const netIncome = totalRevenues - totalExpenses;

  return {
    revenues: {
      accounts: revenues,
      total: totalRevenues,
    },
    expenses: {
      accounts: expenses,
      total: totalExpenses,
    },
    summary: {
      totalRevenues: totalRevenues,
      totalExpenses: totalExpenses,
      netIncome: netIncome,
    },
  };
}
