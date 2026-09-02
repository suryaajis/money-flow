# Product Requirements Document — Money Flow v1.3

**Versi:** 1.3
**Status:** Planning  
**Terakhir diperbarui:** Juli 2026  
**Berdasarkan:** PRD v1.2 (In Development)

---

## 1. Overview

Money Flow v1.3 menghadirkan antarmuka pencatatan baru melalui **WhatsApp** — channel yang sudah dibuka pengguna setiap hari. Tidak perlu buka aplikasi, tidak perlu isi form; cukup chat biasa seperti ngobrol dengan teman. AI memproses pesan dan langsung menyimpan transaksi ke database yang sama dengan web dashboard.

v1.3 juga menambahkan fitur sosial pertama: **Catat Bersama** untuk pasangan atau keluarga, dan **Utang Piutang** untuk mencatat pinjaman informal.

---

## 2. Problem Statement

| Masalah | Dampak |
|---------|--------|
| User lupa buka aplikasi untuk catat transaksi kecil | Data tidak lengkap, analitik tidak akurat |
| Form input web terasa berat untuk transaksi harian sederhana | Drop-off rate tinggi setelah 3 hari pertama |
| Tidak ada cara catat sambil lakukan kegiatan lain (nyetir, antri kasir) | Momen catat terlewat karena hands busy |
| Tidak ada tracking utang piutang informal | User butuh aplikasi terpisah |

---

## 3. Target User v1.3

| Segmen | Kebutuhan Utama |
|--------|----------------|
| **Existing user v1/v1.2** | Cara catat yang lebih cepat dari web |
| **Ibu rumah tangga** | Catat belanja harian tanpa buka aplikasi |
| **Mahasiswa** | Catat uang jajan spontan via voice note |
| **UMKM/warung** | Catat pemasukan kasir cepat, share dengan pasangan/rekan |
| **Freelancer** | Catat invoice masuk & pengeluaran operasional |

---

## 4. Fitur v1.3

---

### 4.1 WhatsApp Bot — Core Infrastructure

**Latar Belakang:** Fondasi semua fitur v1.3. Menghubungkan nomor WA pengguna dengan akun Money Flow mereka.

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| WA-01 | Link akun WA | Hubungkan nomor WhatsApp ke akun Money Flow dari halaman settings |
| WA-02 | Aktivasi bot | Kirim pesan pertama ke nomor WA bot untuk aktivasi |
| WA-03 | Autentikasi | Bot mengenali user dari nomor WA terdaftar tanpa perlu login ulang |
| WA-04 | Webhook handler | Backend NestJS menerima dan memproses pesan masuk dari Meta Cloud API |
| WA-05 | Rate limiting | Batasi request per user untuk mencegah abuse dan biaya API membengkak |
| WA-06 | Error handling | Pesan error yang ramah saat bot tidak paham atau terjadi kesalahan |
| WA-07 | Unlink akun WA | Putuskan koneksi nomor WA dari settings |

**User Flow Aktivasi:**
```
Settings web → "Hubungkan WhatsApp" → Masukkan nomor WA
→ Scan QR / klik link → Chat pertama ke bot → Konfirmasi aktif
```

**Acceptance Criteria:**
- Satu akun Money Flow hanya bisa dihubungkan ke satu nomor WA
- Satu nomor WA hanya bisa dihubungkan ke satu akun
- Pesan dari nomor tidak terdaftar dibalas dengan instruksi registrasi
- Response bot maksimal 3 detik untuk pesan teks

---

### 4.2 AI NLP Parser — Catat Bebas Format

**Latar Belakang:** Inti dari pengalaman WA. User bisa mengetik apa saja dalam bahasa Indonesia natural dan bot memahaminya.

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| NLP-01 | Parse nominal | Kenali format: 15rb, 15k, 15.000, 15ribu, 1,5jt, 1.5juta, +5jt |
| NLP-02 | Parse tipe transaksi | Bedakan pemasukan (`+`, "gajian", "terima", "dapat") vs pengeluaran (default) |
| NLP-03 | Parse kategori otomatis | Klasifikasi otomatis berdasarkan kata kunci (kopi→Makanan, bensin→Transport) |
| NLP-04 | Parse tanggal relatif | Kenali: "kemarin", "tadi pagi", "2 hari lalu", "senin lalu" |
| NLP-05 | Catat banyak sekaligus | Satu pesan bisa berisi beberapa transaksi sekaligus |
| NLP-06 | Konfirmasi parsial | Jika ada field yang tidak bisa di-parse, bot tanya secara interaktif |
| NLP-07 | Deteksi ambiguitas | Tandai hasil parsing dengan confidence score; minta konfirmasi jika rendah |

