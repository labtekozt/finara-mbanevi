import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { serializeDecimal } from "@/lib/utils";
import { z } from "zod";
import logger from "@/lib/logger";

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

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/supplier/[id]
 * Get single supplier with detailed information
 */
export async function GET(request: NextRequest, props: RouteParams) {
  const params = await props.params;
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

    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      include: {
        transaksiMasuk: {
          include: {
            barang: true,
            lokasi: true,
          },
          orderBy: { tanggal: "desc" },
          take: 20,
        },
        hutang: {
          where: {
            status: {
              in: ["BELUM_LUNAS", "JATUH_TEMPO"],
            },
          },
          orderBy: { tanggalHutang: "desc" },
        },
        _count: {
          select: {
            transaksiMasuk: true,
            hutang: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 },
      );
    }

    // Calculate total hutang
    const totalHutang = supplier.hutang.reduce(
      (sum, h) => sum + Number(h.sisaHutang),
      0,
    );

    return NextResponse.json(
      serializeDecimal({
        ...supplier,
        totalHutang,
      }),
    );
  } catch (error) {
    logger.error("Error fetching supplier:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/supplier/[id]
 * Update supplier information
 */
export async function PUT(request: NextRequest, props: RouteParams) {
  const params = await props.params;
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

    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: {
        nama: validatedData.nama,
        alamat: validatedData.alamat,
        nomorTelepon: validatedData.nomorTelepon,
        email: validatedData.email || null,
        namaKontak: validatedData.namaKontak,
        kategori: validatedData.kategori,
        keterangan: validatedData.keterangan,
        isActive: validatedData.isActive,
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

    return NextResponse.json(supplier);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }

    logger.error("Error updating supplier:", error);
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/supplier/[id]
 * Soft delete supplier (set isActive to false)
 */
export async function DELETE(request: NextRequest, props: RouteParams) {
  const params = await props.params;
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

    // Check if supplier has transactions
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            transaksiMasuk: true,
            hutang: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 },
      );
    }

    // Soft delete if has transactions, hard delete otherwise
    if (supplier._count.transaksiMasuk > 0 || supplier._count.hutang > 0) {
      await prisma.supplier.update({
        where: { id: params.id },
        data: { isActive: false },
      });

      return NextResponse.json({
        message: "Supplier deactivated successfully",
        softDeleted: true,
      });
    } else {
      await prisma.supplier.delete({
        where: { id: params.id },
      });

      return NextResponse.json({
        message: "Supplier deleted successfully",
        hardDeleted: true,
      });
    }
  } catch (error) {
    logger.error("Error deleting supplier:", error);
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 },
    );
  }
}
