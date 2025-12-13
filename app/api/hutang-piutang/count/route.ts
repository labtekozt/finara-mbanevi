import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";

// GET - Get counts of unpaid hutang and piutang
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [hutangCount, piutangCount] = await Promise.all([
      prisma.hutang.count({
        where: {
          status: "BELUM_LUNAS",
        },
      }),
      prisma.piutang.count({
        where: {
          status: "BELUM_LUNAS",
        },
      }),
    ]);

    return NextResponse.json({
      hutangCount,
      piutangCount,
      total: hutangCount + piutangCount,
    });
  } catch (error) {
    logger.error("Error fetching hutang-piutang counts:", error);
    return NextResponse.json(
      { error: "Failed to fetch counts" },
      { status: 500 },
    );
  }
}
