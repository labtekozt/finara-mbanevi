"use client";

import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { StyledTabs, StyledTabsList, StyledTabsTrigger } from "@/components/ui/styled-tabs";
import {
  Package,
  TrendingUp,
  TrendingDown,
  History,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  TambahEditBarangDialog,
  BarangKeluarDialog,
} from "@/components/inventory";
import { DaftarBarangTab } from "./tabs/DaftarBarangTab";
import { HistoryBarangMasukTab } from "./tabs/HistoryBarangMasukTab";
import { HistoryBarangKeluarTab } from "./tabs/HistoryBarangKeluarTab";
import { HistoryPenjualanTab } from "./tabs/HistoryPenjualanTab";

interface Barang {
  id: string;
  nama: string;
  sku?: string;
  kategori: string;
  stok: number;
  stokMinimum: number;
  hargaBeli: number;
  hargaJual: number;
  satuan: string;
  deskripsi?: string;
  lokasiId: string;
  lokasi: {
    id: string;
    namaLokasi: string;
  };
}

interface Lokasi {
  id: string;
  namaLokasi: string;
  alamat?: string;
}

interface TransaksiMasuk {
  id: string;
  nomorTransaksi: string;
  tanggal: string;
  qty: number;
  hargaBeli: number;
  totalNilai: number;
  sumber: string;
  keterangan?: string;
  barang: Barang;
  lokasi: Lokasi;
}

interface TransaksiKeluar {
  id: string;
  nomorTransaksi: string;
  tanggal: string;
  qty: number;
  hargaBarang: number;
  totalNilai: number;
  tujuan: string;
  keterangan?: string;
  barang: Barang;
  lokasi: Lokasi;
}

interface ItemTransaksiKasir {
  id: string;
  namaBarang: string;
  qty: number;
  hargaSatuan: number;
  subtotal: number;
  barang: Barang;
}

interface TransaksiKasir {
  id: string;
  nomorTransaksi: string;
  tanggal: string;
  total: number;
  metodePembayaran: string;
  kasir: {
    id: string;
    nama: string;
    username: string;
  };
  itemTransaksi: ItemTransaksiKasir[];
}

