import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { generateTransactionNumber } from "@/lib/transaction-number";
import { createJournalEntryForSalesReturn } from "@/lib/accounting-utils";
import { z } from "zod";

const returPenjualanSchema = z.object({
  transaksiKasirId: z.string().min(1, "Transaksi penjualan harus dipilih"),
  items: z
    .array(
      z.object({
        barangId: z.string(),
        qty: z.number().int().positive(),
      }),
    )
    .min(1, "Minimal 1 item harus diretur"),
  alasan: z.string().min(1, "Alasan retur harus diisi"),
  catatan: z.string().optional(),
});

// GET - List sales returns
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

    // For now, we'll use TransaksiKasir with negative values as return records
    // In a real implementation, you'd have a separate ReturPenjualan model
    const retur = await prisma.transaksiKasir.findMany({
      where: {
        ...where,
        catatan: {
          contains: "RETUR",
        },
      },
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
              include: {
                lokasi: true,
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

    // Transform the data to match frontend expectations
    const transformedRetur = retur.map((transaksi) => ({
      id: transaksi.id,
      nomorTransaksi: transaksi.nomorTransaksi,
      tanggal: transaksi.tanggal,
      barang:
        transaksi.itemTransaksi.length > 0
          ? {
              id: transaksi.itemTransaksi[0].barang.id,
              nama: transaksi.itemTransaksi[0].barang.nama,
              sku: transaksi.itemTransaksi[0].barang.sku,
              satuan: transaksi.itemTransaksi[0].barang.satuan,
            }
          : null,
      lokasi:
        transaksi.itemTransaksi.length > 0 &&
        transaksi.itemTransaksi[0].barang.lokasi
          ? {
              id: transaksi.itemTransaksi[0].barang.lokasi.id,
              namaLokasi: transaksi.itemTransaksi[0].barang.lokasi.namaLokasi,
            }
          : null,
      qty:
        transaksi.itemTransaksi.length > 0
          ? Math.abs(transaksi.itemTransaksi[0].qty)
          : 0,
      hargaJual:
        transaksi.itemTransaksi.length > 0
          ? transaksi.itemTransaksi[0].hargaSatuan
          : 0,
      totalNilai: Math.abs(transaksi.total),
      pelanggan: transaksi.catatan?.replace("RETUR: ", "") || "Umum",
      keterangan: transaksi.catatan || "",
    }));

    return NextResponse.json(transformedRetur);
  } catch (error) {
    console.error("Error fetching retur penjualan:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales returns" },
      { status: 500 },
    );
  }
}

// POST - Create sales return
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = returPenjualanSchema.parse(body);

    // Get original sales transaction
    const originalTransaksi = await prisma.transaksiKasir.findUnique({
      where: { id: validatedData.transaksiKasirId },
      include: {
        itemTransaksi: {
          include: {
            barang: true,
          },
        },
      },
    });

    if (!originalTransaksi) {
      return NextResponse.json(
        { error: "Transaksi penjualan tidak ditemukan" },
        { status: 404 },
      );
    }

    // Calculate return amounts and validate
    let totalRevenue = 0;
    let totalCOGS = 0;

    // Find previous returns for this transaction to prevent over-returning
    // We look for transactions with "RETUR [NomorTransaksi]" in the notes
    const previousReturns = await prisma.transaksiKasir.findMany({
      where: {
        catatan: {
          contains: `RETUR ${originalTransaksi.nomorTransaksi}`,
        },
      },
      include: {
        itemTransaksi: true,
      },
    });

    for (const returnItem of validatedData.items) {
      const originalItem = originalTransaksi.itemTransaksi.find(
        (item) => item.barangId === returnItem.barangId,
      );

      if (!originalItem) {
        return NextResponse.json(
          {
            error: `Barang ${returnItem.barangId} tidak ditemukan dalam transaksi asli`,
          },
          { status: 400 },
        );
      }

      // Calculate already returned quantity
      let alreadyReturnedQty = 0;
      for (const prevRetur of previousReturns) {
        const prevItem = prevRetur.itemTransaksi.find(
          (item) => item.barangId === returnItem.barangId,
        );
        if (prevItem) {
          alreadyReturnedQty += Math.abs(prevItem.qty);
        }
      }

      if (alreadyReturnedQty + returnItem.qty > originalItem.qty) {
        return NextResponse.json(
          {
            error: `Jumlah retur barang ${originalItem.namaBarang} (${returnItem.qty}) melebihi sisa yang bisa diretur (Sisa: ${originalItem.qty - alreadyReturnedQty})`,
          },
          { status: 400 },
        );
      }

      totalRevenue += returnItem.qty * originalItem.hargaSatuan;
      totalCOGS += returnItem.qty * originalItem.barang.hargaBeli;
    }

    // Create return transaction and update stock
    const retur = await prisma.$transaction(async (tx) => {
      // Create a new "return" transaction record (using TransaksiKasir with negative values)
      const returnTransaksi = await tx.transaksiKasir.create({
        data: {
          nomorTransaksi: generateTransactionNumber("RTPJ"),
          subtotal: -totalRevenue,
          pajak: 0,
          diskon: 0,
          total: -totalRevenue,
          metodePembayaran: "tunai",
          jumlahBayar: 0,
          kembalian: 0,
          kasirId: session.user.id,
          // Include original transaction number for tracking
          catatan: `RETUR ${originalTransaksi.nomorTransaksi} - ${validatedData.alasan}${validatedData.catatan ? ` - ${validatedData.catatan}` : ""}`,
        },
      });

      // Create return items and update stock
      for (const returnItem of validatedData.items) {
        const originalItem = originalTransaksi.itemTransaksi.find(
          (item) => item.barangId === returnItem.barangId,
        );

        await tx.itemTransaksi.create({
          data: {
            transaksiKasirId: returnTransaksi.id,
            barangId: returnItem.barangId,
            namaBarang: originalItem!.namaBarang,
            hargaSatuan: -originalItem!.hargaSatuan, // Negative for return
            qty: -returnItem.qty, // Negative for return
            subtotal: -(returnItem.qty * originalItem!.hargaSatuan),
          },
        });

        // Update stock (increase due to return)
        await tx.barang.update({
          where: { id: returnItem.barangId },
          data: {
            stok: {
              increment: returnItem.qty,
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
          entity: "ReturPenjualan",
          entityId: returnTransaksi.id,
          description: `Retur penjualan ${returnTransaksi.nomorTransaksi} - Total: Rp ${totalRevenue.toLocaleString("id-ID")}`,
        },
      });

      // Create accounting journal entry (critical for balance)
      // Now inside the transaction!
      await createJournalEntryForSalesReturn(
        returnTransaksi.nomorTransaksi,
        totalRevenue,
        totalCOGS,
        originalTransaksi.metodePembayaran,
        session.user.id,
        tx, // Pass transaction client
      );

      return returnTransaksi;
    });

    // Fetch complete return transaction data
    const completeRetur = await prisma.transaksiKasir.findUnique({
      where: { id: retur.id },
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
    });

    return NextResponse.json(completeRetur, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    console.error("Error creating retur penjualan:", error);
    return NextResponse.json(
      { error: "Failed to create sales return" },
      { status: 500 },
    );
  }
}
