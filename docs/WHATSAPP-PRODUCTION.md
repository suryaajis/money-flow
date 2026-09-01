# WhatsApp Production Setup — MoneyFlow

> Membership quota, distributed rate limit, dan outbound cost guard v1.7
> dijelaskan di [`WHATSAPP-RATE-LIMITS.md`](./WHATSAPP-RATE-LIMITS.md).
> Kebijakan pricing Meta dan biaya platform Kirimdev dijelaskan terpisah di
> [`WHATSAPP-PRICING-META.md`](./WHATSAPP-PRICING-META.md). Rate dan harga wajib
> diverifikasi ulang sebelum production launch.

Dokumen ini adalah checklist deployment integrasi Meta WhatsApp Cloud API untuk
MoneyFlow. Balasan terhadap chat pengguna memakai pesan biasa selama customer
service window 24 jam. Semua pesan yang dimulai sistem memakai template Utility
yang sudah berstatus **APPROVED**.

## 1. Template yang harus dibuat

Buat template berikut melalui **WhatsApp Manager → Message templates**. Pilih
bahasa Indonesian (`id`) dan kategori **Utility**. Meta tetap menentukan
kategori akhir ketika template direview.

### `moneyflow_monthly_recap`

```text
Rekap MoneyFlow {{1}} sudah siap.

Pemasukan: Rp{{2}}
Pengeluaran: Rp{{3}}
Saldo bersih: Rp{{4}}

Top pengeluaran:
{{5}}

Buka MoneyFlow untuk melihat detail.
```

Urutan parameter: periode, pemasukan, pengeluaran, saldo bersih, top kategori.

### `moneyflow_budget_alert`

```text
Anggaran MoneyFlow kamu terlampaui:

{{1}}

Buka MoneyFlow untuk melihat detail dan menyesuaikan anggaran.
```

Parameter pertama berisi ringkasan kategori yang melewati anggaran.

### `moneyflow_debt_due`

```text
Pengingat utang/piutang MoneyFlow:

{{1}}

Buka MoneyFlow untuk memperbarui status pembayaran.
```

Parameter pertama berisi ringkasan pembayaran yang jatuh tempo.

### `moneyflow_shared_wallet_activity`

```text
Aktivitas baru pada dompet bersama MoneyFlow.

Dicatat oleh: {{1}}
Nominal: {{2}}
Kategori: {{3}}
Catatan: {{4}}

Buka MoneyFlow untuk melihat detail.
```

Urutan parameter: nama anggota, nominal, kategori, catatan.

### Membuat dan memverifikasi melalui project

MoneyFlow menyediakan manifest yang sama dengan kontrak parameter di kode API.
Preview payload tanpa mengakses Meta:

```bash
npm run whatsapp:templates:sync -- --dry-run
```

Setelah `WA_ACCESS_TOKEN` baru dan `WA_WABA_ID` diisi, buat semua template yang
belum ada:

```bash
npm run whatsapp:templates:sync -- --apply
```

Meta biasanya mengembalikan status awal `PENDING`. Setelah proses review, cek
status, kategori, bahasa, dan perubahan isi dengan:

```bash
npm run whatsapp:templates:sync -- --verify
```

Script tidak menghapus atau menimpa template existing. Jika menemukan `REJECTED`
atau `BODY DRIFT`, script keluar dengan status gagal agar perubahan ditinjau
secara eksplisit di WhatsApp Manager.

Jangan mengubah jumlah atau urutan variable tanpa mengubah pemanggilan template
di API. Nama dan bahasa template dapat dioverride melalui environment variable.

## 2. Environment variables

```env
NODE_ENV=production

WA_ACCESS_TOKEN=<system-user-token-baru>
WA_PHONE_NUMBER_ID=<phone-number-id>
WA_WABA_ID=<whatsapp-business-account-id>
WA_BUSINESS_PHONE_NUMBER=628123456789
WA_APP_SECRET=<meta-app-secret>
WA_VERIFY_TOKEN=<random-secret-yang-panjang>
WA_GRAPH_API_VERSION=v25.0
WA_REQUEST_TIMEOUT_MS=10000
WA_LINK_TOKEN_TTL_MINUTES=10

WA_TEMPLATE_LANGUAGE=id
WA_TEMPLATE_MONTHLY_RECAP=moneyflow_monthly_recap
WA_TEMPLATE_OVER_BUDGET=moneyflow_budget_alert
WA_TEMPLATE_DEBT_DUE=moneyflow_debt_due
WA_TEMPLATE_SHARED_WALLET=moneyflow_shared_wallet_activity
```

