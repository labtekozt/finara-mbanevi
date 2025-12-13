import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateTransactionNumber } from "@/lib/transaction-number";
import { createJournalEntryForStockAdjustment } from "@/lib/accounting-utils";
import { z } from "zod";
import logger from "@/lib/logger";

const stockOpnameSchema = z.object({
  barangId: z.string().min(1, "Barang harus dipilih"),
  stokSistem: z.number().int().min(0, "Stok sistem harus valid"),
  stokFisik: z.number().int().min(0, "Stok fisik harus valid"),
  lokasiId: z.string().min(1, "Lokasi harus dipilih"),
  keterangan: z.string().min(1, "Keterangan penyesuaian harus diisi"),
});

// GET - List stock adjustments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const lokasiId = searchParams.get("lokasiId");

    const where: any = {};
    if (startDate || endDate) {
      where.tanggal = {};
      if (startDate) where.tanggal.gte = new Date(startDate);
      if (endDate) where.tanggal.lte = new Date(endDate);
    }
    if (lokasiId) where.lokasiId = lokasiId;

    // For now, we'll use TransaksiKeluar with "opname" in keterangan as adjustment records
    // In a real implementation, you'd have a separate StockOpname model
    const adjustments = await prisma.transaksiKeluar.findMany({
      where: {
        ...where,
        keterangan: {
          contains: "OPNAME",
        },
      },
      include: {
        barang: true,
        lokasi: true,
      },
      orderBy: {
        tanggal: "desc",
      },
      take: 100,
    });

    return NextResponse.json(adjustments);
  } catch (error) {
    logger.error("Error fetching stock adjustments:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock adjustments" },
      { status: 500 },
    );
  }
}

// POST - Create stock adjustment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = stockOpnameSchema.parse(body);

    // Get current item
    const barang = await prisma.barang.findUnique({
      where: { id: validatedData.barangId },
      include: { lokasi: true },
    });

    if (!barang) {
      return NextResponse.json(
        { error: "Barang tidak ditemukan" },
        { status: 404 },
      );
    }

    // Verify system stock matches
    if (barang.stok !== validatedData.stokSistem) {
      return NextResponse.json(
        {
          error: `Stok sistem tidak sesuai. Sistem: ${barang.stok}, Input: ${validatedData.stokSistem}`,
        },
        { status: 400 },
      );
    }

    const adjustmentQty = validatedData.stokFisik - validatedData.stokSistem;
    const adjustmentAmount =
      Math.abs(adjustmentQty) * barang.hargaBeli.toNumber();
    const isIncrease = adjustmentQty > 0;

    // Create adjustment transaction and update stock
    const adjustment = await prisma.$transaction(async (tx) => {
      // Create adjustment record using TransaksiKeluar
      const adjustmentTransaksi = await tx.transaksiKeluar.create({
        data: {
          nomorTransaksi: generateTransactionNumber("OPN"),
          barangId: validatedData.barangId,
          qty: adjustmentQty, // Positive for increase, negative for decrease
          hargaBarang: barang.hargaBeli,
          totalNilai: adjustmentAmount,
          tujuan: "Stock Opname",
          lokasiId: validatedData.lokasiId,
          keterangan: `OPNAME - ${validatedData.keterangan} (Sistem: ${validatedData.stokSistem}, Fisik: ${validatedData.stokFisik}, Selisih: ${adjustmentQty > 0 ? "+" : ""}${adjustmentQty})`,
        },
        include: {
          barang: true,
          lokasi: true,
        },
      });

      // Update stock to match physical count
      await tx.barang.update({
        where: { id: validatedData.barangId },
        data: {
          stok: validatedData.stokFisik,
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name || "",
          action: "CREATE",
          entity: "StockOpname",
          entityId: adjustmentTransaksi.id,
          description: `Stock opname ${adjustmentTransaksi.nomorTransaksi} - ${adjustmentTransaksi.barang.nama}: ${validatedData.stokSistem} → ${validatedData.stokFisik} (${adjustmentQty > 0 ? "+" : ""}${adjustmentQty})`,
        },
      });

      return adjustmentTransaksi;
    });

    // Create accounting journal entry (critical for balance)
    await createJournalEntryForStockAdjustment(
      adjustment.nomorTransaksi,
      adjustmentAmount,
      isIncrease,
      session.user.id,
    );

    return NextResponse.json(adjustment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    logger.error("Error creating stock adjustment:", error);
    return NextResponse.json(
      { error: "Failed to create stock adjustment" },
      { status: 500 },
    );
  }
}
