import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { BalanceSheetData } from "@/types/accounting";
import { FinancialValidator } from "@/lib/financial-validator";
import { AuditLogger } from "@/lib/audit-logger";
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

    // Get all active balance sheet accounts (ASSET, LIABILITY, EQUITY only)
    const balanceSheetAccounts = await prisma.akun.findMany({
      where: {
        isActive: true,
        tipe: {
          in: ["ASSET", "LIABILITY", "EQUITY"],
        },
      },
      orderBy: [{ tipe: "asc" }, { kode: "asc" }],
    });

    // Calculate balances for each balance sheet account
    const accountBalances = await Promise.all(
      balanceSheetAccounts.map(async (akun) => {
        // Get opening balance from SaldoAwal table
        let saldoAwalDecimal = new Prisma.Decimal(0);
        if (periode) {
          const openingBalance = await prisma.saldoAwal.findUnique({
            where: {
              akunId_periodeId: {
                akunId: akun.id,
                periodeId: periode.id,
              },
            },
          });
          if (openingBalance) {
            saldoAwalDecimal = openingBalance.saldo;
          }
        }

        // Calculate mutations up to period end (or current date if no period)
        const balanceWhere: any = {
          akunId: akun.id,
        };

        if (periode) {
          balanceWhere.jurnal = {
            tanggal: {
              lte: periode.tanggalAkhir,
            },
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

        // Calculate mutations based on account type normal balance
        let mutationsDecimal = new Prisma.Decimal(0);
        for (const detail of details) {
          if (akun.tipe === "ASSET") {
            // Assets: normal debit balance, debit increases, credit decreases
            mutationsDecimal = mutationsDecimal
              .plus(detail.debit)
              .minus(detail.kredit);
          } else if (akun.tipe === "LIABILITY") {
            // Liabilities: normal credit balance, credit increases, debit decreases
            mutationsDecimal = mutationsDecimal
              .plus(detail.kredit)
              .minus(detail.debit);
          } else if (akun.tipe === "EQUITY") {
            // Equity: normal credit balance, credit increases, debit decreases
            mutationsDecimal = mutationsDecimal
              .plus(detail.kredit)
              .minus(detail.debit);
          }
        }

        // Final balance = opening balance + mutations
        // For display, we want positive balances for normal balances
        const balanceDecimal = saldoAwalDecimal.plus(mutationsDecimal);

        return {
          akun,
          // Keep the signed balance for proper accounting
          saldo: balanceDecimal.toNumber(),
          displaySaldo: Math.abs(balanceDecimal.toNumber()), // For UI display
        };
      }),
    );

    // Group accounts by type for balance sheet (use signed balances for calculations)
    const assets = accountBalances.filter((item) => item.akun.tipe === "ASSET");
    const liabilities = accountBalances.filter(
      (item) => item.akun.tipe === "LIABILITY",
    );
    const equity = accountBalances.filter(
      (item) => item.akun.tipe === "EQUITY",
    );

    // Calculate totals using signed values to handle abnormal balances (e.g. negative cash)
    const totalAssets = assets.reduce((sum, item) => sum + item.saldo, 0);
    const totalLiabilities = liabilities.reduce(
      (sum, item) => sum + item.saldo,
      0,
    );
    const totalEquity = equity.reduce((sum, item) => sum + item.saldo, 0);

    // Calculate net income (revenue - expenses) for the period
    let netIncome = 0;
    if (periode) {
      // Calculate for specific period
      // Get all revenue accounts
      const revenueAccounts = await prisma.akun.findMany({
        where: {
          isActive: true,
          tipe: "REVENUE",
        },
      });

      // Get all expense accounts
      const expenseAccounts = await prisma.akun.findMany({
        where: {
          isActive: true,
          tipe: "EXPENSE",
        },
      });

      // Calculate total revenue
      const totalRevenueDecimal = await Promise.all(
        revenueAccounts.map(async (akun) => {
          const details = await prisma.jurnalDetail.findMany({
            where: {
              akunId: akun.id,
              jurnal: {
                tanggal: {
                  lte: periode.tanggalAkhir,
                },
                periodeId: periode.id,
              },
            },
            select: {
              kredit: true,
              debit: true,
            },
          });
          return details.reduce(
            (sum, detail) => sum.plus(detail.kredit).minus(detail.debit),
            new Prisma.Decimal(0),
          );
        }),
      ).then((results) =>
        results.reduce((sum, val) => sum.plus(val), new Prisma.Decimal(0)),
      );

      // Calculate total expenses
      const totalExpensesDecimal = await Promise.all(
        expenseAccounts.map(async (akun) => {
          const details = await prisma.jurnalDetail.findMany({
            where: {
              akunId: akun.id,
              jurnal: {
                tanggal: {
                  lte: periode.tanggalAkhir,
                },
                periodeId: periode.id,
              },
            },
            select: {
              debit: true,
              kredit: true,
            },
          });
          return details.reduce(
            (sum, detail) => sum.plus(detail.debit).minus(detail.kredit),
            new Prisma.Decimal(0),
          );
        }),
      ).then((results) =>
        results.reduce((sum, val) => sum.plus(val), new Prisma.Decimal(0)),
      );

      netIncome = totalRevenueDecimal.minus(totalExpensesDecimal).toNumber();
    } else {
      // Calculate for all periods (ALL selection)
      // Get all revenue accounts
      const revenueAccounts = await prisma.akun.findMany({
        where: {
          isActive: true,
          tipe: "REVENUE",
        },
      });

      // Get all expense accounts
      const expenseAccounts = await prisma.akun.findMany({
        where: {
          isActive: true,
          tipe: "EXPENSE",
        },
      });

      // Calculate total revenue for all periods
      const totalRevenueDecimal = await Promise.all(
        revenueAccounts.map(async (akun) => {
          const details = await prisma.jurnalDetail.findMany({
            where: {
              akunId: akun.id,
              jurnal: {
                isPosted: true, // Only posted entries
              },
            },
            select: {
              kredit: true,
              debit: true,
            },
          });
          return details.reduce(
            (sum, detail) => sum.plus(detail.kredit).minus(detail.debit),
            new Prisma.Decimal(0),
          );
        }),
      ).then((results) =>
        results.reduce((sum, val) => sum.plus(val), new Prisma.Decimal(0)),
      );

      // Calculate total expenses for all periods
      const totalExpensesDecimal = await Promise.all(
        expenseAccounts.map(async (akun) => {
          const details = await prisma.jurnalDetail.findMany({
            where: {
              akunId: akun.id,
              jurnal: {
                isPosted: true, // Only posted entries
              },
            },
            select: {
              debit: true,
              kredit: true,
            },
          });
          return details.reduce(
            (sum, detail) => sum.plus(detail.debit).minus(detail.kredit),
            new Prisma.Decimal(0),
          );
        }),
      ).then((results) =>
        results.reduce((sum, val) => sum.plus(val), new Prisma.Decimal(0)),
      );

      netIncome = totalRevenueDecimal.minus(totalExpensesDecimal).toNumber();
    }

    const totalLiabilitiesEquity = totalLiabilities + totalEquity + netIncome;

    // Check if balanced using FinancialValidator (XBRL compliance)
    const validation = FinancialValidator.validateBalanceSheet(
      totalAssets,
      totalLiabilitiesEquity,
    );
    const isBalanced = validation.isBalanced;

    // Log report generation for audit trail
    if (session?.user?.id) {
      await AuditLogger.logReportGeneration(
        "balance_sheet",
        periodeId || "all_periods",
        session.user.id,
        "JSON",
        {
          periodeId,
          isBalanced: validation.isBalanced,
          totalAssets,
          totalLiabilitiesEquity,
        },
      );
    }

    const result: BalanceSheetData = {
      periodeId: periodeId || undefined,
      periode: periode || undefined,
      assets: {
        title: "ASET",
        entries: assets.map((item) => ({ ...item, saldo: item.displaySaldo })),
        total: totalAssets,
      },
      liabilities: {
        title: "KEWAJIBAN",
        entries: liabilities.map((item) => ({
          ...item,
          saldo: item.displaySaldo,
        })),
        total: totalLiabilities,
      },
      equity: {
        title: "EKUITAS",
        entries: equity.map((item) => ({ ...item, saldo: item.displaySaldo })),
        total: totalEquity,
      },
      netIncome: netIncome,
      totalAssets,
      totalLiabilitiesEquity,
      isBalanced,
      // Add validation details for enhanced reporting
      validation: {
        totalDebit: validation.totalDebit,
        totalCredit: validation.totalCredit,
        variance: validation.variance,
        message: validation.message,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error fetching balance sheet:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
