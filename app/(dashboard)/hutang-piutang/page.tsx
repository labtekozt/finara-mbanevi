"use client";

import { useState, useEffect } from "react";
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
import { TabsContent } from "@/components/ui/tabs";
import {
  StyledTabs,
  StyledTabsList,
  StyledTabsTrigger,
} from "@/components/ui/styled-tabs";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface Hutang {
  id: string;
  nomorHutang: string;
  tanggalHutang: string;
  sumberHutang: string;
  deskripsi: string;
  totalHutang: number;
  totalBayar: number;
  sisaHutang: number;
  status: string;
  jatuhTempo?: string;
  catatan?: string;
}

interface Piutang {
  id: string;
  nomorPiutang: string;
  tanggalPiutang: string;
  namaPelanggan: string;
  nomorHp?: string;
  alamat?: string;
  deskripsi: string;
  totalPiutang: number;
  totalBayar: number;
  sisaPiutang: number;
  status: string;
  jatuhTempo?: string;
  catatan?: string;
}

export default function HutangPiutangPage() {
  const router = useRouter();
  const [hutang, setHutang] = useState<Hutang[]>([]);
  const [piutang, setPiutang] = useState<Piutang[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogHutang, setDialogHutang] = useState(false);
  const [dialogPiutang, setDialogPiutang] = useState(false);
  const [selectedHutang, setSelectedHutang] = useState<Hutang | null>(null);
  const [selectedPiutang, setSelectedPiutang] = useState<Piutang | null>(null);
  const [formBayarHutang, setFormBayarHutang] = useState({
    jumlahBayar: 0,
    metodePembayaran: "tunai",
    catatan: "",
  });
  const [formBayarPiutang, setFormBayarPiutang] = useState({
    jumlahBayar: 0,
    metodePembayaran: "tunai",
    catatan: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [hutangRes, piutangRes] = await Promise.all([
        fetch("/api/hutang"),
        fetch("/api/piutang"),
      ]);

      const hutangData = await hutangRes.json();
      const piutangData = await piutangRes.json();

      setHutang(hutangData);
      setPiutang(piutangData);
    } catch (error) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  function openBayarHutang(item: Hutang) {
    setSelectedHutang(item);
    setFormBayarHutang({
      jumlahBayar: item.sisaHutang,
      metodePembayaran: "tunai",
      catatan: "",
    });
    setDialogHutang(true);
  }

  function openBayarPiutang(item: Piutang) {
    setSelectedPiutang(item);
    setFormBayarPiutang({
      jumlahBayar: item.sisaPiutang,
      metodePembayaran: "tunai",
      catatan: "",
    });
    setDialogPiutang(true);
  }

  async function handleBayarHutang(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedHutang) return;

    if (formBayarHutang.jumlahBayar > selectedHutang.sisaHutang) {
      toast.error("Jumlah bayar melebihi sisa hutang");
      return;
    }

    if (formBayarHutang.jumlahBayar <= 0) {
      toast.error("Jumlah bayar harus lebih dari 0");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/hutang/${selectedHutang.id}/bayar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formBayarHutang),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal membayar hutang");
      }

      toast.success("Pembayaran hutang berhasil dicatat");
      setDialogHutang(false);
      setSelectedHutang(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleBayarPiutang(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPiutang) return;

    if (formBayarPiutang.jumlahBayar > selectedPiutang.sisaPiutang) {
      toast.error("Jumlah bayar melebihi sisa piutang");
      return;
    }

    if (formBayarPiutang.jumlahBayar <= 0) {
      toast.error("Jumlah bayar harus lebih dari 0");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/piutang/${selectedPiutang.id}/bayar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formBayarPiutang),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal mencatat pembayaran piutang");
      }

      toast.success("Pembayaran piutang berhasil dicatat");
      setDialogPiutang(false);
      setSelectedPiutang(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  // Calculate totals
  const totalHutang = hutang.reduce((sum, h) => sum + h.sisaHutang, 0);
  const totalPiutang = piutang.reduce((sum, p) => sum + p.sisaPiutang, 0);
  const totalHutangLunas = hutang.filter((h) => h.status === "LUNAS").length;
  const totalPiutangLunas = piutang.filter((p) => p.status === "LUNAS").length;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Hutang & Piutang"
        description="Kelola data hutang dan piutang usaha"
      />

      <div className="flex-1 p-3 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Hutang
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                Rp {totalHutang.toLocaleString("id-ID")}
              </div>
              <p className="text-xs text-muted-foreground">
                {hutang.length} transaksi
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Piutang
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                Rp {totalPiutang.toLocaleString("id-ID")}
              </div>
              <p className="text-xs text-muted-foreground">
                {piutang.length} transaksi
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Hutang Lunas
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHutangLunas}</div>
              <p className="text-xs text-muted-foreground">
                dari {hutang.length} hutang
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Piutang Lunas
              </CardTitle>
              <Wallet className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPiutangLunas}</div>
              <p className="text-xs text-muted-foreground">
                dari {piutang.length} piutang
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <StyledTabs defaultValue="hutang">
          <StyledTabsList>
            <StyledTabsTrigger value="hutang">
              <TrendingDown className="mr-2 h-4 w-4" />
              Hutang
            </StyledTabsTrigger>
            <StyledTabsTrigger value="piutang">
              <TrendingUp className="mr-2 h-4 w-4" />
              Piutang
            </StyledTabsTrigger>
          </StyledTabsList>

          {/* Tab Hutang */}
          <TabsContent value="hutang">
            <Card>
              <CardHeader>
                <CardTitle>Daftar Hutang</CardTitle>
                <CardDescription>
                  Hutang kepada supplier dan pihak ketiga
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No. Hutang</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Sumber</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead>Total Hutang</TableHead>
                        <TableHead>Sudah Bayar</TableHead>
                        <TableHead>Sisa Hutang</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hutang.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center">
                            Tidak ada data hutang
                          </TableCell>
                        </TableRow>
                      ) : (
                        hutang.map((h) => (
                          <TableRow key={h.id}>
                            <TableCell className="font-medium">
                              <button
                                onClick={() => router.push(`/hutang-piutang/${h.id}`)}
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {h.nomorHutang}
                                <Eye className="h-3 w-3" />
                              </button>
                            </TableCell>
                            <TableCell>
                              {format(
                                new Date(h.tanggalHutang),
                                "dd/MM/yyyy"
                              )}
                            </TableCell>
                            <TableCell>{h.sumberHutang}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {h.deskripsi}
                            </TableCell>
                            <TableCell className="font-semibold">
                              Rp {h.totalHutang.toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell>
                              Rp {h.totalBayar.toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="font-semibold text-red-600">
                              Rp {h.sisaHutang.toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  h.status === "LUNAS"
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {h.status === "LUNAS"
                                  ? "Lunas"
                                  : "Belum Lunas"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {h.status !== "LUNAS" && (
                                <Button
                                  size="sm"
                                  onClick={() => openBayarHutang(h)}
                                >
                                  Bayar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Piutang */}
          <TabsContent value="piutang">
            <Card>
              <CardHeader>
                <CardTitle>Daftar Piutang</CardTitle>
                <CardDescription>
                  Piutang dari pelanggan dan penjualan kredit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No. Piutang</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Pelanggan</TableHead>
                        <TableHead>Kontak</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead>Total Piutang</TableHead>
                        <TableHead>Sudah Bayar</TableHead>
                        <TableHead>Sisa Piutang</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {piutang.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center">
                            Tidak ada data piutang
                          </TableCell>
                        </TableRow>
                      ) : (
                        piutang.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">
                              <button
                                onClick={() => router.push(`/hutang-piutang/${p.id}`)}
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                {p.nomorPiutang}
                                <Eye className="h-3 w-3" />
                              </button>
                            </TableCell>
                            <TableCell>
                              {format(
                                new Date(p.tanggalPiutang),
                                "dd/MM/yyyy"
                              )}
                            </TableCell>
                            <TableCell>{p.namaPelanggan}</TableCell>
                            <TableCell>
                              {p.nomorHp || "-"}
                              {p.alamat && (
                                <div className="text-xs text-muted-foreground">
                                  {p.alamat}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {p.deskripsi}
                            </TableCell>
                            <TableCell className="font-semibold">
                              Rp {p.totalPiutang.toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell>
                              Rp {p.totalBayar.toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              Rp {p.sisaPiutang.toLocaleString("id-ID")}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  p.status === "LUNAS"
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {p.status === "LUNAS"
                                  ? "Lunas"
                                  : "Belum Lunas"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {p.status !== "LUNAS" && (
                                <Button
                                  size="sm"
                                  onClick={() => openBayarPiutang(p)}
                                >
                                  Terima Bayar
                                </Button>
                              )}
                            </TableCell>
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

      {/* Dialog Bayar Hutang */}
      <Dialog open={dialogHutang} onOpenChange={setDialogHutang}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bayar Hutang</DialogTitle>
            <DialogDescription>
              Catat pembayaran hutang kepada {selectedHutang?.sumberHutang}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBayarHutang}>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>Total Hutang:</span>
                  <span className="font-semibold">
                    Rp {selectedHutang?.totalHutang.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Sudah Dibayar:</span>
                  <span>
                    Rp {selectedHutang?.totalBayar.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-red-600">
                  <span>Sisa Hutang:</span>
                  <span>
                    Rp {selectedHutang?.sisaHutang.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jumlah-bayar-hutang">Jumlah Bayar *</Label>
                <Input
                  id="jumlah-bayar-hutang"
                  type="number"
                  value={formBayarHutang.jumlahBayar}
                  onChange={(e) =>
                    setFormBayarHutang({
                      ...formBayarHutang,
                      jumlahBayar: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  min="0"
                  max={selectedHutang?.sisaHutang}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metode-pembayaran-hutang">Metode Pembayaran *</Label>
                <Select
                  value={formBayarHutang.metodePembayaran}
                  onValueChange={(value) =>
                    setFormBayarHutang({
                      ...formBayarHutang,
                      metodePembayaran: value,
                    })
                  }
                >
                  <SelectTrigger id="metode-pembayaran-hutang">
                    <SelectValue placeholder="Pilih metode pembayaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tunai">Tunai</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="catatan-hutang">Catatan</Label>
                <Input
                  id="catatan-hutang"
                  value={formBayarHutang.catatan}
                  onChange={(e) =>
                    setFormBayarHutang({
                      ...formBayarHutang,
                      catatan: e.target.value,
                    })
                  }
                  placeholder="Catatan pembayaran (opsional)"
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogHutang(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Bayar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Terima Bayar Piutang */}
      <Dialog open={dialogPiutang} onOpenChange={setDialogPiutang}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terima Pembayaran Piutang</DialogTitle>
            <DialogDescription>
              Catat pembayaran piutang dari {selectedPiutang?.namaPelanggan}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBayarPiutang}>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>Total Piutang:</span>
                  <span className="font-semibold">
                    Rp {selectedPiutang?.totalPiutang.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Sudah Dibayar:</span>
                  <span>
                    Rp {selectedPiutang?.totalBayar.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-green-600">
                  <span>Sisa Piutang:</span>
                  <span>
                    Rp {selectedPiutang?.sisaPiutang.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jumlah-bayar-piutang">Jumlah Diterima *</Label>
                <Input
                  id="jumlah-bayar-piutang"
                  type="number"
                  value={formBayarPiutang.jumlahBayar}
                  onChange={(e) =>
                    setFormBayarPiutang({
                      ...formBayarPiutang,
                      jumlahBayar: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  min="0"
                  max={selectedPiutang?.sisaPiutang}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metode-pembayaran-piutang">Metode Pembayaran *</Label>
                <Select
                  value={formBayarPiutang.metodePembayaran}
                  onValueChange={(value) =>
                    setFormBayarPiutang({
                      ...formBayarPiutang,
                      metodePembayaran: value,
                    })
                  }
                >
                  <SelectTrigger id="metode-pembayaran-piutang">
                    <SelectValue placeholder="Pilih metode pembayaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tunai">Tunai</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="catatan-piutang">Catatan</Label>
                <Input
                  id="catatan-piutang"
                  value={formBayarPiutang.catatan}
                  onChange={(e) =>
                    setFormBayarPiutang({
                      ...formBayarPiutang,
                      catatan: e.target.value,
                    })
                  }
                  placeholder="Catatan pembayaran (opsional)"
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogPiutang(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Terima Pembayaran"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
