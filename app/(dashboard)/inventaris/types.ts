export interface Barang {
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

export interface Lokasi {
  id: string;
  namaLokasi: string;
  alamat?: string;
}

export interface TransaksiMasuk {
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

export interface TransaksiKeluar {
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

export interface ItemTransaksiKasir {
  id: string;
  namaBarang: string;
  qty: number;
  hargaSatuan: number;
  subtotal: number;
  barang: Barang;
}

export interface TransaksiKasir {
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
