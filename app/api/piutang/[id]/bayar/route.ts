import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// POST - Terima bayar piutang
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jumlahBayar, metodePembayaran, catatan } = body;

    if (!jumlahBayar || jumlahBayar <= 0) {
      return NextResponse.json(
        { error: "Jumlah bayar harus lebih dari 0" },
        { status: 400 }
      );
    }

    // Get piutang data
    const piutang = await prisma.piutang.findUnique({
      where: { id: params.id },
    });

    if (!piutang) {
      return NextResponse.json(
        { error: "Piutang tidak ditemukan" },
        { status: 404 }
      );
    }

    if (jumlahBayar > piutang.sisaPiutang) {
      return NextResponse.json(
        { error: "Jumlah bayar melebihi sisa piutang" },
        { status: 400 }
      );
    }

    // Create payment and update piutang
    const result = await prisma.$transaction(async (tx: any) => {
      // Record payment
      const pembayaran = await tx.pembayaranPiutang.create({
        data: {
          piutangId: params.id,
          jumlahBayar,
          metodePembayaran: metodePembayaran || "tunai",
          catatan,
        },
      });

      // Update piutang
      const newTotalBayar = piutang.totalBayar + jumlahBayar;
      const newSisaPiutang = piutang.totalPiutang - newTotalBayar;
      const newStatus =
        newSisaPiutang <= 0 ? "LUNAS" : "BELUM_LUNAS";

      const updatedPiutang = await tx.piutang.update({
        where: { id: params.id },
        data: {
          totalBayar: newTotalBayar,
          sisaPiutang: newSisaPiutang,
          status: newStatus,
        },
      });

      return { pembayaran, piutang: updatedPiutang };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing piutang payment:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
