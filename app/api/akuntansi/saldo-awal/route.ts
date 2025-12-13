import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import logger from "@/lib/logger";

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
    const periodeId = searchParams.get("periodeId");

    if (!periodeId) {
      return NextResponse.json(
        { error: "Periode ID is required" },
        { status: 400 },
      );
    }

    // Get opening balances for the period
    const openingBalances = await prisma.saldoAwal.findMany({
      where: { periodeId },
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
      },
      orderBy: [{ akun: { tipe: "asc" } }, { akun: { kode: "asc" } }],
    });

    return NextResponse.json(openingBalances);
  } catch (error) {
    logger.error("Error fetching opening balances:", error);
    return NextResponse.json(
      { error: "Failed to fetch opening balances" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canAccessTransaksi")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { periodeId, akunId, saldo } = body;

    if (!periodeId || !akunId || saldo === undefined) {
      return NextResponse.json(
        { error: "Periode ID, account ID, and saldo are required" },
        { status: 400 },
      );
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

    // Check if account exists
    const akun = await prisma.akun.findUnique({
      where: { id: akunId },
    });

    if (!akun) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Create or update opening balance
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
      },
    });

    return NextResponse.json(openingBalance);
  } catch (error) {
    logger.error("Error creating/updating opening balance:", error);
    return NextResponse.json(
      { error: "Failed to create/update opening balance" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canAccessTransaksi")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const akunId = searchParams.get("akunId");
    const periodeId = searchParams.get("periodeId");

    if (!akunId || !periodeId) {
      return NextResponse.json(
        { error: "Account ID and Period ID are required" },
        { status: 400 },
      );
    }

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
