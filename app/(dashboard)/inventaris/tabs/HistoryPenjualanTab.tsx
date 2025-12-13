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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Package, TrendingDown, Eye } from "lucide-react";
import { format } from "date-fns";
import { StatsGrid } from "@/components/inventory";
import { TransaksiKasir, ItemTransaksiKasir } from "../types";
import { ReactNode, useState } from "react";

interface HistoryPenjualanTabProps {
  // Data
  sortedTransaksiKasir: TransaksiKasir[];
  paginatedTransaksiKasir: Array<{
    tr: TransaksiKasir;
    item: ItemTransaksiKasir;
  }>;
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
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransaksiKasir | null>(null);

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
                    sum +
                    tr.itemTransaksi.reduce(
                      (s, item) => s + Number(item.qty),
                      0,
                    ),
                  0,
                ),
                description: "Unit terjual",
                icon: TrendingDown,
              },
              {
                title: "Total Nilai Penjualan",
                value: `Rp ${sortedTransaksiKasir.reduce((sum, tr) => sum + Number(tr.total), 0).toLocaleString("id-ID")}`,
                description: "Omset penjualan",
                icon: TrendingDown,
              },
              {
                title: "Rata-rata",
                value: `Rp ${sortedTransaksiKasir.length > 0 ? (sortedTransaksiKasir.reduce((sum, tr) => sum + Number(tr.total), 0) / sortedTransaksiKasir.length).toLocaleString("id-ID") : "0"}`,
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
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransaksiKasir.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
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
                        <div
                          className="truncate"
                          title={`Rp ${item.hargaSatuan.toLocaleString("id-ID")}`}
                        >
                          Rp {item.hargaSatuan.toLocaleString("id-ID")}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        <div
                          className="truncate"
                          title={`Rp ${item.subtotal.toLocaleString("id-ID")}`}
                        >
                          Rp {item.subtotal.toLocaleString("id-ID")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tr.metodePembayaran}</Badge>
                      </TableCell>
                      <TableCell>{tr.kasir.nama}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedTransaction(tr)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
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

      <Dialog
        open={!!selectedTransaction}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
            <DialogDescription>
              {selectedTransaction?.nomorTransaksi}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Tanggal
                  </p>
                  <p>
                    {format(
                      new Date(selectedTransaction.tanggal),
                      "dd MMMM yyyy HH:mm",
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Kasir
                  </p>
                  <p>{selectedTransaction.kasir.nama}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pelanggan
                  </p>
                  <p>{selectedTransaction.namaPelanggan || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Status Pengambilan
                  </p>
                  <Badge
                    variant={
                      selectedTransaction.belumDiambil
                        ? "destructive"
                        : "default"
                    }
                  >
                    {selectedTransaction.belumDiambil
                      ? "Belum Diambil"
                      : "Sudah Diambil"}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-medium">Item Transaksi</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Barang</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Harga</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTransaction.itemTransaksi.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.namaBarang}</TableCell>
                          <TableCell className="text-right">
                            {item.qty} {item.barang.satuan}
                          </TableCell>
                          <TableCell className="text-right">
                            Rp {item.hargaSatuan.toLocaleString("id-ID")}
                          </TableCell>
                          <TableCell className="text-right">
                            Rp {item.subtotal.toLocaleString("id-ID")}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} className="text-right font-bold">
                          Total
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          Rp {selectedTransaction.total.toLocaleString("id-ID")}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedTransaction.catatan && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Catatan
                  </p>
                  <p className="text-sm">{selectedTransaction.catatan}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
