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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Download,
  Calendar,
  Eye,
  BarChart3,
  Printer,
} from "lucide-react";
import { useJournals } from "@/hooks/accounting";
import {
  JurnalEntry,
  AccumulationPeriod,
  AccumulationData,
} from "@/types/accounting";
import { AccountingService } from "@/services/accounting";
import { toast } from "sonner";
import { JournalPDFExporter } from "@/lib/pdf-export";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface JournalRecapitulationProps {
  selectedPeriode?: string;
  className?: string;
}

const ACCUMULATION_PERIODS: { value: AccumulationPeriod; label: string }[] = [
  { value: "daily", label: "Harian" },
  { value: "monthly", label: "Bulanan" },
  { value: "yearly", label: "Tahunan" },
];

export function JournalRecapitulation({
  selectedPeriode,
  className,
}: JournalRecapitulationProps) {
  const [accumulationPeriod, setAccumulationPeriod] =
    useState<AccumulationPeriod>("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPeriodData, setSelectedPeriodData] =
    useState<AccumulationData | null>(null);
  const [detailedEntries, setDetailedEntries] = useState<JurnalEntry[]>([]);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(
    new Set(),
  );

  const {
    entries,
    loading,
    accumulationData,
    accumulationLoading,
    setAccumulationPeriod: setHookAccumulationPeriod,
  } = useJournals({
    periodeId: selectedPeriode,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    autoLoad: true,
  });

  const handlePeriodChange = (period: AccumulationPeriod) => {
    setAccumulationPeriod(period);
    setHookAccumulationPeriod(period);
  };

  const handleViewDetails = async (periodData: AccumulationData) => {
    setLoadingDetails(true);
    try {
      // Filter entries for the selected period
      const periodEntries = entries.filter((entry) => {
        const entryDate = new Date(entry.tanggal);
        const periodStr = periodData.period;

        switch (accumulationPeriod) {
          case "daily":
            return entryDate.toISOString().split("T")[0] === periodStr;
          case "monthly":
            const [year, month] = periodStr.split("-");
            return (
              entryDate.getFullYear() === parseInt(year) &&
              entryDate.getMonth() === parseInt(month) - 1
            );
          case "yearly":
            return entryDate.getFullYear() === parseInt(periodStr);
          default:
            return false;
        }
      });

      setSelectedPeriodData(periodData);
      setDetailedEntries(periodEntries);
      setIsDetailDialogOpen(true);
    } catch (error) {
      toast.error("Gagal memuat detail periode");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      if (accumulationPeriod === "yearly") {
        await exportDetailedYearlyReport();
      } else if (accumulationPeriod === "monthly") {
        await exportDetailedMonthlyReport();
      } else if (accumulationPeriod === "daily") {
        await exportDetailedDailyReport();
      } else {
        // For standard views, use the basic export
        await JournalPDFExporter.exportRecapitulationReport(
          accumulationData,
          accumulationPeriod,
          startDate || undefined,
          endDate || undefined,
          selectedPeriode,
        );
      }
      toast.success("PDF berhasil diekspor");
    } catch (error) {
      toast.error("Gagal export PDF");
    }
  };

  const exportDetailedMonthlyReport = async () => {
    const pdf = new jsPDF();

    // Title
    pdf.setFontSize(20);
    pdf.text("Rekapitulasi Jurnal Bulanan Detail", 105, 20, {
      align: "center",
    });

    // Period info
    pdf.setFontSize(12);
    pdf.text(`Periode: Bulanan`, 20, 35);

    if (startDate && endDate) {
      pdf.text(
        `Tanggal: ${new Date(startDate).toLocaleDateString("id-ID")} - ${new Date(endDate).toLocaleDateString("id-ID")}`,
        20,
        45,
      );
    }

    if (selectedPeriode) {
      pdf.text(`Periode Akuntansi: ${selectedPeriode}`, 20, 55);
    }

    let yPosition = 70;

    // Process each month
    for (const monthData of accumulationData) {
      // Month header
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `${formatPeriodLabel(monthData.period)} - Total: Rp ${monthData.totalDebit.toLocaleString("id-ID")}`,
        20,
        yPosition,
      );
      yPosition += 10;

      // Get daily entries for this month
      const monthEntries = getDailyEntriesForMonth(monthData.period);

      // Individual journal entries table
      const entriesTableData = monthEntries.map((entry) => {
        const totalDebit = entry.details.reduce(
          (sum, detail) => sum + detail.debit,
          0,
        );
        const totalKredit = entry.details.reduce(
          (sum, detail) => sum + detail.kredit,
          0,
        );
        const isBalanced = totalDebit === totalKredit;

        return [
          new Date(entry.tanggal).toLocaleDateString("id-ID"),
          entry.nomorJurnal,
          entry.deskripsi,
          `Rp ${totalDebit.toLocaleString("id-ID")}`,
          `Rp ${totalKredit.toLocaleString("id-ID")}`,
          entry.isPosted ? "Posted" : "Draft",
        ];
      });

      autoTable(pdf, {
        head: [
          [
            "Tanggal",
            "Nomor Jurnal",
            "Deskripsi",
            "Total Debit",
            "Total Kredit",
            "Status",
          ],
        ],
        body: entriesTableData,
        startY: yPosition,
        styles: {
          fontSize: 7,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: 0,
          fontStyle: "bold",
        },
        margin: { left: 30 },
        tableWidth: "auto",
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 30 },
          2: { cellWidth: 60 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 15 },
        },
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      // Add page break if needed
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
    }

    // Overall summary
    const totalSummary = accumulationData.reduce(
      (acc, period) => ({
        totalDebit: acc.totalDebit + period.totalDebit,
        totalKredit: acc.totalKredit + period.totalKredit,
        transactionCount: acc.transactionCount + period.transactionCount,
      }),
      { totalDebit: 0, totalKredit: 0, transactionCount: 0 },
    );

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(
      `Total Keseluruhan - Debit: Rp ${totalSummary.totalDebit.toLocaleString("id-ID")}, Kredit: Rp ${totalSummary.totalKredit.toLocaleString("id-ID")}, Transaksi: ${totalSummary.transactionCount}`,
      20,
      yPosition,
    );

    // Footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Halaman ${i} dari ${pageCount}`, 105, 285, { align: "center" });
      pdf.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, 20, 285);
    }

    // Save the PDF
    pdf.save(
      `rekapitulasi-bulanan-detail-${new Date().toISOString().split("T")[0]}.pdf`,
    );
  };

  const exportDetailedYearlyReport = async () => {
    const pdf = new jsPDF();

    // Title
    pdf.setFontSize(20);
    pdf.text("Rekapitulasi Jurnal Tahunan Detail", 105, 20, {
      align: "center",
    });

    // Period info
    pdf.setFontSize(12);
    pdf.text(`Tahun: ${accumulationData[0]?.period || "N/A"}`, 20, 35);

    if (startDate && endDate) {
      pdf.text(
        `Tanggal: ${new Date(startDate).toLocaleDateString("id-ID")} - ${new Date(endDate).toLocaleDateString("id-ID")}`,
        20,
        45,
      );
    }

    if (selectedPeriode) {
      pdf.text(`Periode Akuntansi: ${selectedPeriode}`, 20, 55);
    }

    let yPosition = 70;

    // Process each year
    for (const yearData of accumulationData) {
      // Year header
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `${formatPeriodLabel(yearData.period)} - Total: Rp ${yearData.totalDebit.toLocaleString("id-ID")}`,
        20,
        yPosition,
      );
      yPosition += 10;

      // Get monthly data for this year
      const monthlyData = getMonthlyAccumulationForYear(yearData.period);

      // Monthly breakdown table
      const monthlyTableData = monthlyData.map((month) => [
        formatPeriodLabel(month.period),
        `Rp ${month.totalDebit.toLocaleString("id-ID")}`,
        `Rp ${month.totalKredit.toLocaleString("id-ID")}`,
        month.transactionCount.toString(),
        month.isBalanced ? "✓" : "✗",
      ]);

      autoTable(pdf, {
        head: [
          [
            "Bulan",
            "Total Debit",
            "Total Kredit",
            "Jumlah Transaksi",
            "Status",
          ],
        ],
        body: monthlyTableData,
        startY: yPosition,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: 0,
          fontStyle: "bold",
        },
        margin: { left: 30 },
        tableWidth: "auto",
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      // Add page break if needed
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
    }

    // Overall summary
    const totalSummary = accumulationData.reduce(
      (acc, period) => ({
        totalDebit: acc.totalDebit + period.totalDebit,
        totalKredit: acc.totalKredit + period.totalKredit,
        transactionCount: acc.transactionCount + period.transactionCount,
      }),
      { totalDebit: 0, totalKredit: 0, transactionCount: 0 },
    );

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(
      `Total Keseluruhan - Debit: Rp ${totalSummary.totalDebit.toLocaleString("id-ID")}, Kredit: Rp ${totalSummary.totalKredit.toLocaleString("id-ID")}, Transaksi: ${totalSummary.transactionCount}`,
      20,
      yPosition,
    );

    // Footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Halaman ${i} dari ${pageCount}`, 105, 285, { align: "center" });
      pdf.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, 20, 285);
    }

    // Save the PDF
    pdf.save(
      `rekapitulasi-tahunan-detail-${accumulationData[0]?.period || "unknown"}.pdf`,
    );
  };

  const exportDetailedDailyReport = async () => {
    const pdf = new jsPDF();

    // Title
    pdf.setFontSize(20);
    pdf.text("Rekapitulasi Jurnal Harian Detail", 105, 20, { align: "center" });

    // Period info
    pdf.setFontSize(12);
    pdf.text(`Periode: Harian`, 20, 35);

    if (startDate && endDate) {
      pdf.text(
        `Tanggal: ${new Date(startDate).toLocaleDateString("id-ID")} - ${new Date(endDate).toLocaleDateString("id-ID")}`,
        20,
        45,
      );
    }

    if (selectedPeriode) {
      pdf.text(`Periode Akuntansi: ${selectedPeriode}`, 20, 55);
    }

    let yPosition = 70;

    // Process each day
    for (const dayData of accumulationData) {
      // Day header
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `${formatPeriodLabel(dayData.period)} - Total: Rp ${dayData.totalDebit.toLocaleString("id-ID")}`,
        20,
        yPosition,
      );
      yPosition += 10;

      // Get entries for this day
      const dayEntries = getEntriesForDay(dayData.period);

      // Individual journal entries table
      const entriesTableData = dayEntries.map((entry: JurnalEntry) => {
        const totalDebit = entry.details.reduce(
          (sum: number, detail) => sum + detail.debit,
          0,
        );
        const totalKredit = entry.details.reduce(
          (sum: number, detail) => sum + detail.kredit,
          0,
        );

        return [
          new Date(entry.tanggal).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          entry.nomorJurnal,
          entry.deskripsi,
          `Rp ${totalDebit.toLocaleString("id-ID")}`,
          `Rp ${totalKredit.toLocaleString("id-ID")}`,
          entry.isPosted ? "Posted" : "Draft",
        ];
      });

      autoTable(pdf, {
        head: [
          [
            "Waktu",
            "Nomor Jurnal",
            "Deskripsi",
            "Total Debit",
            "Total Kredit",
            "Status",
          ],
        ],
        body: entriesTableData,
        startY: yPosition,
        styles: {
          fontSize: 7,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: 0,
          fontStyle: "bold",
        },
        margin: { left: 30 },
        tableWidth: "auto",
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 30 },
          2: { cellWidth: 60 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 15 },
        },
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      // Add page break if needed
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
    }

    // Overall summary
    const totalSummary = accumulationData.reduce(
      (acc, period) => ({
        totalDebit: acc.totalDebit + period.totalDebit,
        totalKredit: acc.totalKredit + period.totalKredit,
        transactionCount: acc.transactionCount + period.transactionCount,
      }),
      { totalDebit: 0, totalKredit: 0, transactionCount: 0 },
    );

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text(
      `Total Keseluruhan - Debit: Rp ${totalSummary.totalDebit.toLocaleString("id-ID")}, Kredit: Rp ${totalSummary.totalKredit.toLocaleString("id-ID")}, Transaksi: ${totalSummary.transactionCount}`,
      20,
      yPosition,
    );

    // Footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Halaman ${i} dari ${pageCount}`, 105, 285, { align: "center" });
      pdf.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, 20, 285);
    }

    // Save the PDF
    pdf.save(
      `rekapitulasi-harian-detail-${new Date().toISOString().split("T")[0]}.pdf`,
    );
  };

  const handleExportPeriodDetailPDF = async () => {
    if (!selectedPeriodData) return;

    try {
      await JournalPDFExporter.exportDetailedPeriodReport(
        selectedPeriodData,
        detailedEntries,
        accumulationPeriod,
      );
      toast.success("Detail PDF berhasil diekspor");
    } catch (error) {
      toast.error("Gagal export detail PDF");
    }
  };

  const togglePeriodExpansion = (periodStr: string) => {
    const newExpanded = new Set(expandedPeriods);
    if (newExpanded.has(periodStr)) {
      newExpanded.delete(periodStr);
    } else {
      newExpanded.add(periodStr);
    }
    setExpandedPeriods(newExpanded);
  };

  const getMonthlyAccumulationForYear = (
    yearPeriod: string,
  ): AccumulationData[] => {
    const yearEntries = getEntriesForYear(yearPeriod);
    const monthlyData: { [key: string]: AccumulationData } = {};

    yearEntries.forEach((entry) => {
      const entryDate = new Date(entry.tanggal);
      const monthStr = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyData[monthStr]) {
        monthlyData[monthStr] = {
          period: monthStr,
          totalDebit: 0,
          totalKredit: 0,
          transactionCount: 0,
          isBalanced: true,
        };
      }

      const monthData = monthlyData[monthStr];
      monthData.totalDebit += entry.details.reduce(
        (sum, detail) => sum + detail.debit,
        0,
      );
      monthData.totalKredit += entry.details.reduce(
        (sum, detail) => sum + detail.kredit,
        0,
      );
      monthData.transactionCount += 1;
      monthData.isBalanced = monthData.totalDebit === monthData.totalKredit;
    });

    return Object.values(monthlyData).sort((a, b) =>
      a.period.localeCompare(b.period),
    );
  };

  const getEntriesForYear = (yearPeriod: string): JurnalEntry[] => {
    const year = parseInt(yearPeriod);
    return entries.filter((entry) => {
      const entryDate = new Date(entry.tanggal);
      return entryDate.getFullYear() === year;
    });
  };

  const getEntriesForDay = (dayPeriod: string): JurnalEntry[] => {
    return entries
      .filter((entry) => {
        const entryDate = new Date(entry.tanggal).toISOString().split("T")[0];
        return entryDate === dayPeriod;
      })
      .sort(
        (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime(),
      );
  };

  const getDailyEntriesForMonth = (monthPeriod: string): JurnalEntry[] => {
    const [year, month] = monthPeriod.split("-");
    const yearNum = parseInt(year);
    const monthNum = parseInt(month) - 1; // JavaScript months are 0-indexed

    return entries
      .filter((entry) => {
        const entryDate = new Date(entry.tanggal);
        return (
          entryDate.getFullYear() === yearNum &&
          entryDate.getMonth() === monthNum
        );
      })
      .sort(
        (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime(),
      );
  };

  const handlePrint = () => {
    window.print();
  };

  const formatPeriodLabel = (periodStr: string) => {
    switch (accumulationPeriod) {
      case "daily":
        return new Date(periodStr).toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      case "monthly":
        const [year, month] = periodStr.split("-");
        const monthNames = [
          "Januari",
          "Februari",
          "Maret",
          "April",
          "Mei",
          "Juni",
          "Juli",
          "Agustus",
          "September",
          "Oktober",
          "November",
          "Desember",
        ];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
      case "yearly":
        return `Tahun ${periodStr}`;
      default:
        return periodStr;
    }
  };

  const totalSummary = accumulationData.reduce(
    (acc, period) => ({
      totalDebit: acc.totalDebit + period.totalDebit,
      totalKredit: acc.totalKredit + period.totalKredit,
      transactionCount: acc.transactionCount + period.transactionCount,
    }),
    { totalDebit: 0, totalKredit: 0, transactionCount: 0 },
  );

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Rekapitulasi Jurnal
              </CardTitle>
              <CardDescription>
                Lihat akumulasi jurnal berdasarkan periode waktu
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Cetak
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <Label htmlFor="period-type" className="mb-2">
                Tipe Periode
              </Label>
              <Select
                value={accumulationPeriod}
                onValueChange={handlePeriodChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCUMULATION_PERIODS.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-32">
              <Label htmlFor="start-date">Tanggal Mulai</Label>
              <Input
                id="start-date"
                className="mt-2"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-32">
              <Label htmlFor="end-date">Tanggal Akhir</Label>
              <Input
                id="end-date"
                className="mt-2"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  Rp {totalSummary.totalDebit.toLocaleString("id-ID")}
                </div>
                <p className="text-xs text-muted-foreground">Total Debit</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  Rp {totalSummary.totalKredit.toLocaleString("id-ID")}
                </div>
                <p className="text-xs text-muted-foreground">Total Kredit</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {totalSummary.transactionCount}
                </div>
                <p className="text-xs text-muted-foreground">Total Transaksi</p>
              </CardContent>
            </Card>
          </div>

          {/* Accumulation Table */}
          <div className="space-y-4">
            <Label className="text-base font-medium">
              Rekapitulasi per Periode
            </Label>
            {accumulationLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">
                  Memuat data rekapitulasi...
                </div>
              </div>
            ) : accumulationData.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                <h3 className="text-lg font-medium">Tidak ada data</h3>
                <p className="text-sm text-muted-foreground">
                  Belum ada jurnal untuk periode yang dipilih
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periode</TableHead>
                      <TableHead className="text-right">Total Debit</TableHead>
                      <TableHead className="text-right">Total Kredit</TableHead>
                      <TableHead className="text-right">
                        Jumlah Transaksi
                      </TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accumulationData.map((period) => {
                      const isExpanded = expandedPeriods.has(period.period);

                      return (
                        <React.Fragment key={period.period}>
                          {/* Monthly Row */}
                          <TableRow className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {accumulationPeriod !== "daily" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0"
                                    onClick={() =>
                                      togglePeriodExpansion(period.period)
                                    }
                                  >
                                    {isExpanded ? "▼" : "▶"}
                                  </Button>
                                )}
                                {formatPeriodLabel(period.period)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              Rp {period.totalDebit.toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="text-right">
                              Rp {period.totalKredit.toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="text-right">
                              {period.transactionCount}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  period.isBalanced ? "default" : "destructive"
                                }
                              >
                                {period.isBalanced
                                  ? "Seimbang"
                                  : "Tidak Seimbang"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(period)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Detail Rows based on period type */}
                          {isExpanded &&
                            (() => {
                              if (accumulationPeriod === "yearly") {
                                // Show monthly breakdown for yearly view
                                const monthlyData =
                                  getMonthlyAccumulationForYear(period.period);
                                return monthlyData.map((monthData) => (
                                  <TableRow
                                    key={monthData.period}
                                    className="bg-muted/20"
                                  >
                                    <TableCell className="pl-8 font-normal text-sm">
                                      {formatPeriodLabel(monthData.period)}
                                    </TableCell>
                                    <TableCell className="text-right text-sm">
                                      Rp{" "}
                                      {monthData.totalDebit.toLocaleString(
                                        "id-ID",
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right text-sm">
                                      Rp{" "}
                                      {monthData.totalKredit.toLocaleString(
                                        "id-ID",
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right text-sm">
                                      {monthData.transactionCount}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge
                                        variant={
                                          monthData.isBalanced
                                            ? "default"
                                            : "destructive"
                                        }
                                        className="text-xs"
                                      >
                                        {monthData.isBalanced ? "✓" : "✗"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleViewDetails(monthData)
                                        }
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ));
                              } else if (accumulationPeriod === "monthly") {
                                // Show daily journal entries for monthly view
                                const monthEntries = getDailyEntriesForMonth(
                                  period.period,
                                );
                                return monthEntries.map(
                                  (entry: JurnalEntry) => {
                                    const totalDebit = entry.details.reduce(
                                      (sum: number, detail) =>
                                        sum + detail.debit,
                                      0,
                                    );
                                    const totalKredit = entry.details.reduce(
                                      (sum: number, detail) =>
                                        sum + detail.kredit,
                                      0,
                                    );
                                    const isBalanced =
                                      totalDebit === totalKredit;

                                    return (
                                      <TableRow
                                        key={entry.id}
                                        className="bg-muted/20"
                                      >
                                        <TableCell className="pl-8 font-normal text-sm">
                                          <div className="flex flex-col">
                                            <span>
                                              {new Date(
                                                entry.tanggal,
                                              ).toLocaleDateString("id-ID")}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                              {entry.nomorJurnal}
                                            </span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                          Rp{" "}
                                          {totalDebit.toLocaleString("id-ID")}
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                          Rp{" "}
                                          {totalKredit.toLocaleString("id-ID")}
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                          1
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <div className="flex flex-col items-center gap-1">
                                            <Badge
                                              variant={
                                                entry.isPosted
                                                  ? "default"
                                                  : "secondary"
                                              }
                                              className="text-xs"
                                            >
                                              {entry.isPosted
                                                ? "Posted"
                                                : "Draft"}
                                            </Badge>
                                            <Badge
                                              variant={
                                                isBalanced
                                                  ? "default"
                                                  : "destructive"
                                              }
                                              className="text-xs"
                                            >
                                              {isBalanced ? "✓" : "✗"}
                                            </Badge>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              handleViewDetails({
                                                period:
                                                  typeof entry.tanggal ===
                                                  "string"
                                                    ? entry.tanggal
                                                    : entry.tanggal.toISOString(),
                                                totalDebit,
                                                totalKredit,
                                                transactionCount: 1,
                                                isBalanced,
                                              })
                                            }
                                          >
                                            <Eye className="h-3 w-3" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  },
                                );
                              } else if (accumulationPeriod === "daily") {
                                // Show individual journal entries for daily view
                                const dayEntries = getEntriesForDay(
                                  period.period,
                                );
                                return dayEntries.map((entry) => {
                                  const totalDebit = entry.details.reduce(
                                    (sum, detail) => sum + detail.debit,
                                    0,
                                  );
                                  const totalKredit = entry.details.reduce(
                                    (sum, detail) => sum + detail.kredit,
                                    0,
                                  );
                                  const isBalanced = totalDebit === totalKredit;

                                  return (
                                    <TableRow
                                      key={entry.id}
                                      className="bg-muted/20"
                                    >
                                      <TableCell className="pl-8 font-normal text-sm">
                                        <div className="flex flex-col">
                                          <span>
                                            {new Date(
                                              entry.tanggal,
                                            ).toLocaleTimeString("id-ID", {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            {entry.nomorJurnal}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right text-sm">
                                        Rp {totalDebit.toLocaleString("id-ID")}
                                      </TableCell>
                                      <TableCell className="text-right text-sm">
                                        Rp {totalKredit.toLocaleString("id-ID")}
                                      </TableCell>
                                      <TableCell className="text-right text-sm">
                                        1
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                          <Badge
                                            variant={
                                              entry.isPosted
                                                ? "default"
                                                : "secondary"
                                            }
                                            className="text-xs"
                                          >
                                            {entry.isPosted
                                              ? "Posted"
                                              : "Draft"}
                                          </Badge>
                                          <Badge
                                            variant={
                                              isBalanced
                                                ? "default"
                                                : "destructive"
                                            }
                                            className="text-xs"
                                          >
                                            {isBalanced ? "✓" : "✗"}
                                          </Badge>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleViewDetails({
                                              period:
                                                typeof entry.tanggal ===
                                                "string"
                                                  ? entry.tanggal
                                                  : entry.tanggal.toISOString(),
                                              totalDebit,
                                              totalKredit,
                                              transactionCount: 1,
                                              isBalanced,
                                            })
                                          }
                                        >
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                });
                              }
                              return null;
                            })()}
                        </React.Fragment>
                      );
                    })}

                    {/* Summary Row */}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell>Total Keseluruhan</TableCell>
                      <TableCell className="text-right">
                        Rp {totalSummary.totalDebit.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right">
                        Rp {totalSummary.totalKredit.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right">
                        {totalSummary.transactionCount}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            totalSummary.totalDebit === totalSummary.totalKredit
                              ? "default"
                              : "destructive"
                          }
                        >
                          {totalSummary.totalDebit === totalSummary.totalKredit
                            ? "Seimbang"
                            : "Tidak Seimbang"}
                        </Badge>
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Period Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detail Jurnal -{" "}
              {selectedPeriodData
                ? formatPeriodLabel(selectedPeriodData.period)
                : ""}
            </DialogTitle>
            <DialogDescription>
              Daftar lengkap transaksi jurnal untuk periode ini
            </DialogDescription>
          </DialogHeader>

          {selectedPeriodData && (
            <div className="space-y-4">
              {/* Period Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Total Debit
                  </Label>
                  <p className="text-lg font-semibold">
                    Rp {selectedPeriodData.totalDebit.toLocaleString("id-ID")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Total Kredit
                  </Label>
                  <p className="text-lg font-semibold">
                    Rp {selectedPeriodData.totalKredit.toLocaleString("id-ID")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Jumlah Transaksi
                  </Label>
                  <p className="text-lg font-semibold">
                    {selectedPeriodData.transactionCount}
                  </p>
                </div>
              </div>

              {/* Detailed Transactions */}
              <div className="space-y-4">
                <Label className="text-base font-medium">
                  Detail Transaksi
                </Label>
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">
                      Memuat detail transaksi...
                    </div>
                  </div>
                ) : detailedEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      Tidak ada transaksi untuk periode ini
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Nomor Jurnal</TableHead>
                          <TableHead>Deskripsi</TableHead>
                          <TableHead>Akun</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Kredit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailedEntries.map((entry) =>
                          entry.details.map((detail, index) => (
                            <TableRow key={`${entry.id}-${index}`}>
                              {index === 0 && (
                                <>
                                  <TableCell
                                    rowSpan={entry.details.length}
                                    className="font-medium"
                                  >
                                    {new Date(entry.tanggal).toLocaleDateString(
                                      "id-ID",
                                    )}
                                  </TableCell>
                                  <TableCell
                                    rowSpan={entry.details.length}
                                    className="font-medium"
                                  >
                                    {entry.nomorJurnal}
                                  </TableCell>
                                  <TableCell rowSpan={entry.details.length}>
                                    {entry.deskripsi}
                                  </TableCell>
                                </>
                              )}
                              <TableCell>
                                {detail.akun.kode} - {detail.akun.nama}
                              </TableCell>
                              <TableCell className="text-right">
                                {detail.debit > 0
                                  ? `Rp ${detail.debit.toLocaleString("id-ID")}`
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                {detail.kredit > 0
                                  ? `Rp ${detail.kredit.toLocaleString("id-ID")}`
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          )),
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleExportPeriodDetailPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDetailDialogOpen(false)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
