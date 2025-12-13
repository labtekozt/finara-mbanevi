import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { mapDisplayCategoryToEnum } from "@/lib/accounting-mappings";
import logger from "@/lib/logger";

// GET /api/akuntansi/akun - Get all accounts
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
    const tipe = searchParams.get("tipe");
    const kategori = searchParams.get("kategori");
    const search = searchParams.get("search");

    const where: any = { isActive: true };

    if (tipe) where.tipe = tipe;
    if (kategori) {
      const enumKategori = mapDisplayCategoryToEnum(kategori);
      if (enumKategori) {
        where.kategori = enumKategori;
      } else {
        // If mapping fails, return empty result or error
        return NextResponse.json([]);
      }
    }
    if (search) {
      where.OR = [
        { nama: { contains: search, mode: "insensitive" } },
        { kode: { contains: search, mode: "insensitive" } },
      ];
    }

    const akun = await prisma.akun.findMany({
      where,
      include: {
        parent: true,
        children: true,
        _count: {
          select: { jurnalDetails: true },
        },
      },
      orderBy: [{ kode: "asc" }],
    });

    return NextResponse.json(akun);
  } catch (error) {
    logger.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST /api/akuntansi/akun - Create new account
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canManageUsers")) {
      // Only admin can create accounts
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { kode, nama, tipe, kategori, parentId, deskripsi } = body;

    // Validate required fields
    if (!kode || !nama || !tipe || !kategori) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Map display category to enum value
    const enumKategori = mapDisplayCategoryToEnum(kategori);
    if (!enumKategori) {
      return NextResponse.json(
        { error: "Invalid account category" },
        { status: 400 },
      );
    }

    // Check if kode already exists
    const existingAkun = await prisma.akun.findUnique({
      where: { kode },
    });

    if (existingAkun) {
      return NextResponse.json(
        { error: "Account code already exists" },
        { status: 400 },
      );
    }

    // Calculate level
    let level = 1;
    if (parentId) {
      const parent = await prisma.akun.findUnique({
        where: { id: parentId },
      });
      if (parent) {
        level = parent.level + 1;
      }
    }

    const akun = await prisma.akun.create({
      data: {
        kode,
        nama,
        tipe,
        kategori: enumKategori,
        parentId,
        level,
        deskripsi,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.username,
        action: "CREATE",
        entity: "AKUN",
        entityId: akun.id,
        description: `Created account: ${akun.kode} - ${akun.nama}`,
      },
    });

    return NextResponse.json(akun, { status: 201 });
  } catch (error) {
    logger.error("Error creating account:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
