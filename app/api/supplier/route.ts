import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import logger from "@/lib/logger";
import { Prisma } from "@prisma/client";

// Validation schema
const supplierSchema = z.object({
  nama: z.string().min(1, "Nama supplier harus diisi"),
  alamat: z.string().optional(),
  nomorTelepon: z.string().optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  namaKontak: z.string().optional(),
  kategori: z.string().optional(),
  keterangan: z.string().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/supplier
 * Retrieve all suppliers with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user exists (zombie session check)
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!userExists) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const isActive = searchParams.get("isActive");
    const kategori = searchParams.get("kategori");

    // Build where clause
    const where: Prisma.SupplierWhereInput = {
      ...(search && {
        OR: [
          { nama: { contains: search, mode: "insensitive" } },
          { kode: { contains: search, mode: "insensitive" } },
          { alamat: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(isActive !== null && { isActive: isActive === "true" }),
      ...(kategori && { kategori }),
    };

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { nama: "asc" },
      include: {
        _count: {
          select: {
            transaksiMasuk: true,
            hutang: {
              where: {
                status: {
                  in: ["BELUM_LUNAS", "JATUH_TEMPO"],
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    logger.error("Error fetching suppliers:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/supplier
 * Create a new supplier
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!userExists) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = supplierSchema.parse(body);

    // Generate unique supplier code (SUP-001, SUP-002, etc.)
    const lastSupplier = await prisma.supplier.findFirst({
      orderBy: { kode: "desc" },
    });

    let newCode = "SUP-001";
    if (lastSupplier && lastSupplier.kode.startsWith("SUP-")) {
      const lastNumber = parseInt(lastSupplier.kode.split("-")[1]);
      newCode = `SUP-${String(lastNumber + 1).padStart(3, "0")}`;
    }

    const supplier = await prisma.supplier.create({
      data: {
        kode: newCode,
        nama: validatedData.nama,
        alamat: validatedData.alamat,
        nomorTelepon: validatedData.nomorTelepon,
        email: validatedData.email || null,
        namaKontak: validatedData.namaKontak,
        kategori: validatedData.kategori,
        keterangan: validatedData.keterangan,
        isActive: validatedData.isActive ?? true,
      },
      include: {
        _count: {
          select: {
            transaksiMasuk: true,
            hutang: true,
          },
        },
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    logger.error("Error creating supplier:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 },
    );
  }
}