**Contoh Input & Output:**

| Input User | Parsing AI | Respons Bot |
|-----------|-----------|------------|
| `kopi 15rb` | expense Rp15.000 Makanan | ✅ Tercatat: -Rp15.000 Makanan |
| `gajian 8jt` | income Rp8.000.000 Gaji | ✅ Tercatat: +Rp8.000.000 Gaji |
| `bensin 50k, parkir 3k, makan siang 25rb` | 3 transaksi | ✅ 3 transaksi tercatat |
| `bayar listrik 150000 kemarin` | expense Rp150.000 Tagihan kemarin | ✅ Tercatat: -Rp150.000 kemarin |
| `beli sesuatu 200rb` | expense Rp200.000 (kategori?) | ❓ Untuk kategori apa? |

**Acceptance Criteria:**
- Akurasi parsing nominal > 95% untuk format umum Indonesia
- Akurasi klasifikasi kategori otomatis > 80%
- Pesan ambigu memicu pertanyaan klarifikasi (1 pertanyaan max)
- Slang yang didukung: rb, k, jt, ribu, ratus, juta, M (miliar)

**Implementasi:**
- Gunakan Claude API (`claude-haiku-4-5`) dengan structured output untuk kecepatan & biaya rendah
- System prompt berisi daftar kategori user + contoh format
- Fallback ke rule-based parser jika API tidak tersedia

---

### 4.3 Voice Note — Catat Pakai Suara

**Latar Belakang:** Situasi hands-free (nyetir, antri, lagi sibuk) tidak bisa ngetik. Voice note WA langsung dicatat.

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| VN-01 | Terima voice note | Bot menerima audio OGG/MP3 dari WA |
| VN-02 | Transkripsi otomatis | Konversi audio ke teks menggunakan Whisper API (OpenAI) atau Groq |
| VN-03 | Parse hasil transkripsi | Hasil transkripsi diproses sama seperti pesan teks (masuk ke NLP parser) |
| VN-04 | Konfirmasi hasil | Bot balas dengan teks transkripsi + hasil parsing sebelum simpan |
| VN-05 | Koreksi jika salah | User bisa ketik "bukan" atau "salah" untuk batalkan dan coba lagi |

**User Flow:**
```
User rekam voice note di WA
→ Bot download audio dari Meta API
→ Transkripsi via Whisper
→ Parse teks hasil transkripsi via NLP
→ Bot balas: "🎙️ Kamu bilang: 'beli bensin 50 ribu'\n✅ Tercatat: -Rp50.000 Transport"
```

**Acceptance Criteria:**
- Durasi voice note maksimal 5 menit
- Bahasa: Indonesia (ID) dengan support slang
- Waktu total proses (download + transkripsi + parsing + reply): < 8 detik
- Jika transkripsi gagal, bot minta user ketik ulang

---

### 4.4 Perintah Bot (Bot Commands)

**Latar Belakang:** Selain catat transaksi, user bisa query data dan kelola akun langsung dari WA.

| ID | Perintah | Respons Bot |
|----|----------|------------|
| CMD-01 | `saldo` / `balance` | Total saldo, pemasukan, pengeluaran bulan ini |
| CMD-02 | `rekap` / `laporan` | Ringkasan bulanan: top kategori pengeluaran, perbandingan MoM |
| CMD-03 | `rekap minggu ini` | Ringkasan 7 hari terakhir |
| CMD-04 | `hapus` / `batal` | Hapus transaksi terakhir yang dicatat via WA (dengan konfirmasi) |
| CMD-05 | `daftar` | 5 transaksi terakhir |
| CMD-06 | `budget` | Status budget bulan ini per kategori |
| CMD-07 | `utang` | Daftar utang piutang yang belum lunas |
| CMD-08 | `bantuan` / `help` | Daftar semua perintah yang tersedia |
| CMD-09 | `ekspor` | Link download CSV/Excel transaksi bulan ini (berlaku 1 jam) |

**Format Respons `saldo`:**
```
💰 Saldo bulan ini (Juli 2026)

📈 Pemasukan: +Rp 8.500.000
📉 Pengeluaran: -Rp 3.200.000
💵 Saldo bersih: Rp 5.300.000

Untuk detail lengkap → [link dashboard]
```

**Acceptance Criteria:**
- Response time < 2 detik untuk query perintah (tanpa AI)
- Perintah case-insensitive dan typo-tolerant (saldo, SALDO, salso)
- Perintah yang tidak dikenali → panduan ke `bantuan`

