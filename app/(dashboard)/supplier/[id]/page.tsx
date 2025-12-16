"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Save,
  Trash2,
  Package,
  DollarSign,
  Calendar,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SupplierDetail {
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
  transaksiMasuk: any[];
  hutang: any[];
  _count: {
    transaksiMasuk: number;
    hutang: number;
  };
}

interface SupplierStats {
  totalTransactions: number;
  totalValue: number;
  totalHutang: number;
  totalHutangBelumLunas: number;
  topProducts: any[];
  monthlyTrends: any[];
}

export default function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchSupplierData();
  }, [resolvedParams.id]);

  const fetchSupplierData = async () => {
    try {
      setLoading(true);
      const [supplierRes, statsRes] = await Promise.all([
        fetch(`/api/supplier/${resolvedParams.id}`),
        fetch(`/api/supplier/${resolvedParams.id}/stats`),
      ]);

      if (!supplierRes.ok) throw new Error("Failed to fetch supplier");

      const supplierData = await supplierRes.json();
      setSupplier(supplierData);
      setFormData({
        nama: supplierData.nama,
        alamat: supplierData.alamat || "",
        nomorTelepon: supplierData.nomorTelepon || "",
        email: supplierData.email || "",
        namaKontak: supplierData.namaKontak || "",
        kategori: supplierData.kategori || "",
        keterangan: supplierData.keterangan || "",
        isActive: supplierData.isActive,
      });

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        // Flatten statistics object
        setStats({
          totalTransactions: statsData.statistics?.totalTransactions || 0,
          totalValue: statsData.statistics?.totalValue || 0,
          totalHutang: statsData.statistics?.totalHutang || 0,
          totalHutangBelumLunas:
            statsData.statistics?.totalHutangBelumLunas || 0,
          topProducts: statsData.topProducts || [],
          monthlyTrends: statsData.monthlyTrends || [],
        });
      }
    } catch (error) {
      toast.error("Gagal memuat data supplier");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/supplier/${resolvedParams.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to update supplier");

      toast.success("Data supplier berhasil disimpan");
      setIsEditing(false);
      fetchSupplierData();
    } catch (error) {
      toast.error("Gagal menyimpan perubahan");
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Memuat data supplier...</div>;
  }

  if (!supplier) {
    return <div className="p-8 text-center">Supplier tidak ditemukan</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {supplier.nama}
            <Badge variant={supplier.isActive ? "default" : "secondary"}>
              {supplier.isActive ? "Aktif" : "Non-Aktif"}
            </Badge>
          </h1>
          <p className="text-muted-foreground">{supplier.kode}</p>
        </div>
        <div className="ml-auto flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Batal
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Simpan
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Profil</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Informasi Supplier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Supplier</Label>
              {isEditing ? (
                <Input
                  value={formData.nama}
                  onChange={(e) =>
                    setFormData({ ...formData, nama: e.target.value })
                  }
                />
              ) : (
                <div className="font-medium">{supplier.nama}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Kategori</Label>
              {isEditing ? (
                <Input
                  value={formData.kategori}
                  onChange={(e) =>
                    setFormData({ ...formData, kategori: e.target.value })
                  }
                />
              ) : (
                <div>{supplier.kategori || "-"}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nama Kontak</Label>
              {isEditing ? (
                <Input
                  value={formData.namaKontak}
                  onChange={(e) =>
                    setFormData({ ...formData, namaKontak: e.target.value })
                  }
                />
              ) : (
                <div>{supplier.namaKontak || "-"}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nomor Telepon</Label>
              {isEditing ? (
                <Input
                  value={formData.nomorTelepon}
                  onChange={(e) =>
                    setFormData({ ...formData, nomorTelepon: e.target.value })
                  }
                />
              ) : (
                <div>{supplier.nomorTelepon || "-"}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              {isEditing ? (
                <Input
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              ) : (
                <div>{supplier.email || "-"}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Alamat</Label>
              {isEditing ? (
                <Textarea
                  value={formData.alamat}
                  onChange={(e) =>
                    setFormData({ ...formData, alamat: e.target.value })
                  }
                />
              ) : (
                <div className="whitespace-pre-wrap">
                  {supplier.alamat || "-"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Keterangan</Label>
              {isEditing ? (
                <Textarea
                  value={formData.keterangan}
                  onChange={(e) =>
                    setFormData({ ...formData, keterangan: e.target.value })
                  }
                />
              ) : (
                <div className="whitespace-pre-wrap">
                  {supplier.keterangan || "-"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats & Tabs */}
        <div className="md:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Transaksi
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalTransactions || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats?.totalValue || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sisa Hutang
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats?.totalHutangBelumLunas || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Dari total {formatCurrency(stats?.totalHutang || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Rata-rata Transaksi
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    stats?.totalTransactions
                      ? (stats.totalValue || 0) / stats.totalTransactions
                      : 0,
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="transactions">
            <TabsList>
              <TabsTrigger value="transactions">Riwayat Transaksi</TabsTrigger>
              <TabsTrigger value="hutang">Riwayat Hutang</TabsTrigger>
              <TabsTrigger value="products">Produk Teratas</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Riwayat Transaksi Masuk</CardTitle>
                  <CardDescription>
                    Daftar barang yang disupply oleh {supplier.nama}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Barang</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Harga Beli</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Lokasi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplier.transaksiMasuk?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            Belum ada transaksi
                          </TableCell>
                        </TableRow>
                      ) : (
                        supplier.transaksiMasuk?.map((trx: any) => (
                          <TableRow key={trx.id}>
                            <TableCell>{formatDate(trx.tanggal)}</TableCell>
                            <TableCell className="font-medium">
                              {trx.barang?.nama || "-"}
                            </TableCell>
                            <TableCell>{trx.qty || 0}</TableCell>
                            <TableCell>
                              {formatCurrency(Number(trx.hargaBeli) || 0)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(
                                (trx.qty || 0) * (Number(trx.hargaBeli) || 0),
                              )}
                            </TableCell>
                            <TableCell>
                              {trx.lokasi?.namaLokasi || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hutang">
              <Card>
                <CardHeader>
                  <CardTitle>Riwayat Hutang</CardTitle>
                  <CardDescription>
                    Status pembayaran hutang ke {supplier.nama}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Jatuh Tempo</TableHead>
                        <TableHead>Jumlah</TableHead>
                        <TableHead>Sisa</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplier.hutang?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            Belum ada data hutang
                          </TableCell>
                        </TableRow>
                      ) : (
                        supplier.hutang?.map((h: any) => (
                          <TableRow key={h.id}>
                            <TableCell>{formatDate(h.tanggalHutang)}</TableCell>
                            <TableCell>{h.deskripsi}</TableCell>
                            <TableCell>
                              {h.jatuhTempo ? formatDate(h.jatuhTempo) : "-"}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(h.totalHutang)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(h.sisaHutang)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  h.status === "LUNAS"
                                    ? "default"
                                    : h.status === "JATUH_TEMPO"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {h.status.replace("_", " ")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>Produk Teratas</CardTitle>
                  <CardDescription>
                    Produk yang paling sering disupply
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Barang</TableHead>
                        <TableHead className="text-right">Total Qty</TableHead>
                        <TableHead className="text-right">
                          Total Nilai
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats?.topProducts?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center">
                            Belum ada data
                          </TableCell>
                        </TableRow>
                      ) : (
                        stats?.topProducts?.map((prod: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {prod.namaBarang}
                            </TableCell>
                            <TableCell className="text-right">
                              {prod.totalQty}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(prod.totalValue)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function TrendingUp({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
