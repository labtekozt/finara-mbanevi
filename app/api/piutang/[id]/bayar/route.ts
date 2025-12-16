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

    // Verify user exists in database (in case of DB reset with active session)
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!userExists) {
      return NextResponse.json(
        { error: "User session invalid. Please login again." },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    let { jumlahBayar, metodePembayaran, catatan } = body;

    // Ensure jumlahBayar is a number
    jumlahBayar = Number(jumlahBayar);

    if (!jumlahBayar || jumlahBayar <= 0) {
      return NextResponse.json(
        { error: "Jumlah bayar harus lebih dari 0" },
        { status: 400 },
      );
    }

    const MAX_DECIMAL = 9999999999999.99;
    if (jumlahBayar > MAX_DECIMAL) {
      return NextResponse.json(
        { error: "Jumlah bayar terlalu besar" },
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

      // Convert Decimal to number for comparison and calculation
      const sisaPiutangNum = Number(piutang.sisaPiutang);
      const totalBayarNum = Number(piutang.totalBayar);
      const totalPiutangNum = Number(piutang.totalPiutang);

      if (jumlahBayar > sisaPiutangNum) {
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
      // Use toFixed(2) to avoid floating point precision issues
      const newTotalBayar = Number(totalBayarNum + jumlahBayar);
      const newSisaPiutang = Number(totalPiutangNum - newTotalBayar);
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
