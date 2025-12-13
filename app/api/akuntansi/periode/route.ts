import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import logger from "@/lib/logger";

// GET /api/akuntansi/periode - Get accounting periods
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canAccessTransaksi")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");
    const isClosed = searchParams.get("isClosed");

    const where: any = {};

    if (isActive !== null) where.isActive = isActive === "true";
    if (isClosed !== null) where.isClosed = isClosed === "true";

    const periode = await prisma.periodeAkuntansi.findMany({
      where,
      include: {
        _count: {
          select: { jurnalEntries: true },
        },
      },
      orderBy: {
        tanggalMulai: "desc",
      },
    });

    return NextResponse.json(periode);
  } catch (error) {
    logger.error("Error fetching accounting periods:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST /api/akuntansi/periode - Create new accounting period
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canManageUsers")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { nama, tanggalMulai, tanggalAkhir, isActive } = body;

    // Validate required fields
    if (!nama || !tanggalMulai || !tanggalAkhir) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate date range
    const startDate = new Date(tanggalMulai);
    const endDate = new Date(tanggalAkhir);

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
    }

    // Check for overlapping periods if setting as active
    if (isActive) {
      const overlapping = await prisma.periodeAkuntansi.findFirst({
        where: {
          OR: [
            {
              AND: [
                { tanggalMulai: { lte: startDate } },
                { tanggalAkhir: { gte: startDate } },
              ],
            },
            {
              AND: [
                { tanggalMulai: { lte: endDate } },
                { tanggalAkhir: { gte: endDate } },
              ],
            },
          ],
          isActive: true,
        },
      });

      if (overlapping) {
        return NextResponse.json(
          {
            error: "Cannot create overlapping active periods",
          },
          { status: 400 },
        );
      }

      // Deactivate other active periods
      await prisma.periodeAkuntansi.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const periode = await prisma.periodeAkuntansi.create({
      data: {
        nama,
        tanggalMulai: startDate,
        tanggalAkhir: endDate,
        isActive: isActive || false,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.username,
        action: "CREATE",
        entity: "PERIODE_AKUNTANSI",
        entityId: periode.id,
        description: `Created accounting period: ${periode.nama}`,
      },
    });

    return NextResponse.json(periode, { status: 201 });
  } catch (error) {
    logger.error("Error creating accounting period:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
