import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { generateTransactionNumber } from "@/lib/transaction-number";
import logger from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canAccessTransaksi")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Calculate total inventory value (hargaBeli * stok for all items)
    const inventoryItems = await prisma.barang.findMany({
      select: {
        hargaBeli: true,
        stok: true,
      },
    });

    const totalInventoryValue = inventoryItems.reduce(
      (total, item) => total + item.hargaBeli.toNumber() * item.stok.toNumber(),
      0,
    );

    // Get or create capital account (Modal Pemilik)
    let capitalAccount = await prisma.akun.findFirst({
      where: {
        kode: "3001", // Standard capital account code
        tipe: "EQUITY",
      },
    });

    if (!capitalAccount) {
      capitalAccount = await prisma.akun.create({
        data: {
          kode: "3001",
          nama: "Modal Pemilik",
          tipe: "EQUITY",
          kategori: "OWNER_EQUITY",
          isActive: true,
        },
      });
    }

    // Get or create inventory account (Persediaan)
    let inventoryAccount = await prisma.akun.findFirst({
      where: {
        kode: "1201", // Standard inventory account code (changed from 1101 to avoid conflict)
        tipe: "ASSET",
      },
    });

    if (!inventoryAccount) {
      inventoryAccount = await prisma.akun.create({
        data: {
          kode: "1201",
          nama: "Persediaan Barang",
          tipe: "ASSET",
          kategori: "CURRENT_ASSET",
          isActive: true,
        },
      });
    }

    // Check if initial capital journal entry already exists
    const existingEntry = await prisma.jurnalEntry.findFirst({
      where: {
        deskripsi: "Modal Awal - Persediaan",
      },
      include: {
        details: true,
      },
    });

    if (existingEntry) {
      return NextResponse.json({
        message: "Modal awal sudah dihitung sebelumnya",
        totalInventoryValue,
        capitalAccountId: capitalAccount.id,
        inventoryAccountId: inventoryAccount.id,
        existingEntry: true,
      });
    }

    // Get or create default accounting period for initial capital
    let defaultPeriod = await prisma.periodeAkuntansi.findFirst({
      where: {
        isActive: true,
      },
      orderBy: {
        tanggalMulai: "asc",
      },
    });

    if (!defaultPeriod) {
      // Create a default period if none exists
      const currentYear = new Date().getFullYear();
      defaultPeriod = await prisma.periodeAkuntansi.create({
        data: {
          nama: `Periode ${currentYear}`,
          tanggalMulai: new Date(currentYear, 0, 1),
          tanggalAkhir: new Date(currentYear, 11, 31),
          isActive: true,
        },
      });
    }

    // Generate journal number
    const nomorJurnal = generateTransactionNumber("JR");

    // Create initial capital journal entry
    const journalEntry = await prisma.jurnalEntry.create({
      data: {
        nomorJurnal,
        tanggal: new Date(),
        deskripsi: "Modal Awal - Persediaan",
        periodeId: defaultPeriod.id,
        userId: session.user.id,
        isPosted: true, // Mark as posted so it appears in reports
        details: {
          create: [
            // Debit inventory (asset increases)
            {
              akunId: inventoryAccount.id,
              debit: totalInventoryValue,
              kredit: 0,
            },
            // Credit capital (equity increases)
            {
              akunId: capitalAccount.id,
              debit: 0,
              kredit: totalInventoryValue,
            },
          ],
        },
      },
      include: {
        details: true,
      },
    });

    // Log the action
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown",
        action: "CREATE",
        entity: "JurnalEntry",
        entityId: journalEntry.id,
        description: `Modal awal dihitung otomatis: Rp ${totalInventoryValue.toLocaleString("id-ID")}`,
      },
    });

    return NextResponse.json({
      message: "Modal awal berhasil dihitung",
      totalInventoryValue,
      capitalAccountId: capitalAccount.id,
      inventoryAccountId: inventoryAccount.id,
      journalEntry,
    });
  } catch (error) {
    logger.error("Error calculating initial capital:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
