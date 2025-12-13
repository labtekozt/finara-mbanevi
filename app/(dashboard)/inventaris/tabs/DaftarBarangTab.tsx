import { Button } from "@/components/ui/button";
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
import { Plus, Search, Edit, Package, AlertTriangle } from "lucide-react";
import { StatsGrid } from "@/components/inventory";
import { Barang, Lokasi } from "../types";
import { ReactNode } from "react";

interface DaftarBarangTabProps {
  // Data
  originalBarang: Barang[];
  paginatedBarang: Barang[];
  lokasi: Lokasi[];
  kategoriList: string[];
  loading: boolean;

  // Search & Filter state
  search: string;
  setSearch: (value: string) => void;
  kategoriFilter: string;
  setKategoriFilter: (value: string) => void;
  lokasiFilter: string;
  setLokasiFilter: (value: string) => void;
  stokRendahFilter: boolean;
  setStokRendahFilter: (value: boolean) => void;

  // Sort handlers
  handleSort: (column: string) => void;
  getSortIcon: (column: string) => ReactNode;

  // Actions
  openTambahDialog: () => void;
  openEditDialog: (item: Barang) => void;

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

export function DaftarBarangTab({
  originalBarang,
  paginatedBarang,
  lokasi,
  kategoriList,
  loading,
  search,
  setSearch,
  kategoriFilter,
  setKategoriFilter,
  lokasiFilter,
  setLokasiFilter,
  stokRendahFilter,
  setStokRendahFilter,
  handleSort,
  getSortIcon,
  openTambahDialog,
  openEditDialog,
  currentPage,
  totalPages,
  setCurrentPage,
  PaginationComponent,
}: DaftarBarangTabProps) {
  return (
    <Card className="bg-linear-to-b from-blue-50 to-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Daftar Barang</CardTitle>
        <CardDescription>
          <div className="flex justify-between items-center">
            <Button onClick={openTambahDialog} className="my-3">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Barang
            </Button>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Statistics */}
        <StatsGrid
          stats={[
            {
              title: "Total Barang",
              value: originalBarang.length,
              description: "Item dalam inventaris",
              icon: Package,
            },
            {
              title: "Total Nilai",
              value: `Rp ${originalBarang.reduce((sum, item) => sum + Number(item.stok) * Number(item.hargaBeli), 0).toLocaleString("id-ID")}`,
              description: "Berdasarkan harga beli",
              icon: Package,
            },
            {
              title: "Stok Rendah",
              value: originalBarang.filter(
                (item) => item.stok <= item.stokMinimum,
              ).length,
              description: "Perlu restock",
              icon: AlertTriangle,
              action: (
                <Button
                  variant={stokRendahFilter ? "default" : "outline"}
                  onClick={() => setStokRendahFilter(!stokRendahFilter)}
                  className="w-full"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {stokRendahFilter
                    ? "Stok Rendah Aktif"
                    : "Tampilkan Stok Rendah"}
                </Button>
              ),
            },
          ]}
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-4 my-5">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
          </div>
          <Select value={kategoriFilter} onValueChange={setKategoriFilter}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Kategori</SelectItem>
              {kategoriList.map((kat) => (
                <SelectItem key={kat} value={kat}>
                  {kat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={lokasiFilter} onValueChange={setLokasiFilter}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="Semua Lokasi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Lokasi</SelectItem>
              {lokasi.map((lok) => (
                <SelectItem key={lok.id} value={lok.id}>
                  {lok.namaLokasi}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("nama")}
                >
                  <div className="flex items-center">
                    Nama
                    {getSortIcon("nama")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("sku")}
                >
                  <div className="flex items-center">
                    SKU
                    {getSortIcon("sku")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("kategori")}
                >
                  <div className="flex items-center">
                    Kategori
                    {getSortIcon("kategori")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("stok")}
                >
                  <div className="flex items-center">
                    Stok
                    {getSortIcon("stok")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("hargaBeli")}
                >
                  <div className="flex items-center">
                    Harga Beli
                    {getSortIcon("hargaBeli")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("hargaJual")}
                >
                  <div className="flex items-center">
                    Harga Jual
                    {getSortIcon("hargaJual")}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("lokasi")}
                >
                  <div className="flex items-center">
                    Lokasi
                    {getSortIcon("lokasi")}
                  </div>
                </TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : paginatedBarang.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Tidak ada data
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBarang.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {item.stok <= item.stokMinimum && (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                        {item.nama}
                      </div>
                    </TableCell>
                    <TableCell>{item.sku || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.kategori}</Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          item.stok <= item.stokMinimum
                            ? "text-red-600 font-semibold"
                            : ""
                        }
                      >
                        {item.stok} {item.satuan}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div
                        className="truncate"
                        title={`Rp ${item.hargaBeli.toLocaleString("id-ID")}`}
                      >
                        Rp {item.hargaBeli.toLocaleString("id-ID")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div
                        className="truncate"
                        title={`Rp ${item.hargaJual.toLocaleString("id-ID")}`}
                      >
                        Rp {item.hargaJual.toLocaleString("id-ID")}
                      </div>
                    </TableCell>
                    <TableCell>{item.lokasi.namaLokasi}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
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
  );
}
