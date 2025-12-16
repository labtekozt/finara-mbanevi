"use client";

import React, { useState, useMemo } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useCashFlow } from "@/hooks/accounting";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CashFlowReportProps {
  className?: string;
}

export function CashFlowReport({ className }: CashFlowReportProps) {
  const [filterType, setFilterType] = useState<
    "today" | "month" | "year" | "custom"
  >("month");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Calculate date range based on filter type
  const dateRange = useMemo(() => {
    const today = new Date();
    let start = "";
    let end = "";

    switch (filterType) {
      case "today":
        start = today.toISOString().split("T")[0];
        end = start;
        break;
      case "month":
        const firstDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
        );
        const lastDayOfMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0,
        );
        start = firstDayOfMonth.toISOString().split("T")[0];
        end = lastDayOfMonth.toISOString().split("T")[0];
        break;
      case "year":
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        const lastDayOfYear = new Date(today.getFullYear(), 11, 31);
        start = firstDayOfYear.toISOString().split("T")[0];
        end = lastDayOfYear.toISOString().split("T")[0];
        break;
      case "custom":
        start = startDate;
        end = endDate;
        break;
    }

    return { start, end };
  }, [filterType, startDate, endDate]);

  const { data, loading, error, refetch } = useCashFlow({
    startDate: dateRange.start,
    endDate: dateRange.end,
    autoLoad: true,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const exportPDF = () => {
    if (!data) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;

    // Header
    pdf.setFontSize(16);
    pdf.text("LAPORAN ARUS KAS", pageWidth / 2, 20, { align: "center" });

    pdf.setFontSize(10);
    pdf.text(`Periode: ${data.startDate} s/d ${data.endDate}`, 20, 35);

    // Summary boxes
    let yPos = 50;
    pdf.setFontSize(12);
    pdf.text(
      `Total Pemasukan: ${formatCurrency(data.totalPemasukan)}`,
      20,
      yPos,
    );
    pdf.text(
      `Total Pengeluaran: ${formatCurrency(data.totalPengeluaran)}`,
      20,
      yPos + 8,
    );
    pdf.text(
      `Net Cash Flow: ${formatCurrency(data.netCashFlow)}`,
      20,
      yPos + 16,
    );
    pdf.text(`Saldo Akhir: ${formatCurrency(data.saldoAkhir)}`, 20, yPos + 24);

    // Transactions table
    yPos += 37;
    const tableData = data.entries.map((entry) => [
      formatDate(entry.tanggal),
      entry.deskripsi,
      entry.kategori,
      entry.tipe === "in"
        ? formatCurrency(entry.jumlah)
        : formatCurrency(entry.jumlah),
      formatCurrency(entry.saldo),
    ]);

    autoTable(pdf, {
      head: [["Tanggal", "Deskripsi", "Kategori", "Jumlah", "Saldo"]],
      body: tableData,
      startY: yPos,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      columnStyles: {
        3: { halign: "right" },
        4: { halign: "right" },
      },
    });

    pdf.save(`cash-flow-${data.startDate}-${data.endDate}.pdf`);
    toast.success("Laporan Arus Kas berhasil diekspor");
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Laporan Arus Kas
          </CardTitle>
          <CardDescription>
            Laporan arus keluar masuk keuangan dari pendapatan dan pengeluaran
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filter Type */}
              <div>
                <Label htmlFor="filterType" className="mb-2">
                  Periode
                </Label>
                <Select
                  value={filterType}
                  onValueChange={(value: any) => setFilterType(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih periode..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hari Ini</SelectItem>
                    <SelectItem value="month">Bulan Ini</SelectItem>
                    <SelectItem value="year">Tahun Ini</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Export Button */}
              <div className="flex items-end">
                {data && (
                  <Button
                    onClick={exportPDF}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                )}
              </div>
            </div>

            {/* Custom Date Range */}
            {filterType === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate" className="mb-2">
                    Tanggal Mulai
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="mb-2">
                    Tanggal Akhir
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Filter Info */}
            {dateRange.start && dateRange.end && (
              <Card className="bg-blue-50 border-blue-200 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">
                    {filterType === "today" && "Hari Ini"}
                    {filterType === "month" && "Bulan Ini"}
                    {filterType === "year" && "Tahun Ini"}
                    {filterType === "custom" && "Custom Range"}
                  </Badge>
                  <span className="text-muted-foreground">
                    Filter aktif: {dateRange.start} sampai {dateRange.end}
                  </span>
                </div>
              </Card>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">
                Memuat laporan arus kas...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <Button onClick={refetch} className="mt-2">
                Coba Lagi
              </Button>
            </div>
          )}

          {/* Content */}
          {data && !loading && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-1">
                      <ArrowUpCircle className="h-4 w-4" />
                      Pemasukan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-700">
                      {formatCurrency(data.totalPemasukan)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-1">
                      <ArrowDownCircle className="h-4 w-4" />
                      Pengeluaran
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-700">
                      {formatCurrency(data.totalPengeluaran)}
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={
                    data.netCashFlow >= 0
                      ? "border-blue-200 bg-blue-50"
                      : "border-orange-200 bg-orange-50"
                  }
                >
                  <CardHeader className="pb-2">
                    <CardTitle
                      className={`text-sm font-medium flex items-center gap-1 ${data.netCashFlow >= 0 ? "text-blue-700" : "text-orange-700"}`}
                    >
                      {data.netCashFlow >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      Net Cash Flow
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${data.netCashFlow >= 0 ? "text-blue-700" : "text-orange-700"}`}
                    >
                      {formatCurrency(data.netCashFlow)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-purple-700">
                      Saldo Akhir
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-700">
                      {formatCurrency(data.saldoAkhir)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Summary Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Rincian Pemasukan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Penjualan Tunai
                        </span>
                        <span className="font-medium">
                          {formatCurrency(data.summary.pemasukan.penjualan)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Pembayaran Piutang
                        </span>
                        <span className="font-medium">
                          {formatCurrency(
                            data.summary.pemasukan.pembayaranPiutang,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lainnya</span>
                        <span className="font-medium">
                          {formatCurrency(data.summary.pemasukan.lainnya)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-bold">
                        <span>Total</span>
                        <span>
                          {formatCurrency(data.summary.pemasukan.total)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Rincian Pengeluaran
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Pembelian Tunai
                        </span>
                        <span className="font-medium">
                          {formatCurrency(data.summary.pengeluaran.pembelian)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Pembayaran Hutang
                        </span>
                        <span className="font-medium">
                          {formatCurrency(
                            data.summary.pengeluaran.pembayaranHutang,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Operasional
                        </span>
                        <span className="font-medium">
                          {formatCurrency(data.summary.pengeluaran.operasional)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gaji</span>
                        <span className="font-medium">
                          {formatCurrency(data.summary.pengeluaran.gaji)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lainnya</span>
                        <span className="font-medium">
                          {formatCurrency(data.summary.pengeluaran.lainnya)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-bold">
                        <span>Total</span>
                        <span>
                          {formatCurrency(data.summary.pengeluaran.total)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Rincian Transaksi</CardTitle>
                  <CardDescription>
                    {data.entries.length} transaksi ditemukan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Deskripsi</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead className="text-right">Jumlah</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.entries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              Tidak ada transaksi dalam periode ini
                            </TableCell>
                          </TableRow>
                        ) : (
                          data.entries.map((entry, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {formatDate(entry.tanggal)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {entry.tipe === "in" ? (
                                    <ArrowUpCircle className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ArrowDownCircle className="h-4 w-4 text-red-600" />
                                  )}
                                  {entry.deskripsi}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {entry.kategori}
                                </Badge>
                              </TableCell>
                              <TableCell
                                className={`text-right font-medium ${entry.tipe === "in" ? "text-green-600" : "text-red-600"}`}
                              >
                                {entry.tipe === "in" ? "+" : "-"}
                                {formatCurrency(entry.jumlah)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(entry.saldo)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
