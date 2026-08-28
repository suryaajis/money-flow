# Money Flow — Integrasi WhatsApp Bot

Dokumentasi lengkap fitur WhatsApp Money Flow (PRD v3): apa saja fungsinya,
cara memakainya sebagai pengguna, dan cara men-deploy-nya ke produksi.

Untuk konfigurasi hardened terbaru, template Meta, signature webhook, linking
berbasis challenge, dan checklist deploy, lihat [`WHATSAPP-PRODUCTION.md`](./WHATSAPP-PRODUCTION.md).

- **Versi:** v3
- **Stack:** NestJS + TypeORM + PostgreSQL (API), Next.js (web)
- **Channel:** Meta WhatsApp Cloud API
- **AI:** Google Gemini 1.5 Flash (NLP teks) + Groq Whisper (voice note)

---

## Daftar Isi

1. [Ringkasan](#1-ringkasan)
2. [Arsitektur](#2-arsitektur)
3. [Fungsi & Fitur](#3-fungsi--fitur)
4. [Panduan Penggunaan (Pengguna)](#4-panduan-penggunaan-pengguna)
5. [Konfigurasi (Environment Variables)](#5-konfigurasi-environment-variables)
6. [Cara Deploy](#6-cara-deploy)
7. [Referensi API](#7-referensi-api)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Ringkasan

Money Flow bisa mencatat keuangan langsung dari **chat WhatsApp** — tanpa buka
aplikasi. Pengguna cukup mengetik pesan biasa seperti `kopi 15rb`, mengirim
**voice note**, atau memakai perintah seperti `saldo` dan `rekap`. AI memproses
pesan dan menyimpan transaksi ke database yang sama dengan dashboard web.

Kemampuan utama:

| Kategori | Kemampuan |
|----------|-----------|
| **Catat transaksi** | Bahasa natural Indonesia (`bensin 50k, parkir 3k`) |
| **Voice note** | Rekam suara → transkripsi otomatis → catat |
| **Perintah bot** | `saldo`, `rekap`, `budget`, `utang`, `daftar`, `hapus`, `ekspor`, `bantuan` |
| **Hutang piutang** | Catat & lunas dari chat (`pinjam ke budi 100rb`) |
| **Notifikasi proaktif** | Rekap bulanan, alert budget, reminder jatuh tempo (opt-in, template Utility) |
| **Dompet bersama** | Anggota mencatat ke akun pemilik, dengan notifikasi |

> **Mode dev tanpa kredensial:** Jika `WA_ACCESS_TOKEN` belum diset, bot tidak
> mengirim pesan WA sungguhan — semua balasan hanya di-*log* ke console. Jadi
> pengembangan lokal bisa jalan tanpa akun Meta.

---

## 2. Arsitektur

```
WhatsApp (user)
      │  pesan / voice note
      ▼
Meta WhatsApp Cloud API  ──webhook──►  POST /api/webhook/whatsapp
      ▲                                        │
      │  balasan (sendText / buttons)          ▼
      └────────────  WaNotifierService ◄── WhatsappService (router)
                                               │
        ┌──────────────────┬───────────────────┼──────────────────┐
        ▼                  ▼                    ▼                  ▼
 MessageParserService  VoiceService     Debts/Budgets repo   WaSession
 (Gemini + fallback)   (Groq Whisper)   (query & tulis)      (state chat)
```

### Modul NestJS

```
apps/api/src/whatsapp/
├── whatsapp.module.ts              Modul utama WA
├── whatsapp.controller.ts          Webhook Meta (GET verify, POST receive)
├── whatsapp.controller.settings.ts REST link/unlink nomor (/users/whatsapp)
├── whatsapp.service.ts             Router pesan + semua handler perintah
├── message-parser.service.ts       NLP: Gemini 1.5 Flash + cooldown quota
├── template-parser.service.ts      Parser non-AI (fallback, tanpa rate limit)
├── voice.service.ts                Download audio Meta + transkripsi Groq
├── wa-notifier.service.ts          Kirim teks & tombol ke Meta Cloud API
├── wa-notifications.service.ts     Cron: rekap/alert/reminder (opt-in)
├── wa-notifications.module.ts      Modul cron (impor ScheduleModule)
├── notification-settings.controller.ts  REST preferensi notif
├── export.controller.ts            Endpoint CSV bertoken (perintah ekspor)
└── wa-session.entity.ts            Tabel wa_sessions (state percakapan)
```

### Tabel Database

| Tabel | Kolom penting | Untuk |
|-------|---------------|-------|
| `users` (ALTER) | `waPhone`, `waLinkedAt`, `notifyMonthlyRecap`, `notifyOverBudget`, `notifyDebtDue` | Koneksi WA + preferensi notif |
| `transactions` (ALTER) | `source` (`web`/`whatsapp`/`shared`), `recordedBy` | Asal & atribusi transaksi |
| `wa_sessions` | `waPhone`, `state`, `context` (jsonb), `expiresAt` | State percakapan multi-langkah (konfirmasi kategori, hapus, voice) |
| `debts` | `direction`, `amount`, `counterpartyName`, `dueDate`, `settledAt` | Hutang piutang |
| `wallet_members` | `ownerUserId`, `memberUserId`, `inviteToken`, `acceptedAt` | Dompet bersama |

---

## 3. Fungsi & Fitur

### 3.1 Catat transaksi (NLP)

`MessageParserService` mengubah pesan bebas menjadi transaksi. Strategi bertingkat:

1. **Gemini 1.5 Flash** (jika `GEMINI_API_KEY` diset) — akurasi tinggi, paham konteks.
2. **Cooldown quota** — saat Gemini kena rate limit (HTTP 429), otomatis
   berhenti memanggilnya selama 60 detik supaya kuota tidak habis dan balasan
   tetap instan.
3. **TemplateParserService** (fallback non-AI) — murni keyword + regex, **tanpa
   rate limit**. Dipakai kalau Gemini tidak tersedia/limit/error.

Yang dikenali parser:

- **Nominal:** `15rb`, `15k`, `15.000`, `1,5jt`, `1.5juta`, `+8jt`, `2m`
- **Tipe:** awalan `+` atau kata (`gajian`, `terima`, `bonus`, `THR`) = pemasukan; selain itu pengeluaran
- **Kategori otomatis:** ~80 kata kunci → cocokkan nama kategori (ID **dan** EN, jadi "Food"/"Makanan" sama-sama kena)
- **Multi-transaksi:** dipisah koma, `;`, atau ` dan ` (aman untuk `1,5jt`)
- **Tanggal relatif:** `kemarin`, `2 hari lalu`, `senin lalu`
- **Kategori eksplisit:** `makan 25rb #food` atau `beli buku 100rb kategori:belanja`

### 3.2 Voice note (VN-01..05)

`VoiceService` menangani rekaman suara:

1. Meta mengirim **media id** di webhook.
2. Resolve media id → URL sementara → download audio (OGG/Opus, maks ~16MB / ~5 menit).
3. Transkripsi via **Groq Whisper** (`whisper-large-v3`, bahasa `id`).
4. Hasil transkripsi diproses parser yang sama dengan teks.
5. Bot menampilkan preview (`🎙️ Kamu bilang: "..."`) dan minta konfirmasi
   **sebelum** menyimpan — konfirmasi lewat tombol *Ya/Bukan* atau ketik `ya`/`bukan`.

Butuh `GROQ_API_KEY` + `WA_ACCESS_TOKEN`. Tanpa itu, bot minta user mengetik saja.

### 3.3 Perintah bot

| Perintah | Fungsi |
|----------|--------|
| `saldo` / `balance` | Ringkasan pemasukan/pengeluaran/saldo bulan ini |
| `rekap` / `laporan` | Laporan bulanan + top 3 kategori |
| `rekap minggu ini` | Laporan 7 hari terakhir |
| `budget` / `anggaran` | Status budget per kategori (🟢/🟠/🔴) |
| `utang` / `piutang` | Daftar hutang piutang aktif |
| `daftar` / `list` | 5 transaksi terakhir |
| `hapus` / `batal` | Hapus transaksi WA terakhir (dengan konfirmasi) |
| `ekspor` / `export` | Link unduh CSV bulan ini (berlaku 1 jam) |
| `bantuan` / `help` | Menu semua perintah |

Perintah bersifat *case-insensitive*.

### 3.4 Hutang piutang via chat

- `pinjam ke budi 100rb` → **piutang** (Budi hutang ke kamu)
- `hutang ke ani 50rb` → **hutang** (kamu hutang ke Ani)
- `budi udah bayar` / `lunas ani` → tandai **lunas** (pakai tombol bila ambigu)

Deteksi hutang diperketat: `bayar hutang 100rb` (pengeluaran biasa) **tidak**
salah terbaca karena butuh pola `pinjam`/`piutang`/`… ke <nama>`.

### 3.5 Notifikasi proaktif (cron)

`WaNotificationsService` (`@nestjs/schedule`). Semua **opt-in, default mati**,
maksimal 1 pesan proaktif per hari:

| Notifikasi | Jadwal | Isi |
|------------|--------|-----|
| Rekap awal bulan | 08:00 tanggal 1 | Ringkasan bulan lalu + top 3 pengeluaran |
| Alert budget terlampaui | 20:00 harian | Kategori yang lewat 100% budget |
| Reminder jatuh tempo | 09:00 harian | Utang/piutang jatuh tempo H-1 & hari-H |

Diatur dari **Settings → WhatsApp** (toggle per jenis).

### 3.6 Dompet bersama (write)

- Anggota yang sudah menerima undangan bisa **mencatat transaksi ke akun pemilik**
  dari halaman *Settings → Dompet Bersama*.
- Transaksi tersimpan dengan `userId = pemilik`, `recordedBy = anggota`, `source = 'shared'`.
- Di tabel transaksi pemilik muncul badge **"👥 dicatat oleh X"** (atribusi).
- Pemilik dapat **notifikasi WA** saat anggota mencatat (jika nomornya terhubung).
- Anggota **tidak bisa** edit/hapus transaksi milik orang lain.

---

## 4. Panduan Penggunaan (Pengguna)

### Menghubungkan nomor

1. Buka web app → **Settings → WhatsApp**.
2. Klik **Buat Link WhatsApp** lalu **Buka WhatsApp**.
3. Kirim pesan `HUBUNGKAN <token>` yang sudah disiapkan. Nomor diverifikasi dari webhook Meta.

Satu akun hanya bisa terhubung ke satu nomor, dan sebaliknya.

### Contoh percakapan

```
User: kopi 15rb
Bot:  ✅ Tercatat: -Rp15.000 Makanan • kopi

User: gajian 8jt
Bot:  ✅ Tercatat: +Rp8.000.000 Gaji

User: bensin 50k, parkir 3k
Bot:  ✅ 2 transaksi berhasil dicatat!

User: [voice note] "beli bensin lima puluh ribu"
Bot:  🎙️ Kamu bilang: "beli bensin lima puluh ribu"
      📝 Aku catat: -Rp50.000 Transport
      Simpan?  [Ya, simpan] [Bukan]

User: saldo
Bot:  💰 Saldo Juli 2026
      📈 Pemasukan: +Rp8.000.000
      📉 Pengeluaran: -Rp3.200.000
      💵 Saldo bersih: Rp4.800.000

User: pinjam ke budi 100rb
Bot:  ✅ Tercatat: Budi hutang Rp100.000 ke kamu (piutang).

User: budi udah bayar
Bot:  ✅ Budi Rp100.000 ditandai lunas.
```

---

## 5. Konfigurasi (Environment Variables)

Semua di `apps/api/.env` (lihat `apps/api/.env.example`).

| Variabel | Wajib? | Keterangan |
|----------|--------|------------|
| `WA_ACCESS_TOKEN` | untuk kirim WA | Access token permanen Meta Business → WhatsApp |
| `WA_PHONE_NUMBER_ID` | untuk kirim WA | ID nomor pengirim di Meta |
| `WA_WABA_ID` | kelola template | ID WhatsApp Business Account untuk sync template |
| `WA_BUSINESS_PHONE_NUMBER` | untuk linking | Nomor publik pengirim, format internasional tanpa `+` |
| `WA_APP_SECRET` | production | Memverifikasi signature POST webhook Meta |
| `WA_VERIFY_TOKEN` | untuk webhook | String bebas untuk verifikasi webhook (samakan di Meta) |
| `WA_GRAPH_API_VERSION` | disarankan | Versi Graph API, default `v25.0` |
| `WA_TEMPLATE_*` | notifikasi | Nama empat template Utility yang sudah approved |
| `PUBLIC_API_URL` | untuk `ekspor` | Base URL publik API, untuk menyusun link CSV (mis. `https://api.domain.com/api`) |
| `GEMINI_API_KEY` | opsional | Google AI Studio (gratis). Kosong → pakai template parser |
| `GROQ_API_KEY` | untuk voice | console.groq.com (gratis). Kosong → voice note nonaktif |
| `JWT_SECRET` | ya (sudah ada) | Dipakai juga untuk token link ekspor |

Tanpa `WA_ACCESS_TOKEN`/`WA_PHONE_NUMBER_ID`, semua pengiriman di-*log* ke console (mode dev).

---

## 6. Cara Deploy

### Langkah 1 — Siapkan Meta WhatsApp Cloud API

1. Buat app di [developers.facebook.com](https://developers.facebook.com) → tambah produk **WhatsApp**.
2. Catat **Phone Number ID** → set `WA_PHONE_NUMBER_ID`.
3. Buat **permanent access token** (System User) → set `WA_ACCESS_TOKEN`.
4. Tentukan string verifikasi bebas → set `WA_VERIFY_TOKEN` (mis. `money-flow-verify`).

### Langkah 2 — Daftarkan webhook

Di Meta App → WhatsApp → Configuration → Webhook:

- **Callback URL:** `https://<domain-api>/api/webhook/whatsapp`
- **Verify token:** sama dengan `WA_VERIFY_TOKEN`
- **Subscribe** field: `messages`

Meta akan `GET` URL itu untuk verifikasi; endpoint sudah menangani handshake
`hub.challenge`. Untuk uji lokal, expose port dengan ngrok/cloudflared.

### Langkah 3 — Kunci AI (opsional tapi disarankan)

- **Gemini:** [aistudio.google.com](https://aistudio.google.com) → buat API key → `GEMINI_API_KEY`. (Free tier: ~15 RPM / 1500 request per hari.)
- **Groq (voice):** [console.groq.com](https://console.groq.com) → API key → `GROQ_API_KEY`.

Tanpa keduanya aplikasi tetap jalan: NLP jatuh ke template parser, voice note dimatikan dengan pesan ramah.

### Langkah 4 — Migrasi database

Skema WA masuk lewat migration (bukan `synchronize`). Setelah deploy kode:

```bash
cd apps/api
npm run migration:run
```

Migration yang relevan:
- `AddWhatsapp…` — `wa_sessions` + kolom `users.waPhone/waLinkedAt` + `transactions.source/recordedBy`
- `AddDebts…` — tabel `debts`
- `AddWalletMembers…` — tabel `wallet_members`
- `AddNotificationPrefs…` — kolom opt-in notifikasi di `users`

### Langkah 5 — Cron (notifikasi)

`WaNotificationsModule` memakai `@nestjs/schedule` (in-process). Cukup pastikan
proses API tetap hidup 24/7 (mis. PM2, systemd, atau container yang tidak
di-scale-to-zero). Jadwal cron dikunci ke zona waktu **Asia/Jakarta**.

> ⚠️ Kalau API dijalankan multi-instance, cron akan berjalan di **setiap**
> instance. Untuk saat ini jalankan scheduler di satu instance saja, atau
> tambahkan lock (mis. Redis) sebelum scale horizontal.

### Langkah 6 — Verifikasi

1. Set semua env → restart API.
2. Meta Webhook menunjukkan status **verified**.
3. Kirim `bantuan` dari nomor terdaftar → bot membalas menu.
4. Cek log: mode produksi mengirim ke Graph API; mode dev menampilkan `[DEV] WA → …`.

---

## 7. Referensi API

Endpoint internal (butuh JWT kecuali webhook & export):

| Method | Path | Fungsi |
|--------|------|--------|
| `GET`  | `/api/webhook/whatsapp` | Verifikasi webhook Meta |
| `POST` | `/api/webhook/whatsapp` | Terima pesan masuk |
| `GET`  | `/api/users/whatsapp` | Status koneksi WA |
| `POST` | `/api/users/whatsapp/link` | Hubungkan nomor |
| `DELETE` | `/api/users/whatsapp/link` | Putuskan nomor |
| `GET/PUT` | `/api/users/notifications` | Baca/ubah preferensi notif |
| `GET`  | `/api/export/transactions?token=…` | Unduh CSV (token 1 jam) |
| `POST` | `/api/shared-wallet/:ownerId/transactions` | Anggota catat ke dompet pemilik |
| `GET`  | `/api/shared-wallet/recorders` | id→nama untuk atribusi |

---

## 8. Troubleshooting

| Gejala | Kemungkinan sebab | Solusi |
|--------|-------------------|--------|
| Bot tidak membalas | Webhook belum verified / token salah | Cek `WA_VERIFY_TOKEN` & URL webhook di Meta |
| Balasan hanya di log | `WA_ACCESS_TOKEN`/`WA_PHONE_NUMBER_ID` kosong | Set kredensial Meta (ini mode dev) |
| Kategori sering salah | Gemini limit / tidak diset | Set `GEMINI_API_KEY`; template parser tetap jalan tapi lebih sederhana |
| Voice note "belum aktif" | `GROQ_API_KEY` atau `WA_ACCESS_TOKEN` kosong | Set keduanya |
| Link ekspor "tidak valid" | Token kedaluwarsa (>1 jam) atau `JWT_SECRET` beda | Minta ulang `ekspor`; pastikan `JWT_SECRET` konsisten |
| Notifikasi tidak terkirim | Preferensi mati / nomor belum terhubung / proses mati | Aktifkan toggle di Settings, hubungkan nomor, pastikan API 24/7 |
| Kolom DB error saat start | Migration belum dijalankan | `npm run migration:run` |

---

## Referensi PRD

Fitur ini mengimplementasikan **PRD v3** — lihat [`docs/PRD-v3.md`](./PRD-v3.md):
WA-01..07, NLP-01..07, VN-01..05, CMD-01..09, NOT-WA-01/02/04, DEBT-01..06, SHARE-01..06.