---

### 4.5 Notifikasi WA Otomatis

**Latar Belakang:** Bot proaktif mengingatkan dan mengirimkan ringkasan tanpa perlu user tanya duluan.

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| NOT-WA-01 | Rekap awal bulan | Kirim ringkasan bulan lalu di tanggal 1 setiap bulan |
| NOT-WA-02 | Alert over budget | Kirim WA ketika pengeluaran suatu kategori melebihi budget |
| NOT-WA-03 | Reminder input harian | Opsional: reminder WA di jam tertentu jika belum ada transaksi hari ini |
| NOT-WA-04 | Reminder utang jatuh tempo | Ingatkan jika ada utang/piutang yang mendekati tanggal jatuh tempo |

**Format Rekap Awal Bulan:**
```
📊 Rekap Keuangan Juni 2026

📈 Pemasukan:     Rp 12.500.000
📉 Pengeluaran:   Rp  7.800.000
💵 Saldo bersih:  Rp  4.700.000

🏆 Top pengeluaran:
1. Makanan       Rp 2.100.000 (27%)
2. Transport     Rp 1.200.000 (15%)
3. Tagihan       Rp   900.000 (12%)

Lihat detail → [link dashboard]
```

**Acceptance Criteria:**
- Semua notifikasi WA bersifat opt-in (default mati)
- User bisa atur jam notifikasi dari settings web
- Notifikasi dikirim via WhatsApp Business API template message (untuk inisiasi)
- Tidak lebih dari 1 notifikasi proaktif per hari per user

---

### 4.6 Utang Piutang (Debt Tracking)

**Latar Belakang:** Pinjaman informal antar teman/keluarga sering terlupakan. Fitur ini mencatat siapa yang hutang ke kita dan sebaliknya.

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| DEBT-01 | Catat piutang | "pinjam ke budi 100rb" → tercatat Budi hutang ke user Rp100.000 |
| DEBT-02 | Catat utang | "hutang ke ani 50rb" → tercatat user hutang ke Ani Rp50.000 |
| DEBT-03 | Tandai lunas | "budi udah bayar" atau via dashboard → status berubah jadi lunas |
| DEBT-04 | Daftar utang piutang | Lihat semua utang/piutang aktif via perintah `utang` atau dashboard |
| DEBT-05 | Reminder jatuh tempo | Set tanggal kapan utang harus dikembalikan, dapat notifikasi WA |
| DEBT-06 | Halaman debt di dashboard | Tabel utang piutang dengan filter status (aktif/lunas) |

**Contoh interaksi WA:**
```
User: "pinjam ke budi 100rb"
Bot: "✅ Tercatat: Budi hutang Rp100.000 ke kamu"

User: "budi udah bayar"
Bot: "Hutang mana yang dimaksud? (1) Budi Rp100.000 – 5 Jul"
User: "1"
Bot: "✅ Hutang Budi Rp100.000 ditandai lunas"
```

**Acceptance Criteria:**
- Utang tidak masuk ke transaksi biasa (tersimpan di tabel terpisah)
- Nama orang bisa bebas (tidak terhubung ke kontak WA)
- Notifikasi jatuh tempo H-1 dan hari-H

---

### 4.7 Catat Bersama (Shared Wallet)

**Latar Belakang:** Pasangan atau rekan usaha ingin mencatat di akun yang sama dari nomor WA masing-masing.

| ID | Fitur | Deskripsi |
|----|-------|-----------|
| SHARE-01 | Undang anggota | Pemilik akun kirim undangan ke nomor WA lain dari settings |
| SHARE-02 | Terima undangan | Anggota konfirmasi via WA → langsung terhubung ke akun |
| SHARE-03 | Catat bersama | Semua anggota bisa catat transaksi ke akun yang sama |
| SHARE-04 | Atribusi pencatat | Setiap transaksi menampilkan siapa yang mencatatnya (via WA / web) |
| SHARE-05 | Kelola anggota | Pemilik bisa hapus akses anggota dari settings |
| SHARE-06 | Notifikasi aktivitas | Pemilik dapat notifikasi WA saat anggota mencatat transaksi |

**Acceptance Criteria:**
- Maksimal 2 anggota per akun (bisa diperluas ke paket premium)
- Anggota tidak bisa hapus/edit transaksi yang bukan miliknya
- Anggota tidak bisa melihat atau mengubah pengaturan akun
- Jika anggota di-remove, transaksi yang sudah dicatat tetap ada

---

## 5. Arsitektur Teknis v1.3

