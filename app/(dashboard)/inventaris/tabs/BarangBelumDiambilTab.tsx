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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Package } from "lucide-react";
import { format } from "date-fns";
import { TransaksiKasir } from "../types";
import { useState } from "react";
import { toast } from "sonner";

interface BarangBelumDiambilTabProps {
  transaksiKasir: TransaksiKasir[];
  onStatusChange: () => void;
}

export function BarangBelumDiambilTab({
  transaksiKasir,
  onStatusChange,
}: BarangBelumDiambilTabProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const pendingTransactions = transaksiKasir.filter((tr) => tr.belumDiambil);

  async function handleMarkAsPickedUp(id: string) {
    try {
      setLoadingId(id);
      const response = await fetch(`/api/transaksi-kasir/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ belumDiambil: false }),
      });

      if (!response.ok) {
        throw new Error("Gagal mengupdate status");
      }

      toast.success("Status berhasil diperbarui");
      onStatusChange();
    } catch (error) {
      toast.error("Terjadi kesalahan");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Belum Diambil
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingTransactions.length}
            </div>
            <p className="text-xs text-muted-foreground">Transaksi pending</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Barang Belum Diambil</CardTitle>
          <CardDescription>
            Transaksi yang sudah dibayar tetapi barang belum diambil oleh
            pelanggan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Transaksi</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Barang</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Package className="h-8 w-8 mb-2" />
                        <p>Tidak ada barang yang belum diambil</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingTransactions.map((tr) => (
                    <TableRow key={tr.id}>
                      <TableCell className="font-medium">
                        {tr.nomorTransaksi}
                      </TableCell>
                      <TableCell>
                        {format(new Date(tr.tanggal), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {tr.namaPelanggan || "Umum"}
                          </span>
                          {tr.nomorHpPelanggan && (
                            <span className="text-xs text-muted-foreground">
                              {tr.nomorHpPelanggan}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {tr.itemTransaksi.map((item) => (
                            <div
                              key={item.id}
                              className="text-sm flex justify-between max-w-[200px]"
                            >
                              <span>{item.namaBarang}</span>
                              <span className="text-muted-foreground">
                                x{item.qty}
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-orange-50 text-orange-700 border-orange-200"
                        >
                          Belum Diambil
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsPickedUp(tr.id)}
                          disabled={loadingId === tr.id}
                        >
                          {loadingId === tr.id ? (
                            "Memproses..."
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Sudah Diambil
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
