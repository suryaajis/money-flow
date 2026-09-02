# Product Requirements Document — Money Flow v1

**Versi:** 1.0  
**Status:** Released  
**Terakhir diperbarui:** Juni 2026  

---

## 1. Overview

Money Flow adalah aplikasi manajemen keuangan pribadi berbasis web yang memungkinkan pengguna mencatat, mengkategorikan, menganalisis, dan mengekspor data pemasukan dan pengeluaran mereka. Aplikasi ini dibangun sebagai Progressive Web App (PWA) sehingga dapat diinstal di perangkat mobile maupun desktop.

---

## 2. Problem Statement

Banyak orang kesulitan melacak keuangan pribadi mereka karena:
- Aplikasi pencatat keuangan yang ada terlalu kompleks atau berbayar
- Tidak ada cara mudah untuk menambahkan transaksi dari struk belanja fisik
- Data keuangan tersebar dan tidak mudah dianalisis secara visual
- Aplikasi tidak dapat digunakan secara offline

Money Flow hadir sebagai solusi sederhana, gratis, dan dapat digunakan tanpa koneksi internet.

---

## 3. Target User

| Segmen | Deskripsi |
|--------|-----------|
| **Primary** | Individu usia 18–35 tahun yang ingin mulai mencatat keuangan pribadi |
| **Secondary** | Pengguna Indonesia yang terbiasa bertransaksi tunai dan butuh scan struk |

---

## 4. Fitur v1

### 4.1 Autentikasi

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| AUTH-01 | Registrasi | User mendaftar dengan nama, email, dan password (min. 8 karakter) |
| AUTH-02 | Login | User masuk dengan email dan password |
| AUTH-03 | Proteksi rute | Halaman selain login/register hanya bisa diakses setelah login |
| AUTH-04 | Logout | User dapat keluar dan sesi dihapus |
| AUTH-05 | Persistensi sesi | Token JWT disimpan lokal, user tidak perlu login ulang saat buka app |

**Acceptance Criteria:**
- Password minimal 8 karakter
- Email harus valid dan unik
- Pesan error ditampilkan jika login gagal
- Redirect ke `/dashboard` setelah login/register berhasil

---

### 4.2 Dashboard

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| DASH-01 | Ringkasan saldo | Tampilkan total saldo, total pemasukan, total pengeluaran |
| DASH-02 | Grafik bulanan | Grafik garis 6 bulan terakhir (income vs expense) |
| DASH-03 | Pie chart kategori | Distribusi pengeluaran per kategori bulan ini |
| DASH-04 | Transaksi terbaru | Daftar 5 transaksi terakhir dengan kategori dan nominal |

**Acceptance Criteria:**
- Semua angka diformat sesuai mata uang yang dipilih (IDR/USD)
- Grafik diperbarui otomatis saat data berubah
- Dashboard kosong menampilkan empty state yang informatif

---

### 4.3 Manajemen Transaksi

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| TRX-01 | Tambah transaksi | Form input: tipe (income/expense), nominal, kategori, tanggal, catatan |
| TRX-02 | Edit transaksi | Ubah data transaksi yang sudah ada |
| TRX-03 | Hapus transaksi | Hapus satu transaksi dengan konfirmasi dialog |
| TRX-04 | Hapus bulk | Pilih beberapa transaksi dan hapus sekaligus |
| TRX-05 | Filter transaksi | Filter berdasarkan tipe, kategori, rentang tanggal, kata kunci |
| TRX-06 | Pagination tabel | Tampilkan 15 transaksi per halaman dengan navigasi |
| TRX-07 | Sorting tabel | Sort berdasarkan tanggal, nominal, atau tipe |
| TRX-08 | Export CSV | Unduh data transaksi yang terfilter ke format CSV |
| TRX-09 | Export Excel | Unduh data transaksi yang terfilter ke format XLSX |

**Acceptance Criteria:**
- Nominal harus berupa angka positif
- Tanggal tidak boleh lebih dari hari ini
- Kategori wajib dipilih (hanya kategori yang sesuai tipe ditampilkan)
- Konfirmasi dialog muncul sebelum penghapusan
- Export menyertakan informasi kategori

---

### 4.4 Manajemen Kategori

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| CAT-01 | Kategori default | 9 kategori bawaan yang otomatis dibuat saat user pertama kali login |
| CAT-02 | Buat kategori | Tambah kategori kustom dengan nama, warna, ikon, dan tipe |
| CAT-03 | Edit kategori | Ubah nama, warna, ikon, atau tipe kategori |
| CAT-04 | Hapus kategori | Hapus kategori kustom dengan konfirmasi |
| CAT-05 | Proteksi default | Kategori default tidak dapat dihapus |

**Kategori Default:**

| Nama | Tipe | Ikon |
|------|------|------|
| Gaji | Income | Banknote |
| Investasi | Income & Expense | TrendingUp |
| Makanan | Expense | UtensilsCrossed |
| Transportasi | Expense | Car |
| Hiburan | Expense | Gamepad2 |
| Kesehatan | Expense | Heart |
| Belanja | Expense | ShoppingBag |
| Tagihan | Expense | Receipt |
| Lainnya | Income & Expense | MoreHorizontal |

