import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createJournalEntryForExpense } from "@/lib/accounting-utils";

// GET /api/pengeluaran - Get all expenses
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const kategori = searchParams.get("kategori");
    const search = searchParams.get("search");

    const where: any = {};

    if (startDate && endDate) {
      where.tanggal = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    if (kategori) where.kategori = kategori;
    if (search) {
      where.OR = [
        { deskripsi: { contains: search, mode: "insensitive" } },
        { penerima: { contains: search, mode: "insensitive" } },
      ];
    }

    const pengeluaran = await prisma.pengeluaran.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            username: true,
          },
        },
      },
      orderBy: {
        tanggal: "desc",
      },
    });

    return NextResponse.json(pengeluaran);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST /api/pengeluaran - Create new expense
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
    const {
      tanggal,
      kategori,
      deskripsi,
      jumlah,
      penerima,
      metodePembayaran,
      catatan,
    } = body;

    // Validate required fields
    if (!tanggal || !kategori || !deskripsi || !jumlah || !penerima) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create expense and journal entry in transaction
    const result = await prisma.$transaction(async (tx) => {
      const pengeluaran = await tx.pengeluaran.create({
        data: {
          tanggal: new Date(tanggal),
          kategori,
          deskripsi,
          jumlah: parseFloat(jumlah),
          penerima,
          metodePembayaran: metodePembayaran || "tunai",
          catatan,
          userId: session.user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              nama: true,
              username: true,
            },
          },
        },
      });

      // Create journal entry for expense
      // Removed try-catch to ensure atomicity. If journal fails, expense creation must rollback.
      await createJournalEntryForExpense(tx, pengeluaran, session.user.id);

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name || session.user.username,
          action: "CREATE",
          entity: "PENGELUARAN",
          entityId: pengeluaran.id,
          description: `Created expense: ${pengeluaran.deskripsi} - Rp ${pengeluaran.jumlah.toLocaleString("id-ID")}`,
        },
      });

      return pengeluaran;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
