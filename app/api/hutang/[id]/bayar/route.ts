import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createJournalEntryForDebtPayment } from "@/lib/accounting-utils";

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

    const { id } = await params;
    const body = await request.json();
    const { jumlahBayar, metodePembayaran, catatan } = body;

    if (!jumlahBayar || jumlahBayar <= 0) {
      return NextResponse.json(
        { error: "Jumlah bayar harus lebih dari 0" },
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

      if (jumlahBayar > hutang.sisaHutang) {
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
      const newTotalBayar = hutang.totalBayar + jumlahBayar;
      const newSisaHutang = hutang.totalHutang - newTotalBayar;
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
    console.error("Error processing hutang payment:", error);
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
