import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";
import { Prisma } from "@prisma/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/supplier/[id]/stats
 * Get supplier statistics
 */
export async function GET(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!userExists) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Get supplier with all relations
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      include: {
        transaksiMasuk: {
          include: {
            barang: true,
          },
        },
        hutang: {
          where: {
            status: {
              in: ["BELUM_LUNAS", "JATUH_TEMPO"],
            },
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 },
      );
    }

    // Calculate statistics
    const totalTransactions = supplier.transaksiMasuk.length;
    const totalValue = supplier.transaksiMasuk.reduce(
      (sum, t) => sum + Number(t.totalNilai),
      0,
    );

    // Get ALL hutang for totalHutang (including LUNAS)
    const allHutang = await prisma.hutang.findMany({
      where: { supplierId: params.id },
    });

    const totalHutang = allHutang.reduce(
      (sum, h) => sum + Number(h.totalHutang),
      0,
    );

    const totalHutangBelumLunas = supplier.hutang.reduce(
      (sum, h) => sum + Number(h.sisaHutang),
      0,
    );

    // Group by barang
    const barangStats = supplier.transaksiMasuk.reduce(
      (acc, t) => {
        const key = t.barangId;
        if (!acc[key]) {
          acc[key] = {
            barangId: t.barangId,
            namaBarang: t.barang.nama,
            totalQty: 0,
            totalValue: 0,
            transactions: 0,
          };
        }
        acc[key].totalQty += t.qty;
        acc[key].totalValue += Number(t.totalNilai);
        acc[key].transactions += 1;
        return acc;
      },
      {} as Record<string, any>,
    );

    const topProducts = Object.values(barangStats)
      .sort((a: any, b: any) => b.totalValue - a.totalValue)
      .slice(0, 10);

    // Monthly trends (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyTransactions = await prisma.transaksiMasuk.groupBy({
      by: ["tanggal"],
      where: {
        supplierId: params.id,
        tanggal: {
          gte: twelveMonthsAgo,
        },
      },
      _sum: {
        totalNilai: true,
        qty: true,
      },
      _count: true,
    });

    return NextResponse.json({
      supplier: {
        id: supplier.id,
        kode: supplier.kode,
        nama: supplier.nama,
      },
      statistics: {
        totalTransactions,
        totalValue,
        totalHutang,
        totalHutangBelumLunas,
        averageTransactionValue:
          totalTransactions > 0 ? totalValue / totalTransactions : 0,
      },
      topProducts,
      monthlyTrends: monthlyTransactions,
    });
  } catch (error) {
    logger.error("Error fetching supplier stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier statistics" },
      { status: 500 },
    );
  }
}
