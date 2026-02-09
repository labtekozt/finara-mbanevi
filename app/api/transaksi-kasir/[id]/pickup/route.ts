import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import logger from "@/lib/logger";

interface PickupItem {
  id: string;
  qtyDiambil: number;
  qtyAsli: number;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user exists (zombie session check)
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!userExists) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const { items, allPickedUp, pickupNote } = body as {
      items: PickupItem[];
      allPickedUp: boolean;
      pickupNote: string;
    };

    // Validate input
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items tidak boleh kosong" },
        { status: 400 }
      );
    }

    const transaksiId = params.id;

    // Validate transaksi exists and is pending pickup
    const transaksi = await prisma.transaksiKasir.findUnique({
      where: { id: transaksiId },
      include: {
        itemTransaksi: {
          include: {
            barang: true,
          },
        },
      },
    });

    if (!transaksi) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    if (!transaksi.belumDiambil) {
      return NextResponse.json(
        { error: "Transaksi ini sudah selesai diambil" },
        { status: 400 }
      );
    }

    // Process pickup - update qty tapi JANGAN ubah total transaksi
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const qtyDiambil = item.qtyDiambil;

        // Find item transaksi - GUNAKAN DATA DARI DATABASE, BUKAN DARI REQUEST
        const itemTransaksi = await tx.itemTransaksi.findUnique({
          where: { id: item.id },
        });

        if (!itemTransaksi) {
          // Item sudah tidak ada (mungkin sudah dihapus di pengambilan sebelumnya)
          continue;
        }

        // CRITICAL: Validasi qty berdasarkan data database terbaru
        if (qtyDiambil < 0) {
          throw new Error(
            `Qty tidak valid untuk ${itemTransaksi.namaBarang}: ${qtyDiambil}`
          );
        }

        if (qtyDiambil > itemTransaksi.qty) {
          throw new Error(
            `Qty diambil (${qtyDiambil}) melebihi qty tersedia (${itemTransaksi.qty}) untuk ${itemTransaksi.namaBarang}`
          );
        }

        const sisaQty = itemTransaksi.qty - qtyDiambil;

        if (sisaQty === 0) {
          // Item fully picked up - delete from itemTransaksi
          await tx.itemTransaksi.delete({
            where: { id: item.id },
          });
        } else if (sisaQty > 0) {
          // Partial pickup - update qty to remaining
          // Update subtotal juga, tapi total transaksi tetap
          await tx.itemTransaksi.update({
            where: { id: item.id },
            data: {
              qty: sisaQty,
              subtotal: new Prisma.Decimal(sisaQty).times(
                itemTransaksi.hargaSatuan
              ),
            },
          });
        }
      }

      // Check remaining items
      const remainingItems = await tx.itemTransaksi.findMany({
        where: { transaksiKasirId: transaksiId },
      });

      // Update status dan catatan
      // CRITICAL: Total transaksi TIDAK berubah - tetap sesuai pembayaran awal
      // FIX: Gunakan remainingItems.length saja, bukan && !allPickedUp
      await tx.transaksiKasir.update({
        where: { id: transaksiId },
        data: {
          belumDiambil: remainingItems.length > 0,
          catatan: transaksi.catatan
            ? `${transaksi.catatan}\n\n${pickupNote}`
            : pickupNote,
          // Total, subtotal, pajak, diskon TIDAK diubah
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name || "",
          action: "UPDATE",
          entity: "TransaksiKasir",
          entityId: transaksiId,
          description: `${allPickedUp || remainingItems.length === 0 ? "Menyelesaikan pengambilan" : "Mencatat pengambilan sebagian"} transaksi ${transaksi.nomorTransaksi}`,
        },
      });
    });

    logger.info(
      `Pickup processed for transaction ${transaksi.nomorTransaksi} by ${session.user.username}`,
      {
        transaksiId,
        allPickedUp,
        items: items.map((i) => ({ id: i.id, qtyDiambil: i.qtyDiambil })),
      }
    );

    return NextResponse.json({
      success: true,
      message: allPickedUp
        ? "Semua barang berhasil diambil"
        : "Pengambilan sebagian berhasil diproses",
    });
  } catch (error) {
    logger.error("Error in pickup API:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}
