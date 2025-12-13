import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { TrialBalanceData } from "@/types/accounting";
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

    // Get all active accounts
    const accounts = await prisma.akun.findMany({
      where: { isActive: true },
      orderBy: [{ tipe: "asc" }, { kode: "asc" }],
    });

    // Get period info if specified
    let periode = null;
    if (periodeId) {
      periode = await prisma.periodeAkuntansi.findUnique({
        where: { id: periodeId },
      });
    }

    // Calculate trial balance for each account
    const entries = await Promise.all(
      accounts.map(async (akun) => {
        // Get opening balance from SaldoAwal table for the period
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

        // Calculate mutations within the period
        let mutasiDebit = new Prisma.Decimal(0);
        let mutasiKredit = new Prisma.Decimal(0);

        const mutationWhere: any = {
          akunId: akun.id,
        };

        if (periode) {
          mutationWhere.jurnal = {
            periodeId: periode.id,
          };
        }

        const mutationDetails = await prisma.jurnalDetail.findMany({
          where: mutationWhere,
          select: {
            debit: true,
            kredit: true,
          },
        });

        for (const detail of mutationDetails) {
          mutasiDebit = mutasiDebit.plus(detail.debit);
          mutasiKredit = mutasiKredit.plus(detail.kredit);
        }

        // Calculate ending balance based on account type and normal balance
        let saldoAkhirDecimal = new Prisma.Decimal(0);

        // Apply mutations based on account type
        if (akun.tipe === "ASSET" || akun.tipe === "EXPENSE") {
          // Debit normal accounts: increase with debits, decrease with credits
          // Result: positive balances for debit normal accounts
          saldoAkhirDecimal = saldoAwalDecimal
            .plus(mutasiDebit)
            .minus(mutasiKredit);
        } else if (
          akun.tipe === "LIABILITY" ||
          akun.tipe === "EQUITY" ||
          akun.tipe === "REVENUE"
        ) {
          // Credit normal accounts: increase with credits, decrease with debits
          // Result: negative balances for credit normal accounts (to represent credit balances)
          saldoAkhirDecimal = saldoAwalDecimal
            .plus(mutasiKredit)
            .minus(mutasiDebit)
            .negated();
        }

        return {
          akun,
          saldoAwal: saldoAwalDecimal.toNumber(),
          mutasiDebit: mutasiDebit.toNumber(),
          mutasiKredit: mutasiKredit.toNumber(),
          saldoAkhir: saldoAkhirDecimal.toNumber(),
        };
      }),
    );

    // Calculate totals for trial balance format
    const totalSaldoAwal = entries.reduce(
      (sum, entry) => sum + entry.saldoAwal,
      0,
    );
    const totalMutasiDebit = entries.reduce(
      (sum, entry) => sum + entry.mutasiDebit,
      0,
    );
    const totalMutasiKredit = entries.reduce(
      (sum, entry) => sum + entry.mutasiKredit,
      0,
    );

    // For trial balance, calculate debit and credit column totals
    const totalDebitBalances = entries
      .filter((entry) => entry.saldoAkhir > 0)
      .reduce((sum, entry) => sum + entry.saldoAkhir, 0);

    const totalCreditBalances = entries
      .filter((entry) => entry.saldoAkhir < 0)
      .reduce((sum, entry) => sum + Math.abs(entry.saldoAkhir), 0);

    // Total ending balance should be algebraic sum (debits + credits = 0 for balanced)
    const totalSaldoAkhir = entries.reduce(
      (sum, entry) => sum + entry.saldoAkhir,
      0,
    );

    // Check if balanced using FinancialValidator (FinOps Framework best practice)
    const validation = FinancialValidator.validateTrialBalance(entries);
    const isBalanced = validation.isBalanced;

    // Log report generation for audit trail (XBRL compliance)
    if (session?.user?.id) {
      await AuditLogger.logReportGeneration(
        "trial_balance",
        periodeId || "all_periods",
        session.user.id,
        "JSON",
        { periodeId, isBalanced: validation.isBalanced },
      );
    }

    const result: TrialBalanceData = {
      periodeId: periodeId || undefined,
      periode: periode || undefined,
      entries,
      totalSaldoAwal,
      totalMutasiDebit,
      totalMutasiKredit,
      totalSaldoAkhir,
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
    logger.error("Error fetching trial balance:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
