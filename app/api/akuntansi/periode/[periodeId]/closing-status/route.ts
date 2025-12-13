import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { PeriodClosingData } from "@/types/accounting";

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

    // Check if period exists
    const periode = await prisma.periodeAkuntansi.findUnique({
      where: { id: periodeId },
    });

    if (!periode) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }

    // If period is not closed, return null
    if (!periode.isClosed) {
      return NextResponse.json(null);
    }

    // Get closing entries
    const closingEntries = await prisma.jurnalEntry.findMany({
      where: {
        periodeId: periodeId,
        tipeReferensi: "PERIOD_CLOSING",
      },
      include: {
        details: {
          include: {
            akun: true,
          },
          orderBy: {
            debit: "desc",
          },
        },
        periode: true,
        user: {
          select: {
            id: true,
            nama: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Get opening balances for next period
    const openingBalances = await prisma.saldoAwal.findMany({
      where: {
        periodeId: periodeId,
      },
      include: {
        akun: true,
        periode: true,
      },
    });

    // Calculate net income from closing entries
    let netIncome = 0;
    for (const entry of closingEntries) {
      // Revenue closing: retained earnings debit = revenue credit
      // Expense closing: retained earnings credit = expense debit
      const retainedEarningsDetail = entry.details.find((detail) =>
        detail.deskripsi?.includes("Penutupan akun pendapatan"),
      );
      if (retainedEarningsDetail) {
        netIncome += retainedEarningsDetail.debit.toNumber();
      }

      const expenseClosingDetail = entry.details.find((detail) =>
        detail.deskripsi?.includes("Penutupan akun beban"),
      );
      if (expenseClosingDetail) {
        netIncome -= expenseClosingDetail.kredit.toNumber();
      }
    }

    const mappedClosingEntries = closingEntries.map((entry) => ({
      ...entry,
      details: entry.details.map((detail) => ({
        ...detail,
        debit: detail.debit.toNumber(),
        kredit: detail.kredit.toNumber(),
      })),
    }));

    const mappedOpeningBalances = openingBalances.map((balance) => ({
      ...balance,
      saldo: balance.saldo.toNumber(),
    }));

    const result: PeriodClosingData = {
      periodeId,
      periode,
      closingEntries: mappedClosingEntries as any,
      openingBalances: mappedOpeningBalances as any,
      netIncome,
      status: "completed",
      closedAt: periode.updatedAt?.toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching period closing status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
