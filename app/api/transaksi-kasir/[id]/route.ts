import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { belumDiambil } = body;

    if (typeof belumDiambil !== "boolean") {
      return NextResponse.json(
        { error: "Invalid data provided" },
        { status: 400 },
      );
    }

    const transaksi = await prisma.transaksiKasir.update({
      where: { id },
      data: { belumDiambil },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || "",
        action: "UPDATE",
        entity: "TransaksiKasir",
        entityId: transaksi.id,
        description: `Mengubah status pengambilan transaksi ${transaksi.nomorTransaksi} menjadi ${belumDiambil ? "Belum Diambil" : "Sudah Diambil"}`,
      },
    });

    return NextResponse.json(transaksi);
  } catch (error) {
    logger.error("Error updating transaction:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 },
    );
  }
}
