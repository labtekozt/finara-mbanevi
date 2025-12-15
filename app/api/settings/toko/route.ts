import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import logger from "@/lib/logger";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get store settings (should only be one record)
    let settings = await prisma.settingsToko.findFirst();

    // If no settings exist, create default
    if (!settings) {
      settings = await prisma.settingsToko.create({
        data: {
          namaToko: "Toko Anda",
          alamat: "Alamat Toko",
          nomorTelepon: "0812-3456-7890",
          tagline: "Melayani Dengan Sepenuh Hati",
          footerText: "Terima kasih atas kunjungan Anda",
          pajak: 0,
          includePajak: false,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    logger.error("Error fetching store settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch store settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
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
      namaToko,
      alamat,
      nomorTelepon,
      email,
      website,
      tagline,
      footerText,
      pajak,
      includePajak,
    } = body;

    // Get existing settings
    let settings = await prisma.settingsToko.findFirst();

    if (settings) {
      // Update existing
      settings = await prisma.settingsToko.update({
        where: { id: settings.id },
        data: {
          namaToko,
          alamat,
          nomorTelepon,
          email,
          website,
          tagline,
          footerText,
          pajak: pajak ? parseFloat(pajak) : 0,
          includePajak: includePajak || false,
        },
      });
    } else {
      // Create new
      settings = await prisma.settingsToko.create({
        data: {
          namaToko,
          alamat,
          nomorTelepon,
          email,
          website,
          tagline,
          footerText,
          pajak: pajak ? parseFloat(pajak) : 0,
          includePajak: includePajak || false,
        },
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "",
        action: "UPDATE",
        entity: "SettingsToko",
        entityId: settings.id,
        description: `Update pengaturan toko: ${namaToko}`,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    logger.error("Error updating store settings:", error);
    return NextResponse.json(
      { error: "Failed to update store settings" },
      { status: 500 },
    );
  }
}
