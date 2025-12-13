import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET - Get hutang by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hutang = await prisma.hutang.findUnique({
      where: {
        id: params.id,
      },
      include: {
        pembayaranHutang: {
          orderBy: {
            tanggalBayar: "asc",
          },
        },
      },
    });

    if (!hutang) {
      return NextResponse.json(
        { error: "Hutang tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(hutang);
  } catch (error) {
    console.error("Error fetching hutang detail:", error);
    return NextResponse.json(
      { error: "Failed to fetch hutang detail" },
      { status: 500 }
    );
  }
}
