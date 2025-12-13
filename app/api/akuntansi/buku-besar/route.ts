import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { GeneralLedgerData } from "@/types/accounting";

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
    const akunId = searchParams.get("akunId");
    const periodeId = searchParams.get("periodeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!akunId) {
      return NextResponse.json(
        { error: "akunId is required" },
        { status: 400 },
      );
    }

    // Get account details
    const akun = await prisma.akun.findUnique({
      where: { id: akunId },
    });

    if (!akun) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Build where clause for journal details
    const where: any = {
      akunId: akunId,
    };

    if (periodeId) {
      where.jurnal = {
        periodeId: periodeId,
      };
    }

    if (startDate && endDate) {
      where.jurnal = {
        ...where.jurnal,
        tanggal: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      };
    }

    // Get all journal details for this account
    const journalDetails = await prisma.jurnalDetail.findMany({
      where,
      include: {
        jurnal: {
          include: {
            periode: true,
            user: {
              select: {
                id: true,
                nama: true,
                username: true,
              },
            },
          },
        },
        akun: true,
      },
      orderBy: [
        {
          jurnal: {
            tanggal: "asc",
          },
        },
        {
          jurnal: {
            createdAt: "asc",
          },
        },
      ],
    });

    // Calculate opening balance (saldo awal)
    let saldoAwal = 0;

    // If we have date filters, calculate opening balance up to start date
    if (startDate) {
      const openingWhere: any = {
        akunId: akunId,
        jurnal: {
          tanggal: {
            lt: new Date(startDate),
          },
        },
      };

      if (periodeId) {
        openingWhere.jurnal.periodeId = periodeId;
      }

      const openingDetails = await prisma.jurnalDetail.findMany({
        where: openingWhere,
        select: {
          debit: true,
          kredit: true,
        },
      });

      // Calculate opening balance based on account type
      for (const detail of openingDetails) {
        if (akun.tipe === "ASSET" || akun.tipe === "EXPENSE") {
          saldoAwal += detail.debit.toNumber() - detail.kredit.toNumber();
        } else {
          saldoAwal += detail.kredit.toNumber() - detail.debit.toNumber();
        }
      }
    }

    // Build general ledger entries with running balance
    let runningBalance = saldoAwal;
    const entries = journalDetails.map((detail) => {
      const debit = detail.debit.toNumber();
      const kredit = detail.kredit.toNumber();

      // Calculate running balance based on account type
      if (akun.tipe === "ASSET" || akun.tipe === "EXPENSE") {
        runningBalance += debit - kredit;
      } else {
        runningBalance += kredit - debit;
      }

      return {
        id: detail.id,
        tanggal: detail.jurnal.tanggal.toISOString().split("T")[0],
        nomorJurnal: detail.jurnal.nomorJurnal,
        deskripsi: detail.deskripsi || detail.jurnal.deskripsi,
        referensi: detail.jurnal.referensi,
        debit: debit,
        kredit: kredit,
        saldo: runningBalance,
        jurnalId: detail.jurnalId,
        jurnalEntry: {
          id: detail.jurnal.id,
          nomorJurnal: detail.jurnal.nomorJurnal,
          tanggal: detail.jurnal.tanggal.toISOString().split("T")[0],
          deskripsi: detail.jurnal.deskripsi,
        },
      };
    });

    // Calculate totals
    const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalKredit = entries.reduce((sum, entry) => sum + entry.kredit, 0);
    const saldoAkhir = runningBalance;

    const result: GeneralLedgerData = {
      akun: akun as any,
      entries: entries as any,
      saldoAwal,
      saldoAkhir,
      totalDebit,
      totalKredit,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching general ledger:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
