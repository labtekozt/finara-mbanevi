"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, DollarSign, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface PembayaranHutang {
  id: string;
  tanggalBayar: string;
  jumlahBayar: number;
  metodePembayaran: string;
  catatan?: string;
}

interface PembayaranPiutang {
  id: string;
  tanggalBayar: string;
  jumlahBayar: number;
  metodePembayaran: string;
  catatan?: string;
}

interface ItemTransaksi {
  id: string;
  namaBarang: string;
  hargaSatuan: number;
  qty: number;
  subtotal: number;
}

interface TransaksiKasir {
  id: string;
  nomorTransaksi: string;
  itemTransaksi: ItemTransaksi[];
}

interface HutangDetail {
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
  pembayaranHutang: PembayaranHutang[];
}

interface PiutangDetail {
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
  pembayaranPiutang: PembayaranPiutang[];
  transaksiKasir?: TransaksiKasir;
}

type DetailData = HutangDetail | PiutangDetail;

function isHutang(data: DetailData): data is HutangDetail {
  return "sumberHutang" in data;
}

function isPiutang(data: DetailData): data is PiutangDetail {
  return "namaPelanggan" in data;
}

export default function DetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<"hutang" | "piutang">("hutang");

  useEffect(() => {
    fetchData();
  }, [params.id]);

  async function fetchData() {
    try {
      setLoading(true);
      // Try hutang first
      const hutangRes = await fetch(`/api/hutang/${params.id}`);
      if (hutangRes.ok) {
        const hutangData = await hutangRes.json();
        setData(hutangData);
        setType("hutang");
        return;
      }

      // If not hutang, try piutang
      const piutangRes = await fetch(`/api/piutang/${params.id}`);
      if (piutangRes.ok) {
        const piutangData = await piutangRes.json();
        setData(piutangData);
        setType("piutang");
        return;
      }

      throw new Error("Data tidak ditemukan");
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const statusMap = {
      BELUM_LUNAS: { label: "Belum Lunas", variant: "destructive" as const },
      LUNAS: { label: "Lunas", variant: "default" as const },
      JATUH_TEMPO: { label: "Jatuh Tempo", variant: "secondary" as const },
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || {
      label: status,
      variant: "secondary" as const,
    };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Detail" />
        <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Data Tidak Ditemukan" />
        <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/hutang-piutang")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Data tidak ditemukan</h1>
          </div>
        </main>
      </div>
    );
  }

  const payments = isHutang(data)
    ? data.pembayaranHutang
    : data.pembayaranPiutang;

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        title={`Detail ${type === "hutang" ? "Hutang" : "Piutang"}`}
        description={isHutang(data) ? data.nomorHutang : data.nomorPiutang}
      />
      <main className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/hutang-piutang")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              Detail {type === "hutang" ? "Hutang" : "Piutang"}
            </h1>
            <p className="text-muted-foreground">
              {isHutang(data) ? data.nomorHutang : data.nomorPiutang}
            </p>
          </div>
          {getStatusBadge(data.status)}
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total {type === "hutang" ? "Hutang" : "Piutang"}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp{" "}
                {(isHutang(data) ? data.totalHutang : data.totalPiutang).toLocaleString(
                  "id-ID"
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Dibayar
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                Rp {data.totalBayar.toLocaleString("id-ID")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sisa</CardTitle>
              <DollarSign className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                Rp{" "}
                {(isHutang(data) ? data.sisaHutang : data.sisaPiutang).toLocaleString(
                  "id-ID"
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Jumlah Cicilan
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payments.length}x</div>
            </CardContent>
          </Card>
        </div>

        {/* Detail Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Nomor {type === "hutang" ? "Hutang" : "Piutang"}
                </p>
                <p className="text-lg font-semibold">
                  {isHutang(data) ? data.nomorHutang : data.nomorPiutang}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Tanggal
                </p>
                <p className="text-lg font-semibold">
                  {format(
                    new Date(
                      isHutang(data) ? data.tanggalHutang : data.tanggalPiutang
                    ),
                    "dd MMMM yyyy",
                    { locale: idLocale }
                  )}
                </p>
              </div>

              {isHutang(data) ? (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Sumber Hutang
                  </p>
                  <p className="text-lg font-semibold">{data.sumberHutang}</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Nama Pelanggan
                    </p>
                    <p className="text-lg font-semibold">
                      {data.namaPelanggan}
                    </p>
                  </div>

                  {data.nomorHp && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        No. HP
                      </p>
                      <p className="text-lg font-semibold">{data.nomorHp}</p>
                    </div>
                  )}

                  {data.alamat && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Alamat
                      </p>
                      <p className="text-lg font-semibold">{data.alamat}</p>
                    </div>
                  )}
                </>
              )}

              {data.jatuhTempo && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Jatuh Tempo
                  </p>
                  <p className="text-lg font-semibold">
                    {format(
                      new Date(data.jatuhTempo),
                      "dd MMMM yyyy",
                      { locale: idLocale }
                    )}
                  </p>
                </div>
              )}

              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Deskripsi
                </p>
                {isPiutang(data) && data.transaksiKasir?.itemTransaksi ? (
                  <div className="mt-2 space-y-2">
                    {data.transaksiKasir.itemTransaksi.map((item, index) => (
                      <div key={item.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold text-base">{item.namaBarang}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>Qty: <span className="font-medium text-foreground">{item.qty}</span></span>
                            <span>@Rp {item.hargaSatuan.toLocaleString("id-ID")}</span>
                            <span className="ml-auto font-semibold text-foreground">
                              Rp {item.subtotal.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-lg">{data.deskripsi}</p>
                )}
              </div>

              {data.catatan && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Catatan
                  </p>
                  <p className="text-lg">{data.catatan}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Pembayaran</CardTitle>
            <CardDescription>
              Detail cicilan pembayaran {type === "hutang" ? "hutang" : "piutang"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Belum ada pembayaran</p>
                <p className="text-sm text-muted-foreground">
                  Riwayat pembayaran akan muncul di sini
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Tanggal Bayar</TableHead>
                      <TableHead>Jumlah Dibayar</TableHead>
                      <TableHead>Metode Pembayaran</TableHead>
                      <TableHead>Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment, index) => (
                      <TableRow key={payment.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          {format(
                            new Date(payment.tanggalBayar),
                            "dd MMM yyyy HH:mm",
                            { locale: idLocale }
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          Rp {payment.jumlahBayar.toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payment.metodePembayaran.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.catatan || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Summary */}
                <div className="mt-4 border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Total Pembayaran:
                    </span>
                    <span className="text-lg font-bold">
                      Rp {data.totalBayar.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-medium">Sisa yang Harus Dibayar:</span>
                    <span className="text-lg font-bold text-red-600">
                      Rp{" "}
                      {(isHutang(data)
                        ? data.sisaHutang
                        : data.sisaPiutang
                      ).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
