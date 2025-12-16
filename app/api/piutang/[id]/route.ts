import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { serializeDecimal } from "@/lib/utils";
import logger from "@/lib/logger";

// GET - Get piutang by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const piutang = await prisma.piutang.findUnique({
      where: {
        id,
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
        { status: 404 },
      );
    }

    return NextResponse.json(serializeDecimal(piutang));
  } catch (error) {
    logger.error("Error fetching piutang detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch piutang detail" },
      { status: 500 },
    );
  }
}
