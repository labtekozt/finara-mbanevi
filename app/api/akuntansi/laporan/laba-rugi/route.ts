import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { IncomeStatementData } from "@/types/accounting";
import logger from "@/lib/logger";

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
    const periodeId = searchParams.get("periodeId");

    // Get period info if specified
    let periode = null;
    if (periodeId) {
      periode = await prisma.periodeAkuntansi.findUnique({
        where: { id: periodeId },
      });
    }

    // Get all active accounts with their balances
    const accounts = await prisma.akun.findMany({
      where: { isActive: true },
      orderBy: [{ tipe: "asc" }, { kode: "asc" }],
    });

    // Calculate balances for each account
    const accountBalances = await Promise.all(
      accounts.map(async (akun) => {
        // Calculate balance for the period
        const balanceWhere: any = {
          akunId: akun.id,
        };

        if (periode) {
          balanceWhere.jurnal = {
            periodeId: periode.id,
          };
        }

        const details = await prisma.jurnalDetail.findMany({
          where: balanceWhere,
          select: {
            debit: true,
            kredit: true,
          },
        });

        // Calculate balance based on account type
        let balance = 0;
        for (const detail of details) {
          if (akun.tipe === "REVENUE") {
            // Revenue: credit balance (kredit - debit)
            balance += detail.kredit.toNumber() - detail.debit.toNumber();
          } else if (akun.tipe === "EXPENSE") {
            // Expense: debit balance (debit - kredit)
            balance += detail.debit.toNumber() - detail.kredit.toNumber();
          }
        }

        return {
          akun,
          saldo: balance,
        };
      }),
    );

    // Group accounts by type for income statement
    const revenue = accountBalances.filter(
      (item) => item.akun.tipe === "REVENUE" && item.saldo !== 0,
    );
    const expenses = accountBalances.filter(
      (item) => item.akun.tipe === "EXPENSE" && item.saldo !== 0,
    );

    // Calculate totals
    const totalRevenue = revenue.reduce((sum, item) => sum + item.saldo, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.saldo, 0);
    const netIncome = totalRevenue - totalExpenses;

    const result: IncomeStatementData = {
      periodeId: periodeId || undefined,
      periode: periode as any,
      revenue: {
        title: "PENDAPATAN",
        entries: revenue,
        total: totalRevenue,
      },
      expenses: {
        title: "BEBAN",
        entries: expenses,
        total: totalExpenses,
      },
      netIncome,
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error fetching income statement:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
