# Product Requirements Document — Money Flow v1.2

**Versi:** 1.2
**Status:** Planning  
**Terakhir diperbarui:** Juni 2026  
**Berdasarkan:** PRD v1 (Released)

---

## 1. Overview

Money Flow v1.2 membangun di atas fondasi v1 dengan menambahkan fitur-fitur yang meningkatkan kontrol keuangan pengguna secara proaktif — bukan hanya mencatat, tapi juga **merencanakan dan mengingatkan**. v1.2 juga melengkapi gap auth dan manajemen akun yang belum ada di v1.

---

## 2. Tujuan v1.2

| Tujuan | Metrik Keberhasilan |
|--------|-------------------|
| User dapat merencanakan anggaran per kategori | Budget planner digunakan oleh >50% active user |
| Mengurangi input manual transaksi berulang | Recurring transaction mengurangi input manual >30% |
| Melengkapi auth flow yang aman | 0 keluhan soal tidak bisa reset password |
| Meningkatkan retensi pengguna | DAU naik 20% dibanding v1 |

---

## 3. Fitur v1.2

---

### 3.1 Reset Password (Forgot Password)

**Latar Belakang:** V1 tidak memiliki mekanisme recovery akun. Jika user lupa password, akun tidak bisa diakses.

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| AUTH-06 | Forgot password | Form input email untuk request reset password |
| AUTH-07 | Email reset link | Kirim email berisi link reset yang berlaku 1 jam |
| AUTH-08 | Reset password page | Halaman untuk set password baru via link dari email |
| AUTH-09 | Token expiry | Link kadaluarsa setelah 1 jam atau sudah dipakai |

**User Flow:**
```
Login page → "Lupa password?" → Input email
→ Cek email → Klik link → Set password baru → Login
```

**Acceptance Criteria:**
- Email dikirim dalam waktu < 30 detik
- Link hanya bisa dipakai sekali
- Password baru harus minimal 8 karakter
- Tampilkan pesan sukses meski email tidak terdaftar (security)

---

### 3.2 Profile Management

**Latar Belakang:** V1 tidak ada halaman settings. User tidak bisa ubah nama, email, atau password setelah registrasi.

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| PROF-01 | Halaman profil | Halaman settings menampilkan info akun saat ini |
| PROF-02 | Edit nama | Ubah nama tampilan |
| PROF-03 | Ganti password | Input password lama + password baru + konfirmasi |
| PROF-04 | Avatar/inisial | Tampilkan avatar berbasis inisial nama user |
| PROF-05 | Hapus akun | Hapus akun beserta semua data dengan konfirmasi berlapis |

**Acceptance Criteria:**
- Ganti password wajib verifikasi password lama
- Hapus akun memerlukan konfirmasi ketik ulang email
- Perubahan nama langsung tercermin di Header
- Halaman profil dapat diakses dari menu Header atau Sidebar

---

### 3.3 Recurring Transaction

**Latar Belakang:** Transaksi berulang (gaji, cicilan, langganan) harus diinput manual setiap bulan di v1 — membuang waktu.

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| REC-01 | Buat recurring | Set transaksi berulang dengan frekuensi tertentu |
| REC-02 | Frekuensi | Pilihan: harian, mingguan, bulanan, tahunan |
| REC-03 | Tanggal mulai & akhir | Set kapan recurring dimulai dan kapan berhenti (opsional) |
| REC-04 | Generate otomatis | Sistem auto-generate transaksi sesuai jadwal saat user buka app |
| REC-05 | Daftar recurring | Halaman manajemen semua recurring transaction |
| REC-06 | Edit & pause | Edit atau pause sementara recurring tanpa menghapus |
| REC-07 | Hapus recurring | Hapus template recurring (tidak hapus transaksi yang sudah terbuat) |

**Contoh Use Case:**
- Gaji: setiap tanggal 25, income Rp 8.000.000
- Netflix: setiap tanggal 1, expense Rp 54.000
- Cicilan KPR: setiap tanggal 10, expense Rp 3.500.000

**Acceptance Criteria:**
- Transaksi auto-generated memiliki flag `isRecurring: true`
- Jika app tidak dibuka beberapa hari, semua transaksi yang terlewat tetap di-generate
- User bisa edit transaksi hasil generate tanpa mempengaruhi template
- Frekuensi yang didukung: daily, weekly, monthly, yearly

