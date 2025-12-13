import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { generateTransactionNumber } from "@/lib/transaction-number";
import { PeriodClosingData } from "@/types/accounting";
import logger from "@/lib/logger";

export async function POST(
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

    // Fetch the period to ensure it exists and get its details
    const periode = await prisma.periodeAkuntansi.findUnique({
      where: { id: periodeId },
    });

    if (!periode) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }

    if (periode.isClosed) {
      return NextResponse.json(
        { error: "Period is already closed" },
        { status: 400 },
      );
    }

    // Pre-closing validation
    const validationResponse = await fetch(
      `${process.env.NEXTAUTH_URL}/api/akuntansi/periode/${periodeId}/pre-close`,
      {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      },
    );

    if (!validationResponse.ok) {
      return NextResponse.json(
        { error: "Failed to validate period before closing" },
        { status: 500 },
      );
    }

    const validation = await validationResponse.json();

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Period cannot be closed due to validation issues",
          issues: validation.issues,
        },
        { status: 400 },
      );
    }

    // Get income statement data for the period
    const revenueAccounts = await prisma.akun.findMany({
      where: { tipe: "REVENUE", isActive: true },
    });

    const expenseAccounts = await prisma.akun.findMany({
      where: { tipe: "EXPENSE", isActive: true },
    });

    // Calculate balances for revenue and expense accounts
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

    // Find retained earnings account (assuming it exists)
    const retainedEarningsAccount = await prisma.akun.findFirst({
      where: {
        tipe: "EQUITY",
        nama: { contains: "Laba Ditahan", mode: "insensitive" },
      },
    });

    if (!retainedEarningsAccount) {
      return NextResponse.json(
        {
          error:
            "Retained earnings account not found. Please create an equity account for 'Laba Ditahan'",
        },
        { status: 400 },
      );
    }

    // Create closing entries in transaction
    const result = await prisma.$transaction(async (tx) => {
      const closingEntries: any[] = [];

      // Close revenue accounts to retained earnings
      if (totalRevenue > 0) {
        const nomorJurnal = generateTransactionNumber("JR");
        const revenueEntry = await tx.jurnalEntry.create({
          data: {
            nomorJurnal,
            tanggal: periode.tanggalAkhir,
            deskripsi: `Penutupan akun pendapatan periode ${periode.nama}`,
            referensi: `CLOSING-${periode.nama}`,
            tipeReferensi: "PERIOD_CLOSING",
            periodeId: periodeId,
            userId: session.user.id,
            isPosted: true,
            details: {
              create: [
                // Debit retained earnings
                {
                  akunId: retainedEarningsAccount.id,
                  debit: totalRevenue,
                  kredit: 0,
                  deskripsi: "Penutupan akun pendapatan",
                },
                // Credit revenue accounts
                ...revenueBalances
                  .filter((item) => item.balance > 0)
                  .map((item) => ({
                    akunId: item.akun.id,
                    debit: 0,
                    kredit: item.balance,
                    deskripsi: `Penutupan ${item.akun.nama}`,
                  })),
              ],
            },
          },
          include: {
            details: { include: { akun: true } },
            periode: true,
            user: { select: { id: true, nama: true, username: true } },
          },
        });
        closingEntries.push(revenueEntry);
      }

      // Close expense accounts to retained earnings
      if (totalExpenses > 0) {
        const nomorJurnal = generateTransactionNumber("JR");
        const expenseEntry = await tx.jurnalEntry.create({
          data: {
            nomorJurnal,
            tanggal: periode.tanggalAkhir,
            deskripsi: `Penutupan akun beban periode ${periode.nama}`,
            referensi: `CLOSING-${periode.nama}`,
            tipeReferensi: "PERIOD_CLOSING",
            periodeId: periodeId,
            userId: session.user.id,
            isPosted: true,
            details: {
              create: [
                // Credit retained earnings
                {
                  akunId: retainedEarningsAccount.id,
                  debit: 0,
                  kredit: totalExpenses,
                  deskripsi: "Penutupan akun beban",
                },
                // Debit expense accounts
                ...expenseBalances
                  .filter((item) => item.balance > 0)
                  .map((item) => ({
                    akunId: item.akun.id,
                    debit: item.balance,
                    kredit: 0,
                    deskripsi: `Penutupan ${item.akun.nama}`,
                  })),
              ],
            },
          },
          include: {
            details: { include: { akun: true } },
            periode: true,
            user: { select: { id: true, nama: true, username: true } },
          },
        });
        closingEntries.push(expenseEntry);
      }

      // Create opening balances for next period (if exists)
      const nextPeriod = await tx.periodeAkuntansi.findFirst({
        where: {
          tanggalMulai: {
            gt: periode.tanggalAkhir,
          },
          isActive: false,
          isClosed: false,
        },
        orderBy: { tanggalMulai: "asc" },
      });

      let openingBalances: any[] = [];

      if (nextPeriod) {
        // Get all account balances at period end
        const allAccounts = await tx.akun.findMany({
          where: { isActive: true },
        });

        const accountBalances = await Promise.all(
          allAccounts.map(async (akun) => {
            const details = await tx.jurnalDetail.findMany({
              where: {
                akunId: akun.id,
                jurnal: {
                  tanggal: {
                    lte: periode.tanggalAkhir,
                  },
                },
              },
              select: { debit: true, kredit: true },
            });

            let balance = 0;
            for (const detail of details) {
              if (akun.tipe === "ASSET" || akun.tipe === "EXPENSE") {
                balance += detail.debit.toNumber() - detail.kredit.toNumber();
              } else {
                balance += detail.kredit.toNumber() - detail.debit.toNumber();
              }
            }

            return { akun, balance };
          }),
        );

        // Create opening balance records
        for (const { akun, balance } of accountBalances) {
          if (balance !== 0) {
            const openingBalance = await tx.saldoAwal.create({
              data: {
                periodeId: nextPeriod.id,
                akunId: akun.id,
                saldo: balance,
              },
              include: {
                akun: true,
                periode: true,
              },
            });
            openingBalances.push(openingBalance);
          }
        }
      }

      // Mark period as closed
      await tx.periodeAkuntansi.update({
        where: { id: periodeId },
        data: {
          isClosed: true,
          updatedAt: new Date(),
        },
      });

      // Create activity log
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name || session.user.username,
          action: "CLOSE_PERIOD",
          entity: "PERIODE_AKUNTANSI",
          entityId: periodeId,
          description: `Closed accounting period: ${periode.nama} with net income: ${netIncome}`,
        },
      });

      return {
        periodeId,
        periode,
        closingEntries,
        openingBalances,
        netIncome,
        status: "completed" as const,
        closedAt: new Date().toISOString(),
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error("Error closing period:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
