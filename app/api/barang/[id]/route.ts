import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import {
  createJournalEntryForStockAdjustment,
  createJournalEntryForStockAddition,
} from "@/lib/accounting-utils";
import { z } from "zod";
import { serializeDecimal } from "@/lib/utils";
import logger from "@/lib/logger";
import { generateMasukNumber } from "@/lib/transaction-number";

const barangSchema = z.object({
  nama: z.string().min(1, "Nama barang harus diisi"),
  sku: z.string().optional(),
  kategori: z.string().min(1, "Kategori harus diisi"),
  stok: z.number().int().min(0, "Stok tidak boleh negatif"),
  stokMinimum: z.number().int().min(0, "Stok minimum tidak boleh negatif"),
  hargaBeli: z.number().min(0, "Harga beli tidak boleh negatif"),
  hargaJual: z.number().min(0, "Harga jual tidak boleh negatif"),
  satuan: z.string().min(1, "Satuan harus diisi"),
  deskripsi: z.string().optional(),
  lokasiId: z.string().min(1, "Lokasi harus dipilih"),
  // Optional fields for stock addition during edit
  paymentMethod: z.enum(["CASH", "CREDIT"]).optional(),
  supplierId: z.string().optional(),
  dueDate: z.string().optional(),
});

// GET - Get single item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const barang = await prisma.barang.findUnique({
      where: { id },
      include: {
        lokasi: true,
      },
    });

    if (!barang) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(serializeDecimal(barang));
  } catch (error) {
    logger.error("Error fetching item:", error);
    return NextResponse.json(
      { error: "Failed to fetch item" },
      { status: 500 },
    );
  }
}

// PUT - Update item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const body = await request.json();
    const validatedData = barangSchema.parse(body);

    // Validate numeric limits for Decimal(15, 2)
    const MAX_DECIMAL = 9999999999999.99;
    if (
      validatedData.hargaBeli > MAX_DECIMAL ||
      validatedData.hargaJual > MAX_DECIMAL
    ) {
      return NextResponse.json(
        { error: "Harga terlalu besar (maksimum 9.999.999.999.999,99)" },
        { status: 400 },
      );
    }

    // Get current item to check for stock changes
    const currentBarang = await prisma.barang.findUnique({
      where: { id },
    });

    if (!currentBarang) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Use transaction for atomicity (increase timeout for accounting operations)
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Update Barang
        // We need to exclude the optional fields that are not part of Barang model
        const { paymentMethod, supplierId, dueDate, ...barangData } =
          validatedData;

        const barang = await tx.barang.update({
          where: { id },
          data: barangData,
          include: {
            lokasi: true,
          },
        });

        // 2. Check for stock adjustment
        const stockDifference = validatedData.stok - currentBarang.stok;

        // Prevent stock decrease via Edit Item endpoint
        if (stockDifference < 0) {
          throw new Error(
            "Stok tidak dapat dikurangi melalui menu Edit Barang. Gunakan Transaksi Keluar atau Stock Opname.",
          );
        }

        if (stockDifference > 0) {
          try {
            const adjustmentAmount =
              stockDifference * currentBarang.hargaBeli.toNumber();
            const isIncrease = true;

            // Case A: Stock Increase with Payment Method (Purchase)
            if (paymentMethod) {
              const totalNilai = adjustmentAmount;
              const reason = "PURCHASE";

              // Create TransaksiMasuk
              const transaksiMasuk = await tx.transaksiMasuk.create({
                data: {
                  nomorTransaksi: generateMasukNumber(),
                  barangId: barang.id,
                  qty: stockDifference,
                  hargaBeli: barang.hargaBeli,
                  totalNilai: totalNilai,
                  supplierId: supplierId,
                  lokasiId: barang.lokasiId,
                  keterangan: "Penambahan stok via Edit Barang",
                  tanggal: new Date(),
                },
              });

              // Create Hutang if Credit
              if (paymentMethod === "CREDIT") {
                const nomorHutang = `HTG-${Date.now()}`;
                await tx.hutang.create({
                  data: {
                    nomorHutang,
                    transaksiMasukId: transaksiMasuk.id,
                    supplierId: supplierId,
                    deskripsi: `Pembelian (Edit) ${barang.nama}`,
                    totalHutang: totalNilai,
                    totalBayar: 0,
                    sisaHutang: totalNilai,
                    status: "BELUM_LUNAS",
                    jatuhTempo: dueDate ? new Date(dueDate) : null,
                  },
                });
              }

              // Journal
              await createJournalEntryForStockAddition(
                transaksiMasuk.id,
                totalNilai,
                reason,
                session.user.id,
                paymentMethod,
                tx,
              );
            } else {
              // Case B: Generic Adjustment (Increase without payment info)
              // This happens if user just increases the number without filling purchase details (should be prevented by UI validation ideally)
              await createJournalEntryForStockAdjustment(
                `ADJ-${barang.id}-${Date.now()}`,
                adjustmentAmount,
                isIncrease,
                session.user.id,
                tx,
              );
            }

            logger.info(
              `Stock adjustment journal created for ${barang.nama}: +${stockDifference} units`,
            );
          } catch (journalError) {
            logger.error(
              "Failed to create stock adjustment journal:",
              journalError,
            );
            throw journalError;
          }
        }

        // Log activity
        await tx.activityLog.create({
          data: {
            userId: session.user.id,
            userName: session.user.name || "",
            action: "UPDATE",
            entity: "Barang",
            entityId: barang.id,
            description: `Mengupdate barang: ${barang.nama}${stockDifference !== 0 ? ` (stok: ${currentBarang.stok} → ${validatedData.stok})` : ""}`,
          },
        });

        return barang;
      },
      {
        timeout: 15000, // Increase timeout to 15 seconds for complex accounting operations
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    logger.error("Error updating barang:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update item",
      },
      { status: 500 },
    );
  }
}

// DELETE - Delete item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const barang = await prisma.barang.findUnique({
      where: { id },
    });

    if (!barang) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await prisma.barang.delete({
      where: { id },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "",
        action: "DELETE",
        entity: "Barang",
        entityId: id,
        description: `Menghapus barang: ${barang.nama}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting barang:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 },
    );
  }
}
