import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import logger from "@/lib/logger";

// GET /api/akuntansi/akun/[id] - Get account by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canAccessTransaksi")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const akun = await prisma.akun.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        jurnalDetails: {
          include: {
            jurnal: true,
          },
        },
        _count: {
          select: { jurnalDetails: true },
        },
      },
    });

    if (!akun) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json(akun);
  } catch (error) {
    logger.error("Error fetching account:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// PUT /api/akuntansi/akun/[id] - Update account
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canManageUsers")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { kode, nama, tipe, kategori, parentId, deskripsi, isActive } = body;

    // Check if account exists
    const existingAkun = await prisma.akun.findUnique({
      where: { id },
    });

    if (!existingAkun) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Check if kode is being changed and if it conflicts
    if (kode && kode !== existingAkun.kode) {
      const kodeExists = await prisma.akun.findUnique({
        where: { kode },
      });
      if (kodeExists) {
        return NextResponse.json(
          { error: "Account code already exists" },
          { status: 400 },
        );
      }
    }

    // Calculate level if parent changed
    let level = existingAkun.level;
    if (parentId !== existingAkun.parentId) {
      if (parentId) {
        const parent = await prisma.akun.findUnique({
          where: { id: parentId },
        });
        if (parent) {
          level = parent.level + 1;
        }
      } else {
        level = 1;
      }
    }

    const akun = await prisma.akun.update({
      where: { id },
      data: {
        ...(kode && { kode }),
        ...(nama && { nama }),
        ...(tipe && { tipe }),
        ...(kategori && { kategori }),
        ...(parentId !== undefined && { parentId }),
        ...(deskripsi !== undefined && { deskripsi }),
        ...(isActive !== undefined && { isActive }),
        level,
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
        action: "UPDATE",
        entity: "AKUN",
        entityId: akun.id,
        description: `Updated account: ${akun.kode} - ${akun.nama}`,
      },
    });

    return NextResponse.json(akun);
  } catch (error) {
    logger.error("Error updating account:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE /api/akuntansi/akun/[id] - Delete account (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canManageUsers")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if account has journal entries
    const journalCount = await prisma.jurnalEntry.count({
      where: {
        details: {
          some: {
            akunId: id,
          },
        },
      },
    });

    if (journalCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete account with existing journal entries",
        },
        { status: 400 },
      );
    }

    const akun = await prisma.akun.update({
      where: { id },
      data: { isActive: false },
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
        action: "DELETE",
        entity: "AKUN",
        entityId: akun.id,
        description: `Deactivated account: ${akun.kode} - ${akun.nama}`,
      },
    });

    return NextResponse.json(akun);
  } catch (error) {
    logger.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
