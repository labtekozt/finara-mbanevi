"use client";

import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { TabsContent } from "@/components/ui/tabs";
import {
  StyledTabs,
  StyledTabsList,
  StyledTabsTrigger,
} from "@/components/ui/styled-tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Barang {
  id: string;
  nama: string;
  stok: number;
  satuan: string;
  hargaBeli: number;
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

interface TransaksiKeluar {
  id: string;
  nomorTransaksi: string;
  tanggal: string;
  qty: number;
  hargaBarang: number;
  totalNilai: number;
  tujuan: string;
  keterangan?: string;
  barang: Barang;
  lokasi: Lokasi;
}

export default function TransaksiPage() {
  const [barang, setBarang] = useState<Barang[]>([]);
  const [lokasi, setLokasi] = useState<Lokasi[]>([]);
  const [transaksiMasuk, setTransaksiMasuk] = useState<TransaksiMasuk[]>([]);
  const [transaksiKeluar, setTransaksiKeluar] = useState<TransaksiKeluar[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogType, setDialogType] = useState<"masuk" | "keluar" | null>(null);
  const [sortColumn, setSortColumn] = useState<string>("tanggal");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [dateFilter, setDateFilter] = useState("");

  const [formMasuk, setFormMasuk] = useState({
    barangId: "",
    qty: 0,
    hargaBeli: 0,
    sumber: "",
    lokasiId: "",
    keterangan: "",
  });

  const [formKeluar, setFormKeluar] = useState({
    barangId: "",
    qty: 0,
    tujuan: "",
    lokasiId: "",
    keterangan: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const sortedTransaksiKeluar = useMemo(() => {
    let filtered = [...transaksiKeluar];

    if (dateFilter) {
      const filterDate = new Date(dateFilter).toDateString();
      filtered = filtered.filter(
        (tr) => new Date(tr.tanggal).toDateString() === filterDate,
      );
    }

    return filtered.sort((a, b) => {
      let aValue: any = a[sortColumn as keyof TransaksiKeluar];
      let bValue: any = b[sortColumn as keyof TransaksiKeluar];

      if (sortColumn === "tanggal") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortColumn === "barang") {
        aValue = a.barang.nama.toLowerCase();
        bValue = b.barang.nama.toLowerCase();
      } else if (sortColumn === "lokasi") {
        aValue = a.lokasi.namaLokasi.toLowerCase();
        bValue = b.lokasi.namaLokasi.toLowerCase();
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [transaksiKeluar, sortColumn, sortDirection, dateFilter]);

  function handleSort(column: string) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  }

  function getSortIcon(column: string) {
    if (sortColumn !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  }

  async function fetchData() {
    try {
      setLoading(true);
      const [barangRes, lokasiRes, masukRes, keluarRes] = await Promise.all([
        fetch("/api/barang"),
        fetch("/api/lokasi"),
        fetch("/api/transaksi-masuk"),
        fetch("/api/transaksi-keluar"),
      ]);

      setBarang(await barangRes.json());
      setLokasi(await lokasiRes.json());
      setTransaksiMasuk(await masukRes.json());
      setTransaksiKeluar(await keluarRes.json());
    } catch (error) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitMasuk(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/transaksi-masuk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formMasuk),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal menyimpan transaksi");
      }

      toast.success("Transaksi barang masuk berhasil dicatat");
      setDialogType(null);
      resetFormMasuk();
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitKeluar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/transaksi-keluar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formKeluar),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal menyimpan transaksi");
      }

      toast.success("Transaksi barang keluar berhasil dicatat");
      setDialogType(null);
      resetFormKeluar();
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  function resetFormMasuk() {
    setFormMasuk({
      barangId: "",
      qty: 0,
      hargaBeli: 0,
      sumber: "",
      lokasiId: "",
      keterangan: "",
    });
  }

  function resetFormKeluar() {
    setFormKeluar({
      barangId: "",
      qty: 0,
      tujuan: "",
      lokasiId: "",
      keterangan: "",
    });
  }

  function handleBarangChange(barangId: string, type: "masuk" | "keluar") {
    const selectedBarang = barang.find((b) => b.id === barangId);
    if (!selectedBarang) return;

    if (type === "masuk") {
      setFormMasuk({
        ...formMasuk,
        barangId,
        hargaBeli: selectedBarang.hargaBeli,
      });
    } else {
      setFormKeluar({
        ...formKeluar,
        barangId,
      });
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Transaksi Barang"
        description="Kelola barang masuk dan keluar gudang"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button onClick={() => setDialogType("masuk")} className="flex-1">
            <TrendingUp className="mr-2 h-4 w-4" />
            Barang Masuk
          </Button>
          <Button
            onClick={() => setDialogType("keluar")}
            variant="outline"
            className="flex-1"
          >
            <TrendingDown className="mr-2 h-4 w-4" />
            Barang Keluar
          </Button>
        </div>

        {/* Transactions Tabs */}
        <StyledTabs defaultValue="masuk">
          <StyledTabsList className="grid w-full grid-cols-2">
            <StyledTabsTrigger value="masuk">
              <TrendingUp className="mr-2 h-4 w-4" />
              Barang Masuk ({transaksiMasuk.length})
            </StyledTabsTrigger>
            <StyledTabsTrigger value="keluar">
              <TrendingDown className="mr-2 h-4 w-4" />
              Barang Keluar ({transaksiKeluar.length})
            </StyledTabsTrigger>
          </StyledTabsList>

          {/* Barang Masuk Tab */}
          <TabsContent value="masuk">
            <Card>
              <CardHeader>
                <CardTitle>Histori Barang Masuk</CardTitle>
                <CardDescription>
                  Riwayat transaksi barang masuk gudang
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No. Transaksi</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Barang</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Harga Beli</TableHead>
                        <TableHead>Total Nilai</TableHead>
                        <TableHead>Sumber</TableHead>
                        <TableHead>Lokasi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transaksiMasuk.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center">
                            Belum ada transaksi
                          </TableCell>
                        </TableRow>
                      ) : (
                        transaksiMasuk.map((tr) => (
                          <TableRow key={tr.id}>
                            <TableCell className="font-medium">
                              {tr.nomorTransaksi}
                            </TableCell>
                            <TableCell>
                              {format(new Date(tr.tanggal), "dd/MM/yyyy HH:mm")}
                            </TableCell>
                            <TableCell>{tr.barang.nama}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {tr.qty} {tr.barang.satuan}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              Rp {tr.hargaBeli.toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="font-semibold">
                              Rp {tr.totalNilai.toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell>{tr.sumber}</TableCell>
                            <TableCell>{tr.lokasi.namaLokasi}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Barang Keluar Tab */}
          <TabsContent value="keluar">
            {/* Filters and Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Filter & Analisis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date-filter">Filter Tanggal</Label>
                      <Input
                        id="date-filter"
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setDateFilter("")}
                      disabled={!dateFilter}
                    >
                      Reset Filter
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Transaksi
                    </CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {sortedTransaksiKeluar.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Barang keluar
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Qty
                    </CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {sortedTransaksiKeluar.reduce(
                        (sum, tr) => sum + tr.qty,
                        0,
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Unit keluar</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Nilai
                    </CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      Rp{" "}
                      {sortedTransaksiKeluar
                        .reduce((sum, tr) => sum + tr.totalNilai, 0)
                        .toLocaleString("id-ID")}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Nilai barang keluar
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Rata-rata
                    </CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      Rp{" "}
                      {sortedTransaksiKeluar.length > 0
                        ? (
                            sortedTransaksiKeluar.reduce(
                              (sum, tr) => sum + tr.totalNilai,
                              0,
                            ) / sortedTransaksiKeluar.length
                          ).toLocaleString("id-ID")
                        : "0"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Per transaksi
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Histori Barang Keluar</CardTitle>
                <CardDescription>
                  Riwayat transaksi barang keluar gudang
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => handleSort("nomorTransaksi")}
                        >
                          <div className="flex items-center">
                            No. Transaksi
                            {getSortIcon("nomorTransaksi")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => handleSort("tanggal")}
                        >
                          <div className="flex items-center">
                            Tanggal
                            {getSortIcon("tanggal")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => handleSort("barang")}
                        >
                          <div className="flex items-center">
                            Barang
                            {getSortIcon("barang")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => handleSort("qty")}
                        >
                          <div className="flex items-center">
                            Qty
                            {getSortIcon("qty")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => handleSort("hargaBarang")}
                        >
                          <div className="flex items-center">
                            Harga
                            {getSortIcon("hargaBarang")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => handleSort("totalNilai")}
                        >
                          <div className="flex items-center">
                            Total Nilai
                            {getSortIcon("totalNilai")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none"
                          onClick={() => handleSort("tujuan")}
                        >
                          <div className="flex items-center">
                            Tujuan
                            {getSortIcon("tujuan")}
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTransaksiKeluar.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center">
                            {dateFilter
                              ? "Tidak ada transaksi pada tanggal tersebut"
                              : "Belum ada transaksi"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedTransaksiKeluar.map((tr) => (
                          <TableRow key={tr.id}>
                            <TableCell className="font-medium">
                              {tr.nomorTransaksi}
                            </TableCell>
                            <TableCell>
                              {format(new Date(tr.tanggal), "dd/MM/yyyy HH:mm")}
                            </TableCell>
                            <TableCell>{tr.barang.nama}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {tr.qty} {tr.barang.satuan}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              Rp {tr.hargaBarang.toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="font-semibold">
                              Rp {tr.totalNilai.toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell>{tr.tujuan}</TableCell>
                            <TableCell>{tr.lokasi.namaLokasi}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </StyledTabs>
      </div>

      {/* Dialog Barang Masuk */}
      <Dialog
        open={dialogType === "masuk"}
        onOpenChange={(open) => {
          if (!open) {
            setDialogType(null);
            resetFormMasuk();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaksi Barang Masuk</DialogTitle>
            <DialogDescription>Catat barang masuk ke gudang</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitMasuk}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="barang-masuk">Barang *</Label>
                <Select
                  value={formMasuk.barangId}
                  onValueChange={(value) => handleBarangChange(value, "masuk")}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih barang" />
                  </SelectTrigger>
                  <SelectContent>
                    {barang.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nama} (Stok: {b.stok} {b.satuan})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qty-masuk">Jumlah *</Label>
                  <Input
                    id="qty-masuk"
                    type="number"
                    value={formMasuk.qty || ""}
                    onChange={(e) =>
                      setFormMasuk({
                        ...formMasuk,
                        qty: parseInt(e.target.value) || 0,
                      })
                    }
                    required
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="harga-masuk">Harga Beli *</Label>
                  <Input
                    id="harga-masuk"
                    type="number"
                    value={formMasuk.hargaBeli || ""}
                    onChange={(e) =>
                      setFormMasuk({
                        ...formMasuk,
                        hargaBeli: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sumber">Sumber *</Label>
                <Input
                  id="sumber"
                  value={formMasuk.sumber}
                  onChange={(e) =>
                    setFormMasuk({ ...formMasuk, sumber: e.target.value })
                  }
                  placeholder="Contoh: Supplier A, Transfer Cabang B"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lokasi-masuk">Lokasi Gudang *</Label>
                <Select
                  value={formMasuk.lokasiId}
                  onValueChange={(value) =>
                    setFormMasuk({ ...formMasuk, lokasiId: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih lokasi" />
                  </SelectTrigger>
                  <SelectContent>
                    {lokasi.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.namaLokasi}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keterangan-masuk">Keterangan</Label>
                <Input
                  id="keterangan-masuk"
                  value={formMasuk.keterangan}
                  onChange={(e) =>
                    setFormMasuk({ ...formMasuk, keterangan: e.target.value })
                  }
                />
              </div>

              {formMasuk.qty > 0 && formMasuk.hargaBeli > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Total Nilai
                  </div>
                  <div className="text-2xl font-bold">
                    Rp{" "}
                    {(formMasuk.qty * formMasuk.hargaBeli).toLocaleString(
                      "id-ID",
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogType(null)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Barang Keluar */}
      <Dialog
        open={dialogType === "keluar"}
        onOpenChange={(open) => {
          if (!open) {
            setDialogType(null);
            resetFormKeluar();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaksi Barang Keluar</DialogTitle>
            <DialogDescription>
              Catat barang keluar dari gudang
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitKeluar}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="barang-keluar">Barang *</Label>
                <Select
                  value={formKeluar.barangId}
                  onValueChange={(value) => handleBarangChange(value, "keluar")}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih barang" />
                  </SelectTrigger>
                  <SelectContent>
                    {barang.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nama} (Stok: {b.stok} {b.satuan})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qty-keluar">Jumlah *</Label>
                <Input
                  id="qty-keluar"
                  type="number"
                  value={formKeluar.qty || ""}
                  onChange={(e) =>
                    setFormKeluar({
                      ...formKeluar,
                      qty: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tujuan">Tujuan *</Label>
                <Input
                  id="tujuan"
                  value={formKeluar.tujuan}
                  onChange={(e) =>
                    setFormKeluar({ ...formKeluar, tujuan: e.target.value })
                  }
                  placeholder="Contoh: Toko Cabang A, Retur, Rusak"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lokasi-keluar">Lokasi Gudang *</Label>
                <Select
                  value={formKeluar.lokasiId}
                  onValueChange={(value) =>
                    setFormKeluar({ ...formKeluar, lokasiId: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih lokasi" />
                  </SelectTrigger>
                  <SelectContent>
                    {lokasi.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.namaLokasi}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keterangan-keluar">Keterangan</Label>
                <Input
                  id="keterangan-keluar"
                  value={formKeluar.keterangan}
                  onChange={(e) =>
                    setFormKeluar({ ...formKeluar, keterangan: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogType(null)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
