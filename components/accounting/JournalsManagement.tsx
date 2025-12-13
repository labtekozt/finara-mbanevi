"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { TabsContent } from "@/components/ui/tabs";
import {
  StyledTabs,
  StyledTabsList,
  StyledTabsTrigger,
} from "@/components/ui/styled-tabs";
import {
  BookOpen,
  Plus,
  Search,
  Calendar,
  Eye,
  Edit,
  Trash2,
  BarChart3,
} from "lucide-react";
import { useJournals } from "@/hooks/accounting";
import { JurnalEntry, AccumulationPeriod } from "@/types/accounting";
import { JournalForm } from "./forms/JournalForm";
import { JournalDetailDialog } from "./dialogs/JournalDetailDialog";
import { AccumulationChart } from "./charts/AccumulationChart";
import { JournalRecapitulation } from "./JournalRecapitulation";

interface JournalsManagementProps {
  selectedPeriode?: string;
  className?: string;
}

const ACCUMULATION_PERIODS: { value: AccumulationPeriod; label: string }[] = [
  { value: "daily", label: "Harian" },
  { value: "monthly", label: "Bulanan" },
  { value: "yearly", label: "Tahunan" },
];

export function JournalsManagement({
  selectedPeriode,
  className,
}: JournalsManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JurnalEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JurnalEntry | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const {
    entries,
    loading,
    accumulationData,
    accumulationPeriod,
    accumulationLoading,
    setAccumulationPeriod,
    createEntry,
    updateEntry,
    deleteEntry,
  } = useJournals({
    periodeId: selectedPeriode,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: searchTerm || undefined,
  });

  const handleCreateEntry = async (data: any) => {
    const result = await createEntry(data);
    if (result) {
      setIsFormDialogOpen(false);
    }
  };

  const handleUpdateEntry = async (data: any) => {
    if (editingEntry) {
      const result = await updateEntry(editingEntry.id, data);
      if (result) {
        setIsFormDialogOpen(false);
        setEditingEntry(null);
      }
    }
  };

  const handleDeleteEntry = async (entry: JurnalEntry) => {
    if (
      confirm(`Apakah Anda yakin ingin menghapus jurnal "${entry.deskripsi}"?`)
    ) {
      await deleteEntry(entry.id);
    }
  };

  const openEditDialog = (entry: JurnalEntry) => {
    setEditingEntry(entry);
    setIsFormDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingEntry(null);
    setIsFormDialogOpen(true);
  };

  const openDetailDialog = (entry: JurnalEntry) => {
    setSelectedEntry(entry);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className={className}>
      <StyledTabs defaultValue="entries">
        <StyledTabsList>
          <StyledTabsTrigger value="entries">
            <BookOpen className="mr-2 h-4 w-4" />
            Daftar Jurnal
          </StyledTabsTrigger>
          <StyledTabsTrigger value="recapitulation">
            <BarChart3 className="mr-2 h-4 w-4" />
            Rekapitulasi
          </StyledTabsTrigger>
        </StyledTabsList>

        <TabsContent value="entries" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Jurnal Umum</h3>
              <p className="text-sm text-muted-foreground">
                Catat transaksi double-entry dalam jurnal umum
              </p>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Jurnal
            </Button>
          </div>
          {/* Filters */}
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Cari Jurnal</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Cari berdasarkan nomor atau deskripsi..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-32">
                  <Label htmlFor="start-date">Tanggal Mulai</Label>
                  <Input
                    id="start-date"
                    className="mt-2"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="w-full sm:w-32">
                  <Label htmlFor="end-date">Tanggal Akhir</Label>
                  <Input
                    className="mt-2"
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Journal Entries Table */}
          <Card className="mt-4">
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">
                    Memuat jurnal...
                  </div>
                </div>
              ) : !entries || entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Belum ada jurnal</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tambahkan jurnal pertama untuk memulai pencatatan
                  </p>
                  <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Jurnal Pertama
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Nomor Jurnal</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead>Total Debit</TableHead>
                      <TableHead>Total Kredit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => {
                      const totalDebit = entry.details.reduce(
                        (sum, detail) => sum + detail.debit,
                        0,
                      );
                      const totalKredit = entry.details.reduce(
                        (sum, detail) => sum + detail.kredit,
                        0,
                      );
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {new Date(entry.tanggal).toLocaleDateString(
                              "id-ID",
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {entry.nomorJurnal}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {entry.deskripsi}
                          </TableCell>
                          <TableCell>
                            Rp {totalDebit.toLocaleString("id-ID")}
                          </TableCell>
                          <TableCell>
                            Rp {totalKredit.toLocaleString("id-ID")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={entry.isPosted ? "default" : "secondary"}
                            >
                              {entry.isPosted ? "Posted" : "Draft"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDetailDialog(entry)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(entry)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEntry(entry)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recapitulation" className="space-y-4">
          <JournalRecapitulation selectedPeriode={selectedPeriode} />
        </TabsContent>
      </StyledTabs>

      {/* Journal Form Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Edit Jurnal" : "Tambah Jurnal Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingEntry
                ? "Perbarui entri jurnal yang dipilih"
                : "Buat entri jurnal dengan prinsip double-entry accounting"}
            </DialogDescription>
          </DialogHeader>

          <JournalForm
            entry={editingEntry}
            onSubmit={editingEntry ? handleUpdateEntry : handleCreateEntry}
            loading={loading}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFormDialogOpen(false)}
            >
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Journal Detail Dialog */}
      <JournalDetailDialog
        entry={selectedEntry}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
      />
    </div>
  );
}
