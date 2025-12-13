import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createJournalEntryForStockAddition } from "@/lib/accounting-utils";
import { z } from "zod";
import { serializeDecimal } from "@/lib/utils";
import logger from "@/lib/logger";
import {
  generateTransactionNumber,
  generateMasukNumber,
} from "@/lib/transaction-number";

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
  // Optional fields for initial stock purchase
  paymentMethod: z.enum(["CASH", "CREDIT"]).optional(),
  supplier: z.string().optional(),
  dueDate: z.string().optional(),
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
    logger.error("Error fetching barang:", error);
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

    const totalNilai = validatedData.stok * validatedData.hargaBeli;
    if (totalNilai > MAX_DECIMAL) {
      return NextResponse.json(
        {
          error:
            "Total nilai stok awal terlalu besar (maksimum 9.999.999.999.999,99)",
        },
        { status: 400 },
      );
    }

    // Auto-generate SKU if not provided
    let sku = validatedData.sku;
    if (!sku || sku.trim() === "") {
      sku = generateTransactionNumber("BRG");
    }

    // Use transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Barang
      const barang = await tx.barang.create({
        data: {
          nama: validatedData.nama,
          sku: sku!,
          kategori: validatedData.kategori,
          stok: validatedData.stok,
          stokMinimum: validatedData.stokMinimum,
          hargaBeli: validatedData.hargaBeli,
          hargaJual: validatedData.hargaJual,
          satuan: validatedData.satuan,
          deskripsi: validatedData.deskripsi,
          lokasiId: validatedData.lokasiId,
        },
        include: {
          lokasi: true,
        },
      });

      // 2. Log activity
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name || "",
          action: "CREATE",
          entity: "Barang",
          entityId: barang.id,
          description: `Menambah barang baru: ${barang.nama}`,
        },
      });

      // 3. Handle Initial Stock (Create TransaksiMasuk & Journal)
      if (validatedData.stok > 0) {
        const totalNilai = validatedData.stok * validatedData.hargaBeli;
        const reason = validatedData.supplier
          ? "PURCHASE"
          : "INTERNAL_ADJUSTMENT";

        // Create TransaksiMasuk record for traceability
        const transaksiMasuk = await tx.transaksiMasuk.create({
          data: {
            nomorTransaksi: generateMasukNumber(),
            barangId: barang.id,
            qty: validatedData.stok,
            hargaBeli: validatedData.hargaBeli,
            totalNilai: totalNilai,
            sumber: validatedData.supplier || "Initial Inventory",
            lokasiId: validatedData.lokasiId,
            keterangan: "Stok awal barang baru",
            tanggal: new Date(),
          },
        });

        // If Credit Purchase, create Hutang
        if (reason === "PURCHASE" && validatedData.paymentMethod === "CREDIT") {
          const nomorHutang = `HTG-${Date.now()}`;
          const deskripsi = `Pembelian Awal ${barang.nama} - ${validatedData.stok} ${barang.satuan}`;

          await tx.hutang.create({
            data: {
              nomorHutang,
              transaksiMasukId: transaksiMasuk.id,
              sumberHutang: validatedData.supplier!,
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

        // Create Journal Entry
        await createJournalEntryForStockAddition(
          transaksiMasuk.id,
          totalNilai,
          reason,
          session.user.id,
          validatedData.paymentMethod,
          tx,
        );
      }

      return barang;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    logger.error("Error creating barang:", error);
    return NextResponse.json(
      { error: "Failed to create item" },
      { status: 500 },
    );
  }
}
