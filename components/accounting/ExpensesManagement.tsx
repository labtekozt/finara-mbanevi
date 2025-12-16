"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Receipt, Plus, Search, Calendar, Edit, Trash2 } from "lucide-react";
import { useExpenses } from "@/hooks/accounting";
import {
  Pengeluaran,
  ExpenseCategory,
  PaymentMethod,
} from "@/types/accounting";
import { ExpenseForm } from "./forms/ExpenseForm";

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "GAJI_KARYAWAN", label: "Gaji dan Tunjangan Karyawan" },
  { value: "UTILITAS", label: "Listrik, Air, Telepon" },
  { value: "SEWA", label: "Sewa Tempat Usaha" },
  { value: "PERLENGKAPAN_KANTOR", label: "ATK, Alat Tulis" },
  { value: "TRANSPORTASI", label: "Transportasi dan Perjalanan" },
  { value: "PERBAIKAN", label: "Perbaikan dan Pemeliharaan" },
  { value: "IKLAN_PROMOSI", label: "Iklan dan Promosi" },
  { value: "PAJAK", label: "Pajak dan Retribusi" },
  { value: "ASURANSI", label: "Asuransi" },
  { value: "LAINNYA", label: "Pengeluaran Lain" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "tunai", label: "Tunai" },
  { value: "transfer", label: "Transfer" },
  { value: "cek", label: "Cek" },
  { value: "kartu_kredit", label: "Kartu Kredit" },
];

interface ExpensesManagementProps {
  className?: string;
}

export function ExpensesManagement({ className }: ExpensesManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Pengeluaran | null>(
    null,
  );

  const { expenses, loading, createExpense, updateExpense, deleteExpense } =
    useExpenses({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      kategori: kategoriFilter === "ALL" ? undefined : kategoriFilter,
      search: searchTerm || undefined,
    });

  const handleCreateExpense = async (data: any) => {
    const result = await createExpense(data);
    if (result) {
      setIsDialogOpen(false);
    }
  };

  const handleUpdateExpense = async (data: any) => {
    if (editingExpense) {
      const result = await updateExpense(editingExpense.id, data);
      if (result) {
        setIsDialogOpen(false);
        setEditingExpense(null);
      }
    }
  };

  const handleDeleteExpense = async (expense: Pengeluaran) => {
    if (
      confirm(
        `Apakah Anda yakin ingin menghapus pengeluaran "${expense.deskripsi}"?`,
      )
    ) {
      await deleteExpense(expense.id);
    }
  };

  const openEditDialog = (expense: Pengeluaran) => {
    setEditingExpense(expense);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingExpense(null);
    setIsDialogOpen(true);
  };

  const getCategoryLabel = (kategori: ExpenseCategory) => {
    return (
      EXPENSE_CATEGORIES.find((c) => c.value === kategori)?.label || kategori
    );
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    return PAYMENT_METHODS.find((m) => m.value === method)?.label || method;
  };

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.jumlah),
    0,
  );

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Pengeluaran</h3>
          <p className="text-sm text-muted-foreground">
            Catat dan kelola semua pengeluaran operasional
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Pengeluaran
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Pengeluaran
              </p>
              <p className="text-2xl font-bold">
                Rp {totalExpenses.toLocaleString("id-ID")}
              </p>
            </div>
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="mb-2">
                Cari Pengeluaran
              </Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cari berdasarkan deskripsi atau penerima..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full sm:w-40">
              <Label htmlFor="kategori" className="mb-2">
                Kategori
              </Label>
              <Select value={kategoriFilter} onValueChange={setKategoriFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Kategori</SelectItem>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-32">
              <Label htmlFor="start-date" className="mb-2">
                Tanggal Mulai
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-32">
              <Label htmlFor="end-date" className="mb-2">
                Tanggal Akhir
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="mt-4">
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">
                Memuat pengeluaran...
              </div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Belum ada pengeluaran</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tambahkan pengeluaran pertama untuk memulai
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Pengeluaran Pertama
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Penerima</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      {new Date(expense.tanggal).toLocaleDateString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCategoryLabel(expense.kategori as ExpenseCategory)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {expense.deskripsi}
                    </TableCell>
                    <TableCell>{expense.penerima}</TableCell>
                    <TableCell>
                      Rp {expense.jumlah.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getPaymentMethodLabel(
                          expense.metodePembayaran as PaymentMethod,
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(expense)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Expense Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Edit Pengeluaran" : "Tambah Pengeluaran Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingExpense
                ? "Perbarui informasi pengeluaran yang dipilih"
                : "Catat pengeluaran operasional baru"}
            </DialogDescription>
          </DialogHeader>

          <ExpenseForm
            expense={editingExpense}
            onSubmit={
              editingExpense ? handleUpdateExpense : handleCreateExpense
            }
            loading={loading}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
