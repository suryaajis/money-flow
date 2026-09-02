# Panduan Lengkap: Mendapatkan Environment Variables WhatsApp

> Untuk deployment production terbaru—termasuk App Secret, signature webhook,
> linking berbasis challenge, dan template Utility—ikuti
> [`WHATSAPP-PRODUCTION.md`](./WHATSAPP-PRODUCTION.md). Dokumen ini tetap berguna
> untuk mendapatkan kredensial dasar dan menjalankan setup lokal.

Dokumen ini menjelaskan **langkah demi langkah** cara mendapatkan semua environment
variable yang dibutuhkan untuk mengaktifkan WhatsApp bot Money Flow.

---

## Daftar Isi

1. [Ringkasan Variabel](#1-ringkasan-variabel)
2. [WA\_ACCESS\_TOKEN & WA\_PHONE\_NUMBER\_ID](#2-wa_access_token--wa_phone_number_id)
3. [WA\_VERIFY\_TOKEN](#3-wa_verify_token)
4. [PUBLIC\_API\_URL (ngrok untuk dev lokal)](#4-public_api_url-ngrok-untuk-dev-lokal)
5. [GEMINI\_API\_KEY](#5-gemini_api_key)
6. [GROQ\_API\_KEY](#6-groq_api_key)
7. [Contoh .env Lengkap](#7-contoh-env-lengkap)
8. [Urutan Setup yang Disarankan](#8-urutan-setup-yang-disarankan)

---

## 1. Ringkasan Variabel

| Variabel | Dari mana | Wajib? |
|---|---|---|
| `WA_ACCESS_TOKEN` | Meta for Developers | Ya (untuk kirim pesan nyata) |
| `WA_PHONE_NUMBER_ID` | Meta for Developers | Ya (untuk kirim pesan nyata) |
| `WA_VERIFY_TOKEN` | Dibuat sendiri | Ya (untuk daftarkan webhook) |
| `PUBLIC_API_URL` | Ngrok (dev) / domain kamu (prod) | Ya (untuk fitur ekspor CSV) |
| `GEMINI_API_KEY` | Google AI Studio | Opsional (NLP lebih akurat) |
| `GROQ_API_KEY` | Groq Console | Opsional (fitur voice note) |

> **Tanpa `WA_ACCESS_TOKEN`/`WA_PHONE_NUMBER_ID`:** bot tetap jalan tapi semua
> balasan hanya muncul di log console (tidak terkirim ke WA sungguhan). Cocok
> untuk dev lokal tanpa akun Meta.

---

## 2. WA\_ACCESS\_TOKEN & WA\_PHONE\_NUMBER\_ID

Kedua variabel ini berasal dari **Meta for Developers** (platform yang mengelola
WhatsApp Business API). Ada dua jenis token: **temporary** (untuk testing, 24 jam)
dan **permanent** (untuk production). Ikuti seluruh langkah di bawah.

### 2.1 Buat Akun Meta for Developers

1. Buka **[developers.facebook.com](https://developers.facebook.com)**.
2. Klik **Get Started** (pojok kanan atas).
3. Login dengan akun Facebook kamu. Jika belum punya, buat dulu di facebook.com.
4. Setujui kebijakan pengembang → klik **Continue**.
5. Pilih tipe akun: **Developer** → klik **Complete Registration**.

### 2.2 Buat App Baru

1. Di dashboard developer, klik **Create App** (atau **My Apps → Create App**).
2. Pilih use case: **Other** → klik **Next**.
3. Pilih tipe app: **Business** → klik **Next**.
4. Isi form:
   - **App Name:** `Money Flow` (atau nama apa saja)
   - **App Contact Email:** email kamu
   - **Business Account:** pilih akun bisnis kamu (atau buat baru)
5. Klik **Create App** → konfirmasi password Facebook.

### 2.3 Tambahkan Produk WhatsApp

1. Setelah app dibuat, kamu akan diarahkan ke **App Dashboard**.
2. Cari panel **Add products to your app**.
3. Temukan **WhatsApp** → klik **Set Up**.
4. Pilih **WhatsApp Business Platform** → klik **Continue**.
5. Halaman **WhatsApp → Getting Started** akan terbuka.

### 2.4 Dapatkan Phone Number ID

1. Di halaman **WhatsApp → Getting Started**, lihat bagian **Send and receive messages**.
2. Di dropdown **From**, pilih nomor test yang disediakan Meta (format:
   `+1 555 XXX XXXX`). Nomor ini gratis dan sudah siap pakai.
3. Di bawah dropdown tersebut, klik **Phone number ID** → salin nilai yang muncul.
4. Simpan sebagai:

```env
WA_PHONE_NUMBER_ID=123456789012345
```

### 2.5 Dapatkan Access Token (Temporary — untuk Testing)

1. Masih di halaman **WhatsApp → Getting Started**.
2. Lihat bagian **Temporary access token** — token ini berlaku **24 jam**.
3. Klik ikon copy di samping token tersebut.
4. Simpan sebagai:

```env
WA_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx...
```

> **Token temporary cukup untuk development/testing.** Untuk production, lanjut ke
> langkah 2.6 untuk membuat token permanen.

### 2.6 Tambahkan Nomor Penerima Test

Saat akun masih dalam mode **development**, kamu hanya bisa mengirim pesan ke
nomor yang terdaftar sebagai test recipient:

1. Masih di **WhatsApp → Getting Started**, lihat bagian **To**.
2. Klik **Manage phone number list**.
3. Klik **Add phone number**.
4. Masukkan nomor WA kamu (format internasional: `628xxxxxxxxxx`).
5. Verifikasi dengan kode OTP yang dikirim ke nomor tersebut.
6. Nomor kamu sekarang bisa menerima pesan dari bot dalam mode dev.

### 2.7 Buat Token Permanen (untuk Production)

Token temporary kedaluwarsa setiap 24 jam — tidak cocok untuk production.
Ikuti langkah ini untuk membuat **System User Token** yang tidak kedaluwarsa:

#### Langkah A — Buka Meta Business Suite

1. Buka **[business.facebook.com](https://business.facebook.com)**.
2. Pilih bisnis yang kamu gunakan saat membuat app tadi.

#### Langkah B — Buat System User

1. Di sidebar kiri, klik **Settings** (ikon roda gigi).
2. Klik **Users → System Users**.
3. Klik **Add** → beri nama (mis. `money-flow-bot`).
4. Pilih role: **Admin** → klik **Create System User**.

#### Langkah C — Assign Asset ke System User

1. Setelah System User dibuat, klik **Add Assets**.
2. Pilih kategori **Apps** → pilih app `Money Flow` yang kamu buat tadi.
3. Centang **Full Control** → klik **Save Changes**.

#### Langkah D — Generate Token

1. Kembali ke halaman System Users → klik nama system user kamu.
2. Klik **Generate New Token**.
3. Pilih app: `Money Flow`.
4. Centang permission berikut:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Klik **Generate Token**.
6. **Salin token sekarang** — token ini hanya ditampilkan sekali.
7. Simpan sebagai:

```env
WA_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx...
```

> Simpan token ini di tempat aman (password manager). Jika hilang, kamu harus
> generate ulang.

### 2.8 Upgrade ke Akun Bisnis Terverifikasi (untuk Production Publik)

Selama akun dalam mode development, bot hanya bisa dihubungi oleh nomor yang
kamu daftarkan di test recipient list. Untuk melayani user umum:

1. Di Meta for Developers → App Dashboard → klik **Go Live** (tombol hijau di
   bagian atas).
2. Meta akan meminta verifikasi bisnis — ikuti prosesnya (bisa butuh beberapa hari).
3. Setelah terverifikasi dan live, bot bisa dipakai oleh siapa saja.

---

## 3. WA\_VERIFY\_TOKEN

Ini adalah string **buatan kamu sendiri** — fungsinya sebagai "kata sandi" agar
Meta tahu bahwa webhook URL yang didaftarkan memang milik kamu (bukan orang lain).

### Cara membuatnya

Pilih string yang susah ditebak. Contoh:

```
money-flow-verify-2026
mf-wh-secret-abc123
```

Atau generate secara random:

```bash
# Di terminal (Linux/Mac/Git Bash)
openssl rand -hex 16
```

Simpan di `.env`:

```env
WA_VERIFY_TOKEN=money-flow-verify-2026
```

### Cara mendaftarkannya ke Meta

Ini dilakukan di langkah registrasi webhook (lihat bagian di bawah, setelah
kamu punya `PUBLIC_API_URL`):

1. Buka **Meta App → WhatsApp → Configuration → Webhook**.
2. Klik **Edit**.
3. Isi **Verify Token** dengan nilai yang sama persis dengan `WA_VERIFY_TOKEN` di `.env`.

---

## 4. PUBLIC\_API\_URL (ngrok untuk dev lokal)

Webhook Meta harus dapat diakses dari internet dengan **HTTPS**. Untuk dev lokal,
gunakan **ngrok** sebagai tunnel.

### 4.1 Install ngrok

```bash
# Windows (via winget)
winget install ngrok.ngrok

# Mac
brew install ngrok

# Atau download manual di ngrok.com/download
```

### 4.2 Buat Akun ngrok (Gratis)

1. Daftar di **[ngrok.com](https://ngrok.com)** → Sign Up.
2. Setelah login, buka **[dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)**.
3. Salin **Authtoken** kamu.
4. Jalankan di terminal:

```bash
ngrok config add-authtoken <authtoken-kamu>
```

### 4.3 Jalankan ngrok

Pastikan API kamu berjalan di port `3001` (default), lalu buka terminal baru:

```bash
ngrok http 3001
```

Output akan terlihat seperti ini:

```
Forwarding  https://abcd-1234.ngrok-free.app -> http://localhost:3001
```

### 4.4 Set PUBLIC\_API\_URL

Salin URL HTTPS dari output ngrok, tambahkan `/api` di belakangnya:

```env
PUBLIC_API_URL=https://abcd-1234.ngrok-free.app/api
```

### 4.5 Daftarkan Webhook ke Meta

Sekarang kamu sudah punya `PUBLIC_API_URL` dan `WA_VERIFY_TOKEN`, daftarkan webhook:

1. Buka **Meta App → WhatsApp → Configuration**.
2. Di bagian **Webhook**, klik **Edit**.
3. Isi form:
   - **Callback URL:** `https://abcd-1234.ngrok-free.app/api/webhook/whatsapp`
   - **Verify Token:** isi dengan nilai `WA_VERIFY_TOKEN` kamu (mis. `money-flow-verify-2026`)
4. Klik **Verify and Save**.
5. Meta akan melakukan GET request ke URL itu — server kamu harus sedang berjalan
   agar verifikasi berhasil.
6. Setelah berhasil, klik **Add subscriptions** → centang **messages** → klik **Done**.

> **Setiap kali ngrok di-restart, URL berubah.** Kamu harus update Callback URL
> di Meta dan `PUBLIC_API_URL` di `.env` setiap sesi dev. Untuk menghindari ini,
> upgrade ke ngrok plan berbayar (custom subdomain) atau deploy ke server.

### 4.6 Untuk Production

Gunakan domain sungguhan:

```env
PUBLIC_API_URL=https://api.money-flow.app/api
```

Daftarkan domain ini di webhook Meta (sama seperti langkah di atas).

---

## 5. GEMINI\_API\_KEY

Digunakan oleh `MessageParserService` untuk memahami pesan bahasa natural dengan
akurasi tinggi. **Gratis** dengan kuota 15 request per menit dan 1.500 request
per hari (cukup untuk penggunaan personal).

### Langkah-langkah

1. Buka **[aistudio.google.com](https://aistudio.google.com)**.
2. Login dengan akun Google kamu.
3. Di halaman utama, klik **Get API Key** (atau **Create API Key**).
4. Klik **Create API key in new project**.
   - Atau pilih project Google Cloud yang sudah ada.
5. API key akan langsung ditampilkan. Salin nilainya.
6. Simpan sebagai:

```env
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXX
```

### Catatan Penting

- API key bersifat **sensitif** — jangan commit ke Git.
- Jika kuota habis (HTTP 429), `MessageParserService` otomatis berhenti memanggil
  Gemini selama 60 detik dan beralih ke template parser bawaan. Bot tetap bisa
  mencatat transaksi, hanya akurasi NLP-nya yang berkurang sementara.
- Model yang dipakai: **Gemini 1.5 Flash** (paling ringan dan cepat di keluarga Gemini).

---

## 6. GROQ\_API\_KEY

Digunakan oleh `VoiceService` untuk mentranskripsikan voice note yang dikirim
pengguna ke bot WA. Menggunakan model **Whisper Large v3** via Groq. **Gratis**
dengan batas yang sangat longgar untuk penggunaan personal.

### Langkah-langkah

1. Buka **[console.groq.com](https://console.groq.com)**.
2. Klik **Sign Up** → daftar dengan email atau akun Google/GitHub.
3. Setelah login, klik **API Keys** di menu kiri.
4. Klik **Create API Key**.
5. Beri nama (mis. `money-flow-bot`) → klik **Submit**.
6. Salin API key yang muncul (hanya ditampilkan sekali).
7. Simpan sebagai:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Catatan Penting

- `GROQ_API_KEY` **tidak akan berfungsi tanpa `WA_ACCESS_TOKEN`** — keduanya
  dibutuhkan karena audio diunduh dari server Meta menggunakan access token.
- Jika salah satu dari dua key ini kosong, bot akan membalas:
  `"🎙️ Voice note belum aktif di server ini. Silakan ketik..."`
- Format audio yang didukung Meta untuk voice note: OGG/Opus (ukuran maks ~16MB).

---

## 7. Contoh .env Lengkap

Salin blok ini ke `apps/api/.env` dan ganti semua nilai placeholder:

```env
# ─── Database ────────────────────────────────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=ganti_dengan_password_db_kamu
DB_NAME=money_flow

# ─── Auth ────────────────────────────────────────────────────────────────────
JWT_SECRET=ganti_dengan_string_panjang_acak_minimal_32_karakter
JWT_EXPIRES_IN=7d

# ─── Server ──────────────────────────────────────────────────────────────────
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# ─── WhatsApp (Meta Cloud API) ────────────────────────────────────────────────
# Dari: Meta for Developers → App → WhatsApp → Getting Started
WA_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WA_PHONE_NUMBER_ID=123456789012345

# Buat sendiri — harus sama dengan yang didaftarkan di webhook Meta
WA_VERIFY_TOKEN=money-flow-verify-2026

# URL publik API ini (HTTPS). Untuk dev lokal gunakan URL ngrok.
# Untuk production ganti dengan domain sungguhan.
PUBLIC_API_URL=https://abcd-1234.ngrok-free.app/api

# ─── AI: NLP Parser (opsional) ───────────────────────────────────────────────
# Dari: aistudio.google.com → Get API Key
# Kosong = pakai template parser bawaan (akurasi lebih rendah)
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXX

# ─── AI: Voice Note Transcription (opsional) ─────────────────────────────────
# Dari: console.groq.com → API Keys
# Kosong = fitur voice note nonaktif
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 8. Urutan Setup yang Disarankan

Ikuti urutan ini agar tidak bolak-balik:

```
1. Buat akun Meta for Developers
       ↓
2. Buat Meta App + tambah produk WhatsApp
       ↓
3. Catat WA_PHONE_NUMBER_ID (dari halaman Getting Started)
       ↓
4. Catat WA_ACCESS_TOKEN (temporary dulu, permanent nanti)
       ↓
5. Tambahkan nomor WA kamu ke test recipient list
       ↓
6. Tentukan WA_VERIFY_TOKEN (string bebas buatan sendiri)
       ↓
7. Jalankan API lokal: cd apps/api && npm run start:dev
       ↓
8. Jalankan ngrok: ngrok http 3001 → catat URL HTTPS-nya
       ↓
9. Set PUBLIC_API_URL di .env dengan URL ngrok
       ↓
10. Daftarkan webhook di Meta (URL ngrok + WA_VERIFY_TOKEN)
        ↓
11. Verifikasi webhook berhasil (status "verified" di Meta)
        ↓
12. Kirim pesan "bantuan" ke nomor bot → bot harus membalas ✅
        ↓
13. (Opsional) Daftar Gemini API key → set GEMINI_API_KEY
        ↓
14. (Opsional) Daftar Groq API key → set GROQ_API_KEY
        ↓
15. Restart API → test voice note 🎙️
```

### Checklist Verifikasi

Setelah semua diset, pastikan:

- [ ] `GET /api/webhook/whatsapp` → status **verified** di Meta
- [ ] Kirim `bantuan` ke bot → menerima menu perintah
- [ ] Kirim `kopi 15rb` → tercatat di dashboard web
- [ ] Kirim `saldo` → mendapat ringkasan bulan ini
- [ ] (Jika GEMINI diset) Kirim kalimat natural → terparsing dengan benar
- [ ] (Jika GROQ diset) Kirim voice note → mendapat preview transkrip + konfirmasi

---

## Referensi

- [Meta WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Google AI Studio](https://aistudio.google.com)
- [Groq Console](https://console.groq.com)
- [ngrok Docs](https://ngrok.com/docs)
- [Dokumentasi bot lengkap](./WHATSAPP.md)
