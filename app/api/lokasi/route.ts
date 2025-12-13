import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";

// GET - List all locations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lokasi = await prisma.lokasi.findMany({
      orderBy: {
        namaLokasi: "asc",
      },
    });

    return NextResponse.json(lokasi);
  } catch (error) {
    logger.error("Error fetching lokasi:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 },
    );
  }
}

// POST - Create new location
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { namaLokasi, alamat } = body;

    if (!namaLokasi) {
      return NextResponse.json(
        { error: "Nama lokasi harus diisi" },
        { status: 400 },
      );
    }

    const lokasi = await prisma.lokasi.create({
      data: {
        namaLokasi,
        alamat: alamat || null,
      },
    });

    return NextResponse.json(lokasi, { status: 201 });
  } catch (error) {
    logger.error("Error creating lokasi:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 },
    );
  }
}
