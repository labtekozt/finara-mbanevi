import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateKasirNumber } from "@/lib/transaction-number";
import {
  createJournalEntryForSale,
  createJournalEntryForCOGS,
  createJournalEntryForCompleteSale,
} from "@/lib/accounting-utils";
import { z } from "zod";

const itemSchema = z.object({
  barangId: z.string(),
  namaBarang: z.string(),
  hargaSatuan: z.number(),
  qty: z.number().int().positive(),
  subtotal: z.number(),
});

const transaksiSchema = z.object({
  items: z.array(itemSchema).min(1, "Minimal 1 item harus dipilih"),
  subtotal: z.number(),
  pajak: z.number().default(0),
  diskon: z.number().default(0),
  total: z.number(),
  metodePembayaran: z.string(),
  jumlahBayar: z.number(),
  kembalian: z.number(),
  catatan: z.string().optional(),
  // Data pelanggan untuk kredit
  namaPelanggan: z.string().optional(),
  nomorHpPelanggan: z.string().optional(),
  alamatPelanggan: z.string().optional(),
});

// GET - List transactions with filters
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

    const transaksi = await prisma.transaksiKasir.findMany({
      where,
      include: {
        kasir: {
          select: {
            id: true,
            nama: true,
            username: true,
          },
        },
        itemTransaksi: {
          include: {
            barang: true,
          },
        },
      },
      orderBy: {
        tanggal: "desc",
      },
      take: 100,
    });

    return NextResponse.json(transaksi);
  } catch (error) {
    console.error("Error fetching transaksi:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 },
    );
  }
}

// POST - Create new transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = transaksiSchema.parse(body);

    // Check stock availability for all items
    for (const item of validatedData.items) {
      const barang = await prisma.barang.findUnique({
        where: { id: item.barangId },
      });

      if (!barang) {
        return NextResponse.json(
          { error: `Barang ${item.namaBarang} tidak ditemukan` },
          { status: 400 },
        );
      }

      if (barang.stok < item.qty) {
        return NextResponse.json(
          {
            error: `Stok ${item.namaBarang} tidak cukup. Tersedia: ${barang.stok} ${barang.satuan}`,
          },
          { status: 400 },
        );
      }
    }

    // Create transaction with items and update stock
    const transaksi = await prisma.$transaction(async (tx) => {
      // Create transaction
      const newTransaksi = await tx.transaksiKasir.create({
        data: {
          nomorTransaksi: generateKasirNumber(),
          subtotal: validatedData.subtotal,
          pajak: validatedData.pajak,
          diskon: validatedData.diskon,
          total: validatedData.total,
          metodePembayaran: validatedData.metodePembayaran,
          jumlahBayar: validatedData.jumlahBayar,
          kembalian: validatedData.kembalian,
          kasirId: session.user.id,
          catatan: validatedData.catatan,
          namaPelanggan: validatedData.namaPelanggan,
          nomorHpPelanggan: validatedData.nomorHpPelanggan,
          alamatPelanggan: validatedData.alamatPelanggan,
        },
      });

      // Create transaction items and update stock
      for (const item of validatedData.items) {
        await tx.itemTransaksi.create({
          data: {
            transaksiKasirId: newTransaksi.id,
            barangId: item.barangId,
            namaBarang: item.namaBarang,
            hargaSatuan: item.hargaSatuan,
            qty: item.qty,
            subtotal: item.subtotal,
          },
        });

        // Update stock
        await tx.barang.update({
          where: { id: item.barangId },
          data: {
            stok: {
              decrement: item.qty,
            },
          },
        });
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name || "",
          action: "CREATE",
          entity: "TransaksiKasir",
          entityId: newTransaksi.id,
          description: `Transaksi kasir ${newTransaksi.nomorTransaksi} - Total: Rp ${validatedData.total.toLocaleString("id-ID")}`,
        },
      });

      // Create Piutang if payment method is kredit
      if (validatedData.metodePembayaran === "kredit") {
        const deskripsi = validatedData.items
          .map((item) => `${item.namaBarang} x${item.qty}`)
          .join(", ");

        await tx.piutang.create({
          data: {
            nomorPiutang: `PTG-${Date.now()}`,
            transaksiKasirId: newTransaksi.id,
            namaPelanggan: validatedData.namaPelanggan || "Pelanggan",
            nomorHp: validatedData.nomorHpPelanggan,
            alamat: validatedData.alamatPelanggan,
            deskripsi: `Penjualan: ${deskripsi}`,
            totalPiutang: validatedData.total,
            totalBayar: 0,
            sisaPiutang: validatedData.total,
            status: "BELUM_LUNAS",
          },
        });
      }

      return newTransaksi;
    });

    // Fetch complete transaction data for accounting
    const completeTransaksi = await prisma.transaksiKasir.findUnique({
      where: { id: transaksi.id },
      include: {
        kasir: true,
        itemTransaksi: {
          include: {
            barang: true,
          },
        },
      },
    });

    if (!completeTransaksi) {
      throw new Error("Failed to fetch complete transaction");
    }

    // Prepare data for accounting journal entry
    const totalRevenue = completeTransaksi.total;
    const items = completeTransaksi.itemTransaksi.map((item) => ({
      barangId: item.barangId,
      qty: item.qty,
      costPrice: item.hargaSatuan, // Assuming this is the cost price
    }));

    // Create accounting journal entry (critical for balance)
    await createJournalEntryForCompleteSale(
      transaksi.id,
      totalRevenue,
      items,
      session.user.id,
    );

    return NextResponse.json(completeTransaksi, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Error creating transaksi:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 },
    );
  }
}