### Stack Tambahan

| Komponen | Teknologi | Keterangan |
|----------|-----------|------------|
| WA API | Meta WhatsApp Cloud API | Gratis hingga 1000 conversation/bulan |
| AI NLP | Claude API (Haiku) | Parse natural language, ~$0.001/pesan |
| Speech-to-Text | OpenAI Whisper / Groq Whisper | Transkripsi voice note |
| Job Queue | BullMQ + Redis | Async processing voice note & notifikasi |
| Cron | `@nestjs/schedule` | Monthly summary, reminder jatuh tempo |
| Template WA | Meta Business Template | Untuk notifikasi proaktif (one-time approval) |

### Modul NestJS Baru

```
apps/api/src/
├── whatsapp/
│   ├── whatsapp.module.ts
│   ├── whatsapp.controller.ts     ← webhook endpoint POST /webhook/whatsapp
│   ├── whatsapp.service.ts        ← routing pesan masuk
│   ├── message-parser.service.ts  ← NLP via Claude API
│   ├── voice.service.ts           ← download audio + Whisper
│   └── wa-notifier.service.ts     ← kirim pesan/notifikasi ke user
├── debts/
│   ├── debt.entity.ts
│   ├── debts.service.ts
│   ├── debts.controller.ts
│   └── debts.module.ts
└── shared-wallet/
    ├── wallet-member.entity.ts
    ├── shared-wallet.service.ts
    └── shared-wallet.module.ts
```

### Schema Database Tambahan

```sql
-- Koneksi WA per user
ALTER TABLE users ADD COLUMN wa_phone VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN wa_linked_at TIMESTAMP;

-- Session interaktif bot (untuk multi-turn conversation)
CREATE TABLE wa_sessions (
  id UUID PRIMARY KEY,
  wa_phone VARCHAR(20) NOT NULL,
  state VARCHAR(50) NOT NULL,     -- 'idle' | 'awaiting_category' | 'awaiting_confirm'
  context JSONB,                  -- data parsial yang sedang dikonfirmasi
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Utang piutang
CREATE TABLE debts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  person_name VARCHAR(100) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  direction VARCHAR(10) NOT NULL,  -- 'owed_to_me' | 'i_owe'
  notes TEXT,
  due_date DATE,
  settled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Anggota shared wallet
CREATE TABLE wallet_members (
  id UUID PRIMARY KEY,
  owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  member_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  UNIQUE(owner_user_id, member_user_id)
);

-- Atribusi transaksi (siapa yang mencatat)
ALTER TABLE transactions ADD COLUMN recorded_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN source VARCHAR(20) DEFAULT 'web';  -- 'web' | 'whatsapp'
```

### Endpoint API Baru v1.3

| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/webhook/whatsapp` | Webhook Meta Cloud API (verify + receive) |
| GET | `/webhook/whatsapp` | Webhook verification challenge dari Meta |
| PUT | `/users/wa-phone` | Link nomor WA ke akun |
| DELETE | `/users/wa-phone` | Unlink nomor WA |
| GET | `/debts` | Daftar utang piutang user |
| POST | `/debts` | Catat utang/piutang baru |
| PUT | `/debts/:id/settle` | Tandai lunas |
| DELETE | `/debts/:id` | Hapus catatan utang |
| GET | `/shared-wallet/members` | Daftar anggota shared wallet |
| POST | `/shared-wallet/invite` | Kirim undangan ke nomor WA |
| DELETE | `/shared-wallet/members/:id` | Hapus akses anggota |

### Halaman Web Baru v1.3

| Halaman | Route | Deskripsi |
|---------|-------|-----------|
| Link WA | `/settings/whatsapp` | Setup & manage koneksi WhatsApp |
| Utang Piutang | `/debts` | Tabel utang piutang dengan filter |
| Shared Wallet | `/settings/shared-wallet` | Kelola anggota yang berbagi akun |

---

## 6. Alur Pemrosesan Pesan WA

```
[User kirim pesan WA]
        ↓
[Meta Cloud API → POST /webhook/whatsapp]
        ↓
[WhatsApp Service: identifikasi user dari nomor WA]
        ↓ (user tidak ditemukan)
[Balas: "Nomor ini belum terdaftar. Daftar di: link"]
        ↓ (user ditemukan)
[Cek tipe pesan: text | audio | image | lainnya]
        ↓
