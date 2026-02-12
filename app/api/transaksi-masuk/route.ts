import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateMasukNumber } from "@/lib/transaction-number";
import { createJournalEntryForStockAddition } from "@/lib/accounting-utils";
import { ensureActivePeriod } from "@/lib/period-management";
import { z } from "zod";
import logger from "@/lib/logger";

const transaksiMasukSchema = z.object({
  barangId: z.string().min(1, "Barang harus dipilih"),
  qty: z.number().positive("Jumlah harus lebih dari 0"),
  hargaBeli: z.number().min(0, "Harga beli tidak boleh negatif"),
  supplierId: z.string().optional(), // Optional because internal adjustment might not have supplier
  lokasiId: z.string().min(1, "Lokasi harus dipilih"),
  keterangan: z.string().optional(),
  tanggal: z.string().optional(), // Transaction date, defaults to now if not provided
  reason: z.enum(["PURCHASE", "STOCK_OPNAME_SURPLUS", "INTERNAL_ADJUSTMENT"], {
    required_error: "Alasan penambahan stok harus dipilih",
  }),
  paymentMethod: z.enum(["CASH", "CREDIT"]).optional(),
  dueDate: z.string().optional(),
});

// GET - List incoming transactions
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

    const transaksi = await prisma.transaksiMasuk.findMany({
      where,
      include: {
        barang: true,
        lokasi: true,
      },
      orderBy: {
        tanggal: "desc",
      },
      take: 100,
    });

    return NextResponse.json(transaksi);
  } catch (error) {
    logger.error("Error fetching transaksi masuk:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 },
    );
  }
}

// POST - Create incoming transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user exists
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!userExists) {
      return NextResponse.json(
        { error: "User session invalid. Please relogin." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validatedData = transaksiMasukSchema.parse(body);

    // Validate numeric limits
    const MAX_DECIMAL = 9999999999999.99;
    if (validatedData.hargaBeli > MAX_DECIMAL) {
      return NextResponse.json(
        { error: "Harga beli terlalu besar" },
        { status: 400 },
      );
    }

    const totalNilai = validatedData.qty * validatedData.hargaBeli;
    if (totalNilai > MAX_DECIMAL) {
      return NextResponse.json(
        { error: "Total nilai transaksi terlalu besar" },
        { status: 400 },
      );
    }

    // Ensure active accounting period (auto-close if needed)
    const transactionDate = validatedData.tanggal
      ? new Date(validatedData.tanggal)
      : new Date();
    await ensureActivePeriod(transactionDate, session.user.id);

    // Create transaction and update stock (increase timeout for accounting operations)
    const transaksi = await prisma.$transaction(
      async (tx: any) => {
        const newTransaksi = await tx.transaksiMasuk.create({
          data: {
            nomorTransaksi: generateMasukNumber(),
            barangId: validatedData.barangId,
            qty: validatedData.qty,
            hargaBeli: validatedData.hargaBeli,
            totalNilai,
            supplierId: validatedData.supplierId,
            lokasiId: validatedData.lokasiId,
            keterangan: validatedData.keterangan,
          },
          include: {
            barang: true,
            lokasi: true,
          },
        });

        // Update stock
        await tx.barang.update({
          where: { id: validatedData.barangId },
          data: {
            stok: {
              increment: validatedData.qty,
            },
            hargaBeli: validatedData.hargaBeli, // Update purchase price
          },
        });

        // Create hutang if payment method is CREDIT
        if (
          validatedData.reason === "PURCHASE" &&
          validatedData.paymentMethod === "CREDIT"
        ) {
          const nomorHutang = `HTG-${Date.now()}`;
          const deskripsi = `Pembelian ${newTransaksi.barang.nama} - ${validatedData.qty} ${newTransaksi.barang.satuan}`;

          await tx.hutang.create({
            data: {
              nomorHutang,
              transaksiMasukId: newTransaksi.id,
              supplierId: validatedData.supplierId,
              deskripsi,
              totalHutang: totalNilai,
              totalBayar: 0,
              sisaHutang: totalNilai,
              status: "BELUM_LUNAS",
              jatuhTempo: validatedData.dueDate
                ? new Date(validatedData.dueDate)
                : null,
            },
          });
        }

        // Log activity
        await tx.activityLog.create({
          data: {
            userId: session.user.id,
            userName: session.user.name || "",
            action: "CREATE",
            entity: "TransaksiMasuk",
            entityId: newTransaksi.id,
            description: `Barang masuk ${newTransaksi.nomorTransaksi} - ${newTransaksi.barang.nama} (${validatedData.qty} ${newTransaksi.barang.satuan})`,
          },
        });

        // Create accounting journal entry (critical for balance)
        // Now inside the transaction!
        await createJournalEntryForStockAddition(
          newTransaksi.id,
          totalNilai,
          validatedData.reason,
          session.user.id,
          validatedData.paymentMethod,
          tx, // Pass transaction client
        );

        return newTransaksi;
      },
      {
        timeout: 15000, // Increase timeout to 15 seconds for accounting operations
      },
    );

    return NextResponse.json(transaksi, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    logger.error("Error creating transaksi masuk:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 },
    );
  }
}
