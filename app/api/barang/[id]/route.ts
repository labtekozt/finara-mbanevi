import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createJournalEntryForStockAdjustment } from "@/lib/accounting-utils";
import { z } from "zod";
import { serializeDecimal } from "@/lib/utils";
import logger from "@/lib/logger";

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

    const { id } = await params;
    const body = await request.json();
    const validatedData = barangSchema.parse(body);

    // Get current item to check for stock changes
    const currentBarang = await prisma.barang.findUnique({
      where: { id },
    });

    if (!currentBarang) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const barang = await prisma.barang.update({
      where: { id },
      data: validatedData,
      include: {
        lokasi: true,
      },
    });

    // Check for stock adjustment and create journal entry if needed
    const stockDifference = validatedData.stok - currentBarang.stok;
    if (stockDifference !== 0) {
      try {
        const adjustmentAmount =
          Math.abs(stockDifference) * currentBarang.hargaBeli.toNumber();
        const isIncrease = stockDifference > 0;

        await createJournalEntryForStockAdjustment(
          `ADJ-${barang.id}-${Date.now()}`,
          adjustmentAmount,
          isIncrease,
          session.user.id,
        );

        logger.info(
          `Stock adjustment journal created for ${barang.nama}: ${stockDifference > 0 ? "+" : ""}${stockDifference} units`,
        );
      } catch (journalError) {
        logger.error(
          "Failed to create stock adjustment journal:",
          journalError,
        );
        // Don't fail the update if journal creation fails
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "",
        action: "UPDATE",
        entity: "Barang",
        entityId: barang.id,
        description: `Mengupdate barang: ${barang.nama}${stockDifference !== 0 ? ` (stok: ${currentBarang.stok} → ${validatedData.stok})` : ""}`,
      },
    });

    return NextResponse.json(barang);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    logger.error("Error updating barang:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
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