export default function InventarisPage() {
  const [barang, setBarang] = useState<Barang[]>([]);
  const [lokasi, setLokasi] = useState<Lokasi[]>([]);
  const [transaksiMasuk, setTransaksiMasuk] = useState<TransaksiMasuk[]>([]);
  const [transaksiKeluar, setTransaksiKeluar] = useState<TransaksiKeluar[]>([]);
  const [transaksiKasir, setTransaksiKasir] = useState<TransaksiKasir[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchKasir, setSearchKasir] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState("ALL");
  const [lokasiFilter, setLokasiFilter] = useState("ALL");
  const [stokRendahFilter, setStokRendahFilter] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKeluarOpen, setDialogKeluarOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Barang | null>(null);
  const [sortColumn, setSortColumn] = useState<string>("nama");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [startDateKeluar, setStartDateKeluar] = useState("");
  const [endDateKeluar, setEndDateKeluar] = useState("");
  const [startDateKasir, setStartDateKasir] = useState("");
  const [endDateKasir, setEndDateKasir] = useState("");
  const [sortColumnMasuk, setSortColumnMasuk] = useState<string>("tanggal");
  const [sortDirectionMasuk, setSortDirectionMasuk] = useState<"asc" | "desc">(
    "desc",
  );
  const [sortColumnKeluar, setSortColumnKeluar] = useState<string>("tanggal");
  const [sortDirectionKeluar, setSortDirectionKeluar] = useState<
    "asc" | "desc"
  >("desc");
  const [sortColumnKasir, setSortColumnKasir] = useState<string>("tanggal");
  const [sortDirectionKasir, setSortDirectionKasir] = useState<"asc" | "desc">(
    "desc",
  );

  // Pagination states
  const [currentPageBarang, setCurrentPageBarang] = useState(1);
  const [currentPageMasuk, setCurrentPageMasuk] = useState(1);
  const [currentPageKeluar, setCurrentPageKeluar] = useState(1);
  const [currentPageKasir, setCurrentPageKasir] = useState(1);
  const itemsPerPage = 10;

  // Mode: "new" untuk barang baru custom, "existing" untuk update stok barang existing
  const [tambahMode, setTambahMode] = useState<"new" | "existing">("existing");

  const [formData, setFormData] = useState({
    nama: "",
    sku: "",
    kategori: "",
    stok: 0,
    stokMinimum: 10,
    hargaBeli: 0,
    hargaJual: 0,
    satuan: "pcs",
    deskripsi: "",
    lokasiId: "",
  });

  // Form untuk tambah stok barang existing
  const [formTambahStok, setFormTambahStok] = useState({
    barangId: "",
    qty: 0,
    hargaBeli: 0,
    sumber: "",
    lokasiId: "",
    keterangan: "",
    reason: "PURCHASE" as
      | "PURCHASE"
      | "STOCK_OPNAME_SURPLUS"
      | "INTERNAL_ADJUSTMENT",
    paymentMethod: "CREDIT" as "CASH" | "CREDIT" | undefined,
  });

  // Form untuk barang keluar
  const [formKeluar, setFormKeluar] = useState({
    barangId: "",
    qty: 0,
    tujuan: "",
    lokasiId: "",
    keterangan: "",
  });

  useEffect(() => {
    fetchData();
  }, [search, kategoriFilter, lokasiFilter]);

  // Reset pagination saat filter/sort berubah
  useEffect(() => {
    setCurrentPageBarang(1);
  }, [
    search,
    kategoriFilter,
    lokasiFilter,
    stokRendahFilter,
    sortColumn,
    sortDirection,
  ]);

  useEffect(() => {
    setCurrentPageMasuk(1);
  }, [sortColumnMasuk, sortDirectionMasuk]);

  useEffect(() => {
    setCurrentPageKeluar(1);
  }, [startDateKeluar, endDateKeluar, sortColumnKeluar, sortDirectionKeluar]);

  useEffect(() => {
    setCurrentPageKasir(1);
  }, [
    startDateKasir,
    endDateKasir,
    sortColumnKasir,
    sortDirectionKasir,
    searchKasir,
  ]);

  const sortedBarang = useMemo(() => {
    let filtered = [...barang];

    // Filter stok rendah jika diaktifkan
    if (stokRendahFilter) {
      filtered = filtered.filter((item) => item.stok <= item.stokMinimum);
    }

    return filtered.sort((a, b) => {
      let aValue: any = a[sortColumn as keyof Barang];
      let bValue: any = b[sortColumn as keyof Barang];

      if (sortColumn === "lokasi") {
        aValue = a.lokasi.namaLokasi;
        bValue = b.lokasi.namaLokasi;
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [barang, sortColumn, sortDirection, stokRendahFilter]);

  const sortedTransaksiKeluar = useMemo(() => {
    let filtered = [...transaksiKeluar];

    // Filter berdasarkan range tanggal
    if (startDateKeluar || endDateKeluar) {
      filtered = filtered.filter((tr) => {
        const transaksiDate = new Date(tr.tanggal);
        const start = startDateKeluar ? new Date(startDateKeluar) : null;
        const end = endDateKeluar ? new Date(endDateKeluar) : null;

        // Set time untuk perbandingan yang akurat
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        transaksiDate.setHours(0, 0, 0, 0);

        if (start && end) {
          return transaksiDate >= start && transaksiDate <= end;
        } else if (start) {
          return transaksiDate >= start;
        } else if (end) {
          return transaksiDate <= end;
        }
        return true;
      });
    }

    return filtered.sort((a, b) => {
      let aValue: any = a[sortColumnKeluar as keyof TransaksiKeluar];
      let bValue: any = b[sortColumnKeluar as keyof TransaksiKeluar];

      if (sortColumnKeluar === "tanggal") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortColumnKeluar === "barang") {
        aValue = a.barang.nama.toLowerCase();
        bValue = b.barang.nama.toLowerCase();
      } else if (sortColumnKeluar === "lokasi") {
        aValue = a.lokasi.namaLokasi.toLowerCase();
        bValue = b.lokasi.namaLokasi.toLowerCase();
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirectionKeluar === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirectionKeluar === "asc" ? 1 : -1;
      return 0;
    });
  }, [
    transaksiKeluar,
    sortColumnKeluar,
    sortDirectionKeluar,
    startDateKeluar,
    endDateKeluar,
  ]);

  const sortedTransaksiMasuk = useMemo(() => {
    return [...transaksiMasuk].sort((a, b) => {
      let aValue: any = a[sortColumnMasuk as keyof TransaksiMasuk];
      let bValue: any = b[sortColumnMasuk as keyof TransaksiMasuk];

      if (sortColumnMasuk === "tanggal") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortColumnMasuk === "barang") {
        aValue = a.barang.nama.toLowerCase();
        bValue = b.barang.nama.toLowerCase();
      } else if (sortColumnMasuk === "lokasi") {
        aValue = a.lokasi.namaLokasi.toLowerCase();
        bValue = b.lokasi.namaLokasi.toLowerCase();
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirectionMasuk === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirectionMasuk === "asc" ? 1 : -1;
      return 0;
    });
  }, [transaksiMasuk, sortColumnMasuk, sortDirectionMasuk]);

  const sortedTransaksiKasir = useMemo(() => {
    let filtered = [...transaksiKasir];

    // Filter berdasarkan range tanggal
    if (startDateKasir || endDateKasir) {
      filtered = filtered.filter((tr) => {
        const transaksiDate = new Date(tr.tanggal);
        const start = startDateKasir ? new Date(startDateKasir) : null;
        const end = endDateKasir ? new Date(endDateKasir) : null;

        // Set time untuk perbandingan yang akurat
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);
        transaksiDate.setHours(0, 0, 0, 0);

        if (start && end) {
          return transaksiDate >= start && transaksiDate <= end;
        } else if (start) {
          return transaksiDate >= start;
        } else if (end) {
          return transaksiDate <= end;
        }
        return true;
      });
    }

    // Filter berdasarkan search term (cari di nomor transaksi, nama barang, kasir, metode pembayaran)
    if (searchKasir.trim()) {
      const searchLower = searchKasir.toLowerCase().trim();
      filtered = filtered.filter((tr) => {
        // Cek nomor transaksi
        if (tr.nomorTransaksi.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Cek kasir
        if (tr.kasir.nama.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Cek metode pembayaran
        if (tr.metodePembayaran.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Cek nama barang di item transaksi
        const hasMatchingItem = tr.itemTransaksi.some((item) =>
          item.namaBarang.toLowerCase().includes(searchLower),
        );
        return hasMatchingItem;
      });
    }

    return filtered.sort((a, b) => {
      let aValue: any = a[sortColumnKasir as keyof TransaksiKasir];
      let bValue: any = b[sortColumnKasir as keyof TransaksiKasir];

      if (sortColumnKasir === "tanggal") {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortColumnKasir === "kasir") {
        aValue = a.kasir.nama.toLowerCase();
        bValue = b.kasir.nama.toLowerCase();
      } else if (sortColumnKasir === "metodePembayaran") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirectionKasir === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirectionKasir === "asc" ? 1 : -1;
      return 0;
    });
  }, [
    transaksiKasir,
    sortColumnKasir,
    sortDirectionKasir,
    startDateKasir,
    endDateKasir,
    searchKasir,
  ]);

  // Pagination untuk Barang
  const paginatedBarang = useMemo(() => {
    const startIndex = (currentPageBarang - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedBarang.slice(startIndex, endIndex);
  }, [sortedBarang, currentPageBarang, itemsPerPage]);

  const totalPagesBarang = Math.ceil(sortedBarang.length / itemsPerPage);

  // Pagination untuk Transaksi Masuk
  const paginatedTransaksiMasuk = useMemo(() => {
    const startIndex = (currentPageMasuk - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedTransaksiMasuk.slice(startIndex, endIndex);
  }, [sortedTransaksiMasuk, currentPageMasuk, itemsPerPage]);

  const totalPagesMasuk = Math.ceil(sortedTransaksiMasuk.length / itemsPerPage);

  // Pagination untuk Transaksi Keluar
  const paginatedTransaksiKeluar = useMemo(() => {
    const startIndex = (currentPageKeluar - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedTransaksiKeluar.slice(startIndex, endIndex);
  }, [sortedTransaksiKeluar, currentPageKeluar, itemsPerPage]);

  const totalPagesKeluar = Math.ceil(
    sortedTransaksiKeluar.length / itemsPerPage,
  );

  // Pagination untuk Transaksi Kasir (per item)
  const paginatedTransaksiKasir = useMemo(() => {
    // Flatten dulu untuk menghitung total items
    const allItems = sortedTransaksiKasir.flatMap((tr) =>
      tr.itemTransaksi.map((item) => ({ tr, item })),
    );

    const startIndex = (currentPageKasir - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allItems.slice(startIndex, endIndex);
  }, [sortedTransaksiKasir, currentPageKasir, itemsPerPage]);

  const totalPagesKasir = Math.ceil(
    sortedTransaksiKasir.reduce((sum, tr) => sum + tr.itemTransaksi.length, 0) /
      itemsPerPage,
  );

  function handleSort(column: string) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  function handleSortKeluar(column: string) {
    if (sortColumnKeluar === column) {
      setSortDirectionKeluar(sortDirectionKeluar === "asc" ? "desc" : "asc");
    } else {
      setSortColumnKeluar(column);
      setSortDirectionKeluar("desc");
    }
  }

  function handleSortMasuk(column: string) {
    if (sortColumnMasuk === column) {
      setSortDirectionMasuk(sortDirectionMasuk === "asc" ? "desc" : "asc");
    } else {
      setSortColumnMasuk(column);
      setSortDirectionMasuk("desc");
    }
  }

  function getSortIcon(column: string) {
    if (sortColumn !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  }

  function getSortIconKeluar(column: string) {
    if (sortColumnKeluar !== column)
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirectionKeluar === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  }

  function getSortIconMasuk(column: string) {
    if (sortColumnMasuk !== column)
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirectionMasuk === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  }

  function handleSortKasir(column: string) {
    if (sortColumnKasir === column) {
      setSortDirectionKasir(sortDirectionKasir === "asc" ? "desc" : "asc");
    } else {
      setSortColumnKasir(column);
      setSortDirectionKasir("desc");
    }
  }

  function getSortIconKasir(column: string) {
    if (sortColumnKasir !== column)
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirectionKasir === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  }

  async function fetchData() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (kategoriFilter && kategoriFilter !== "ALL")
        params.append("kategori", kategoriFilter);
      if (lokasiFilter && lokasiFilter !== "ALL")
        params.append("lokasiId", lokasiFilter);

      const [barangRes, lokasiRes, masukRes, keluarRes, kasirRes] = await Promise.all([
        fetch(`/api/barang?${params}`),
        fetch("/api/lokasi"),
        fetch("/api/transaksi-masuk"),
        fetch("/api/transaksi-keluar"),
        fetch("/api/transaksi-kasir"),
      ]);

      const barangData = await barangRes.json();
      const lokasiData = await lokasiRes.json();
      const masukData = await masukRes.json();
      const keluarData = await keluarRes.json();
      const kasirData = await kasirRes.json();

      setBarang(barangData);
      setLokasi(lokasiData);
      setTransaksiMasuk(masukData);
      setTransaksiKeluar(keluarData);
      setTransaksiKasir(kasirData);
    } catch (error) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  async function refreshLokasi() {
    try {
      const lokasiRes = await fetch("/api/lokasi");
      const lokasiData = await lokasiRes.json();
      setLokasi(lokasiData);
    } catch (error) {
      toast.error("Gagal memuat lokasi");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingItem) {
        // Mode edit barang existing
        const response = await fetch(`/api/barang/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Gagal mengupdate data");
        }

        toast.success("Barang berhasil diupdate");
      } else if (tambahMode === "new") {
        // Mode tambah barang baru custom
        const response = await fetch("/api/barang", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Gagal menambahkan barang baru");
        }

        toast.success("Barang baru berhasil ditambahkan");
      } else {
        // Mode tambah stok barang existing
        const payload = {
          ...formTambahStok,
          reason: formTambahStok.reason,
          paymentMethod:
            formTambahStok.reason === "PURCHASE"
              ? formTambahStok.paymentMethod
              : undefined,
        };

        const response = await fetch("/api/transaksi-masuk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Gagal menambah stok barang");
        }

        toast.success("Stok barang berhasil ditambahkan");
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitKeluar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/transaksi-keluar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formKeluar),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Gagal menyimpan transaksi");
      }

      toast.success("Barang keluar berhasil dicatat");
      setDialogKeluarOpen(false);
      resetFormKeluar();
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus barang ini?")) return;

    try {
      const response = await fetch(`/api/barang/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        // Jika barang sudah digunakan dalam transaksi
        if (response.status === 400 && data.message) {
          toast.error(data.message, {
            duration: 5000, // Tampil lebih lama karena pesan panjang
          });
        } else {
          toast.error(data.error || "Gagal menghapus barang");
        }
        return;
      }

      toast.success("Barang berhasil dihapus");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    }
  }

  function openEditDialog(item: Barang) {
    setEditingItem(item);
    setTambahMode("new"); // Tidak digunakan saat edit
    setFormData({
      nama: item.nama,
      sku: item.sku || "",
      kategori: item.kategori,
      stok: item.stok,
      stokMinimum: item.stokMinimum,
      hargaBeli: item.hargaBeli,
      hargaJual: item.hargaJual,
      satuan: item.satuan,
      deskripsi: item.deskripsi || "",
      lokasiId: item.lokasiId,
    });
    setDialogOpen(true);
  }

  function openTambahDialog() {
    setEditingItem(null);
    setTambahMode("existing"); // Default: tambah stok
    resetForm();
    setDialogOpen(true);
  }

  function resetForm() {
    setEditingItem(null);
    setFormData({
      nama: "",
      sku: "",
      kategori: "",
      stok: 0,
      stokMinimum: 10,
      hargaBeli: 0,
      hargaJual: 0,
      satuan: "pcs",
      deskripsi: "",
      lokasiId: "",
    });
    setFormTambahStok({
      barangId: "",
      qty: 0,
      hargaBeli: 0,
      sumber: "",
      lokasiId: "",
      keterangan: "",
      reason: "PURCHASE",
      paymentMethod: "CASH",
    });
  }

  function resetFormKeluar() {
    setFormKeluar({
      barangId: "",
      qty: 0,
      tujuan: "",
      lokasiId: "",
      keterangan: "",
    });
  }

  function handleBarangChangeTambahStok(barangId: string) {
    const selectedBarang = barang.find((b) => b.id === barangId);
    if (!selectedBarang) return;

    setFormTambahStok({
      ...formTambahStok,
      barangId,
      hargaBeli: selectedBarang.hargaBeli,
      lokasiId: selectedBarang.lokasiId,
      // Reset reason and payment method when changing item
      reason: "PURCHASE",
      paymentMethod: "CASH",
    });
  }

  // Handler untuk Select gabungan di modal tambah: jika value === "NEW" => mode new
  function handleSelectForTambah(value: string) {
    if (value === "NEW") {
      // pilih untuk membuat barang baru
      setTambahMode("new");
      // kosongkan pilihan tambah stok
      setFormTambahStok({
        barangId: "",
        qty: 0,
        hargaBeli: 0,
        sumber: "",
        lokasiId: "",
        keterangan: "",
        reason: "PURCHASE",
        paymentMethod: "CASH",
      });
      // reset formData untuk input barang baru
      setFormData({
        nama: "",
        sku: "",
        kategori: "",
        stok: 0,
        stokMinimum: 10,
        hargaBeli: 0,
        hargaJual: 0,
        satuan: "pcs",
        deskripsi: "",
        lokasiId: "",
      });
    } else {
      // pilih barang existing
      setTambahMode("existing");
      handleBarangChangeTambahStok(value);
    }
  }

  function handleBarangChangeKeluar(barangId: string) {
    const selectedBarang = barang.find((b) => b.id === barangId);
    if (!selectedBarang) return;

    setFormKeluar({
      ...formKeluar,
      barangId,
      lokasiId: selectedBarang.lokasiId,
    });
  }

  const kategoriList = Array.from(new Set(barang.map((item) => item.kategori)));

  // Komponen Pagination
  const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between px-2 py-4">
        <div className="text-sm text-muted-foreground">
          Halaman {currentPage} dari {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Sebelumnya
          </Button>
          {startPage > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(1)}
              >
                1
              </Button>
              {startPage > 2 && <span className="px-2">...</span>}
            </>
          )}
          {pages.map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          ))}
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="px-2">...</span>}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(totalPages)}
              >
                {totalPages}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Selanjutnya
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Inventaris" description="Kelola data barang dan stok" />

      <div className="flex-1 p-3 space-y-6">
        {/* Tabs: Daftar Barang & History Keluar */}
        <h1 className="text-lg font-bold">Pilih Menu</h1>
        <StyledTabs defaultValue="barang">
          <StyledTabsList>
            <StyledTabsTrigger value="barang">
              <Package className="mr-2 h-4 w-4" />
              Daftar Barang
            </StyledTabsTrigger>
            <StyledTabsTrigger value="masuk">
              <TrendingUp className="mr-2 h-4 w-4" />
              History Barang Masuk
            </StyledTabsTrigger>
            <StyledTabsTrigger value="history">
              <History className="mr-2 h-4 w-4" />
              History Barang Keluar
            </StyledTabsTrigger>
            <StyledTabsTrigger value="kasir">
              <TrendingDown className="mr-2 h-4 w-4" />
              History Penjualan Barang
            </StyledTabsTrigger>
          </StyledTabsList>
          {/* Tab Daftar Barang */}
          <TabsContent value="barang">
            <DaftarBarangTab
              originalBarang={barang}
              paginatedBarang={paginatedBarang}
              lokasi={lokasi}
              kategoriList={kategoriList}
              loading={loading}
              search={search}
              setSearch={setSearch}
              kategoriFilter={kategoriFilter}
              setKategoriFilter={setKategoriFilter}
              lokasiFilter={lokasiFilter}
              setLokasiFilter={setLokasiFilter}
              stokRendahFilter={stokRendahFilter}
              setStokRendahFilter={setStokRendahFilter}
              handleSort={handleSort}
              getSortIcon={getSortIcon}
              openTambahDialog={openTambahDialog}
              openEditDialog={openEditDialog}
              handleDelete={handleDelete}
              currentPage={currentPageBarang}
              totalPages={totalPagesBarang}
              setCurrentPage={setCurrentPageBarang}
              PaginationComponent={Pagination}
            />
          </TabsContent>

          {/* Tab History Barang Masuk */}
          <TabsContent value="masuk">
            <HistoryBarangMasukTab
              transaksiMasuk={sortedTransaksiMasuk}
              paginatedTransaksiMasuk={paginatedTransaksiMasuk}
              handleSort={handleSortMasuk}
              getSortIcon={getSortIconMasuk}
              currentPage={currentPageMasuk}
              totalPages={totalPagesMasuk}
              setCurrentPage={setCurrentPageMasuk}
              PaginationComponent={Pagination}
            />
          </TabsContent>

          {/* Tab History Barang Keluar */}
          <TabsContent value="history">
            <HistoryBarangKeluarTab
              sortedTransaksiKeluar={sortedTransaksiKeluar}
              paginatedTransaksiKeluar={paginatedTransaksiKeluar}
              lokasi={lokasi}
              kategoriList={kategoriList}
              search={search}
              setSearch={setSearch}
              kategoriFilter={kategoriFilter}
              setKategoriFilter={setKategoriFilter}
              lokasiFilter={lokasiFilter}
              setLokasiFilter={setLokasiFilter}
              startDateKeluar={startDateKeluar}
              endDateKeluar={endDateKeluar}
              handleSortKeluar={handleSortKeluar}
              getSortIconKeluar={getSortIconKeluar}
              setDialogKeluarOpen={setDialogKeluarOpen}
              currentPage={currentPageKeluar}
              totalPages={totalPagesKeluar}
              setCurrentPage={setCurrentPageKeluar}
              PaginationComponent={Pagination}
            />
          </TabsContent>

          {/* Tab Barang Keluar dari Kasir */}
          <TabsContent value="kasir">
            <HistoryPenjualanTab
              sortedTransaksiKasir={sortedTransaksiKasir}
              paginatedTransaksiKasir={paginatedTransaksiKasir}
              startDateKasir={startDateKasir}
              endDateKasir={endDateKasir}
              searchKasir={searchKasir}
              setSearchKasir={setSearchKasir}
              handleSortKasir={handleSortKasir}
              getSortIconKasir={getSortIconKasir}
              currentPage={currentPageKasir}
              totalPages={totalPagesKasir}
              setCurrentPage={setCurrentPageKasir}
              PaginationComponent={Pagination}
            />
          </TabsContent>
        </StyledTabs>
      </div>

      {/* Dialog Tambah/Edit Barang */}
      <TambahEditBarangDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingItem={editingItem}
        tambahMode={tambahMode}
        formData={formData}
        setFormData={setFormData}
        formTambahStok={formTambahStok}
        setFormTambahStok={setFormTambahStok}
        barang={barang}
        lokasi={lokasi}
        loading={loading}
        handleSubmit={handleSubmit}
        handleSelectForTambah={handleSelectForTambah}
        resetForm={resetForm}
        onLokasiAdded={refreshLokasi}
      />

      {/* Dialog Barang Keluar */}
      <BarangKeluarDialog
        open={dialogKeluarOpen}
        onOpenChange={setDialogKeluarOpen}
        formKeluar={formKeluar}
        setFormKeluar={setFormKeluar}
        barang={barang}
        lokasi={lokasi}
        loading={loading}
        handleSubmitKeluar={handleSubmitKeluar}
        handleBarangChangeKeluar={handleBarangChangeKeluar}
        resetFormKeluar={resetFormKeluar}
        onLokasiAdded={refreshLokasi}
      />
    </div>
  );
}
