import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET - Get piutang by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const piutang = await prisma.piutang.findUnique({
      where: {
        id: params.id,
      },
      include: {
        pembayaranPiutang: {
          orderBy: {
            tanggalBayar: "asc",
          },
        },
        transaksiKasir: {
          include: {
            itemTransaksi: true,
          },
        },
      },
    });

    if (!piutang) {
      return NextResponse.json(
        { error: "Piutang tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(piutang);
  } catch (error) {
    console.error("Error fetching piutang detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch piutang detail" },
      { status: 500 }
    );
  }
}
