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
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  Clock,
  Package,
  ShoppingBag,
  AlertCircle,
} from "lucide-react";
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
  const [showModal, setShowModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransaksiKasir | null>(null);
  const [pickupQuantities, setPickupQuantities] = useState<
    Record<string, number>
  >({});

  const pendingTransactions = transaksiKasir.filter((tr) => tr.belumDiambil);

  function handleOpenModal(transaction: TransaksiKasir) {
    setSelectedTransaction(transaction);
    // Initialize pickup quantities with original quantities
    const initialQuantities: Record<string, number> = {};
    transaction.itemTransaksi.forEach((item) => {
      initialQuantities[item.id] = item.qty;
    });
    setPickupQuantities(initialQuantities);
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setSelectedTransaction(null);
    setPickupQuantities({});
  }

  function handleQuantityChange(itemId: string, value: string) {
    const numValue = parseInt(value) || 0;
    const item = selectedTransaction?.itemTransaksi.find((i) => i.id === itemId);
    if (item) {
      // Validate: cannot exceed original quantity
      const validatedValue = Math.min(Math.max(0, numValue), item.qty);
      setPickupQuantities((prev) => ({
        ...prev,
        [itemId]: validatedValue,
      }));
    }
  }

  async function confirmPickup() {
    if (!selectedTransaction) return;

    // Prevent double submit
    if (loadingId === selectedTransaction.id) {
      return;
    }

    // Validate that at least one item has quantity > 0
    const hasPickup = Object.values(pickupQuantities).some((qty) => qty > 0);
    if (!hasPickup) {
      toast.error("Minimal 1 barang harus diambil");
      return;
    }

    // Validate all quantities are valid (not exceeding available qty)
    const invalidItem = selectedTransaction.itemTransaksi.find(
      (item) => pickupQuantities[item.id] > item.qty
    );
    if (invalidItem) {
      toast.error(
        `Qty diambil tidak boleh melebihi qty tersedia untuk ${invalidItem.namaBarang}`
      );
      return;
    }

    // Check if all items are fully picked up
    const allPickedUp = selectedTransaction.itemTransaksi.every(
      (item) => pickupQuantities[item.id] === item.qty
    );

    // Build pickup data for API
    const pickupItems = selectedTransaction.itemTransaksi.map((item) => ({
      id: item.id,
      qtyDiambil: pickupQuantities[item.id] || 0,
      qtyAsli: item.qty,
    }));

    // Build pickup notes
    const pickupDetails = selectedTransaction.itemTransaksi
      .map((item) => {
        const qtyDiambil = pickupQuantities[item.id] || 0;
        if (qtyDiambil === item.qty) {
          return `${item.namaBarang}: ${qtyDiambil} ${item.barang.satuan} (lengkap)`;
        } else if (qtyDiambil > 0) {
          return `${item.namaBarang}: ${qtyDiambil} dari ${item.qty} ${item.barang.satuan} (sisa ${item.qty - qtyDiambil})`;
        } else {
          return `${item.namaBarang}: belum diambil`;
        }
      })
      .join(", ");

    const pickupNote = `[Pengambilan - ${new Date().toLocaleString("id-ID")}] ${pickupDetails}`;

    try {
      setLoadingId(selectedTransaction.id);
      const response = await fetch(
        `/api/transaksi-kasir/${selectedTransaction.id}/pickup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: pickupItems,
            allPickedUp,
            pickupNote,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal mengupdate status");
      }

      if (allPickedUp) {
        toast.success("Semua barang berhasil ditandai sudah diambil");
      } else {
        toast.success(
          "Pengambilan sebagian berhasil dicatat. Qty barang berkurang, total transaksi & arus kas tetap sama."
        );
      }

      handleCloseModal();
      onStatusChange();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Terjadi kesalahan"
      );
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
            pelanggan. Qty barang akan berkurang sesuai yang diambil, tapi
            total transaksi & arus kas tetap sesuai pembayaran awal.
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
                          onClick={() => handleOpenModal(tr)}
                          disabled={loadingId === tr.id}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Sudah Diambil
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

      {/* Modal Konfirmasi Pengambilan Barang */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Konfirmasi Pengambilan Barang
            </DialogTitle>
            <DialogDescription>
              Catat barang yang diambil pelanggan. Qty barang akan berkurang,
              tapi total transaksi & arus kas TETAP sesuai pembayaran awal
              (tidak berubah).
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4">
              {/* Alert untuk partial pickup */}
              {(() => {
                const hasPartial = selectedTransaction.itemTransaksi.some(
                  (item) =>
                    pickupQuantities[item.id] > 0 &&
                    pickupQuantities[item.id] < item.qty
                );
                const hasZero = selectedTransaction.itemTransaksi.some(
                  (item) => pickupQuantities[item.id] === 0
                );

                if (hasPartial || hasZero) {
                  return (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        <strong>Catatan Pengambilan Sebagian:</strong> Qty
                        barang akan berkurang. Transaksi tetap "Belum Diambil"
                        untuk sisa barang. Total & arus kas TIDAK berubah.
                      </AlertDescription>
                    </Alert>
                  );
                }
                return null;
              })()}

              {/* Info Transaksi */}
              <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">No. Transaksi</span>
                  <span className="font-medium">
                    {selectedTransaction.nomorTransaksi}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tanggal</span>
                  <span className="font-medium">
                    {format(
                      new Date(selectedTransaction.tanggal),
                      "dd/MM/yyyy HH:mm"
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pelanggan</span>
                  <div className="text-right">
                    <div className="font-medium">
                      {selectedTransaction.namaPelanggan || "Umum"}
                    </div>
                    {selectedTransaction.nomorHpPelanggan && (
                      <div className="text-xs text-muted-foreground">
                        {selectedTransaction.nomorHpPelanggan}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total Pembayaran Awal
                  </span>
                  <span className="font-semibold text-green-700">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                    }).format(Number(selectedTransaction.total))}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  *Arus kas tetap sesuai total ini meski qty berkurang
                </div>
              </div>

              {/* Daftar Barang */}
              <div>
                <h4 className="font-semibold mb-3 text-sm">
                  Edit Jumlah Barang yang Diambil:
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Qty di tabel akan berkurang, tapi total pembayaran tetap Rp{" "}
                  {new Intl.NumberFormat("id-ID").format(
                    Number(selectedTransaction.total)
                  )}
                </p>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Barang</TableHead>
                        <TableHead className="text-center">
                          Qty Dibeli
                        </TableHead>
                        <TableHead className="text-center">
                          Qty Diambil
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTransaction.itemTransaksi.map((item) => {
                        const qtyDiambil = pickupQuantities[item.id] || 0;

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.namaBarang}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">
                                {item.qty} {item.barang.satuan}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.qty}
                                  value={qtyDiambil}
                                  onChange={(e) =>
                                    handleQuantityChange(item.id, e.target.value)
                                  }
                                  className="w-20 text-center"
                                />
                                <span className="text-xs text-muted-foreground">
                                  / {item.qty}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Catatan jika ada */}
              {selectedTransaction.catatan && (
                <div className="rounded-lg border p-3 bg-yellow-50">
                  <p className="text-sm font-medium text-yellow-900 mb-1">
                    Catatan:
                  </p>
                  <p className="text-sm text-yellow-800">
                    {selectedTransaction.catatan}
                  </p>
                </div>
              )}

              {/* Info */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs text-blue-800">
                  <strong>⚠️ Penting:</strong> Qty barang di tabel akan
                  berkurang sesuai yang diambil, tapi{" "}
                  <strong>total transaksi & arus kas TETAP</strong> sesuai
                  pembayaran awal (Rp{" "}
                  {new Intl.NumberFormat("id-ID").format(
                    Number(selectedTransaction.total)
                  )}
                  ). History pengambilan dicatat di catatan transaksi.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseModal}
              disabled={loadingId === selectedTransaction?.id}
            >
              Batal
            </Button>
            <Button
              onClick={confirmPickup}
              disabled={loadingId === selectedTransaction?.id}
            >
              {loadingId === selectedTransaction?.id ? (
                "Memproses..."
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Konfirmasi Sudah Diambil
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
