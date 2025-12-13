"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Barang {
  id: string;
  nama: string;
  hargaBeli: number;
  hargaJual: number;
}

interface RabatPreset {
  mdl: number;
  rabat: number;
}

const RABAT_PRESETS: RabatPreset[] = [
  { mdl: 25, rabat: 20 },
  { mdl: 30, rabat: 23 },
  { mdl: 35, rabat: 25.8 },
  { mdl: 40, rabat: 28.5 },
  { mdl: 43, rabat: 30 },
  { mdl: 50, rabat: 33.3 },
  { mdl: 54, rabat: 35 },
  { mdl: 60, rabat: 37.5 },
  { mdl: 66.7, rabat: 40 },
  { mdl: 15, rabat: 13 },
  { mdl: 17.7, rabat: 15 },
  { mdl: 12.5, rabat: 11.1 },
  { mdl: 15, rabat: 13 },
  { mdl: 11.2, rabat: 10 },
];

export default function KalkulatorRabatPage() {
  const [barangList, setBarangList] = useState<Barang[]>([]);
  const [selectedBarangId, setSelectedBarangId] = useState<string>("");
  const [modalHarga, setModalHarga] = useState<number>(0);
  const [modalHargaDisplay, setModalHargaDisplay] = useState<string>("");
  const [persenMdl, setPersenMdl] = useState<number>(30);
  const [persenRabat, setPersenRabat] = useState<number>(23);
  const [loading, setLoading] = useState(true);

  // Fetch barang dari API
  useEffect(() => {
    const fetchBarang = async () => {
      try {
        const response = await fetch("/api/barang");
        if (response.ok) {
          const data = await response.json();
          setBarangList(data);
        }
      } catch (error) {
        toast.error("Gagal memuat data barang");
      } finally {
        setLoading(false);
      }
    };

    fetchBarang();
  }, []);

  // Update modal harga saat barang dipilih
  useEffect(() => {
    if (selectedBarangId) {
      const barang = barangList.find((b) => b.id === selectedBarangId);
      if (barang) {
        setModalHarga(barang.hargaBeli);
        setModalHargaDisplay(formatNumber(barang.hargaBeli));
      }
    }
  }, [selectedBarangId, barangList]);

  // Format number dengan pemisah ribuan
  const formatNumber = (num: number): string => {
    if (num === 0) return "";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Parse number dari string dengan pemisah ribuan
  const parseNumber = (str: string): number => {
    const cleaned = str.replace(/\./g, "");
    return cleaned === "" ? 0 : Number(cleaned);
  };

  // Handle input harga modal dengan format
  const handleModalHargaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Hanya izinkan angka dan titik
    const cleaned = value.replace(/[^\d]/g, "");
    const numValue = cleaned === "" ? 0 : Number(cleaned);
    setModalHarga(numValue);
    setModalHargaDisplay(cleaned === "" ? "" : formatNumber(numValue));
  };

  // Perhitungan Rabat
  const hargaPas = useMemo(() => {
    // Harga Pas = Modal * (1 + persenMdl/100)
    return modalHarga * (1 + persenMdl / 100);
  }, [modalHarga, persenMdl]);

  const hargaSetelahRabat = useMemo(() => {
    // Harga Setelah Rabat = Harga Pas * (1 - persenRabat/100)
    return hargaPas * (1 - persenRabat / 100);
  }, [hargaPas, persenRabat]);

  const selisih = useMemo(() => {
    return hargaSetelahRabat - modalHarga;
  }, [hargaSetelahRabat, modalHarga]);

  const persenSelisih = useMemo(() => {
    if (modalHarga === 0) return 0;
    return ((hargaSetelahRabat - modalHarga) / modalHarga) * 100;
  }, [hargaSetelahRabat, modalHarga]);

  // Status validasi (bagus jika selisih < 5%)
  const isValid = Math.abs(selisih) < modalHarga * 0.05;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const applyPreset = (preset: RabatPreset) => {
    setPersenMdl(preset.mdl);
    setPersenRabat(preset.rabat);
  };

  const selectedBarang = barangList.find((b) => b.id === selectedBarangId);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Kalkulator Rabat
          </h2>
          <p className="text-muted-foreground mt-1">
            Harga jual optimal dengan perhitungan rabat
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Input Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pilih Barang */}
            <div className="space-y-2">
              <Label htmlFor="barang">Pilih Barang</Label>
              <Select
                value={selectedBarangId}
                onValueChange={setSelectedBarangId}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Pilih barang dari inventaris" />
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <SelectItem value="loading" disabled>
                      Memuat data...
                    </SelectItem>
                  ) : barangList.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      Tidak ada barang
                    </SelectItem>
                  ) : (
                    barangList.map((barang) => (
                      <SelectItem key={barang.id} value={barang.id}>
                        {barang.nama}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Harga Modal */}
            <div className="space-y-2">
              <Label htmlFor="modal">Harga Modal</Label>
              <Input
                id="modal"
                type="text"
                value={modalHargaDisplay}
                onChange={handleModalHargaChange}
                className="mt-2"
                placeholder="Masukkan harga modal"
              />
              {selectedBarang && (
                <p className="text-xs text-muted-foreground">
                  Harga Jual Saat Ini:{" "}
                  {formatCurrency(selectedBarang.hargaJual)}
                </p>
              )}
            </div>

            {/* Persen MDL */}
            <div className="space-y-2">
              <Label htmlFor="mdl">Markup (MDL) %</Label>
              <Input
                id="mdl"
                type="number"
                step="0.1"
                value={persenMdl}
                onChange={(e) => setPersenMdl(Number(e.target.value))}
                className="mt-2"
                placeholder="Contoh: 30"
              />
            </div>

            {/* Persen Rabat */}
            <div className="space-y-2">
              <Label htmlFor="rabat">Rabat %</Label>
              <Input
                id="rabat"
                type="number"
                step="0.1"
                value={persenRabat}
                onChange={(e) => setPersenRabat(Number(e.target.value))}
                className="mt-2"
                placeholder="Contoh: 23"
              />
            </div>
          </CardContent>
        </Card>

        {/* Result Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Hasil Perhitungan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Harga Modal:</span>
                <span className="font-bold">{formatCurrency(modalHarga)}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <span className="text-sm font-medium">
                  Harga Jual (+ {persenMdl}%):
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(hargaPas)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <span className="text-sm font-medium">
                  Harga Setelah Rabat (- {persenRabat}%):
                </span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(hargaSetelahRabat)}
                </span>
              </div>

              <div
                className={`flex justify-between items-center p-3 rounded-lg ${
                  isValid
                    ? "bg-emerald-50 dark:bg-emerald-950"
                    : "bg-blue-50 dark:bg-blue-950"
                }`}
              >
                <span className="text-sm font-medium">Selisih:</span>
                <span
                  className={`font-bold ${
                    isValid
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {formatCurrency(selisih)} ({persenSelisih.toFixed(2)}%)
                </span>
              </div>

              {/* Status Badge */}

              {/* Formula Info */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                <p className="font-semibold">Formula:</p>
                <p>1. Harga Jual = Modal × (1 + MDL%)</p>
                <p>2. Harga Setelah Rabat = Harga Jual × (1 - Rabat%)</p>
                <p>3. Selisih = Harga Setelah Rabat - Modal</p>
                {/* <p className="text-muted-foreground italic mt-2">
                  * Bagus jika selisih {"<"} 5% dari modal
                </p> */}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preset Rabat */}
      <Card>
        <CardHeader>
          <CardTitle>Pilih Perhitungan Rabat</CardTitle>
          <p className="text-sm text-muted-foreground">
            Klik untuk menggunakan kombinasi %MDL + %Rabat yang sudah ditentukan
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {RABAT_PRESETS.map((preset, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => applyPreset(preset)}
                className="flex flex-col h-auto py-3"
              >
                <span className="text-xs text-muted-foreground">
                  MDL + Rabat
                </span>
                <span className="font-bold">
                  {preset.mdl}% + {preset.rabat}%
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
