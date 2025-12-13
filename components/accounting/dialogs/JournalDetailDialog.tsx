"use client";

import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { JurnalEntry } from "@/types/accounting";

interface JournalDetailDialogProps {
  entry: JurnalEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JournalDetailDialog({
  entry,
  open,
  onOpenChange,
}: JournalDetailDialogProps) {
  if (!entry) return null;

  const totalDebit = entry.details.reduce(
    (sum, detail) => sum + Number(detail.debit),
    0,
  );
  const totalKredit = entry.details.reduce(
    (sum, detail) => sum + Number(detail.kredit),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Jurnal - {entry.nomorJurnal}</DialogTitle>
          <DialogDescription>
            Rincian lengkap entri jurnal dengan prinsip double-entry accounting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Journal Header Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Tanggal
              </Label>
              <p className="text-sm">
                {new Date(entry.tanggal).toLocaleDateString("id-ID")}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Status
              </Label>
              <Badge variant={entry.isPosted ? "default" : "secondary"}>
                {entry.isPosted ? "Posted" : "Draft"}
              </Badge>
            </div>
            <div className="col-span-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Deskripsi
              </Label>
              <p className="text-sm">{entry.deskripsi}</p>
            </div>
            {entry.referensi && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Referensi
                </Label>
                <p className="text-sm">{entry.referensi}</p>
              </div>
            )}
            {entry.tipeReferensi && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Tipe Referensi
                </Label>
                <p className="text-sm">{entry.tipeReferensi}</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Periode
              </Label>
              <p className="text-sm">{entry.periode.nama}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                User
              </Label>
              <p className="text-sm">{entry.user.nama}</p>
            </div>
          </div>

          {/* Journal Details Table */}
          <div className="space-y-4">
            <Label className="text-base font-medium">
              Rincian Debit dan Kredit
            </Label>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Akun</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Kredit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.details.map((detail, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {detail.akun.kode} - {detail.akun.nama}
                      </TableCell>
                      <TableCell>{detail.deskripsi}</TableCell>
                      <TableCell className="text-right">
                        {detail.debit > 0
                          ? `Rp ${detail.debit.toLocaleString("id-ID")}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {detail.kredit > 0
                          ? `Rp ${detail.kredit.toLocaleString("id-ID")}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={2} className="text-right">
                      Total
                    </TableCell>
                    <TableCell className="text-right">
                      Rp {totalDebit.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp {totalKredit.toLocaleString("id-ID")}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Balance Check */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">
                  Status Keseimbangan
                </Label>
                <p className="text-sm text-muted-foreground">
                  Debit harus sama dengan Kredit
                </p>
              </div>
              <Badge
                variant={totalDebit === totalKredit ? "default" : "destructive"}
              >
                {totalDebit === totalKredit ? "Seimbang" : "Tidak Seimbang"}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
