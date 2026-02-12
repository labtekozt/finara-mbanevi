import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateKeluarNumber } from "@/lib/transaction-number";
import { createJournalEntryForOutgoingTransaction } from "@/lib/accounting-utils";
import { z } from "zod";
import logger from "@/lib/logger";

const transaksiKeluarSchema = z.object({
  barangId: z.string().min(1, "Barang harus dipilih"),
  qty: z.number().positive("Jumlah harus lebih dari 0"),
  tujuan: z.string().min(1, "Tujuan barang harus diisi"),
  lokasiId: z.string().min(1, "Lokasi harus dipilih"),
  keterangan: z.string().optional(),
});

// GET - List outgoing transactions
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

    const transaksi = await prisma.transaksiKeluar.findMany({
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
    logger.error("Error fetching transaksi keluar:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 },
    );
  }
}

// POST - Create outgoing transaction
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
    const validatedData = transaksiKeluarSchema.parse(body);

    // Check stock
    const barang = await prisma.barang.findUnique({
      where: { id: validatedData.barangId },
    });

    if (!barang) {
      return NextResponse.json(
        { error: "Barang tidak ditemukan" },
        { status: 404 },
      );
    }

    if (barang.stok.toNumber() < validatedData.qty) {
      return NextResponse.json(
        {
          error: `Stok ${barang.nama} tidak cukup. Tersedia: ${barang.stok.toNumber()} ${barang.satuan}`,
        },
        { status: 400 },
      );
    }

    const totalNilai = validatedData.qty * barang.hargaBeli.toNumber();

    // Create transaction and update stock (increase timeout for accounting operations)
    const transaksi = await prisma.$transaction(
      async (tx: any) => {
        // 1. Atomic Stock Check & Update
        const updateResult = await tx.barang.updateMany({
          where: {
            id: validatedData.barangId,
            stok: { gte: validatedData.qty }, // Atomic check
          },
          data: {
            stok: { decrement: validatedData.qty },
          },
        });

        if (updateResult.count === 0) {
          // Re-fetch to give accurate error message
          const currentBarang = await tx.barang.findUnique({
            where: { id: validatedData.barangId },
          });
          if (!currentBarang) {
            throw new Error("Barang tidak ditemukan");
          } else {
            throw new Error(
              `Stok ${currentBarang.nama} tidak cukup. Tersedia: ${currentBarang.stok} ${currentBarang.satuan}`,
            );
          }
        }

        const newTransaksi = await tx.transaksiKeluar.create({
          data: {
            nomorTransaksi: generateKeluarNumber(),
            barangId: validatedData.barangId,
            qty: validatedData.qty,
            hargaBarang: barang.hargaBeli,
            totalNilai,
            tujuan: validatedData.tujuan,
            lokasiId: validatedData.lokasiId,
            keterangan: validatedData.keterangan,
          },
          include: {
            barang: true,
            lokasi: true,
          },
        });

        // Create journal entry for outgoing transaction based on purpose
        // Removed try-catch to ensure atomicity
        const journalEntry = await createJournalEntryForOutgoingTransaction(
          newTransaksi.id,
          totalNilai,
          validatedData.tujuan,
          session.user.id,
          tx, // Pass transaction client
        );

        if (journalEntry) {
          logger.info(
            `Journal entry created for outgoing transaction: ${journalEntry.nomorJurnal}`,
          );
        } else {
          logger.info(
            `No journal entry needed for warehouse transfer: ${newTransaksi.nomorTransaksi}`,
          );
        }

        // Log activity
        await tx.activityLog.create({
          data: {
            userId: session.user.id,
            userName: session.user.name || "",
            action: "CREATE",
            entity: "TransaksiKeluar",
            entityId: newTransaksi.id,
            description: `Barang keluar ${newTransaksi.nomorTransaksi} - ${newTransaksi.barang.nama} (${validatedData.qty} ${newTransaksi.barang.satuan})`,
          },
        });

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

    const errorMessage =
      error instanceof Error ? error.message : "Failed to create transaction";
    if (errorMessage.includes("Stok") || errorMessage.includes("tidak cukup")) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    logger.error("Error creating transaksi keluar:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 },
    );
  }
}
