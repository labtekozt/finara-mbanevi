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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ReactNode } from "react";

interface Barang {
  id: string;
  nama: string;
  satuan: string;
}

interface Lokasi {
  id: string;
  namaLokasi: string;
}

interface TransaksiMasuk {
  id: string;
  nomorTransaksi: string;
  tanggal: string;
  qty: number;
  hargaBeli: number;
  totalNilai: number;
  sumber: string;
  keterangan?: string;
  barang: Barang;
  lokasi: Lokasi;
}

interface HistoryBarangMasukTabProps {
  transaksiMasuk: TransaksiMasuk[];
  paginatedTransaksiMasuk: TransaksiMasuk[];
  handleSort: (column: string) => void;
  getSortIcon: (column: string) => ReactNode;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  PaginationComponent: React.ComponentType<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }>;
}

export function HistoryBarangMasukTab({
  transaksiMasuk,
  paginatedTransaksiMasuk,
  handleSort,
  getSortIcon,
  currentPage,
  totalPages,
  setCurrentPage,
  PaginationComponent,
}: HistoryBarangMasukTabProps) {
  // Calculate totals
  const totalTransaksi = transaksiMasuk.length;
  const totalQty = transaksiMasuk.reduce((sum, t) => sum + t.qty, 0);
  const totalNilai = transaksiMasuk.reduce((sum, t) => sum + t.totalNilai, 0);

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalTransaksi.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground">
              Transaksi barang masuk
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Qty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalQty.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground">
              Unit barang masuk
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {totalNilai.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-muted-foreground">
              Nilai pembelian
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>History Barang Masuk</CardTitle>
          <CardDescription>
            Riwayat penambahan stok barang ke gudang
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("nomorTransaksi")}
                  >
                    <div className="flex items-center">
                      No. Transaksi
                      {getSortIcon("nomorTransaksi")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("tanggal")}
                  >
                    <div className="flex items-center">
                      Tanggal
                      {getSortIcon("tanggal")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("barang")}
                  >
                    <div className="flex items-center">
                      Barang
                      {getSortIcon("barang")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("qty")}
                  >
                    <div className="flex items-center">
                      Qty
                      {getSortIcon("qty")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("hargaBeli")}
                  >
                    <div className="flex items-center">
                      Harga Beli
                      {getSortIcon("hargaBeli")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("totalNilai")}
                  >
                    <div className="flex items-center">
                      Total Nilai
                      {getSortIcon("totalNilai")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("sumber")}
                  >
                    <div className="flex items-center">
                      Sumber
                      {getSortIcon("sumber")}
                    </div>
                  </TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransaksiMasuk.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      Belum ada transaksi barang masuk
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTransaksiMasuk.map((tr) => (
                    <TableRow key={tr.id}>
                      <TableCell className="font-medium">
                        {tr.nomorTransaksi}
                      </TableCell>
                      <TableCell>
                        {format(new Date(tr.tanggal), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>{tr.barang.nama}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50">
                          {tr.qty} {tr.barang.satuan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        Rp {tr.hargaBeli.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="font-semibold">
                        Rp {tr.totalNilai.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{tr.sumber}</Badge>
                      </TableCell>
                      <TableCell>{tr.lokasi.namaLokasi}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tr.keterangan || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <PaginationComponent
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
