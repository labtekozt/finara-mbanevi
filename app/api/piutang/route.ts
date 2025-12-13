import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET - List all piutang
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const piutang = await prisma.piutang.findMany({
      orderBy: {
        tanggalPiutang: "desc",
      },
      include: {
        pembayaranPiutang: {
          orderBy: {
            tanggalBayar: "desc",
          },
        },
      },
    });

    return NextResponse.json(piutang);
  } catch (error) {
    console.error("Error fetching piutang:", error);
    return NextResponse.json(
      { error: "Failed to fetch piutang" },
      { status: 500 }
    );
  }
}
