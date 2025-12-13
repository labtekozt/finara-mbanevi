import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Barang } from "@/app/(dashboard)/inventaris/types";

interface StockOpnameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Barang | null;
  onSubmit: (data: {
    barangId: string;
    stokSistem: number;
    stokFisik: number;
    lokasiId: string;
    keterangan: string;
  }) => Promise<void>;
}

export function StockOpnameDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
}: StockOpnameDialogProps) {
  const [stokFisik, setStokFisik] = useState<string>("");
  const [keterangan, setKeterangan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && item) {
      setStokFisik(item.stok.toString());
      setKeterangan("");
    }
  }, [open, item]);

  if (!item) return null;

  const stokSistem = item.stok;
  const fisik = parseInt(stokFisik) || 0;
  const selisih = fisik - stokSistem;
  const nilaiSelisih = selisih * item.hargaBeli;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        barangId: item.id,
        stokSistem: stokSistem,
        stokFisik: fisik,
        lokasiId: item.lokasiId,
        keterangan: keterangan,
      });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Stock Opname: {item.nama}</DialogTitle>
          <DialogDescription>
            Sesuaikan stok fisik dengan stok sistem. Perubahan akan dicatat
            sebagai penyesuaian stok.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stok Sistem</Label>
              <div className="p-2 bg-muted rounded-md font-mono text-center text-lg">
                {stokSistem} {item.satuan}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stokFisik">Stok Fisik</Label>
              <Input
                id="stokFisik"
                type="number"
                value={stokFisik}
                onChange={(e) => setStokFisik(e.target.value)}
                className="text-center text-lg font-bold"
                min="0"
                required
              />
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-slate-50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Selisih Stok
              </span>
              <span
                className={`font-bold ${
                  selisih > 0
                    ? "text-green-600"
                    : selisih < 0
                      ? "text-red-600"
                      : "text-gray-600"
                }`}
              >
                {selisih > 0 ? "+" : ""}
                {selisih} {item.satuan}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Nilai Penyesuaian
              </span>
              <span className="font-mono font-medium">
                Rp {Math.abs(nilaiSelisih).toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keterangan">Keterangan Penyesuaian</Label>
            <Textarea
              id="keterangan"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Barang rusak, hilang, atau bonus supplier"
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Penyesuaian"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
