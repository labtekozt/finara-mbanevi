import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import logger from "@/lib/logger";

interface RouteParams {
  params: Promise<{
    akunId: string;
    periodeId: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canAccessTransaksi")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { akunId, periodeId } = await params;

    const openingBalance = await prisma.saldoAwal.findUnique({
      where: {
        akunId_periodeId: {
          akunId,
          periodeId,
        },
      },
      include: {
        akun: {
          select: {
            id: true,
            kode: true,
            nama: true,
            tipe: true,
            kategori: true,
          },
        },
        periode: {
          select: {
            id: true,
            nama: true,
            tanggalMulai: true,
            tanggalAkhir: true,
            isClosed: true,
          },
        },
      },
    });

    if (!openingBalance) {
      return NextResponse.json(
        { error: "Opening balance not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(openingBalance);
  } catch (error) {
    logger.error("Error fetching opening balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch opening balance" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canAccessTransaksi")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { akunId, periodeId } = await params;
    const body = await request.json();
    const { saldo } = body;

    if (saldo === undefined) {
      return NextResponse.json({ error: "Saldo is required" }, { status: 400 });
    }

    // Check if period exists and is not closed
    const periode = await prisma.periodeAkuntansi.findUnique({
      where: { id: periodeId },
    });

    if (!periode) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }

    if (periode.isClosed) {
      return NextResponse.json(
        { error: "Cannot modify opening balances for closed period" },
        { status: 400 },
      );
    }

    const openingBalance = await prisma.saldoAwal.upsert({
      where: {
        akunId_periodeId: {
          akunId,
          periodeId,
        },
      },
      update: { saldo },
      create: {
        akunId,
        periodeId,
        saldo,
      },
      include: {
        akun: {
          select: {
            id: true,
            kode: true,
            nama: true,
            tipe: true,
            kategori: true,
          },
        },
        periode: {
          select: {
            id: true,
            nama: true,
            tanggalMulai: true,
            tanggalAkhir: true,
            isClosed: true,
          },
        },
      },
    });

    return NextResponse.json(openingBalance);
  } catch (error) {
    logger.error("Error updating opening balance:", error);
    return NextResponse.json(
      { error: "Failed to update opening balance" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canAccessTransaksi")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { akunId, periodeId } = await params;

    // Check if period is not closed
    const periode = await prisma.periodeAkuntansi.findUnique({
      where: { id: periodeId },
    });

    if (periode?.isClosed) {
      return NextResponse.json(
        { error: "Cannot delete opening balances for closed period" },
        { status: 400 },
      );
    }

    await prisma.saldoAwal.delete({
      where: {
        akunId_periodeId: {
          akunId,
          periodeId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting opening balance:", error);
    return NextResponse.json(
      { error: "Failed to delete opening balance" },
      { status: 500 },
    );
  }
}