┌───────────────┬──────────────────┬─────────────────┐
│   Text Msg    │   Audio (VN)     │  Image (struk)  │
│               │                  │                 │
│ Cek apakah   │ Download audio   │ Forward ke OCR  │
│ perintah bot │ → Whisper API    │ (fitur import   │
│ atau transaksi│ → teks hasil    │ via WA, v1.3.1) │
│               │ → lanjut ke NLP │                 │
└──────┬────────┴────────┬─────────┘                 │
       ↓ transaksi       ↓ perintah
[Claude API: parse]  [Execute command]
       ↓                  ↓
[Confidence check]   [Format response]
  ↓ tinggi    ↓ rendah
[Simpan DB]  [Tanya klarifikasi]
       ↓
[Format response]
       ↓
[WA Service: kirim balasan ke user]
```

---

## 7. Pertimbangan Keamanan

| Risiko | Mitigasi |
|--------|---------|
| Webhook palsu dari bukan Meta | Verifikasi `X-Hub-Signature-256` header di setiap request |
| Nomor WA dipindah ke akun lain | Konfirmasi OTP saat link pertama kali |
| Spam pesan ke bot | Rate limit: max 30 pesan/jam per nomor WA |
| Data sensitif di log | Mask nominal dan nama orang di application log |
| Akses tidak sah ke akun shared | Member hanya bisa tambah transaksi, tidak bisa lihat/ubah settings |

---

## 8. Monetisasi & Kuota (Opsional untuk masa depan)

> Catatan: Money Flow saat ini gratis. Tabel ini disiapkan jika v1.3 ingin menerapkan freemium.

| Tier | Harga | Kuota WA/bulan | Shared Wallet |
|------|-------|----------------|---------------|
| Free | Gratis | 30 pesan | ✗ |
| Lite | Rp15.000 | 150 pesan + 50 voice note | ✗ |
| Starter | Rp29.000 | 300 pesan + 100 voice note | +1 nomor |
| Premium | Rp59.000 | Unlimited | +2 nomor |

---

## 9. Out of Scope (v1.3)

Fitur berikut ditunda ke v4 atau later:

- **Import struk via WA** — Foto struk dikirim ke WA, langsung di-OCR (butuh integrasi dengan modul OCR yang sudah ada)
- **WhatsApp Pay integration** — Catat otomatis saat bayar via WA Pay
- **Multi-bahasa bot** — Saat ini hanya Bahasa Indonesia
- **Bot Telegram / LINE** — Hanya WA untuk v1.3
- **Analitik AI proaktif** — "Pengeluaran makanmu naik 40% bulan ini" tanpa user tanya
- **Group WA** — Bot di group WA untuk pencatatan tim/komunitas

---

## 10. Dependensi & Prasyarat v1.3

| Kebutuhan | Detail | Estimasi Biaya |
|-----------|--------|----------------|
| Meta Business Account | Akun bisnis terverifikasi di Meta | Gratis |
| WhatsApp Business API | Akses Cloud API via Meta | Gratis ≤1000 conv/bln |
| Claude API key | `claude-haiku-4-5` untuk NLP parsing | ~$0.001/pesan |
| OpenAI / Groq API key | Whisper untuk transkripsi voice note | ~$0.006/menit audio |
| Redis | BullMQ queue untuk async job | ~$5/bln (Redis Cloud) |
| Nomor WA khusus | Nomor dedicated untuk bot (bukan HP biasa) | ~Rp50k/bln kartu SIM |
| Meta App Review | Approval template notifikasi proaktif | 1-3 hari kerja |

---

## 11. Timeline Estimasi

| Fase | Fitur | Estimasi |
|------|-------|----------|
| **Fase 1** | WA-01–07 (Core infrastructure) + CMD-01–09 (Commands) | 2–3 minggu |
| **Fase 2** | NLP-01–07 (AI Parser) + VN-01–05 (Voice Note) | 2–3 minggu |
| **Fase 3** | NOT-WA-01–04 (Notifikasi WA) + DEBT-01–06 (Utang Piutang) | 1–2 minggu |
| **Fase 4** | SHARE-01–06 (Shared Wallet) + halaman web baru | 1–2 minggu |

**Total estimasi: 6–10 minggu**

---

## 12. Metrik Keberhasilan v1.3

| Metrik | Target |
|--------|--------|
| % user yang link nomor WA | > 40% dari total user aktif |
| Transaksi via WA vs web | > 30% transaksi masuk via WA dalam 3 bulan |
| Akurasi NLP parser | > 90% pesan teks berhasil dicatat tanpa klarifikasi |
| Retensi D30 (30-hari) | Naik 25% dibanding v1.2 baseline |
| Response time bot | < 3 detik untuk teks, < 8 detik untuk voice note |
