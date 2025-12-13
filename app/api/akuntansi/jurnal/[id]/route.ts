import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { AuditLogger } from "@/lib/audit-logger";
import logger from "@/lib/logger";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/akuntansi/jurnal/[id] - Get single journal entry
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canAccessTransaksi")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const entry = await prisma.jurnalEntry.findUnique({
      where: { id },
      include: {
        details: {
          include: {
            akun: true,
          },
          orderBy: {
            debit: "desc", // Debit entries first
          },
        },
        periode: true,
        user: {
          select: {
            id: true,
            nama: true,
            username: true,
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Journal entry not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(entry);
  } catch (error) {
    logger.error("Error fetching journal entry:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE /api/akuntansi/jurnal/[id] - Delete journal entry
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canAccessTransaksi")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if journal entry exists and is not posted
    const entry = await prisma.jurnalEntry.findUnique({
      where: { id },
      include: {
        details: true,
        periode: true,
      },
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Journal entry not found" },
        { status: 404 },
      );
    }

    // Don't allow deletion of posted entries
    if (entry.isPosted) {
      return NextResponse.json(
        { error: "Cannot delete posted journal entries" },
        { status: 400 },
      );
    }

    // Check if period is closed
    if (entry.periode?.isClosed) {
      return NextResponse.json(
        { error: "Cannot delete journal entries from closed periods" },
        { status: 400 },
      );
    }

    // Delete journal entry and details in transaction
    await prisma.$transaction(async (tx) => {
      // Delete journal details first
      await tx.jurnalDetail.deleteMany({
        where: { jurnalId: id },
      });

      // Delete journal entry
      await tx.jurnalEntry.delete({
        where: { id },
      });

      // Create activity log
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name || session.user.username,
          action: "DELETE",
          entity: "JURNAL_ENTRY",
          entityId: id,
          description: `Deleted journal entry: ${entry.nomorJurnal} - ${entry.deskripsi}`,
        },
      });
    });

    // Log audit trail
    await AuditLogger.logFinancialChange({
      tableName: "jurnalEntry",
      recordId: id,
      action: "DELETE",
      oldValues: {
        nomorJurnal: entry.nomorJurnal,
        deskripsi: entry.deskripsi,
        tanggal: entry.tanggal.toISOString(),
        isPosted: entry.isPosted,
      },
      changeReason: "Journal entry deletion",
      changedBy: session.user.id,
    });

    return NextResponse.json({ message: "Journal entry deleted successfully" });
  } catch (error) {
    logger.error("Error deleting journal entry:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
