import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Barang, Lokasi } from "@/app/(dashboard)/inventaris/types";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface TambahEditBarangDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Barang | null;
  tambahMode: "new" | "existing";
  formData: {
    nama: string;
    sku: string;
    kategori: string;
    stok: number;
    stokMinimum: number;
    hargaBeli: number;
    hargaJual: number;
    satuan: string;
    deskripsi: string;
    lokasiId: string;
  };
  setFormData: (data: any) => void;
  formTambahStok: {
    barangId: string;
    qty: number;
    hargaBeli: number;
    sumber: string;
    lokasiId: string;
    keterangan: string;
    reason: "PURCHASE" | "STOCK_OPNAME_SURPLUS" | "INTERNAL_ADJUSTMENT";
    paymentMethod?: "CASH" | "CREDIT";
  };
  setFormTambahStok: (data: any) => void;
  barang: Barang[];
  lokasi: Lokasi[];
  loading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  handleSelectForTambah: (value: string) => void;
  resetForm: () => void;
  onLokasiAdded?: () => void;
}

export function TambahEditBarangDialog({
  open,
  onOpenChange,
  editingItem,
  tambahMode,
  formData,
  setFormData,
  formTambahStok,
  setFormTambahStok,
  barang,
  lokasi,
  loading,
  handleSubmit,
  handleSelectForTambah,
  resetForm,
  onLokasiAdded,
}: TambahEditBarangDialogProps) {
  const [lokasiDialogOpen, setLokasiDialogOpen] = useState(false);
  const [lokasiFormData, setLokasiFormData] = useState({
    namaLokasi: "",
    alamat: "",
  });
  const [lokasiLoading, setLokasiLoading] = useState(false);
  const [sumberMode, setSumberMode] = useState<"select" | "custom">("select");
  const [customSumber, setCustomSumber] = useState("");

  // Daftar sumber barang default
  const sumberBarangList = [
    "Sales muffin",
  ];

  const handleCreateLokasi = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lokasiFormData.namaLokasi.trim()) {
      toast.error("Nama lokasi harus diisi");
      return;
    }

    try {
      setLokasiLoading(true);
      const response = await fetch("/api/lokasi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          namaLokasi: lokasiFormData.namaLokasi.trim(),
          alamat: lokasiFormData.alamat.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal menambah lokasi");
      }

      toast.success("Lokasi berhasil ditambahkan");
      setLokasiDialogOpen(false);
      setLokasiFormData({ namaLokasi: "", alamat: "" });

      // Refresh lokasi list
      if (onLokasiAdded) {
        onLokasiAdded();
      }

      // Auto-select the newly created location
      if (editingItem || tambahMode === "new") {
        setFormData({ ...formData, lokasiId: data.id });
      } else {
        setFormTambahStok({ ...formTambahStok, lokasiId: data.id });
      }
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setLokasiLoading(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(open: boolean) => {
        onOpenChange(open);
        if (!open) resetForm();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Edit Barang" : "Tambah Barang"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Pilih barang atau tambah baru (gabungan) - tampil jika bukan edit */}
            {!editingItem && (
              <div className="space-y-2">
                <Label>Pilih Barang atau Tambah Baru</Label>
                <Select
                  value={
                    tambahMode === "new" ? "NEW" : formTambahStok.barangId || ""
                  }
                  onValueChange={(value: string) =>
                    handleSelectForTambah(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih barang atau tambah baru" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">➕ Tambah Barang Baru</SelectItem>
                    {barang.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nama} - Stok: {b.stok} {b.satuan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Form untuk TAMBAH STOK (existing) */}
            {!editingItem && tambahMode === "existing" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="qty-tambah">Jumlah Tambah Stok *</Label>
                    <Input
                      id="qty-tambah"
                      type="number"
                      value={formTambahStok.qty || ""}
                      onChange={(e) =>
                        setFormTambahStok({
                          ...formTambahStok,
                          qty: parseInt(e.target.value) || 0,
                        })
                      }
                      required
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="harga-beli-tambah">Harga Beli *</Label>
                    <Input
                      id="harga-beli-tambah"
                      type="number"
                      value={formTambahStok.hargaBeli || ""}
                      onChange={(e) =>
                        setFormTambahStok({
                          ...formTambahStok,
                          hargaBeli: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sumber-tambah">Sumber Barang *</Label>
                  {sumberMode === "select" ? (
                    <Select
                      value={
                        formTambahStok.sumber &&
                        sumberBarangList.includes(formTambahStok.sumber)
                          ? formTambahStok.sumber
                          : "CUSTOM"
                      }
                      onValueChange={(value: string) => {
                        if (value === "CUSTOM") {
                          setSumberMode("custom");
                          setCustomSumber("");
                          setFormTambahStok({
                            ...formTambahStok,
                            sumber: "",
                          });
                        } else {
                          setFormTambahStok({
                            ...formTambahStok,
                            sumber: value,
                          });
                        }
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih sumber barang" />
                      </SelectTrigger>
                      <SelectContent>
                        {sumberBarangList.map((sumber) => (
                          <SelectItem key={sumber} value={sumber}>
                            {sumber}
                          </SelectItem>
                        ))}
                        <SelectItem value="CUSTOM">
                          ➕ Tambah Sumber Lain
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        id="sumber-tambah"
                        value={customSumber}
                        onChange={(e) => {
                          setCustomSumber(e.target.value);
                          setFormTambahStok({
                            ...formTambahStok,
                            sumber: e.target.value,
                          });
                        }}
                        placeholder="Masukkan nama sumber barang"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSumberMode("select");
                          setCustomSumber("");
                        }}
                      >
                        Batal
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason-tambah">
                    Alasan Penambahan Stok *
                  </Label>
                  <Select
                    value={formTambahStok.reason}
                    onValueChange={(value: string) =>
                      setFormTambahStok({
                        ...formTambahStok,
                        reason: value as
                          | "PURCHASE"
                          | "STOCK_OPNAME_SURPLUS"
                          | "INTERNAL_ADJUSTMENT",
                        paymentMethod:
                          value === "PURCHASE"
                            ? formTambahStok.paymentMethod
                            : undefined,
                      })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih alasan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PURCHASE">Pembelian</SelectItem>
                      <SelectItem value="STOCK_OPNAME_SURPLUS">
                        Surplus Stock Opname
                      </SelectItem>
                      <SelectItem value="INTERNAL_ADJUSTMENT">
                        Penyesuaian Internal
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formTambahStok.reason === "PURCHASE" && (
                  <div className="space-y-2">
                    <Label htmlFor="payment-method-tambah">
                      Metode Pembayaran *
                    </Label>
                    <Select
                      value={formTambahStok.paymentMethod || ""}
                      onValueChange={(value: string) =>
                        setFormTambahStok({
                          ...formTambahStok,
                          paymentMethod: value as "CASH" | "CREDIT",
                        })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih metode pembayaran" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Tunai</SelectItem>
                        <SelectItem value="CREDIT">Kredit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="lokasi-tambah">Lokasi Gudang *</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select
                        value={formTambahStok.lokasiId}
                        onValueChange={(value: string) =>
                          setFormTambahStok({
                            ...formTambahStok,
                            lokasiId: value,
                          })
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih lokasi" />
                        </SelectTrigger>
                        <SelectContent>
                          {lokasi.map((lok) => (
                            <SelectItem key={lok.id} value={lok.id}>
                              {lok.namaLokasi}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setLokasiDialogOpen(true)}
                      title="Tambah Lokasi Baru"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keterangan-tambah">Keterangan</Label>
                  <Input
                    id="keterangan-tambah"
                    value={formTambahStok.keterangan}
                    onChange={(e) =>
                      setFormTambahStok({
                        ...formTambahStok,
                        keterangan: e.target.value,
                      })
                    }
                    placeholder="Catatan tambahan (opsional)"
                  />
                </div>

                {formTambahStok.qty > 0 && formTambahStok.hargaBeli > 0 && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">
                      Total Nilai Tambah Stok
                    </div>
                    <div className="text-2xl font-bold">
                      Rp{" "}
                      {(
                        formTambahStok.qty * formTambahStok.hargaBeli
                      ).toLocaleString("id-ID")}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Form untuk BARANG BARU (custom) atau EDIT */}
            {(editingItem || tambahMode === "new") && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nama">Nama Barang *</Label>
                    <Input
                      id="nama"
                      value={formData.nama}
                      onChange={(e) =>
                        setFormData({ ...formData, nama: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData({ ...formData, sku: e.target.value })
                      }
                      placeholder="Kode unik (opsional)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kategori">Kategori *</Label>
                    <Input
                      id="kategori"
                      value={formData.kategori}
                      onChange={(e) =>
                        setFormData({ ...formData, kategori: e.target.value })
                      }
                      placeholder="Contoh: Elektronik, Makanan"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="satuan">Satuan *</Label>
                    <Input
                      id="satuan"
                      value={formData.satuan}
                      onChange={(e) =>
                        setFormData({ ...formData, satuan: e.target.value })
                      }
                      placeholder="Contoh: pcs, kg, box"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stok">Stok Awal *</Label>
                    <Input
                      id="stok"
                      type="number"
                      value={formData.stok}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stok: parseInt(e.target.value) || 0,
                        })
                      }
                      required
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stokMinimum">Stok Minimum *</Label>
                    <Input
                      id="stokMinimum"
                      type="number"
                      value={formData.stokMinimum}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stokMinimum: parseInt(e.target.value) || 0,
                        })
                      }
                      required
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hargaBeli">Harga Beli *</Label>
                    <Input
                      id="hargaBeli"
                      type="number"
                      value={formData.hargaBeli}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hargaBeli: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hargaJual">Harga Jual *</Label>
                    <Input
                      id="hargaJual"
                      type="number"
                      value={formData.hargaJual}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hargaJual: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lokasiId">Lokasi *</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select
                        value={formData.lokasiId}
                        onValueChange={(value: string) =>
                          setFormData({ ...formData, lokasiId: value })
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih lokasi" />
                        </SelectTrigger>
                        <SelectContent>
                          {lokasi.map((lok) => (
                            <SelectItem key={lok.id} value={lok.id}>
                              {lok.namaLokasi}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setLokasiDialogOpen(true)}
                      title="Tambah Lokasi Baru"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deskripsi">Deskripsi</Label>
                  <Input
                    id="deskripsi"
                    value={formData.deskripsi}
                    onChange={(e) =>
                      setFormData({ ...formData, deskripsi: e.target.value })
                    }
                    placeholder="Informasi tambahan (opsional)"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : editingItem ? "Update" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Dialog Tambah Lokasi */}
      <Dialog open={lokasiDialogOpen} onOpenChange={setLokasiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Lokasi Baru</DialogTitle>
            <DialogDescription>
              Tambahkan lokasi gudang baru ke sistem
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLokasi}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="namaLokasi">Nama Lokasi *</Label>
                <Input
                  id="namaLokasi"
                  value={lokasiFormData.namaLokasi}
                  onChange={(e) =>
                    setLokasiFormData({
                      ...lokasiFormData,
                      namaLokasi: e.target.value,
                    })
                  }
                  placeholder="Contoh: Gudang Utama, Cabang A"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alamat">Alamat</Label>
                <Input
                  id="alamat"
                  value={lokasiFormData.alamat}
                  onChange={(e) =>
                    setLokasiFormData({
                      ...lokasiFormData,
                      alamat: e.target.value,
                    })
                  }
                  placeholder="Alamat lokasi (opsional)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setLokasiDialogOpen(false);
                  setLokasiFormData({ namaLokasi: "", alamat: "" });
                }}
                disabled={lokasiLoading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={lokasiLoading}>
                {lokasiLoading ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
