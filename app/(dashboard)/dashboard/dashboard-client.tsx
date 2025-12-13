"use client";

import { useEffect, useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Calendar,
  TrendingUpIcon,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface DashboardData {
  stats: {
    totalPenjualan: number;
    totalTransaksi: number;
    barangStokRendah: number;
    totalBarangMasuk: number;
    totalBarangKeluar: number;
  };
  recentTransactions: any[];
  lowStockItems: any[];
  topSellingItems: any[];
  dailyRevenueData: Array<{
    date: string;
    dateLabel: string;
    revenue: number;
  }>;
}

export function DashboardClient() {
  const [period, setPeriod] = useState("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [period]);

  async function fetchData() {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (period === "custom" && startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      } else if (period !== "custom") {
        params.append("period", period);
      }

      const response = await fetch(`/api/dashboard?${params}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleApplyCustomDate = () => {
    if (startDate && endDate) {
      fetchData();
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-lg">
          <Loader2 className="h-32 w-32 animate-spin" />
        </div>
      </div>
    );
  }

  const getPeriodLabel = () => {
    if (period === "custom" && startDate && endDate) {
      return `${format(new Date(startDate), "d MMM yyyy", { locale: idLocale })} - ${format(new Date(endDate), "d MMM yyyy", { locale: idLocale })}`;
    }
    switch (period) {
      case "today":
        return "Hari Ini";
      case "yesterday":
        return "Kemarin";
      case "week":
        return "Minggu Ini";
      case "month":
        return "Bulan Ini";
      case "year":
        return "Tahun Ini";
      default:
        return "Hari Ini";
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 bg-gray-100">
      {/* Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filter Periode
          </CardTitle>
          <CardDescription>
            Pilih periode waktu atau range tanggal untuk melihat statistik
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Quick Period Selection */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Pilih Periode Waktu
              </label>
              <Select
                value={period}
                onValueChange={(value) => {
                  setPeriod(value);
                  setStartDate("");
                  setEndDate("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="yesterday">Kemarin</SelectItem>
                  <SelectItem value="week">Minggu Ini</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                  <SelectItem value="year">Tahun Ini</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Separator */}
            <div className="hidden lg:flex items-center">
              <div className="h-12 w-px bg-border"></div>
            </div>

            {/* Custom Date Range */}
            <div className="flex-1 lg:flex-[1.5]">
              <label className="text-sm font-medium mb-2 block">
                Atau Pilih Range Tanggal Custom
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Dari Tanggal
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPeriod("custom");
                    }}
                    max={format(new Date(), "yyyy-MM-dd")}
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Sampai Tanggal
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPeriod("custom");
                    }}
                    min={startDate}
                    max={format(new Date(), "yyyy-MM-dd")}
                    className="w-full"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleApplyCustomDate}
                    disabled={!startDate || !endDate}
                    className="w-full sm:w-auto"
                  >
                    Terapkan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Penjualan & Barang Terjual */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">
              Penjualan & Transaksi
            </CardTitle>
            <span className="text-lg font-bold text-blue-600">Rp</span>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-2xl font-bold text-blue-900">
                Rp {data.stats.totalPenjualan.toLocaleString("id-ID")}
              </div>
              <p className="text-xs text-blue-700">Total Pendapatan</p>
            </div>
            <div className="border-t border-blue-200 pt-3">
              <div className="text-xl font-bold text-blue-900">
                {data.stats.totalTransaksi}
              </div>
              <p className="text-xs text-blue-700">Jumlah Barang Terjual</p>
            </div>
          </CardContent>
        </Card>

        {/* Barang Stok Rendah */}
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">
              Barang Stok Rendah
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {data.stats.barangStokRendah}
            </div>
            <p className="text-xs text-orange-700">Perlu restock</p>
          </CardContent>
        </Card>

        {/* Barang Masuk & Keluar */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">
              Pergerakan Barang
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <div className="text-xl font-bold text-green-600">
                  {data.stats.totalBarangMasuk}
                </div>
              </div>
              <p className="text-xs text-blue-700">Barang Masuk</p>
            </div>
            <div className="border-t border-blue-200 pt-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <div className="text-xl font-bold text-red-600">
                  {data.stats.totalBarangKeluar}
                </div>
              </div>
              <p className="text-xs text-blue-700">Barang Keluar</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-1">
        {/* Top Selling Items Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Barang Terlaris</CardTitle>
            <CardDescription>
              Top 5 barang dengan penjualan tertinggi - {getPeriodLabel()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.topSellingItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada data penjualan pada periode ini
              </p>
            ) : (
              <div className="space-y-4">
                {data.topSellingItems.map((item: any, index: number) => {
                  const maxJumlah = data.topSellingItems[0]?.jumlah || 1;
                  const percentage = (item.jumlah / maxJumlah) * 100;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="font-medium">{item.nama}</span>
                        </div>
                        <span className="font-bold">{item.jumlah} terjual</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-primary h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Revenue Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5" />
              Pendapatan Harian
            </CardTitle>
            <CardDescription>
              Grafik pendapatan per hari dalam 30 hari terakhir
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.dailyRevenueData && data.dailyRevenueData.length > 0 ? (
              <div style={{ height: "300px" }}>
                <Line
                  data={{
                    labels: data.dailyRevenueData.map((item) => item.dateLabel),
                    datasets: [
                      {
                        label: "Pendapatan",
                        data: data.dailyRevenueData.map((item) => item.revenue),
                        borderColor: "blue",
                        backgroundColor: "lightblue",
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        pointBackgroundColor: "blue",
                        pointBorderColor: "#fff",
                        pointBorderWidth: 2,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: "bottom" as const,
                      },
                      tooltip: {
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        titleColor: "#000",
                        bodyColor: "#000",
                        borderColor: "#ccc",
                        borderWidth: 1,
                        padding: 10,
                        displayColors: true,
                        callbacks: {
                          label: function (context) {
                            const value = context.parsed.y ?? 0;
                            return `Pendapatan: Rp ${value.toLocaleString("id-ID")}`;
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        ticks: {
                          font: {
                            size: 11,
                          },
                          maxRotation: 45,
                          minRotation: 45,
                        },
                        grid: {
                          display: true,
                          color: "rgba(0, 0, 0, 0.05)",
                        },
                      },
                      y: {
                        ticks: {
                          font: {
                            size: 11,
                          },
                          callback: function (value) {
                            return `Rp ${(Number(value) / 1000).toFixed(0)}k`;
                          },
                        },
                        grid: {
                          display: true,
                          color: "rgba(0, 0, 0, 0.05)",
                        },
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-sm text-muted-foreground">
                  Belum ada data pendapatan
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions & Low Stock */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transaksi Terakhir</CardTitle>
            <CardDescription>
              {data.recentTransactions.length} transaksi - {getPeriodLabel()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4">
              {data.recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada transaksi pada periode ini
                </p>
              ) : (
                data.recentTransactions.map((transaction: any) => (
                  <div
                    key={transaction.id}
                    className="border-b pb-3 last:border-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">
                          {transaction.nomorTransaksi}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.kasir.nama}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          Rp {transaction.total.toLocaleString("id-ID")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.tanggal).toLocaleTimeString(
                            "id-ID",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                    </div>
                    {transaction.itemTransaksi &&
                      transaction.itemTransaksi.length > 0 && (
                        <div className="text-xs text-muted-foreground pl-2 border-l-2 border-gray-200">
                          {transaction.itemTransaksi.map((item: any) => (
                            <div
                              key={item.id}
                              className="flex justify-between py-0.5"
                            >
                              <span>{item.namaBarang}</span>
                              <span>
                                {item.qty}x @ Rp{" "}
                                {item.hargaSatuan.toLocaleString("id-ID")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stok Rendah</CardTitle>
            <CardDescription>Barang yang perlu direstock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.lowStockItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Semua stok aman</p>
              ) : (
                data.lowStockItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.nama}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.lokasi.namaLokasi}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">
                        {item.stok} {item.satuan}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Min: {item.stokMinimum}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
