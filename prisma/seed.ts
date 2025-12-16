import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create users
  console.log("Creating users...");
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      nama: "Nevi Administrator",
      username: "Nevi",
      email: "admin@finara.com",
      password: await bcrypt.hash("Imanuel28", 10),
      role: "ADMIN",
    },
  });

  const kasir = await prisma.user.upsert({
    where: { username: "kasir" },
    update: {},
    create: {
      nama: "Nevi Kasir",
      username: "Gerijaya",
      email: "kasir@finara.com",
      password: await bcrypt.hash("Gerijaya04", 10),
      role: "KASIR",
    },
  });

  console.log("✓ Users created");

  // Create locations
  // console.log("Creating locations...");
  // const gudangUtama = await prisma.lokasi.create({
  //   data: {
  //     namaLokasi: "Gudang Utama",
  //     alamat: "Jl. Raya Industri No. 123, Jakarta",
  //   },
  // });

  // console.log("✓ Locations created");

  // Create accounting period
  // console.log("Creating accounting period...");
  // const periodeAkuntansi = await prisma.periodeAkuntansi.create({
  //   data: {
  //     nama: "2025 - Tahun Berjalan",
  //     tanggalMulai: new Date("2025-01-01"),
  //     tanggalAkhir: new Date("2025-12-31"),
  //     isActive: true,
  //   },
  // });

  // console.log("✓ Accounting period created");

  // Create chart of accounts
  console.log("Creating chart of accounts...");

  // Asset accounts
  const assetAccounts = [
    {
      kode: "1001",
      nama: "Kas",
      tipe: "ASSET",
      kategori: "CURRENT_ASSET",
      deskripsi: "Kas dan setara kas",
    },
    {
      kode: "1002",
      nama: "Piutang Dagang",
      tipe: "ASSET",
      kategori: "CURRENT_ASSET",
      deskripsi: "Piutang dari penjualan",
    },
    {
      kode: "1201",
      nama: "Persediaan Barang",
      tipe: "ASSET",
      kategori: "CURRENT_ASSET",
      deskripsi: "Persediaan barang dagang",
    },
    {
      kode: "1101",
      nama: "Peralatan Toko",
      tipe: "ASSET",
      kategori: "FIXED_ASSET",
      deskripsi: "Peralatan dan mesin toko",
    },
    {
      kode: "1102",
      nama: "Akumulasi Penyusutan",
      tipe: "ASSET",
      kategori: "FIXED_ASSET",
      deskripsi: "Akumulasi penyusutan aktiva tetap",
    },
  ];

  // Liability accounts
  const liabilityAccounts = [
    {
      kode: "2001",
      nama: "Hutang Dagang",
      tipe: "LIABILITY",
      kategori: "CURRENT_LIABILITY",
      deskripsi: "Hutang pembelian",
    },
    {
      kode: "2002",
      nama: "Hutang Pajak",
      tipe: "LIABILITY",
      kategori: "CURRENT_LIABILITY",
      deskripsi: "Hutang pajak yang belum dibayar",
    },
  ];

  // Equity accounts
  const equityAccounts = [
    {
      kode: "3001",
      nama: "Modal Pemilik",
      tipe: "EQUITY",
      kategori: "OWNER_EQUITY",
      deskripsi: "Modal yang disetor pemilik",
    },
    {
      kode: "3002",
      nama: "Laba Ditahan",
      tipe: "EQUITY",
      kategori: "RETAINED_EARNINGS",
      deskripsi: "Laba yang ditahan dalam perusahaan",
    },
  ];

  // Revenue accounts
  const revenueAccounts = [
    {
      kode: "4001",
      nama: "Pendapatan Penjualan",
      tipe: "REVENUE",
      kategori: "OPERATING_REVENUE",
      deskripsi: "Pendapatan dari penjualan barang",
    },
    {
      kode: "4002",
      nama: "Pendapatan Lain-lain",
      tipe: "REVENUE",
      kategori: "OTHER_REVENUE",
      deskripsi: "Pendapatan selain penjualan utama",
    },
  ];

  // Expense accounts
  const expenseAccounts = [
    {
      kode: "5001",
      nama: "Harga Pokok Penjualan",
      tipe: "EXPENSE",
      kategori: "OPERATING_EXPENSE",
      deskripsi: "Biaya pembelian barang yang dijual",
    },
    {
      kode: "5002",
      nama: "Gaji Karyawan",
      tipe: "EXPENSE",
      kategori: "OPERATING_EXPENSE",
      deskripsi: "Gaji dan tunjangan karyawan",
    },
    {
      kode: "5003",
      nama: "Biaya Listrik",
      tipe: "EXPENSE",
      kategori: "OPERATING_EXPENSE",
      deskripsi: "Biaya listrik dan utilitas",
    },
    {
      kode: "5004",
      nama: "Biaya Sewa",
      tipe: "EXPENSE",
      kategori: "OPERATING_EXPENSE",
      deskripsi: "Biaya sewa tempat usaha",
    },
    {
      kode: "5005",
      nama: "Biaya ATK",
      tipe: "EXPENSE",
      kategori: "OPERATING_EXPENSE",
      deskripsi: "Biaya alat tulis kantor",
    },
    {
      kode: "5006",
      nama: "Biaya Transportasi",
      tipe: "EXPENSE",
      kategori: "OPERATING_EXPENSE",
      deskripsi: "Biaya transportasi dan perjalanan",
    },
    {
      kode: "5007",
      nama: "Biaya Perbaikan",
      tipe: "EXPENSE",
      kategori: "OPERATING_EXPENSE",
      deskripsi: "Biaya perbaikan dan pemeliharaan",
    },
    {
      kode: "5008",
      nama: "Biaya Iklan & Promosi",
      tipe: "EXPENSE",
      kategori: "OPERATING_EXPENSE",
      deskripsi: "Biaya iklan dan promosi",
    },
    {
      kode: "5009",
      nama: "Biaya Pajak",
      tipe: "EXPENSE",
      kategori: "OPERATING_EXPENSE",
      deskripsi: "Biaya pajak dan retribusi",
    },
    {
      kode: "5010",
      nama: "Biaya Asuransi",
      tipe: "EXPENSE",
      kategori: "OPERATING_EXPENSE",
      deskripsi: "Biaya asuransi dan premi",
    },
    {
      kode: "5011",
      nama: "Biaya Lain-lain",
      tipe: "EXPENSE",
      kategori: "OTHER_EXPENSE",
      deskripsi: "Biaya operasional lainnya",
    },
  ];

  const allAccounts = [
    ...assetAccounts,
    ...liabilityAccounts,
    ...equityAccounts,
    ...revenueAccounts,
    ...expenseAccounts,
  ];

  for (const account of allAccounts) {
    await prisma.akun.upsert({
      where: { kode: account.kode },
      update: {
        nama: account.nama,
        deskripsi: account.deskripsi,
      },
      create: account as any,
    });
  }

  console.log("✓ Chart of accounts created");

  // Create sample products
  // console.log("Creating sample products...");

  // // Product categories and templates
  // const categories = [
  //   "Bahan Pokok",
  //   "Minuman",
  //   "Snack",
  //   "Bumbu Dapur",
  //   "Produk Susu",
  //   "Produk Beku",
  //   "Makanan Kaleng",
  //   "Kesehatan & Kecantikan",
  //   "Peralatan Rumah Tangga",
  //   "Elektronik",
  //   "Pakaian",
  //   "Mainan",
  //   "Buku & Alat Tulis",
  //   "Olahraga",
  //   "Otomotif",
  // ];

  // const productTemplates = {
  //   "Bahan Pokok": [
  //     { name: "Beras Premium", unit: "kg", basePrice: 12000, markup: 1.25 },
  //     { name: "Gula Pasir", unit: "kg", basePrice: 10000, markup: 1.4 },
  //     { name: "Minyak Goreng", unit: "liter", basePrice: 15000, markup: 1.3 },
  //     { name: "Tepung Terigu", unit: "kg", basePrice: 8000, markup: 1.35 },
  //     { name: "Garam Dapur", unit: "kg", basePrice: 3000, markup: 1.5 },
  //     { name: "Kopi Bubuk", unit: "kg", basePrice: 25000, markup: 1.4 },
  //     { name: "Teh Celup", unit: "pak", basePrice: 5000, markup: 1.6 },
  //     {
  //       name: "Susu Kental Manis",
  //       unit: "kaleng",
  //       basePrice: 12000,
  //       markup: 1.3,
  //     },
  //     { name: "Kecap Manis", unit: "botol", basePrice: 8000, markup: 1.4 },
  //     { name: "Saus Tomat", unit: "botol", basePrice: 7000, markup: 1.35 },
  //   ],
  //   Minuman: [
  //     { name: "Air Mineral", unit: "galon", basePrice: 18000, markup: 1.2 },
  //     { name: "Jus Buah", unit: "botol", basePrice: 8000, markup: 1.5 },
  //     { name: "Soda", unit: "kaleng", basePrice: 5000, markup: 1.4 },
  //     { name: "Teh Botol", unit: "botol", basePrice: 4000, markup: 1.6 },
  //     { name: "Kopi Instan", unit: "sachet", basePrice: 2000, markup: 1.8 },
  //     { name: "Susu UHT", unit: "pak", basePrice: 6000, markup: 1.3 },
  //     { name: "Minuman Isotonik", unit: "botol", basePrice: 7000, markup: 1.4 },
  //     { name: "Sirup", unit: "botol", basePrice: 15000, markup: 1.3 },
  //   ],
  //   Snack: [
  //     { name: "Keripik Kentang", unit: "pak", basePrice: 8000, markup: 1.5 },
  //     { name: "Biskuit", unit: "pak", basePrice: 6000, markup: 1.6 },
  //     { name: "Cokelat Batang", unit: "batang", basePrice: 10000, markup: 1.4 },
  //     { name: "Permen", unit: "pak", basePrice: 3000, markup: 1.7 },
  //     { name: "Kacang Goreng", unit: "pak", basePrice: 12000, markup: 1.4 },
  //     { name: "Wafer", unit: "pak", basePrice: 7000, markup: 1.5 },
  //     { name: "Snack Stick", unit: "pak", basePrice: 5000, markup: 1.6 },
  //     { name: "Popcorn", unit: "pak", basePrice: 9000, markup: 1.4 },
  //   ],
  //   "Bumbu Dapur": [
  //     { name: "Bawang Putih", unit: "kg", basePrice: 25000, markup: 1.3 },
  //     { name: "Bawang Merah", unit: "kg", basePrice: 20000, markup: 1.35 },
  //     { name: "Cabe Merah", unit: "kg", basePrice: 30000, markup: 1.25 },
  //     { name: "Cabe Rawit", unit: "kg", basePrice: 35000, markup: 1.2 },
  //     { name: "Jahe", unit: "kg", basePrice: 15000, markup: 1.4 },
  //     { name: "Kunyit", unit: "kg", basePrice: 12000, markup: 1.45 },
  //     { name: "Lengkuas", unit: "kg", basePrice: 18000, markup: 1.35 },
  //     { name: "Kemiri", unit: "kg", basePrice: 40000, markup: 1.2 },
  //   ],
  //   "Produk Susu": [
  //     { name: "Keju Cheddar", unit: "blok", basePrice: 45000, markup: 1.3 },
  //     { name: "Yogurt", unit: "pot", basePrice: 8000, markup: 1.4 },
  //     { name: "Mentega", unit: "blok", basePrice: 25000, markup: 1.35 },
  //     { name: "Krim Kental", unit: "kaleng", basePrice: 15000, markup: 1.3 },
  //     { name: "Susu Bubuk", unit: "kg", basePrice: 35000, markup: 1.25 },
  //     { name: "Es Krim", unit: "liter", basePrice: 30000, markup: 1.4 },
  //   ],
  //   "Produk Beku": [
  //     { name: "Ayam Fillet", unit: "kg", basePrice: 35000, markup: 1.3 },
  //     { name: "Ikan Tuna", unit: "kg", basePrice: 45000, markup: 1.25 },
  //     { name: "Udang", unit: "kg", basePrice: 55000, markup: 1.2 },
  //     { name: "Bakso", unit: "pak", basePrice: 25000, markup: 1.4 },
  //     { name: "Nugget", unit: "pak", basePrice: 30000, markup: 1.35 },
  //     { name: "Sosis", unit: "pak", basePrice: 28000, markup: 1.4 },
  //   ],
  //   "Makanan Kaleng": [
  //     { name: "Sarden", unit: "kaleng", basePrice: 15000, markup: 1.3 },
  //     { name: "Kornet", unit: "kaleng", basePrice: 18000, markup: 1.35 },
  //     { name: "Buah Kaleng", unit: "kaleng", basePrice: 20000, markup: 1.3 },
  //     { name: "Sayur Kaleng", unit: "kaleng", basePrice: 12000, markup: 1.4 },
  //     { name: "Sup Kaleng", unit: "kaleng", basePrice: 10000, markup: 1.45 },
  //   ],
  //   "Kesehatan & Kecantikan": [
  //     { name: "Sabun Mandi", unit: "batang", basePrice: 5000, markup: 1.6 },
  //     { name: "Shampoo", unit: "botol", basePrice: 15000, markup: 1.4 },
  //     { name: "Pasta Gigi", unit: "tube", basePrice: 8000, markup: 1.5 },
  //     { name: "Deodorant", unit: "botol", basePrice: 20000, markup: 1.35 },
  //     { name: "Masker Wajah", unit: "pak", basePrice: 25000, markup: 1.3 },
  //     { name: "Vitamin", unit: "botol", basePrice: 35000, markup: 1.25 },
  //   ],
  //   "Peralatan Rumah Tangga": [
  //     { name: "Sapu", unit: "buah", basePrice: 25000, markup: 1.4 },
  //     { name: "Pel", unit: "buah", basePrice: 15000, markup: 1.5 },
  //     { name: "Ember", unit: "buah", basePrice: 30000, markup: 1.3 },
  //     { name: "Kain Lap", unit: "pak", basePrice: 12000, markup: 1.6 },
  //     { name: "Detergen", unit: "pak", basePrice: 18000, markup: 1.4 },
  //     {
  //       name: "Pewangi Ruangan",
  //       unit: "botol",
  //       basePrice: 22000,
  //       markup: 1.35,
  //     },
  //   ],
  //   Elektronik: [
  //     { name: "Baterai AA", unit: "pak", basePrice: 15000, markup: 1.4 },
  //     { name: "Kabel USB", unit: "buah", basePrice: 25000, markup: 1.3 },
  //     { name: "Power Bank", unit: "buah", basePrice: 150000, markup: 1.2 },
  //     { name: "Earphone", unit: "buah", basePrice: 75000, markup: 1.25 },
  //     { name: "Charger HP", unit: "buah", basePrice: 45000, markup: 1.3 },
  //     { name: "Memory Card", unit: "buah", basePrice: 80000, markup: 1.2 },
  //   ],
  //   Pakaian: [
  //     { name: "Kaos Polos", unit: "buah", basePrice: 35000, markup: 1.5 },
  //     { name: "Celana Jeans", unit: "buah", basePrice: 150000, markup: 1.3 },
  //     { name: "Jaket", unit: "buah", basePrice: 200000, markup: 1.25 },
  //     {
  //       name: "Sepatu Sneakers",
  //       unit: "pasang",
  //       basePrice: 250000,
  //       markup: 1.2,
  //     },
  //     { name: "Topi", unit: "buah", basePrice: 45000, markup: 1.4 },
  //     { name: "Sarung Tangan", unit: "pasang", basePrice: 25000, markup: 1.5 },
  //   ],
  //   Mainan: [
  //     { name: "Boneka", unit: "buah", basePrice: 75000, markup: 1.4 },
  //     { name: "Lego", unit: "set", basePrice: 150000, markup: 1.3 },
  //     { name: "Puzzle", unit: "buah", basePrice: 45000, markup: 1.5 },
  //     { name: "Mobil Remote", unit: "buah", basePrice: 200000, markup: 1.25 },
  //     { name: "Balon", unit: "pak", basePrice: 15000, markup: 1.6 },
  //     { name: "Kartu Permainan", unit: "pak", basePrice: 35000, markup: 1.4 },
  //   ],
  //   "Buku & Alat Tulis": [
  //     { name: "Buku Tulis", unit: "buah", basePrice: 8000, markup: 1.5 },
  //     { name: "Pensil", unit: "pak", basePrice: 12000, markup: 1.4 },
  //     { name: "Pulpen", unit: "buah", basePrice: 5000, markup: 1.6 },
  //     { name: "Penghapus", unit: "buah", basePrice: 3000, markup: 1.7 },
  //     { name: "Penggaris", unit: "buah", basePrice: 8000, markup: 1.5 },
  //     { name: "Buku Gambar", unit: "buah", basePrice: 15000, markup: 1.4 },
  //   ],
  //   Olahraga: [
  //     { name: "Bola Basket", unit: "buah", basePrice: 150000, markup: 1.3 },
  //     {
  //       name: "Raket Badminton",
  //       unit: "buah",
  //       basePrice: 200000,
  //       markup: 1.25,
  //     },
  //     { name: "Sepeda", unit: "buah", basePrice: 1500000, markup: 1.15 },
  //     { name: "Matras Yoga", unit: "buah", basePrice: 100000, markup: 1.4 },
  //     { name: "Dumbbell", unit: "set", basePrice: 250000, markup: 1.2 },
  //     {
  //       name: "Sepatu Olahraga",
  //       unit: "pasang",
  //       basePrice: 300000,
  //       markup: 1.25,
  //     },
  //   ],
  //   Otomotif: [
  //     { name: "Oli Mesin", unit: "liter", basePrice: 45000, markup: 1.3 },
  //     { name: "Busi", unit: "buah", basePrice: 25000, markup: 1.4 },
  //     { name: "Wiper", unit: "pasang", basePrice: 75000, markup: 1.35 },
  //     { name: "Aki Mobil", unit: "buah", basePrice: 500000, markup: 1.2 },
  //     { name: "Ban Dalam", unit: "buah", basePrice: 150000, markup: 1.25 },
  //     { name: "Filter Udara", unit: "buah", basePrice: 80000, markup: 1.3 },
  //   ],
  // };

  // // Generate 1000 products
  // const products = [];
  // let productCounter = 1;

  // for (let i = 0; i < 1000; i++) {
  //   // Randomly select category and template
  //   const category = categories[Math.floor(Math.random() * categories.length)];
  //   const templates =
  //     productTemplates[category as keyof typeof productTemplates];
  //   const template = templates[Math.floor(Math.random() * templates.length)];

  //   // Generate variations
  //   const variations = [
  //     "Premium",
  //     "Regular",
  //     "Ekonomis",
  //     "Super",
  //     "Extra",
  //     "Plus",
  //     "Max",
  //     "Pro",
  //   ];
  //   const brands = [
  //     "ABC",
  //     "XYZ",
  //     "Super",
  //     "Best",
  //     "Top",
  //     "Prima",
  //     "Elite",
  //     "Gold",
  //   ];
  //   const sizes = [
  //     "Kecil",
  //     "Sedang",
  //     "Besar",
  //     "Jumbo",
  //     "Mini",
  //     "Large",
  //     "Small",
  //   ];

  //   const variation = variations[Math.floor(Math.random() * variations.length)];
  //   const brand = brands[Math.floor(Math.random() * brands.length)];
  //   const size = sizes[Math.floor(Math.random() * sizes.length)];

  //   // Create product name
  //   const productName = `${brand} ${template.name} ${variation} ${size}`;

  //   // Generate SKU
  //   const sku = `${category.substring(0, 3).toUpperCase()}-${String(productCounter).padStart(3, "0")}`;

  //   // Calculate prices with some randomization
  //   const priceVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  //   const hargaBeli = Math.round(template.basePrice * priceVariation);
  //   const hargaJual = Math.round(
  //     hargaBeli * template.markup * (0.95 + Math.random() * 0.1),
  //   ); // Add some markup variation

  //   // Random stock levels
  //   const stok = Math.floor(Math.random() * 100) + 10; // 10-110
  //   const stokMinimum = Math.floor(stok * 0.2) + 5; // 20% of stock + 5

  //   // Random location
  //   const lokasiId = Math.random() > 0.5 ? gudangUtama.id : gudangCabang.id;

  //   products.push({
  //     nama: productName,
  //     sku: sku,
  //     kategori: category,
  //     stok: stok,
  //     stokMinimum: stokMinimum,
  //     hargaBeli: hargaBeli,
  //     hargaJual: hargaJual,
  //     satuan: template.unit,
  //     deskripsi: `${productName} - ${category}`,
  //     lokasiId: lokasiId,
  //   });

  //   productCounter++;
  // }

  // for (const product of products) {
  //   await prisma.barang.create({
  //     data: product,
  //   });
  // }

  // console.log("✓ Products created");

  console.log("✅ Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
