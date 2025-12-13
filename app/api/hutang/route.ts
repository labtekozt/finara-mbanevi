import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET - List all hutang
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hutang = await prisma.hutang.findMany({
      orderBy: {
        tanggalHutang: "desc",
      },
      include: {
        pembayaranHutang: {
          orderBy: {
            tanggalBayar: "desc",
          },
        },
      },
    });

    return NextResponse.json(hutang);
  } catch (error) {
    console.error("Error fetching hutang:", error);
    return NextResponse.json(
      { error: "Failed to fetch hutang" },
      { status: 500 }
    );
  }
}
