import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import {
  createJournalEntryForExpense,
  reverseJournalEntry,
} from "@/lib/accounting-utils";

// PUT /api/pengeluaran/[id] - Update expense
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    // Validate required fields
    if (!tanggal || !kategori || !deskripsi || !jumlah || !penerima) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Get the current expense
      const currentExpense = await tx.pengeluaran.findUnique({
        where: { id },
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

      if (!currentExpense) {
        throw new Error("Expense not found");
      }

      // Update the expense
      const updatedExpense = await tx.pengeluaran.update({
        where: { id },
        data: {
          tanggal: new Date(tanggal),
          kategori,
          deskripsi,
          jumlah: parseFloat(jumlah),
          penerima,
          metodePembayaran: metodePembayaran || "tunai",
          catatan,
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

      // If amount changed, reverse old journal entry and create new one
      if (currentExpense.jumlah.toNumber() !== parseFloat(jumlah)) {
        // Find and reverse the old journal entry
        const oldJournalEntry = await tx.jurnalEntry.findFirst({
          where: {
            referensi: `EXP-${currentExpense.id}`,
            tipeReferensi: "EXPENSE",
          },
        });

        if (oldJournalEntry) {
          await reverseJournalEntry(tx, oldJournalEntry.id, session.user.id);
        }

        // Create new journal entry
        try {
          await createJournalEntryForExpense(
            tx,
            updatedExpense,
            session.user.id,
          );
        } catch (journalError) {
          console.error(
            "Error creating journal entry for updated expense:",
            journalError,
          );
          // Don't fail the update if journal entry fails
        }
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name || session.user.username,
          action: "UPDATE",
          entity: "PENGELUARAN",
          entityId: updatedExpense.id,
          description: `Updated expense: ${updatedExpense.deskripsi} - Rp ${updatedExpense.jumlah.toNumber().toLocaleString("id-ID")}`,
        },
      });

      return updatedExpense;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE /api/pengeluaran/[id] - Delete expense
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, "canAccessTransaksi")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const result = await prisma.$transaction(async (tx) => {
      // Get the expense before deleting
      const expense = await tx.pengeluaran.findUnique({
        where: { id },
      });

      if (!expense) {
        throw new Error("Expense not found");
      }

      // Find and reverse the journal entry
      const journalEntry = await tx.jurnalEntry.findFirst({
        where: {
          referensi: `EXP-${expense.id}`,
          tipeReferensi: "EXPENSE",
        },
      });

      if (journalEntry) {
        await reverseJournalEntry(tx, journalEntry.id, session.user.id);
      }

      // Delete the expense
      await tx.pengeluaran.delete({
        where: { id },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          userName: session.user.name || session.user.username,
          action: "DELETE",
          entity: "PENGELUARAN",
          entityId: id,
          description: `Deleted expense: ${expense.deskripsi} - Rp ${expense.jumlah.toNumber().toLocaleString("id-ID")}`,
        },
      });

      return { success: true };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
