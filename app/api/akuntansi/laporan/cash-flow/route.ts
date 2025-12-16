import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { CashFlowData } from "@/types/accounting";
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 },
      );
    }

    // Parse dates and set time boundaries
    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);

    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    logger.info("Cash flow request", {
      startDate,
      endDate,
      startDateTime,
      endDateTime,
    });

    // Get saldo awal (balance before start date) from Kas account
    const kasAccount = await prisma.akun.findFirst({
      where: {
        OR: [
          { kode: { startsWith: "1-1" } }, // Cash accounts usually start with 1-1
          { nama: { contains: "Kas", mode: "insensitive" } },
        ],
        tipe: "ASSET",
        isActive: true,
      },
    });

    let saldoAwal = 0;
    if (kasAccount) {
      // Get all transactions before start date
      const entriesBeforeStart = await prisma.jurnalDetail.findMany({
        where: {
          akunId: kasAccount.id,
          jurnal: {
            tanggal: {
              lt: startDateTime,
            },
            isPosted: true,
          },
        },
        select: {
          debit: true,
          kredit: true,
        },
      });

      // Calculate opening balance
      for (const entry of entriesBeforeStart) {
        saldoAwal += entry.debit.toNumber() - entry.kredit.toNumber();
      }
    }

    // Get all cash transactions in the date range
    const kasTransactions = kasAccount
      ? await prisma.jurnalDetail.findMany({
          where: {
            akunId: kasAccount.id,
            jurnal: {
              tanggal: {
                gte: startDateTime,
                lte: endDateTime,
              },
              isPosted: true,
            },
          },
          include: {
            jurnal: true,
            akun: true,
          },
          orderBy: {
            jurnal: {
              tanggal: "asc",
            },
          },
        })
      : [];

    // Get transaksi kasir
    const transaksiKasir = await prisma.transaksiKasir.findMany({
      where: {
        tanggal: {
          gte: startDateTime,
          lte: endDateTime,
        },
      },
      select: {
        id: true,
        nomorTransaksi: true,
        tanggal: true,
        total: true,
        metodePembayaran: true,
      },
      orderBy: {
        tanggal: "asc",
      },
    });

    // Get pengeluaran
    const pengeluaran = await prisma.pengeluaran.findMany({
      where: {
        tanggal: {
          gte: startDateTime,
          lte: endDateTime,
        },
      },
      select: {
        id: true,
        tanggal: true,
        deskripsi: true,
        jumlah: true,
        kategori: true,
        penerima: true,
      },
      orderBy: {
        tanggal: "asc",
      },
    });

    // Get transaksi masuk (pembelian/stock in)
    const transaksiMasuk = await prisma.transaksiMasuk.findMany({
      where: {
        tanggal: {
          gte: startDateTime,
          lte: endDateTime,
        },
      },
      orderBy: {
        tanggal: "asc",
      },
    });

    // Combine all transactions into entries
    const entries: any[] = [];
    let currentBalance = saldoAwal;
    let totalPemasukan = 0;
    let totalPengeluaran = 0;

    // Summary categories
    const summary = {
      pemasukan: {
        penjualan: 0,
        lainnya: 0,
        total: 0,
      },
      pengeluaran: {
        pembelian: 0,
        operasional: 0,
        gaji: 0,
        lainnya: 0,
        total: 0,
      },
    };

    // Add transaksi kasir (income)
    transaksiKasir.forEach((t) => {
      const jumlah = t.total.toNumber();
      currentBalance += jumlah;
      totalPemasukan += jumlah;
      summary.pemasukan.penjualan += jumlah;

      entries.push({
        tanggal: t.tanggal.toISOString(),
        deskripsi: `Penjualan - ${t.nomorTransaksi}`,
        kategori: "Penjualan",
        referensi: t.nomorTransaksi,
        tipe: "in",
        jumlah,
        saldo: currentBalance,
      });
    });

    // Add pengeluaran (expense)
    pengeluaran.forEach((p) => {
      const jumlah = p.jumlah.toNumber();
      currentBalance -= jumlah;
      totalPengeluaran += jumlah;

      // Categorize
      if (p.kategori === "GAJI_KARYAWAN") {
        summary.pengeluaran.gaji += jumlah;
      } else if (
        ["UTILITAS", "SEWA", "PERLENGKAPAN_KANTOR", "TRANSPORTASI"].includes(
          p.kategori,
        )
      ) {
        summary.pengeluaran.operasional += jumlah;
      } else {
        summary.pengeluaran.lainnya += jumlah;
      }

      entries.push({
        tanggal: p.tanggal.toISOString(),
        deskripsi: `Pengeluaran - ${p.deskripsi}`,
        kategori: p.kategori,
        referensi: p.id,
        tipe: "out",
        jumlah,
        saldo: currentBalance,
      });
    });

    // Add transaksi masuk (purchases - expense)
    transaksiMasuk.forEach((t: any) => {
      const jumlah = t.totalNilai.toNumber();
      currentBalance -= jumlah;
      totalPengeluaran += jumlah;
      summary.pengeluaran.pembelian += jumlah;

      const supplierInfo = t.keterangan || t.sumber || "";
      entries.push({
        tanggal: t.tanggal.toISOString(),
        deskripsi: `Pembelian - ${t.nomorTransaksi}${supplierInfo ? ` (${supplierInfo})` : ""}`,
        kategori: "Pembelian",
        referensi: t.nomorTransaksi,
        tipe: "out",
        jumlah,
        saldo: currentBalance,
      });
    });

    // Sort entries by date
    entries.sort(
      (a, b) =>
        new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime(),
    );

    // Recalculate balance in sorted order
    currentBalance = saldoAwal;
    entries.forEach((entry) => {
      if (entry.tipe === "in") {
        currentBalance += entry.jumlah;
      } else {
        currentBalance -= entry.jumlah;
      }
      entry.saldo = currentBalance;
    });

    summary.pemasukan.total = totalPemasukan;
    summary.pengeluaran.total = totalPengeluaran;

    const result: CashFlowData = {
      startDate: startDate,
      endDate: endDate,
      saldoAwal,
      saldoAkhir: currentBalance,
      totalPemasukan,
      totalPengeluaran,
      netCashFlow: totalPemasukan - totalPengeluaran,
      entries,
      summary,
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error fetching cash flow", error);
    return NextResponse.json(
      { error: "Failed to fetch cash flow" },
      { status: 500 },
    );
  }
}
