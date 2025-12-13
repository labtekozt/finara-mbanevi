import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Package, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { StatsGrid } from "@/components/inventory";
import { TransaksiKasir, ItemTransaksiKasir } from "../types";
import { ReactNode } from "react";

interface HistoryPenjualanTabProps {
  // Data
  sortedTransaksiKasir: TransaksiKasir[];
  paginatedTransaksiKasir: Array<{ tr: TransaksiKasir; item: ItemTransaksiKasir }>;
  startDateKasir: string;
  endDateKasir: string;

  // Search & Filter state
  searchKasir: string;
  setSearchKasir: (value: string) => void;

  // Sort handlers
  handleSortKasir: (column: string) => void;
  getSortIconKasir: (column: string) => ReactNode;

  // Pagination
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  PaginationComponent: React.ComponentType<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }>;
}

export function HistoryPenjualanTab({
  sortedTransaksiKasir,
  paginatedTransaksiKasir,
  startDateKasir,
  endDateKasir,
  searchKasir,
  setSearchKasir,
  handleSortKasir,
  getSortIconKasir,
  currentPage,
  totalPages,
  setCurrentPage,
  PaginationComponent,
}: HistoryPenjualanTabProps) {
  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <Card className="bg-linear-to-b from-blue-50 to-white">
        <CardContent>
          <StatsGrid
            stats={[
              {
                title: "Total Jenis Barang",
                value: (() => {
                  const uniqueBarangIds = new Set<string>();
                  sortedTransaksiKasir.forEach((tr) => {
                    tr.itemTransaksi.forEach((item) => {
                      uniqueBarangIds.add(item.barangId);
                    });
                  });
                  return uniqueBarangIds.size;
                })(),
                description:
                  startDateKasir || endDateKasir
                    ? `${startDateKasir ? format(new Date(startDateKasir), "dd/MM/yyyy") : "..."} - ${endDateKasir ? format(new Date(endDateKasir), "dd/MM/yyyy") : "..."}`
                    : "Total keseluruhan",
                icon: Package,
              },
              {
                title: "Total Qty Keluar",
                value: sortedTransaksiKasir.reduce(
                  (sum, tr) =>
                    sum + tr.itemTransaksi.reduce((s, item) => s + item.qty, 0),
                  0,
                ),
                description: "Unit terjual",
                icon: TrendingDown,
              },
              {
                title: "Total Nilai Penjualan",
                value: `Rp ${sortedTransaksiKasir.reduce((sum, tr) => sum + tr.total, 0).toLocaleString("id-ID")}`,
                description: "Omset penjualan",
                icon: TrendingDown,
              },
              {
                title: "Rata-rata",
                value: `Rp ${sortedTransaksiKasir.length > 0 ? (sortedTransaksiKasir.reduce((sum, tr) => sum + tr.total, 0) / sortedTransaksiKasir.length).toLocaleString("id-ID") : "0"}`,
                description: "Per transaksi",
                icon: TrendingDown,
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* Table History Kasir - Per Item */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>History Barang Keluar (Kasir)</CardTitle>
          <CardDescription>
            Riwayat barang keluar dari transaksi kasir (per item)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 my-5">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nomor transaksi, nama barang, kasir, atau metode bayar..."
                  value={searchKasir}
                  onChange={(e) => setSearchKasir(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
            </div>
          </div>
          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSortKasir("nomorTransaksi")}
                  >
                    <div className="flex items-center">
                      No. Transaksi
                      {getSortIconKasir("nomorTransaksi")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSortKasir("tanggal")}
                  >
                    <div className="flex items-center">
                      Tanggal
                      {getSortIconKasir("tanggal")}
                    </div>
                  </TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Harga Satuan</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSortKasir("metodePembayaran")}
                  >
                    <div className="flex items-center">
                      Metode Bayar
                      {getSortIconKasir("metodePembayaran")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSortKasir("kasir")}
                  >
                    <div className="flex items-center">
                      Kasir
                      {getSortIconKasir("kasir")}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransaksiKasir.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      {startDateKasir || endDateKasir
                        ? "Tidak ada transaksi pada rentang tanggal tersebut"
                        : "Belum ada transaksi"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTransaksiKasir.map(({ tr, item }) => (
                    <TableRow key={`${tr.id}-${item.id}`}>
                      <TableCell className="font-medium">
                        {tr.nomorTransaksi}
                      </TableCell>
                      <TableCell>
                        {format(new Date(tr.tanggal), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>{item.namaBarang}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.qty} {item.barang.satuan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        Rp {item.hargaSatuan.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="font-semibold">
                        Rp {item.subtotal.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tr.metodePembayaran}</Badge>
                      </TableCell>
                      <TableCell>{tr.kasir.nama}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <PaginationComponent
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
