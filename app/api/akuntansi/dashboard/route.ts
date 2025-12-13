import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
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

    // Get total accounts
    const totalAkun = await prisma.akun.count({
      where: { isActive: true },
    });

    // Get total journal entries for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const totalJurnal = await prisma.jurnalEntry.count({
      where: {
        tanggal: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        isPosted: true,
      },
    });

    // Get active period
    const activePeriod = await prisma.periodeAkuntansi.findFirst({
      where: { isActive: true },
    });

    // Check if books are balanced (simple check - total debits = total credits)
    const currentPeriodEntries = await prisma.jurnalEntry.findMany({
      where: {
        periodeId: activePeriod?.id,
        isPosted: true,
      },
      include: {
        details: true,
      },
    });

    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of currentPeriodEntries) {
      for (const detail of entry.details) {
        totalDebit += detail.debit.toNumber();
        totalCredit += detail.kredit.toNumber();
      }
    }

    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    return NextResponse.json({
      totalAkun,
      totalJurnal,
      periodeAktif: activePeriod?.nama || "Tidak ada periode aktif",
      isBalanced,
    });
  } catch (error) {
    logger.error("Error fetching accounting dashboard data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
