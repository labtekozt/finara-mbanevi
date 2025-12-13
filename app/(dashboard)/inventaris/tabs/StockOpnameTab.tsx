import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ClipboardCheck, AlertTriangle } from "lucide-react";
import { Barang, Lokasi } from "../types";
import { ReactNode } from "react";
import { StockOpnameDialog } from "@/components/inventory/dialogs/StockOpnameDialog";
import { toast } from "sonner";

interface StockOpnameTabProps {
  // Data
  originalBarang: Barang[];
  paginatedBarang: Barang[];
  loading: boolean;

  // Search & Filter state
  search: string;
  setSearch: (value: string) => void;

  // Sort handlers
  handleSort: (column: string) => void;
  getSortIcon: (column: string) => ReactNode;

  // Pagination
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  PaginationComponent: React.ComponentType<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }>;

  // Refresh callback
  onRefresh: () => void;
}

export function StockOpnameTab({
  paginatedBarang,
  loading,
  search,
  setSearch,
  handleSort,
  getSortIcon,
  currentPage,
  totalPages,
  setCurrentPage,
  PaginationComponent,
  onRefresh,
}: StockOpnameTabProps) {
  const [selectedItem, setSelectedItem] = useState<Barang | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpnameClick = (item: Barang) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleSubmitOpname = async (data: {
    barangId: string;
    stokSistem: number;
    stokFisik: number;
    lokasiId: string;
    keterangan: string;
  }) => {
    try {
      const response = await fetch("/api/stock-opname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal menyimpan stock opname");
      }

      toast.success("Stock opname berhasil disimpan");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
      throw error;
    }
  };

  return (
    <Card className="bg-linear-to-b from-orange-50 to-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Stock Opname</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("nama")}
                >
                  <div className="flex items-center">
                    Nama Barang
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
                    Stok Sistem
                    {getSortIcon("stok")}
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
                  <TableCell colSpan={6} className="text-center">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : paginatedBarang.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
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
                    <TableCell>{item.lokasi.namaLokasi}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpnameClick(item)}
                        className="gap-2"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        Opname
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

      <StockOpnameDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={selectedItem}
        onSubmit={handleSubmitOpname}
      />
    </Card>
  );
}