**Schema Tambahan (Backend):**
```typescript
RecurringTransaction {
  id: string
  userId: string
  amount: number
  type: 'income' | 'expense'
  categoryId: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  startDate: string
  endDate?: string
  nextRunDate: string
  isActive: boolean
  notes?: string
}
```

---

### 3.4 Budget Planner

**Latar Belakang:** User v1 hanya bisa melihat pengeluaran *setelah* terjadi. v1.2 memungkinkan user *merencanakan* sebelumnya dan mendapat peringatan dini.

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| BDG-01 | Set budget | Set limit pengeluaran per kategori per bulan |
| BDG-02 | Progress bar | Visual progress anggaran yang sudah terpakai vs total |
| BDG-03 | Status budget | Label: On Track / Warning (>75%) / Over Budget (>100%) |
| BDG-04 | Ringkasan budget | Halaman overview semua kategori dengan status budget |
| BDG-05 | Budget di dashboard | Widget budget overview di halaman dashboard |
| BDG-06 | Alert over budget | Notifikasi/banner saat pengeluaran melebihi budget |
| BDG-07 | Copy budget | Salin budget bulan lalu ke bulan ini |
| BDG-08 | Riwayat budget | Lihat budget dan realisasi bulan-bulan sebelumnya |

**Acceptance Criteria:**
- Budget bersifat per bulan (reset tiap awal bulan)
- Hanya kategori tipe `expense` atau `both` yang bisa diset budget
- Progress dihitung real-time dari transaksi yang ada
- Warning muncul di 75% dan 100% pemakaian
- Budget 0 atau kosong berarti tidak ada limit

**Schema Tambahan (Backend):**
```typescript
Budget {
  id: string
  userId: string
  categoryId: string
  amount: number
  month: string  // format: "2026-07"
}
```

---

### 3.5 Backup & Restore Data

**Latar Belakang:** User ingin punya salinan data keuangan mereka sendiri, tidak sepenuhnya bergantung pada server.

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| BAK-01 | Export JSON | Unduh semua data (transaksi + kategori + budget) sebagai file JSON |
| BAK-02 | Import JSON | Upload file backup JSON untuk restore data |
| BAK-03 | Validasi import | Validasi format file sebelum import, tampilkan preview |
| BAK-04 | Mode merge | Pilih: timpa semua data atau merge dengan data yang ada |

**Acceptance Criteria:**
- File JSON mencantumkan versi schema untuk backward compatibility
- Import menampilkan jumlah data yang akan diimport sebelum konfirmasi
- Mode merge tidak menduplikasi data yang sudah ada (cek by ID)
- Ukuran file export maksimal tidak dibatasi

---

### 3.6 Tags / Label Transaksi

**Latar Belakang:** Satu kategori bisa memiliki banyak sub-konteks. Contoh: `Makanan` bisa punya tag `#liburan`, `#kerja`, `#keluarga`.

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| TAG-01 | Tambah tag | Input tag bebas saat membuat/edit transaksi |
| TAG-02 | Auto-complete | Saran tag berdasarkan tag yang pernah dipakai |
| TAG-03 | Filter by tag | Filter transaksi berdasarkan tag di halaman transaksi |
| TAG-04 | Tag di analytics | Breakdown pengeluaran per tag |

**Acceptance Criteria:**
- Tag diawali `#` secara otomatis
- Satu transaksi bisa memiliki multiple tag
- Tag bersifat case-insensitive
- Tag dihapus otomatis jika tidak dipakai oleh transaksi manapun

---

### 3.7 Notifikasi / Reminder (PWA Push Notification)

**Latar Belakang:** User sering lupa input transaksi harian. Reminder meningkatkan konsistensi pencatatan.

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| NOT-01 | Reminder harian | Notifikasi push untuk mengingatkan input transaksi |
| NOT-02 | Jam reminder | User set jam berapa reminder dikirim |
| NOT-03 | Alert over budget | Notifikasi saat pengeluaran melebihi budget kategori |
| NOT-04 | Hari aktif | Pilih hari apa saja reminder aktif (misal: Senin–Jumat) |
| NOT-05 | Toggle notifikasi | On/off per jenis notifikasi di halaman settings |

**Acceptance Criteria:**
- Minta izin notifikasi saat user pertama kali aktifkan fitur
- Notifikasi tetap terkirim meski app tidak terbuka (service worker)
- Semua jenis notifikasi bisa dimatikan secara individual
- Tidak ada notifikasi default — semua opt-in

