"use client";

import { useState, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  TrendingUp,
  Package,
  DollarSign,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Supplier {
  id: string;
  kode: string;
  nama: string;
  alamat?: string;
  nomorTelepon?: string;
  email?: string;
  namaKontak?: string;
  kategori?: string;
  keterangan?: string;
  isActive: boolean;
  _count?: {
    transaksiMasuk: number;
    hutang: number;
  };
}

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [kategoriFilter, setKategoriFilter] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(
    null,
  );

  const [formData, setFormData] = useState({
    nama: "",
    alamat: "",
    nomorTelepon: "",
    email: "",
    namaKontak: "",
    kategori: "",
    keterangan: "",
    isActive: true,
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    filterSuppliers();
  }, [suppliers, search, statusFilter, kategoriFilter]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/supplier");
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      toast.error("Gagal memuat data supplier");
    } finally {
      setLoading(false);
    }
  };

  const filterSuppliers = () => {
    let filtered = suppliers;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.nama.toLowerCase().includes(searchLower) ||
          s.kode.toLowerCase().includes(searchLower) ||
          s.alamat?.toLowerCase().includes(searchLower) ||
          s.nomorTelepon?.toLowerCase().includes(searchLower),
      );
    }

    if (statusFilter !== "ALL") {
      filtered = filtered.filter((s) =>
        statusFilter === "ACTIVE" ? s.isActive : !s.isActive,
      );
    }

    if (kategoriFilter !== "ALL") {
      filtered = filtered.filter((s) => s.kategori === kategoriFilter);
    }

    setFilteredSuppliers(filtered);
  };

  const openAddDialog = () => {
    setEditingSupplier(null);
    setFormData({
      nama: "",
      alamat: "",
      nomorTelepon: "",
      email: "",
      namaKontak: "",
      kategori: "",
      keterangan: "",
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      nama: supplier.nama,
      alamat: supplier.alamat || "",
      nomorTelepon: supplier.nomorTelepon || "",
      email: supplier.email || "",
      namaKontak: supplier.namaKontak || "",
      kategori: supplier.kategori || "",
      keterangan: supplier.keterangan || "",
      isActive: supplier.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const url = editingSupplier
        ? `/api/supplier/${editingSupplier.id}`
        : "/api/supplier";
      const method = editingSupplier ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save supplier");

      toast.success(
        editingSupplier
          ? "Supplier berhasil diupdate"
          : "Supplier berhasil ditambahkan",
      );
      setDialogOpen(false);
      fetchSuppliers();
    } catch (error) {
      toast.error("Gagal menyimpan data supplier");
    }
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;

    try {
      const response = await fetch(`/api/supplier/${supplierToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete supplier");

      const result = await response.json();

      if (result.softDeleted) {
        toast.info("Supplier dinonaktifkan (memiliki transaksi)");
      } else {
        toast.success("Supplier berhasil dihapus");
      }

      setDeleteDialogOpen(false);
      setSupplierToDelete(null);
      fetchSuppliers();
    } catch (error) {
      toast.error("Gagal menghapus supplier");
    }
  };

  const kategoriList = Array.from(
    new Set(suppliers.map((s) => s.kategori).filter(Boolean)),
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Supplier</h1>
          <p className="text-muted-foreground">
            Kelola data supplier dan vendor Anda
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Supplier
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Supplier
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.filter((s) => s.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {suppliers.filter((s) => !s.isActive).length} non-aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transaksi
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.reduce(
                (sum, s) => sum + (s._count?.transaksiMasuk || 0),
                0,
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Transaksi barang masuk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hutang Aktif</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.reduce((sum, s) => sum + (s._count?.hutang || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Hutang belum lunas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Supplier</CardTitle>
          <CardDescription>Kelola dan pantau supplier Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, kode, alamat..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="INACTIVE">Non-Aktif</SelectItem>
              </SelectContent>
            </Select>
            <Select value={kategoriFilter} onValueChange={setKategoriFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kategori</SelectItem>
                {kategoriList.map((kat) => (
                  <SelectItem key={kat} value={kat!}>
                    {kat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-center">Transaksi</TableHead>
                  <TableHead className="text-center">Hutang</TableHead>
                  <TableHead>Status</TableHead>
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
                ) : filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Tidak ada data
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">
                        {supplier.kode}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{supplier.nama}</div>
                          {supplier.alamat && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {supplier.alamat}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {supplier.namaKontak && (
                            <div>{supplier.namaKontak}</div>
                          )}
                          {supplier.nomorTelepon && (
                            <div className="text-muted-foreground">
                              {supplier.nomorTelepon}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.kategori && (
                          <Badge variant="outline">{supplier.kategori}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {supplier._count?.transaksiMasuk || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            (supplier._count?.hutang || 0) > 0
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {supplier._count?.hutang || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={supplier.isActive ? "default" : "secondary"}
                        >
                          {supplier.isActive ? "Aktif" : "Non-Aktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/supplier/${supplier.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(supplier)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSupplierToDelete(supplier);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? "Edit Supplier" : "Tambah Supplier"}
            </DialogTitle>
            <DialogDescription>
              Lengkapi informasi supplier di bawah ini
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nama">
                  Nama Supplier <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nama"
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                  placeholder="PT. Supplier ABC"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kategori">Kategori</Label>
                <Select
                  value={formData.kategori}
                  onValueChange={(value) =>
                    setFormData({ ...formData, kategori: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Distributor">Distributor</SelectItem>
                    <SelectItem value="Supplier">Supplier</SelectItem>
                    <SelectItem value="Manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                    <SelectItem value="Retailer">Retailer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alamat">Alamat</Label>
              <Textarea
                id="alamat"
                value={formData.alamat}
                onChange={(e) =>
                  setFormData({ ...formData, alamat: e.target.value })
                }
                placeholder="Alamat lengkap supplier"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="namaKontak">Nama Kontak</Label>
                <Input
                  id="namaKontak"
                  value={formData.namaKontak}
                  onChange={(e) =>
                    setFormData({ ...formData, namaKontak: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nomorTelepon">Nomor Telepon</Label>
                <Input
                  id="nomorTelepon"
                  value={formData.nomorTelepon}
                  onChange={(e) =>
                    setFormData({ ...formData, nomorTelepon: e.target.value })
                  }
                  placeholder="08123456789"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="supplier@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keterangan">Keterangan</Label>
              <Textarea
                id="keterangan"
                value={formData.keterangan}
                onChange={(e) =>
                  setFormData({ ...formData, keterangan: e.target.value })
                }
                placeholder="Catatan tambahan tentang supplier"
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Supplier Aktif
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.nama}>
              {editingSupplier ? "Update" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Supplier</DialogTitle>
            <DialogDescription>
              {supplierToDelete?._count?.transaksiMasuk! > 0 ||
              supplierToDelete?._count?.hutang! > 0
                ? "Supplier ini memiliki transaksi. Supplier akan dinonaktifkan (soft delete)."
                : "Apakah Anda yakin ingin menghapus supplier ini?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {supplierToDelete?._count?.transaksiMasuk! > 0 ||
              supplierToDelete?._count?.hutang! > 0
                ? "Nonaktifkan"
                : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
