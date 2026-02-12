import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateTransactionNumber } from "@/lib/transaction-number";
import { createJournalEntryForPurchaseReturn } from "@/lib/accounting-utils";
import { z } from "zod";
import logger from "@/lib/logger";

const returPembelianSchema = z.object({
  transaksiMasukId: z.string().min(1, "Transaksi pembelian harus dipilih"),
  qty: z.number().positive("Jumlah harus lebih dari 0"),
  alasan: z.string().min(1, "Alasan retur harus diisi"),
  catatan: z.string().optional(),
});

// GET - List purchase returns
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (startDate || endDate) {
      where.tanggal = {};
      if (startDate) where.tanggal.gte = new Date(startDate);
      if (endDate) where.tanggal.lte = new Date(endDate);
    }

    // For now, we'll use TransaksiMasuk as return records
    // In a real implementation, you'd have a separate ReturPembelian model
    const retur = await prisma.transaksiMasuk.findMany({
      where: {
        ...where,
        keterangan: {
          contains: "RETUR",
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

    return NextResponse.json(retur);
  } catch (error) {
    logger.error("Error fetching retur pembelian:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase returns" },
      { status: 500 },
    );
  }
}

// POST - Create purchase return
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = returPembelianSchema.parse(body);

    // Get original purchase transaction
    const originalTransaksi = await prisma.transaksiMasuk.findUnique({
      where: { id: validatedData.transaksiMasukId },
      include: {
        barang: true,
        hutang: true,
        supplier: true,
      },
    });

    if (!originalTransaksi) {
      return NextResponse.json(
        { error: "Transaksi pembelian tidak ditemukan" },
        { status: 404 },
      );
    }

    // Find previous returns for this transaction
    const previousReturns = await prisma.transaksiMasuk.findMany({
      where: {
        keterangan: {
          contains: `RETUR ${originalTransaksi.nomorTransaksi}`,
        },
      },
    });

    const alreadyReturnedQty = previousReturns.reduce(
      (sum, retur) => sum + Math.abs(retur.qty.toNumber()),
      0,
    );

    if (alreadyReturnedQty + validatedData.qty > originalTransaksi.qty.toNumber()) {
      return NextResponse.json(
        {
          error: `Jumlah retur (${validatedData.qty}) melebihi sisa yang bisa diretur (Sisa: ${originalTransaksi.qty.toNumber() - alreadyReturnedQty})`,
        },
        { status: 400 },
      );
    }

    const returnAmount =
      validatedData.qty * originalTransaksi.hargaBeli.toNumber();

    // Determine if original purchase was cash or credit based on Hutang existence
    const isCreditPurchase = !!originalTransaksi.hutang;
    const isCashPurchase = !isCreditPurchase;

    logger.info("Retur Pembelian Debug:", {
      supplier: originalTransaksi.supplier?.nama,
      isCashPurchase,
      returnAmount,
    });

    // Create return transaction and update stock (increase timeout for accounting operations)
    const retur = await prisma.$transaction(
      async (tx) => {
        // Create a new "return" transaction record (using TransaksiMasuk with negative qty)
        const returnTransaksi = await tx.transaksiMasuk.create({
          data: {
            nomorTransaksi: generateTransactionNumber("RTP"),
            barangId: originalTransaksi.barangId,
            qty: -validatedData.qty, // Negative to indicate return
            hargaBeli: originalTransaksi.hargaBeli,
            totalNilai: -returnAmount, // Negative
            supplierId: originalTransaksi.supplierId,
            lokasiId: originalTransaksi.lokasiId,
            // Include original transaction number for tracking
            keterangan: `RETUR ${originalTransaksi.nomorTransaksi} - ${validatedData.alasan}${validatedData.catatan ? ` - ${validatedData.catatan}` : ""}`,
          },
          include: {
            barang: true,
            lokasi: true,
          },
        });

        // Update stock (decrease due to return)
        await tx.barang.update({
          where: { id: originalTransaksi.barangId },
          data: {
            stok: {
              decrement: validatedData.qty,
            },
          },
        });

        // Log activity
        await tx.activityLog.create({
          data: {
            userId: session.user.id,
            userName: session.user.name || "",
            action: "CREATE",
            entity: "ReturPembelian",
            entityId: returnTransaksi.id,
            description: `Retur pembelian ${returnTransaksi.nomorTransaksi} - ${originalTransaksi.barang.nama} (${validatedData.qty} ${originalTransaksi.barang.satuan})`,
          },
        });

        // Create accounting journal entry (critical for balance)
        // Now inside the transaction!
        await createJournalEntryForPurchaseReturn(
          returnTransaksi.nomorTransaksi,
          returnAmount,
          isCashPurchase,
          session.user.id,
          tx, // Pass transaction client
        );

        return returnTransaksi;
      },
      {
        timeout: 15000, // Increase timeout to 15 seconds for accounting operations
      },
    );

    return NextResponse.json(retur, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    logger.error("Error creating retur pembelian:", error);
    return NextResponse.json(
      { error: "Failed to create purchase return" },
      { status: 500 },
    );
  }
}
