import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// POST - Bayar hutang
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

    // Get hutang data
    const hutang = await prisma.hutang.findUnique({
      where: { id: params.id },
    });

    if (!hutang) {
      return NextResponse.json(
        { error: "Hutang tidak ditemukan" },
        { status: 404 }
      );
    }

    if (jumlahBayar > hutang.sisaHutang) {
      return NextResponse.json(
        { error: "Jumlah bayar melebihi sisa hutang" },
        { status: 400 }
      );
    }

    // Create payment and update hutang
    const result = await prisma.$transaction(async (tx: any) => {
      // Record payment
      const pembayaran = await tx.pembayaranHutang.create({
        data: {
          hutangId: params.id,
          jumlahBayar,
          metodePembayaran: metodePembayaran || "tunai",
          catatan,
        },
      });

      // Update hutang
      const newTotalBayar = hutang.totalBayar + jumlahBayar;
      const newSisaHutang = hutang.totalHutang - newTotalBayar;
      const newStatus =
        newSisaHutang <= 0 ? "LUNAS" : "BELUM_LUNAS";

      const updatedHutang = await tx.hutang.update({
        where: { id: params.id },
        data: {
          totalBayar: newTotalBayar,
          sisaHutang: newSisaHutang,
          status: newStatus,
        },
      });

      return { pembayaran, hutang: updatedHutang };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error processing hutang payment:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
