"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Save, Store } from "lucide-react";

export default function SettingsTokoPage() {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState({
    namaToko: "",
    alamat: "",
    nomorTelepon: "",
    email: "",
    website: "",
    tagline: "",
    footerText: "",
    pajak: "0",
    includePajak: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await fetch("/api/settings/toko");
      const data = await response.json();
      
      if (response.ok) {
        setFormData({
          namaToko: data.namaToko || "",
          alamat: data.alamat || "",
          nomorTelepon: data.nomorTelepon || "",
          email: data.email || "",
          website: data.website || "",
          tagline: data.tagline || "",
          footerText: data.footerText || "",
          pajak: data.pajak?.toString() || "0",
          includePajak: data.includePajak || false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Gagal memuat pengaturan toko");
    } finally {
      setLoadingData(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/settings/toko", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Gagal menyimpan pengaturan");
      }

      toast.success("Pengaturan toko berhasil disimpan");
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan pengaturan");
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Pengaturan Toko" description="Kelola informasi toko dan struk pembayaran" />

      <div className="flex-1 p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informasi Toko */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  <CardTitle>Informasi Toko</CardTitle>
                </div>
                <CardDescription>
                  Informasi ini akan ditampilkan di struk pembayaran
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="namaToko">
                      Nama Toko <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="namaToko"
                      value={formData.namaToko}
                      onChange={(e) =>
                        setFormData({ ...formData, namaToko: e.target.value })
                      }
                      placeholder="Toko ABC"
                      required
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
                      placeholder="0812-3456-7890"
                    />
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
                    placeholder="Jl. Contoh No. 123, Jakarta"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="toko@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) =>
                        setFormData({ ...formData, website: e.target.value })
                      }
                      placeholder="www.tokosaya.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline / Motto Toko</Label>
                  <Input
                    id="tagline"
                    value={formData.tagline}
                    onChange={(e) =>
                      setFormData({ ...formData, tagline: e.target.value })
                    }
                    placeholder="Melayani Dengan Sepenuh Hati"
                  />
                  <p className="text-xs text-muted-foreground">
                    Akan ditampilkan di bawah header struk
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="footerText">Teks Footer Struk</Label>
                  <Textarea
                    id="footerText"
                    value={formData.footerText}
                    onChange={(e) =>
                      setFormData({ ...formData, footerText: e.target.value })
                    }
                    placeholder="Terima kasih atas kunjungan Anda"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    Pesan yang akan ditampilkan di bagian bawah struk
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Pengaturan Pajak */}
            <Card>
              <CardHeader>
                <CardTitle>Pengaturan Pajak</CardTitle>
                <CardDescription>
                  Konfigurasi pajak untuk transaksi penjualan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includePajak"
                    checked={formData.includePajak}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, includePajak: checked as boolean })
                    }
                  />
                  <Label htmlFor="includePajak" className="cursor-pointer">
                    Tampilkan pajak di struk
                  </Label>
                </div>

                {formData.includePajak && (
                  <div className="space-y-2">
                    <Label htmlFor="pajak">Persentase Pajak (%)</Label>
                    <Input
                      id="pajak"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.pajak}
                      onChange={(e) =>
                        setFormData({ ...formData, pajak: e.target.value })
                      }
                      placeholder="10.00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Contoh: 10 untuk PPN 10%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchSettings()}
                disabled={loading}
              >
                Reset
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Pengaturan
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Preview Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Preview Struk</CardTitle>
              <CardDescription>
                Contoh tampilan informasi di struk pembayaran
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-white max-w-sm mx-auto font-mono text-xs">
                <div className="text-center space-y-1">
                  <div className="font-bold text-sm">{formData.namaToko || "Nama Toko"}</div>
                  {formData.alamat && <div>{formData.alamat}</div>}
                  {formData.nomorTelepon && <div>Telp: {formData.nomorTelepon}</div>}
                  {formData.email && <div>{formData.email}</div>}
                  {formData.tagline && (
                    <div className="italic text-gray-600 mt-2">{formData.tagline}</div>
                  )}
                </div>
                <div className="border-t border-dashed my-2"></div>
                <div className="text-center text-gray-500">
                  [Isi Transaksi]
                </div>
                <div className="border-t border-dashed my-2"></div>
                <div className="text-center space-y-1">
                  <div>{formData.footerText || "Terima kasih atas kunjungan Anda"}</div>
                  <div className="text-xs mt-2">*** SIMPAN STRUK INI ***</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
