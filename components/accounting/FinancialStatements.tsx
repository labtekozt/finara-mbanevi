"use client";

import React, { useState } from "react";
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
import { TabsContent } from "@/components/ui/tabs";
import {
  StyledTabs,
  StyledTabsList,
  StyledTabsTrigger,
} from "@/components/ui/styled-tabs";
import {
  FileText,
  Download,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calculator,
} from "lucide-react";
import { useBalanceSheet, useIncomeStatement } from "@/hooks/accounting";
import { useAccountingDashboard } from "@/hooks/accounting";
import { PeriodeAkuntansi } from "@/types/accounting";
import { AccountingService } from "@/services/accounting";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface FinancialStatementsProps {
  className?: string;
}

export function FinancialStatements({ className }: FinancialStatementsProps) {
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>("ALL");

  const {
    data: balanceSheetData,
    loading: bsLoading,
    error: bsError,
    refetch: refetchBS,
  } = useBalanceSheet({
    periodeId: selectedPeriodeId === "ALL" ? undefined : selectedPeriodeId,
    autoLoad: true,
  });

  const {
    data: incomeStatementData,
    loading: isLoading,
    error: isError,
    refetch: refetchIS,
  } = useIncomeStatement({
    periodeId: selectedPeriodeId === "ALL" ? undefined : selectedPeriodeId,
    autoLoad: true,
  });

  const { periods } = useAccountingDashboard();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportBalanceSheetPDF = () => {
    if (!balanceSheetData) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;

    // Header
    pdf.setFontSize(16);
    pdf.text("NERACA", pageWidth / 2, 20, { align: "center" });

    pdf.setFontSize(12);
    if (balanceSheetData.periode) {
      pdf.text(`Periode: ${balanceSheetData.periode.nama}`, 20, 35);
      pdf.text(
        `Tanggal: ${new Date(balanceSheetData.periode.tanggalAkhir).toISOString().split("T")[0]}`,
        20,
        45,
      );
    } else {
      pdf.text("Periode: Sampai Saat Ini", 20, 35);
    }

    // Add balance sheet equation explanation
    pdf.setFontSize(10);
    pdf.text("Persamaan Neraca: ASET = KEWAJIBAN + EKUITAS", 20, 50);
    pdf.text(
      "Neraca harus selalu seimbang karena setiap transaksi memengaruhi kedua sisi persamaan secara seimbang.",
      20,
      58,
    );

    let yPosition = 75;

    // Assets
    pdf.setFontSize(14);
    pdf.text("ASET", 20, yPosition);
    yPosition += 10;

    const assetData = balanceSheetData.assets.entries.map((entry) => [
      entry.akun.kode,
      entry.akun.nama,
      formatCurrency(entry.saldo),
    ]);

    autoTable(pdf, {
      head: [["Kode", "Nama Akun", "Saldo"]],
      body: assetData,
      startY: yPosition,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    let finalY = (pdf as any).lastAutoTable.finalY + 10;
    pdf.text(
      `Total Aset: ${formatCurrency(balanceSheetData.totalAssets)}`,
      20,
      finalY,
    );

    // Liabilities
    finalY += 20;
    pdf.text("KEWAJIBAN", 20, finalY);
    finalY += 10;

    const liabilityData = balanceSheetData.liabilities.entries.map((entry) => [
      entry.akun.kode,
      entry.akun.nama,
      formatCurrency(entry.saldo),
    ]);

    autoTable(pdf, {
      head: [["Kode", "Nama Akun", "Saldo"]],
      body: liabilityData,
      startY: finalY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [231, 76, 60] },
    });

    finalY = (pdf as any).lastAutoTable.finalY + 10;
    pdf.text(
      `Total Kewajiban: ${formatCurrency(balanceSheetData.liabilities.total)}`,
      20,
      finalY,
    );

    // Equity
    finalY += 20;
    pdf.text("EKUITAS", 20, finalY);
    finalY += 10;

    const equityData = balanceSheetData.equity.entries.map((entry) => [
      entry.akun.kode,
      entry.akun.nama,
      formatCurrency(entry.saldo),
    ]);

    autoTable(pdf, {
      head: [["Kode", "Nama Akun", "Saldo"]],
      body: equityData,
      startY: finalY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [46, 204, 113] },
    });

    finalY = (pdf as any).lastAutoTable.finalY + 10;
    pdf.text(
      `Total Ekuitas: ${formatCurrency(balanceSheetData.equity.total)}`,
      20,
      finalY,
    );
    pdf.text(
      `Laba Bersih: ${formatCurrency(balanceSheetData.netIncome || 0)}`,
      20,
      finalY + 10,
    );
    pdf.text(
      `Total Kewajiban + Ekuitas + Laba: ${formatCurrency(balanceSheetData.totalLiabilitiesEquity)}`,
      20,
      finalY + 20,
    );

    pdf.save(
      `neraca-${selectedPeriodeId === "ALL" ? "current" : selectedPeriodeId}.pdf`,
    );
    toast.success("Neraca berhasil diekspor");
  };

  const exportIncomeStatementPDF = () => {
    if (!incomeStatementData) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;

    // Header
    pdf.setFontSize(16);
    pdf.text("LAPORAN LABA RUGI", pageWidth / 2, 20, { align: "center" });

    pdf.setFontSize(12);
    if (incomeStatementData.periode) {
      pdf.text(`Periode: ${incomeStatementData.periode.nama}`, 20, 35);
      pdf.text(
        `Tanggal: ${new Date(incomeStatementData.periode.tanggalMulai).toISOString().split("T")[0]} - ${new Date(incomeStatementData.periode.tanggalAkhir).toISOString().split("T")[0]}`,
        20,
        45,
      );
    } else {
      pdf.text("Periode: Semua Periode", 20, 35);
    }

    let yPosition = 60;

    // Revenue
    pdf.setFontSize(14);
    pdf.text("PENDAPATAN", 20, yPosition);
    yPosition += 10;

    const revenueData = incomeStatementData.revenue.entries.map((entry) => [
      entry.akun.kode,
      entry.akun.nama,
      formatCurrency(entry.saldo),
    ]);

    autoTable(pdf, {
      head: [["Kode", "Nama Akun", "Jumlah"]],
      body: revenueData,
      startY: yPosition,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [46, 204, 113] },
    });

    let finalY = (pdf as any).lastAutoTable.finalY + 10;
    pdf.text(
      `Total Pendapatan: ${formatCurrency(incomeStatementData.revenue.total)}`,
      20,
      finalY,
    );

    // Expenses
    finalY += 20;
    pdf.text("BEBAN", 20, finalY);
    finalY += 10;

    const expenseData = incomeStatementData.expenses.entries.map((entry) => [
      entry.akun.kode,
      entry.akun.nama,
      formatCurrency(entry.saldo),
    ]);

    autoTable(pdf, {
      head: [["Kode", "Nama Akun", "Jumlah"]],
      body: expenseData,
      startY: finalY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [231, 76, 60] },
    });

    finalY = (pdf as any).lastAutoTable.finalY + 10;
    pdf.text(
      `Total Beban: ${formatCurrency(incomeStatementData.expenses.total)}`,
      20,
      finalY,
    );
    pdf.text(
      `Laba/Rugi Bersih: ${formatCurrency(incomeStatementData.netIncome)}`,
      20,
      finalY + 10,
    );

    pdf.save(
      `laporan-laba-rugi-${selectedPeriodeId === "ALL" ? "all" : selectedPeriodeId}.pdf`,
    );
    toast.success("Laporan Laba Rugi berhasil diekspor");
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Laporan Keuangan
          </CardTitle>
          <CardDescription>
            Neraca dan Laporan Laba Rugi untuk periode akuntansi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Period Selector */}
          <div className="mb-6">
            <Label htmlFor="periode" className="mb-2">
              Pilih Periode
            </Label>
            <Select
              value={selectedPeriodeId}
              onValueChange={setSelectedPeriodeId}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Pilih periode..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Periode</SelectItem>
                {periods.map((periode: PeriodeAkuntansi) => (
                  <SelectItem key={periode.id} value={periode.id}>
                    {periode.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <StyledTabs defaultValue="balance-sheet" className="w-full">
            <StyledTabsList className="grid w-full grid-cols-2">
              <StyledTabsTrigger value="balance-sheet">
                Neraca
              </StyledTabsTrigger>
              <StyledTabsTrigger value="income-statement">
                Laporan Laba Rugi
              </StyledTabsTrigger>
            </StyledTabsList>

            {/* Balance Sheet Tab */}
            <TabsContent value="balance-sheet" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Neraca</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      try {
                        const result =
                          await AccountingService.calculateInitialCapital();
                        toast.success(
                          `Modal awal berhasil dihitung: Rp ${result.totalInventoryValue.toLocaleString("id-ID")}`,
                        );
                        refetchBS(); // Refresh balance sheet data
                      } catch (error) {
                        toast.error("Gagal menghitung modal awal");
                        console.error(error);
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Hitung Modal Awal
                  </Button>
                  {balanceSheetData && (
                    <Button
                      onClick={exportBalanceSheetPDF}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  )}
                </div>
              </div>

              {/* Balance Status */}
              {balanceSheetData && (
                <div className="mb-4">
                  <Card
                    className={
                      balanceSheetData.isBalanced
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        {balanceSheetData.isBalanced ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">
                            {balanceSheetData.isBalanced
                              ? "Neraca Seimbang"
                              : "Neraca Tidak Seimbang"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {balanceSheetData.isBalanced
                              ? "Total Aset = Total Kewajiban + Ekuitas"
                              : "Ada ketidakseimbangan dalam laporan keuangan"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Loading/Error States */}
              {bsLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Memuat neraca...</p>
                </div>
              )}

              {bsError && (
                <div className="text-center py-8">
                  <p className="text-red-600">{bsError}</p>
                  <Button onClick={refetchBS} className="mt-2">
                    Coba Lagi
                  </Button>
                </div>
              )}

              {/* Balance Sheet Content */}
              {balanceSheetData && !bsLoading && (
                <div className="space-y-6">
                  {/* Balance Sheet Explanation */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-blue-800 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Persamaan Neraca
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-sm text-blue-700">
                          <strong>Persamaan Dasar Akuntansi:</strong>
                        </p>
                        <div className="bg-white p-3 rounded border border-blue-200">
                          <p className="text-lg font-mono text-center text-blue-800">
                            <span className="text-green-600 font-bold">
                              ASET
                            </span>{" "}
                            ={" "}
                            <span className="text-red-600 font-bold">
                              KEWAJIBAN
                            </span>{" "}
                            +{" "}
                            <span className="text-blue-600 font-bold">
                              EKUITAS
                            </span>
                          </p>
                        </div>
                        <div className="text-sm text-blue-700 space-y-1">
                          <p>
                            <strong>Mengapa neraca harus seimbang?</strong>{" "}
                            Karena setiap transaksi bisnis memengaruhi kedua
                            sisi persamaan secara seimbang (double-entry
                            bookkeeping).
                          </p>
                          <p>
                            <strong>Aset:</strong> Sumber daya yang dimiliki
                            perusahaan (kas, inventaris, piutang, dll.)
                          </p>
                          <p>
                            <strong>Kewajiban:</strong> Utang perusahaan kepada
                            pihak luar (hutang dagang, pinjaman, dll.)
                          </p>
                          <p>
                            <strong>Ekuitas:</strong> Kepemilikan pemilik dalam
                            perusahaan (modal awal, laba ditahan, dll.)
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Assets */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-green-700">ASET</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Kode</TableHead>
                              <TableHead>Nama Akun</TableHead>
                              <TableHead className="text-right">
                                Saldo
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {balanceSheetData.assets.entries.map((entry) => (
                              <TableRow key={entry.akun.id}>
                                <TableCell className="font-mono">
                                  {entry.akun.kode}
                                </TableCell>
                                <TableCell>{entry.akun.nama}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(entry.saldo)}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="border-t-2 font-bold">
                              <TableCell colSpan={2} className="text-right">
                                TOTAL ASET
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(balanceSheetData.totalAssets)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    {/* Liabilities & Equity */}
                    <div className="space-y-4">
                      {/* Liabilities */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-red-700">
                            KEWAJIBAN
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Kode</TableHead>
                                <TableHead>Nama Akun</TableHead>
                                <TableHead className="text-right">
                                  Saldo
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {balanceSheetData.liabilities.entries.map(
                                (entry) => (
                                  <TableRow key={entry.akun.id}>
                                    <TableCell className="font-mono">
                                      {entry.akun.kode}
                                    </TableCell>
                                    <TableCell>{entry.akun.nama}</TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(entry.saldo)}
                                    </TableCell>
                                  </TableRow>
                                ),
                              )}
                              <TableRow className="border-t font-semibold">
                                <TableCell colSpan={2} className="text-right">
                                  Total Kewajiban
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(
                                    balanceSheetData.liabilities.total,
                                  )}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>

                      {/* Equity */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-blue-700">
                            EKUITAS
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Kode</TableHead>
                                <TableHead>Nama Akun</TableHead>
                                <TableHead className="text-right">
                                  Saldo
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {balanceSheetData.equity.entries.map((entry) => (
                                <TableRow key={entry.akun.id}>
                                  <TableCell className="font-mono">
                                    {entry.akun.kode}
                                  </TableCell>
                                  <TableCell>{entry.akun.nama}</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(entry.saldo)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="border-t font-semibold">
                                <TableCell colSpan={2} className="text-right">
                                  Total Ekuitas
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(
                                    balanceSheetData.equity.total,
                                  )}
                                </TableCell>
                              </TableRow>
                              <TableRow className="border-t">
                                <TableCell colSpan={2} className="text-right">
                                  Laba Bersih
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(
                                    balanceSheetData.netIncome || 0,
                                  )}
                                </TableCell>
                              </TableRow>
                              <TableRow className="border-t-2 font-bold">
                                <TableCell colSpan={2} className="text-right">
                                  TOTAL KEWAJIBAN + EKUITAS + LABA
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(
                                    balanceSheetData.totalLiabilitiesEquity,
                                  )}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="income-statement" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Laporan Laba Rugi</h3>
                {incomeStatementData && (
                  <Button
                    onClick={exportIncomeStatementPDF}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                )}
              </div>

              {/* Loading/Error States */}
              {isLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">
                    Memuat laporan laba rugi...
                  </p>
                </div>
              )}

              {isError && (
                <div className="text-center py-8">
                  <p className="text-red-600">{isError}</p>
                  <Button onClick={refetchIS} className="mt-2">
                    Coba Lagi
                  </Button>
                </div>
              )}

              {/* Income Statement Content */}
              {incomeStatementData && !isLoading && (
                <div className="max-w-2xl mx-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-center">
                        LAPORAN LABA RUGI
                      </CardTitle>
                      {incomeStatementData.periode && (
                        <CardDescription className="text-center">
                          Periode: {incomeStatementData.periode.nama}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kode</TableHead>
                            <TableHead>Nama Akun</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {/* Revenue */}
                          {incomeStatementData.revenue.entries.map((entry) => (
                            <TableRow key={entry.akun.id}>
                              <TableCell className="font-mono">
                                {entry.akun.kode}
                              </TableCell>
                              <TableCell>{entry.akun.nama}</TableCell>
                              <TableCell className="text-right font-medium text-green-600">
                                {formatCurrency(entry.saldo)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t font-semibold">
                            <TableCell colSpan={2} className="text-right">
                              TOTAL PENDAPATAN
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {formatCurrency(
                                incomeStatementData.revenue.total,
                              )}
                            </TableCell>
                          </TableRow>

                          {/* Expenses */}
                          {incomeStatementData.expenses.entries.map((entry) => (
                            <TableRow key={entry.akun.id}>
                              <TableCell className="font-mono">
                                {entry.akun.kode}
                              </TableCell>
                              <TableCell>{entry.akun.nama}</TableCell>
                              <TableCell className="text-right font-medium text-red-600">
                                ({formatCurrency(Math.abs(entry.saldo))})
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="border-t font-semibold">
                            <TableCell colSpan={2} className="text-right">
                              TOTAL BEBAN
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              (
                              {formatCurrency(
                                incomeStatementData.expenses.total,
                              )}
                              )
                            </TableCell>
                          </TableRow>

                          {/* Net Income */}
                          <TableRow className="border-t-2 font-bold">
                            <TableCell colSpan={2} className="text-right">
                              {incomeStatementData.netIncome >= 0
                                ? "LABA BERSIH"
                                : "RUGI BERSIH"}
                            </TableCell>
                            <TableCell
                              className={`text-right ${incomeStatementData.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {formatCurrency(
                                Math.abs(incomeStatementData.netIncome),
                              )}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </StyledTabs>
        </CardContent>
      </Card>
    </div>
  );
}
