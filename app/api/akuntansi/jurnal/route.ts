import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { generateTransactionNumber } from "@/lib/transaction-number";
import logger from "@/lib/logger";

// GET /api/akuntansi/jurnal - Get journal entries
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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const isPosted = searchParams.get("isPosted");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {};

    if (periodeId) where.periodeId = periodeId;
    if (startDate && endDate) {
      where.tanggal = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    if (isPosted !== null) where.isPosted = isPosted === "true";
    if (search) {
      where.OR = [
        { nomorJurnal: { contains: search, mode: "insensitive" } },
        { deskripsi: { contains: search, mode: "insensitive" } },
        { referensi: { contains: search, mode: "insensitive" } },
      ];
    }

    const [entries, total] = await Promise.all([
      prisma.jurnalEntry.findMany({
        where,
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
        orderBy: [
          {
            tanggal: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.jurnalEntry.count({ where }),
    ]);

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Error fetching journal entries:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST /api/akuntansi/jurnal - Create journal entry
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
    const { tanggal, deskripsi, referensi, tipeReferensi, periodeId, details } =
      body;

    // Validate required fields
    if (
      !tanggal ||
      !deskripsi ||
      !periodeId ||
      !details ||
      details.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate double-entry: total debit should equal total credit
    const totalDebit = details.reduce(
      (sum: number, detail: any) => sum + (detail.debit || 0),
      0,
    );
    const totalCredit = details.reduce(
      (sum: number, detail: any) => sum + (detail.kredit || 0),
      0,
    );

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      // Allow small floating point differences
      return NextResponse.json(
        {
          error: "Total debit must equal total credit",
          debit: totalDebit,
          credit: totalCredit,
        },
        { status: 400 },
      );
    }

    // Check if periode exists and is active
    const periode = await prisma.periodeAkuntansi.findUnique({
      where: { id: periodeId },
    });

    if (!periode || !periode.isActive) {
      return NextResponse.json(
        { error: "Invalid or inactive accounting period" },
        { status: 400 },
      );
    }

    // Generate journal number
    const nomorJurnal = generateTransactionNumber("JR");

    // Create journal entry with details in transaction
    const result = await prisma.$transaction(async (tx) => {
      const jurnalEntry = await tx.jurnalEntry.create({
        data: {
          nomorJurnal,
          tanggal: new Date(tanggal),
          deskripsi,
          referensi,
          tipeReferensi,
          periodeId,
          userId: session.user.id,
          details: {
            create: details.map((detail: any) => ({
              akunId: detail.akunId,
              debit: detail.debit || 0,
              kredit: detail.kredit || 0,
              deskripsi: detail.deskripsi,
            })),
          },
        },
        include: {
          details: {
            include: {
              akun: true,
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

      // Create activity log
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name || session.user.username,
          action: "CREATE",
          entity: "JURNAL_ENTRY",
          entityId: jurnalEntry.id,
          description: `Created journal entry: ${jurnalEntry.nomorJurnal} - ${jurnalEntry.deskripsi}`,
        },
      });

      return jurnalEntry;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    logger.error("Error creating journal entry:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
