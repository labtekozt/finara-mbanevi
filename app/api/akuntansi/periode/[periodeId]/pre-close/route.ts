import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import logger from "@/lib/logger";

interface PreCloseValidation {
  isValid: boolean;
  issues: string[];
  summary: {
    totalJournals: number;
    unpostedJournals: number;
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    retainedEarningsAccount?: {
      id: string;
      nama: string;
      kode: string;
    };
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ periodeId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canAccessTransaksi")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { periodeId } = await params;

    // Check if period exists and is not already closed
    const periode = await prisma.periodeAkuntansi.findUnique({
      where: { id: periodeId },
    });

    if (!periode) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }

    if (periode.isClosed) {
      return NextResponse.json(
        {
          error: "Period is already closed",
        },
        { status: 400 },
      );
    }

    const issues: string[] = [];

    // Check for unposted journals
    const unpostedJournals = await prisma.jurnalEntry.count({
      where: {
        periodeId: periodeId,
        isPosted: false,
      },
    });

    if (unpostedJournals > 0) {
      issues.push(`${unpostedJournals} jurnal belum diposting`);
    }

    // Check for unbalanced journals
    const allJournals = await prisma.jurnalEntry.findMany({
      where: { periodeId: periodeId },
      include: { details: true },
    });

    const unbalancedJournals = allJournals.filter((journal) => {
      const totalDebit = journal.details.reduce(
        (sum, detail) => sum + detail.debit.toNumber(),
        0,
      );
      const totalKredit = journal.details.reduce(
        (sum, detail) => sum + detail.kredit.toNumber(),
        0,
      );
      return Math.abs(totalDebit - totalKredit) > 0.01; // Allow for small floating point differences
    });

    if (unbalancedJournals.length > 0) {
      issues.push(`${unbalancedJournals.length} jurnal tidak seimbang`);
    }

    // Calculate revenue and expense balances
    const revenueAccounts = await prisma.akun.findMany({
      where: { tipe: "REVENUE", isActive: true },
    });

    const expenseAccounts = await prisma.akun.findMany({
      where: { tipe: "EXPENSE", isActive: true },
    });

    const revenueBalances = await Promise.all(
      revenueAccounts.map(async (akun) => {
        const details = await prisma.jurnalDetail.findMany({
          where: {
            akunId: akun.id,
            jurnal: { periodeId: periodeId },
          },
          select: { debit: true, kredit: true },
        });

        const balance = details.reduce(
          (sum, detail) =>
            sum + detail.kredit.toNumber() - detail.debit.toNumber(),
          0,
        );
        return { akun, balance };
      }),
    );

    const expenseBalances = await Promise.all(
      expenseAccounts.map(async (akun) => {
        const details = await prisma.jurnalDetail.findMany({
          where: {
            akunId: akun.id,
            jurnal: { periodeId: periodeId },
          },
          select: { debit: true, kredit: true },
        });

        const balance = details.reduce(
          (sum, detail) =>
            sum + detail.debit.toNumber() - detail.kredit.toNumber(),
          0,
        );
        return { akun, balance };
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

    // Find retained earnings account
    const retainedEarningsAccount = await prisma.akun.findFirst({
      where: {
        tipe: "EQUITY",
        nama: { contains: "Laba Ditahan", mode: "insensitive" },
        isActive: true,
      },
    });

    if (!retainedEarningsAccount) {
      issues.push(
        "Akun Laba Ditahan tidak ditemukan. Silakan buat akun equity dengan nama 'Laba Ditahan'",
      );
    }

    // Check if next period exists for opening balances
    const nextPeriod = await prisma.periodeAkuntansi.findFirst({
      where: {
        tanggalMulai: {
          gt: periode.tanggalAkhir,
        },
        isActive: false,
        isClosed: false,
      },
      orderBy: { tanggalMulai: "asc" },
    });

    if (!nextPeriod) {
      issues.push(
        "Tidak ada periode berikutnya untuk carry-forward saldo awal",
      );
    }

    const validation: PreCloseValidation = {
      isValid: issues.length === 0,
      issues,
      summary: {
        totalJournals: allJournals.length,
        unpostedJournals: unpostedJournals,
        totalRevenue,
        totalExpenses,
        netIncome,
        retainedEarningsAccount: retainedEarningsAccount
          ? {
              id: retainedEarningsAccount.id,
              nama: retainedEarningsAccount.nama,
              kode: retainedEarningsAccount.kode,
            }
          : undefined,
      },
    };

    return NextResponse.json(validation);
  } catch (error) {
    logger.error("Error validating period pre-close:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
