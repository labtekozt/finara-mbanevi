import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createJournalEntryForStockAddition } from "@/lib/accounting-utils";
import { z } from "zod";
import { serializeDecimal } from "@/lib/utils";

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

// GET - List all items with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const kategori = searchParams.get("kategori");
    const lokasiId = searchParams.get("lokasiId");
    const search = searchParams.get("search");

    const where: any = {};
    if (kategori) where.kategori = kategori;
    if (lokasiId) where.lokasiId = lokasiId;
    if (search) {
      where.OR = [
        { nama: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    const barang = await prisma.barang.findMany({
      where,
      include: {
        lokasi: true,
      },
      orderBy: {
        nama: "asc",
      },
    });

    return NextResponse.json(serializeDecimal(barang));
  } catch (error) {
    console.error("Error fetching barang:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 },
    );
  }
}

// POST - Create new item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = barangSchema.parse(body);

    const barang = await prisma.barang.create({
      data: validatedData,
      include: {
        lokasi: true,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "",
        action: "CREATE",
        entity: "Barang",
        entityId: barang.id,
        description: `Menambah barang baru: ${barang.nama}`,
      },
    });

    // Create journal entry for initial inventory if stock > 0
    if (validatedData.stok > 0) {
      const totalNilai = validatedData.stok * validatedData.hargaBeli;
      await createJournalEntryForStockAddition(
        `INITIAL-${barang.id}`,
        totalNilai,
        "INTERNAL_ADJUSTMENT",
        session.user.id,
      );
    }

    return NextResponse.json(barang, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Error creating barang:", error);
    return NextResponse.json(
      { error: "Failed to create item" },
      { status: 500 },
    );
  }
}