---

### 3.8 Multi-Currency Lanjutan

**Latar Belakang:** V1 hanya support IDR dan USD. Banyak user yang bertransaksi dalam mata uang lain.

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| CUR-01 | Tambah mata uang | Support EUR, SGD, MYR, JPY, GBP |
| CUR-02 | Kurs otomatis | Fetch kurs dari API (update harian) |
| CUR-03 | Konversi tampilan | Tampilkan semua nominal dalam mata uang pilihan user |
| CUR-04 | Mata uang per transaksi | Set mata uang berbeda per transaksi (opsional) |

**Acceptance Criteria:**
- Kurs di-cache dan diperbarui sekali per hari
- Jika API kurs tidak tersedia, gunakan kurs terakhir yang tersimpan
- Konversi ditandai dengan label "≈" untuk menunjukkan nilai perkiraan

---

## 4. Arsitektur Perubahan v1.2

### Tambahan Database Schema

```sql
-- Reset password tokens
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Recurring transactions
CREATE TABLE recurring_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  type VARCHAR(10) NOT NULL,
  category_id UUID REFERENCES categories(id),
  frequency VARCHAR(10) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Budgets
CREATE TABLE budgets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  month VARCHAR(7) NOT NULL,  -- "2026-07"
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, category_id, month)
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE transaction_tags (
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, tag_id)
);
```

### Tambahan API Endpoints v1.2

| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/api/auth/forgot-password` | Request link reset |
| POST | `/api/auth/reset-password` | Set password baru dengan token |
| GET | `/api/users/profile` | Ambil profil user |
| PUT | `/api/users/profile` | Update nama user |
| PUT | `/api/users/password` | Ganti password |
| DELETE | `/api/users/account` | Hapus akun |
| GET | `/api/recurring` | Daftar recurring transactions |
| POST | `/api/recurring` | Buat recurring |
| PUT | `/api/recurring/:id` | Edit recurring |
| DELETE | `/api/recurring/:id` | Hapus recurring |
| GET | `/api/budgets` | Budget bulan ini |
| GET | `/api/budgets?month=2026-07` | Budget bulan tertentu |
| POST | `/api/budgets` | Set budget kategori |
| PUT | `/api/budgets/:id` | Update budget |
| DELETE | `/api/budgets/:id` | Hapus budget |
| GET | `/api/tags` | Semua tags user |
| GET | `/api/backup/export` | Export semua data sebagai JSON |
| POST | `/api/backup/import` | Import data dari JSON |

---

## 5. Halaman Baru v1.2

| Halaman | Route | Deskripsi |
|---------|-------|-----------|
| Profil | `/settings/profile` | Edit nama, ganti password, hapus akun |
| Notifikasi | `/settings/notifications` | Kelola reminder dan alert |
| Budget | `/budget` | Overview dan kelola budget per kategori |
| Recurring | `/recurring` | Kelola transaksi berulang |
| Backup | `/settings/backup` | Export dan import data |
| Reset Password | `/reset-password` | Halaman set password baru |

---

## 6. Out of Scope (v1.2)

Fitur berikut ditunda ke v1.3 atau later:

- Multi-akun / shared wallet (keluarga)
- Sinkronisasi rekening bank otomatis
- Laporan pajak
- Mobile app (React Native)
- Fitur sosial / berbagi laporan
- Investasi & portfolio tracking
- Koneksi dengan e-wallet (GoPay, OVO, DANA)

---

## 7. Timeline Estimasi

| Fase | Fitur | Estimasi |
|------|-------|----------|
| **Fase 1** | Reset Password + Profile Management | 1 minggu |
| **Fase 2** | Recurring Transaction | 1–2 minggu |
| **Fase 3** | Budget Planner | 1–2 minggu |
| **Fase 4** | Tags + Backup & Restore | 1 minggu |
| **Fase 5** | Notifikasi + Multi-Currency | 1–2 minggu |

**Total estimasi: 5–8 minggu**

---

## 8. Dependensi v1.2

| Kebutuhan | Keterangan |
|-----------|------------|
| Email service | Dibutuhkan untuk fitur reset password (Resend / Nodemailer) |
| Currency API | Untuk kurs real-time (exchangerate.host / Open Exchange Rates) |
| Push notification | Service worker sudah ada di v1, perlu backend endpoint |
| Cron job | Untuk generate recurring transaction (NestJS `@nestjs/schedule`) |
