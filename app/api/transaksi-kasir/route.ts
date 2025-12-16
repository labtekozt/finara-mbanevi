import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateKasirNumber } from "@/lib/transaction-number";
import {
  createJournalEntryForCompleteSale,
  getActiveAccountingPeriod,
} from "@/lib/accounting-utils";
import { ensureActivePeriod } from "@/lib/period-management";
import { z } from "zod";
import { serializeDecimal } from "@/lib/utils";
import logger from "@/lib/logger";

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
  tanggal: z.string().optional(), // Transaction date, defaults to now if not provided
  catatan: z.string().optional().nullable(),
  // Data pelanggan untuk kredit atau pending pickup
  namaPelanggan: z.string().optional().nullable(),
  nomorHpPelanggan: z.string().optional().nullable(),
  alamatPelanggan: z.string().optional().nullable(),
  // Pending pickup flag
  belumDiambil: z.boolean().default(false),
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
            barang: {
              select: {
                satuan: true,
              },
            },
          },
        },
      },
      orderBy: {
        tanggal: "desc",
      },
      take: 100,
    });

    return NextResponse.json(serializeDecimal(transaksi));
  } catch (error) {
    logger.error("Error fetching transaksi:", error);
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
    const validatedData = transaksiSchema.parse(body);

    // Ensure active accounting period (auto-close if needed)
    const transactionDate = validatedData.tanggal
      ? new Date(validatedData.tanggal)
      : new Date();
    await ensureActivePeriod(transactionDate, session.user.id);

    // Helper function to execute transaction logic
    const executeTransaction = async () => {
      return await prisma.$transaction(async (tx) => {
        // 1. Atomic Stock Check & Update
        // We do this first to ensure we have the stock locked/updated before proceeding
        for (const item of validatedData.items) {
          const updateResult = await tx.barang.updateMany({
            where: {
              id: item.barangId,
              stok: { gte: item.qty }, // Atomic check: only update if stock >= qty
            },
            data: {
              stok: { decrement: item.qty },
            },
          });

          if (updateResult.count === 0) {
            // If count is 0, it means either item doesn't exist or stock is insufficient
            const barang = await tx.barang.findUnique({
              where: { id: item.barangId },
            });
            if (!barang) {
              throw new Error(`Barang ${item.namaBarang} tidak ditemukan`);
            } else {
              throw new Error(
                `Stok ${item.namaBarang} tidak cukup. Tersedia: ${barang.stok} ${barang.satuan}`,
              );
            }
          }
        }

        // 2. Create transaction header
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
            belumDiambil: validatedData.belumDiambil,
          },
        });

        // 3. Create transaction items
        const itemsForAccounting = [];
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

          // Fetch cost price for accounting (COGS)
          const barang = await tx.barang.findUnique({
            where: { id: item.barangId },
          });
          if (barang) {
            itemsForAccounting.push({
              barangId: item.barangId,
              qty: item.qty,
              costPrice: barang.hargaBeli.toNumber(), // Use purchase price for COGS
            });
          }
        }

        // 4. Log activity
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

        // 5. Create Piutang if payment method is kredit
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

        // 6. Create accounting journal entry (critical for balance)
        // Now inside the transaction!
        await createJournalEntryForCompleteSale(
          newTransaksi.id,
          validatedData.total,
          itemsForAccounting,
          session.user.id,
          validatedData.metodePembayaran,
          tx, // Pass transaction client
        );

        return newTransaksi;
      });
    };

    // Execute transaction with retry logic for accounting period
    let result;
    try {
      result = await executeTransaction();
    } catch (error: any) {
      // If error is due to missing accounting period, try to generate it and retry
      if (
        error.message &&
        (error.message.includes("Tidak ada periode akuntansi aktif") ||
          error.message.includes("periode akuntansi"))
      ) {
        logger.warn(
          "Transaction failed due to missing accounting period. Attempting to auto-generate and retry...",
        );
        try {
          // Force check/create active period outside of transaction
          await getActiveAccountingPeriod();
          // Retry transaction
          result = await executeTransaction();
        } catch (retryError) {
          // If retry fails, throw original error or retry error
          logger.error("Retry transaction failed:", retryError);
          throw error; // Throw original error to be handled by outer catch
        }
      } else {
        throw error;
      }
    }

    // Fetch complete transaction data for response
    const completeTransaksi = await prisma.transaksiKasir.findUnique({
      where: { id: result.id },
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
            barang: {
              select: {
                satuan: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(serializeDecimal(completeTransaksi), {
      status: 201,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    // Handle custom errors from transaction
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create transaction";

    // Check for specific stock error messages
    if (errorMessage.includes("Stok") || errorMessage.includes("tidak cukup")) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    logger.error("Error creating transaksi:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 },
    );
  }
}