`WA_BUSINESS_PHONE_NUMBER` adalah nomor publik pengirim, bukan Phone Number ID.
Gunakan format internasional tanpa tanda `+`.

System-user token untuk template sync harus memiliki permission
`whatsapp_business_management`; pengiriman pesan juga memerlukan
`whatsapp_business_messaging`.

Token dan App Secret hanya boleh disimpan sebagai secret milik platform deploy.
Jangan simpan nilai aslinya di Git, log, screenshot, atau dokumentasi.

## 3. Database

Jalankan migration sebelum menyalakan versi API baru:

```bash
npm run migration:run
```

Migration production hardening menambahkan:

- challenge linking nomor yang kedaluwarsa dan hanya dapat dipakai sekali;
- idempotency key untuk pesan webhook;
- audit status outbound berdasarkan `wamid`;
- delivery gate unik per pengguna dan tanggal Jakarta.

## 4. Webhook Meta

Gunakan callback berikut dan subscribe field `messages`:

```text
https://<api-domain>/api/webhook/whatsapp
```

Verify token harus identik dengan `WA_VERIFY_TOKEN`. POST webhook diverifikasi
dengan `X-Hub-Signature-256` dan `WA_APP_SECRET`. Aplikasi production akan gagal
start jika WhatsApp aktif tetapi App Secret, Verify Token, atau nomor publik
belum dikonfigurasi.

## 5. Linking pengguna

Pengguna tidak lagi mengetik nomor yang langsung dipercaya sistem:

1. Pengguna memilih **Buat Link WhatsApp** di Settings.
2. API membuat token acak, menyimpan SHA-256 token, dan memberi masa berlaku 10 menit.
3. Pengguna membuka link dan mengirim pesan `HUBUNGKAN <token>` dari WhatsApp miliknya.
4. Webhook mengikat akun ke nomor `from` yang diberikan Meta.
5. Token ditandai sudah digunakan dan tidak dapat dipakai ulang.

Pesan linking dari pengguna sekaligus membuka customer service window 24 jam.

## 6. Perilaku pengiriman

- Chat masuk, voice note, dan button reply: balasan `text`/`interactive` dalam window 24 jam.
- Rekap, budget, utang, dan shared wallet: selalu `template`.
- HTTP `429` dan `5xx`: dicoba ulang maksimal tiga kali dengan backoff pendek.
- HTTP error lain: dilempar dan dicatat, bukan dianggap sukses.
- Respons sukses harus mengandung ID `wamid`.
- Webhook status memperbarui `accepted`, `sent`, `delivered`, `read`, atau `failed`.
- Message ID inbound disimpan sebelum diproses agar retry Meta tidak menduplikasi transaksi.
- Maksimal satu notifikasi proaktif per pengguna per tanggal `Asia/Jakarta`.

Pesan inbound yang gagal diproses ditandai `failed` dan tidak direplay otomatis,
karena transaksi mungkin sudah tersimpan sebelum pengiriman balasan gagal. Pengguna
dapat mengirim ulang perintah; operator dapat melihat `wa_webhook_events.lastError`.

## 7. Checklist verifikasi

1. Jalankan template sync `--apply`, lalu pastikan keempatnya `APPROVED` dengan `--verify`.
2. Jalankan migration.
3. Deploy API dengan HTTPS dan semua secret production.
4. Verifikasi webhook dan subscription `messages` di Meta.
5. Link akun melalui tombol pada halaman Settings.
6. Kirim `kopi 15rb`, lalu pastikan transaksi hanya tercatat sekali.
7. Kirim ulang payload webhook yang sama dan pastikan tidak ada transaksi duplikat.
8. Jalankan satu notifikasi template dan cek urutan status sampai `delivered`.
9. Pastikan notifikasi kedua pada tanggal Jakarta yang sama dilewati.
10. Pantau error code Meta dan quality rating nomor/template di WhatsApp Manager.
