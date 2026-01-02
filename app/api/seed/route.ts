import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * POST /api/seed
 * One-time database seeding endpoint
 * IMPORTANT: Delete this file after seeding production database
 */
export async function POST(request: NextRequest) {
  try {
    // Security: Check for seed key
    const { seedKey } = await request.json();
    
    if (seedKey !== process.env.SEED_KEY) {
      return NextResponse.json(
        { error: "Invalid seed key" },
        { status: 403 }
      );
    }

    // Check if already seeded
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      return NextResponse.json(
        { message: "Database already seeded", userCount: existingUsers },
        { status: 200 }
      );
    }

    // Create users
    await prisma.user.upsert({
      where: { username: "Nevi" },
      update: {},
      create: {
        nama: "Nevi Administrator",
        username: "Nevi",
        email: "admin@finara.com",
        password: await bcrypt.hash("Imanuel28", 10),
        role: "ADMIN",
      },
    });

    await prisma.user.upsert({
      where: { username: "Gerijaya" },
      update: {},
      create: {
        nama: "Nevi Kasir",
        username: "Gerijaya",
        email: "kasir@finara.com",
        password: await bcrypt.hash("Gerijaya04", 10),
        role: "KASIR",
      },
    });

    // Create accounting period
    const periodeAkuntansi = await prisma.periodeAkuntansi.create({
      data: {
        nama: "2026 - Tahun Berjalan",
        tanggalMulai: new Date("2026-01-01"),
        tanggalAkhir: new Date("2026-12-31"),
        isActive: true,
      },
    });

    // Create chart of accounts (simplified version)
    const accounts = [
      // Assets
      { kode: "1-1000", nama: "Kas", tipe: "ASSET", kategori: "CURRENT_ASSET", level: 1 },
      { kode: "1-2000", nama: "Bank", tipe: "ASSET", kategori: "CURRENT_ASSET", level: 1 },
      { kode: "1-3000", nama: "Piutang Dagang", tipe: "ASSET", kategori: "CURRENT_ASSET", level: 1 },
      { kode: "1-4000", nama: "Persediaan Barang", tipe: "ASSET", kategori: "CURRENT_ASSET", level: 1 },
      
      // Liabilities
      { kode: "2-1000", nama: "Hutang Dagang", tipe: "LIABILITY", kategori: "CURRENT_LIABILITY", level: 1 },
      
      // Equity
      { kode: "3-1000", nama: "Modal", tipe: "EQUITY", kategori: "OWNER_EQUITY", level: 1 },
      { kode: "3-2000", nama: "Laba Ditahan", tipe: "EQUITY", kategori: "RETAINED_EARNINGS", level: 1 },
      
      // Revenue
      { kode: "4-1000", nama: "Pendapatan Penjualan", tipe: "REVENUE", kategori: "OPERATING_REVENUE", level: 1 },
      
      // Expenses
      { kode: "5-1000", nama: "Harga Pokok Penjualan", tipe: "EXPENSE", kategori: "OPERATING_EXPENSE", level: 1 },
      { kode: "5-2000", nama: "Beban Operasional", tipe: "EXPENSE", kategori: "OPERATING_EXPENSE", level: 1 },
    ];

    for (const account of accounts) {
      await prisma.akun.create({
        data: account as any,
      });
    }

    const userCount = await prisma.user.count();
    const accountCount = await prisma.akun.count();

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      data: {
        users: userCount,
        accounts: accountCount,
        period: periodeAkuntansi.nama,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { 
        error: "Failed to seed database",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