**Acceptance Criteria:**
- Pilihan warna: 12 warna preset
- Tipe kategori: income-only, expense-only, atau keduanya
- Jumlah transaksi per kategori ditampilkan di halaman kategori
- Kategori yang dihapus tidak menghapus transaksi terkait (transaksi tampil sebagai "Unknown")

---

### 4.5 Analitik

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| ANL-01 | Ringkasan periode | Total income, expense, saldo bersih untuk periode yang dipilih |
| ANL-02 | Perbandingan MoM | Perubahan pengeluaran bulan ini vs bulan lalu (nominal & persentase) |
| ANL-03 | Grafik tren | Grafik income vs expense per bulan |
| ANL-04 | Grafik batang bulanan | Perbandingan income vs expense per bulan secara visual |
| ANL-05 | Top kategori | Daftar kategori pengeluaran terbesar dengan persentase |
| ANL-06 | Filter periode | Pilih rentang 3, 6, atau 12 bulan terakhir |

**Acceptance Criteria:**
- Persentase perubahan MoM ditampilkan dengan indikator naik/turun
- Grafik responsif terhadap ukuran layar
- Data diperbarui otomatis saat periode diubah

---

### 4.6 Import Struk (OCR)

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| OCR-01 | Upload gambar | Upload struk dari galeri (JPEG, PNG, WebP, HEIC, HEIF) |
| OCR-02 | Upload PDF | Upload struk dalam format PDF |
| OCR-03 | Kamera | Ambil foto struk langsung dari kamera perangkat |
| OCR-04 | Drag & drop | Upload file dengan drag & drop ke area yang ditentukan |
| OCR-05 | Proses OCR | Ekstrak teks dari gambar menggunakan Tesseract.js (client-side) |
| OCR-06 | Parse struk | Deteksi otomatis nominal, tanggal, dan nama merchant dari teks OCR |
| OCR-07 | Confidence score | Tampilkan tingkat keyakinan hasil parsing (High/Low) |
| OCR-08 | Konfirmasi manual | Form verifikasi sebelum transaksi disimpan |
| OCR-09 | Share target | Terima file yang di-share dari aplikasi lain (system share) |

**Acceptance Criteria:**
- Ukuran file maksimal 10MB
- Progress OCR ditampilkan selama pemrosesan
- User dapat melihat teks mentah hasil OCR
- Semua field dapat diedit manual sebelum disimpan
- Jika OCR gagal, user tetap dapat input manual

---

### 4.7 Pengaturan UI

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| UI-01 | Tema gelap/terang | Toggle antara light, dark, atau system theme |
| UI-02 | Multi-currency | Ganti tampilan mata uang antara IDR dan USD |
| UI-03 | Sidebar | Collapse/expand sidebar navigasi di desktop |
| UI-04 | Responsif | Layout menyesuaikan layar mobile, tablet, dan desktop |
| UI-05 | Bottom navigation | Navigasi mobile di bagian bawah layar |

---

### 4.8 PWA

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| PWA-01 | Installable | Dapat diinstal ke home screen (Add to Home Screen) |
| PWA-02 | Offline page | Halaman khusus saat tidak ada koneksi internet |
| PWA-03 | Service worker | Caching aset statis untuk akses lebih cepat |
| PWA-04 | App shortcuts | Shortcut langsung ke Tambah Transaksi, Scan Struk, dan Analitik |
| PWA-05 | PWA icons | Ikon app untuk berbagai resolusi (192, 512, maskable) |

---

## 5. Arsitektur Teknis

### Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| State Management | Zustand |
| Charts | Recharts |
| OCR | Tesseract.js (client-side) |
| Export | XLSX |
| Backend | NestJS, TypeORM |
| Database | PostgreSQL |
| Auth | JWT (bcrypt + @nestjs/jwt) |

### Struktur Monorepo

```
money-flow/
├── apps/
│   ├── web/    ← Next.js frontend (Vercel)
│   └── api/    ← NestJS backend (VPS)
└── package.json
```

### API Endpoints v1

| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/api/auth/register` | Registrasi user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Info user aktif |
| GET | `/api/categories` | Ambil semua kategori |
| POST | `/api/categories` | Buat kategori |
| PUT | `/api/categories/:id` | Edit kategori |
| DELETE | `/api/categories/:id` | Hapus kategori |
| GET | `/api/transactions` | Ambil transaksi (support query filter) |
| POST | `/api/transactions` | Buat transaksi |
| PUT | `/api/transactions/:id` | Edit transaksi |
| DELETE | `/api/transactions/:id` | Hapus transaksi |
| DELETE | `/api/transactions/bulk` | Hapus banyak transaksi |

---

## 6. Out of Scope (v1)

Fitur berikut **tidak** masuk dalam v1:

- Budget planner / anggaran bulanan
- Notifikasi / reminder tagihan
- Multi-akun / akun bersama (keluarga)
- Sinkronisasi rekening bank otomatis
- Transfer antar akun
- Laporan pajak
- Recurring transaction
- Fitur sosial / berbagi laporan
- Support mata uang selain IDR dan USD

---

## 7. Metrik Keberhasilan v1

| Metrik | Target |
|--------|--------|
| User dapat register dan login | < 30 detik |
| Tambah transaksi manual | < 1 menit |
| Import struk via OCR | < 2 menit end-to-end |
| Load dashboard | < 2 detik |
| Export data ke Excel | < 5 detik |
