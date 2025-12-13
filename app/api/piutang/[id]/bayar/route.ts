import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createJournalEntryForReceivablePayment } from "@/lib/accounting-utils";
import logger from "@/lib/logger";

// POST - Terima bayar piutang
export async function POST(
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
    const { jumlahBayar, metodePembayaran, catatan } = body;

    if (!jumlahBayar || jumlahBayar <= 0) {
      return NextResponse.json(
        { error: "Jumlah bayar harus lebih dari 0" },
        { status: 400 },
      );
    }

    // Create payment and update piutang
    const result = await prisma.$transaction(async (tx: any) => {
      // Get piutang data inside transaction to prevent race conditions
      const piutang = await tx.piutang.findUnique({
        where: { id },
      });

      if (!piutang) {
        throw new Error("Piutang tidak ditemukan");
      }

      if (jumlahBayar > piutang.sisaPiutang) {
        throw new Error("Jumlah bayar melebihi sisa piutang");
      }

      // Record payment
      const pembayaran = await tx.pembayaranPiutang.create({
        data: {
          piutangId: id,
          jumlahBayar,
          metodePembayaran: metodePembayaran || "tunai",
          catatan,
        },
      });

      // Update piutang
      const newTotalBayar = piutang.totalBayar + jumlahBayar;
      const newSisaPiutang = piutang.totalPiutang - newTotalBayar;
      const newStatus = newSisaPiutang <= 0 ? "LUNAS" : "BELUM_LUNAS";

      const updatedPiutang = await tx.piutang.update({
        where: { id },
        data: {
          totalBayar: newTotalBayar,
          sisaPiutang: newSisaPiutang,
          status: newStatus,
        },
      });

      // Create accounting journal entry (INSIDE TRANSACTION)
      await createJournalEntryForReceivablePayment(
        id,
        jumlahBayar,
        session.user.id,
        metodePembayaran || "tunai",
        tx, // Pass transaction client
      );

      return { pembayaran, piutang: updatedPiutang };
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error processing piutang payment:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process payment";
    const status =
      errorMessage === "Piutang tidak ditemukan"
        ? 404
        : errorMessage === "Jumlah bayar melebihi sisa piutang"
          ? 400
          : 500;

    return NextResponse.json({ error: errorMessage }, { status });
  }
}
