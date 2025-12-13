import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createJournalEntryForDebtPayment } from "@/lib/accounting-utils";
import logger from "@/lib/logger";

// POST - Bayar hutang
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    // Create payment and update hutang
    const result = await prisma.$transaction(async (tx: any) => {
      // Get hutang data inside transaction to prevent race conditions
      const hutang = await tx.hutang.findUnique({
        where: { id },
      });

      if (!hutang) {
        throw new Error("Hutang tidak ditemukan");
      }

      // Convert Decimal to number for comparison and calculation
      const sisaHutangNum = Number(hutang.sisaHutang);
      const totalBayarNum = Number(hutang.totalBayar);
      const totalHutangNum = Number(hutang.totalHutang);

      if (jumlahBayar > sisaHutangNum) {
        throw new Error("Jumlah bayar melebihi sisa hutang");
      }

      // Record payment
      const pembayaran = await tx.pembayaranHutang.create({
        data: {
          hutangId: id,
          jumlahBayar,
          metodePembayaran: metodePembayaran || "tunai",
          catatan,
        },
      });

      // Update hutang
      // Use toFixed(2) to avoid floating point precision issues that cause numeric overflow
      const newTotalBayar = Number((totalBayarNum + jumlahBayar).toFixed(2));
      const newSisaHutang = Number((totalHutangNum - newTotalBayar).toFixed(2));
      const newStatus = newSisaHutang <= 0 ? "LUNAS" : "BELUM_LUNAS";

      const updatedHutang = await tx.hutang.update({
        where: { id },
        data: {
          totalBayar: newTotalBayar,
          sisaHutang: newSisaHutang,
          status: newStatus,
        },
      });

      // Create accounting journal entry (INSIDE TRANSACTION)
      await createJournalEntryForDebtPayment(
        id,
        jumlahBayar,
        session.user.id,
        metodePembayaran || "tunai",
        tx, // Pass transaction client
      );

      return { pembayaran, hutang: updatedHutang };
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error processing hutang payment:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process payment";
    const status =
      errorMessage === "Hutang tidak ditemukan"
        ? 404
        : errorMessage === "Jumlah bayar melebihi sisa hutang"
          ? 400
          : 500;

    return NextResponse.json({ error: errorMessage }, { status });
  }
}
