# Product Requirements Document — Money Flow v1.5

## Multi-Number WhatsApp Account

**Versi:** 1.5  
**Status:** Planning  
**Terakhir diperbarui:** September 2026  
**Berdasarkan:** PRD v1.4

---

## 1. Ringkasan

Money Flow v1.5 memungkinkan satu user menghubungkan maksimal tiga nomor
WhatsApp yang semuanya dapat memakai bot untuk akun Money Flow yang sama.
Satu nomor tetap hanya boleh dimiliki satu akun Money Flow pada satu waktu.

Fitur ini ditujukan untuk user yang mempunyai nomor pribadi dan kerja, memakai
perangkat berbeda, atau ingin memberi akses terbatas ke nomor lain miliknya
tanpa membuat akun baru. Rilis ini tidak mengubah model Shared Wallet: nomor
tambahan bertindak sebagai identitas user yang sama, bukan anggota baru.

## 2. Keputusan Produk

| Keputusan | Ketentuan |
| --- | --- |
| Batas nomor | Hard maximum 3 nomor; jumlah aktif efektif mengikuti entitlement membership v1.7 |
| Kepemilikan | Satu nomor hanya dapat terhubung ke satu user |
| Nomor utama | Tepat satu nomor aktif menjadi `primary` |
| Pesan masuk | Semua nomor aktif dapat menjalankan kemampuan bot yang sama |
| Notifikasi proaktif | Default hanya dikirim ke nomor utama |
| Nomor tambahan | Harus diverifikasi melalui challenge dari nomor tersebut |
| Shared Wallet | Hak akses mengikuti user, bukan masing-masing nomor |
| Audit | Transaksi WhatsApp menyimpan identitas nomor pencatat secara internal |

## 3. Masalah yang Diselesaikan

| Masalah | Dampak saat ini | Hasil v1.5 |
| --- | --- | --- |
| User memiliki lebih dari satu nomor | Harus unlink dan link ulang | Semua nomor dapat aktif bersamaan |
| Perangkat utama tidak tersedia | Bot tidak dapat dipakai dari nomor cadangan | Nomor terverifikasi lain tetap dapat digunakan |
| Notifikasi tidak punya tujuan eksplisit | Hanya bergantung pada `users.waPhone` | Ada nomor utama dan preferensi tujuan |
| Audit transaksi multi-nomor tidak tersedia | Sulit mengetahui nomor yang mencatat | Setiap transaksi WA dapat ditelusuri ke phone link |

## 4. Target User dan Jobs to Be Done

| Segmen | Jobs to Be Done |
| --- | --- |
| Profesional dengan nomor pribadi dan kerja | Mencatat transaksi dari nomor yang sedang digunakan |
| User dengan perangkat utama dan cadangan | Tetap mengakses bot saat salah satu perangkat tidak tersedia |
| Pemilik usaha kecil | Memisahkan label nomor pribadi dan operasional pada akun yang sama |

## 5. Requirement Fungsional

### 5.1 Manajemen Nomor

| ID | Requirement |
| --- | --- |
| MW-01 | User dapat melihat daftar nomor terhubung dengan nomor yang sudah dimasking, label, status, dan waktu terhubung |
| MW-02 | User dapat membuat challenge selama jumlah nomor aktif kurang dari `min(plan entitlement, hard maximum 3)` |
| MW-03 | Challenge menggunakan token acak, hanya disimpan sebagai hash, berlaku singkat, sekali pakai, dan terikat ke user pembuat |
| MW-04 | Nomor baru aktif hanya setelah Meta webhook menerima `HUBUNGKAN <token>` dari nomor tersebut |
| MW-05 | Nomor yang sudah terhubung ke user lain ditolak tanpa membocorkan identitas pemiliknya |
| MW-06 | User dapat memberi label maksimal 30 karakter, misalnya `Pribadi`, `Kerja`, atau `Cadangan` |
| MW-07 | User dapat memilih salah satu nomor aktif sebagai nomor utama |
| MW-08 | User dapat melepas nomor non-utama kapan saja setelah re-autentikasi |
| MW-09 | Nomor utama hanya dapat dilepas setelah nomor lain dijadikan utama, kecuali nomor tersebut adalah nomor terakhir |
| MW-10 | Batas tiga nomor ditegakkan secara atomik agar request paralel tidak dapat melewati limit |

### 5.2 Routing Pesan dan Sesi

| ID | Requirement |
| --- | --- |
| ROUTE-01 | Incoming webhook mencari user melalui phone link aktif, bukan `users.waPhone` |
| ROUTE-02 | Semua nomor aktif memperoleh scope bot yang sama dengan user pemiliknya |
| ROUTE-03 | State percakapan tetap terisolasi per nomor agar konfirmasi dari satu nomor tidak mengubah sesi nomor lain |
| ROUTE-04 | Idempotency incoming message berlaku global terhadap Meta message ID, termasuk ketika nomor user lebih dari satu |
| ROUTE-05 | Rate limit diterapkan per nomor, per user gabungan, dan per IP/webhook source |
| ROUTE-06 | Transaksi dari WhatsApp menyimpan `recordedByWaPhoneId` untuk audit, tetapi respons UI hanya menampilkan label atau nomor termasking |
| ROUTE-07 | Unlink nomor langsung membatalkan sesi aktif, challenge terkait, dan pekerjaan outbound tertunda untuk nomor tersebut |

### 5.3 Notifikasi Proaktif

| ID | Requirement |
| --- | --- |
| NOT-MW-01 | Nomor utama menjadi tujuan default seluruh notifikasi WhatsApp proaktif |
| NOT-MW-02 | User dapat mengaktifkan nomor tambahan sebagai tujuan notifikasi secara eksplisit per nomor |
| NOT-MW-03 | Satu event dan satu nomor tujuan hanya boleh menghasilkan satu delivery walaupun scheduler retry |
| NOT-MW-04 | Kegagalan kirim ke nomor tambahan tidak menggagalkan delivery ke nomor utama |
| NOT-MW-05 | Perubahan nomor utama berlaku untuk pekerjaan baru; pekerjaan lama harus mengecek ulang status nomor sebelum dikirim |
| NOT-MW-06 | UI memperingatkan estimasi peningkatan jumlah pesan ketika notifikasi diaktifkan pada lebih dari satu nomor |

### 5.4 Shared Wallet dan Undangan

| ID | Requirement |
| --- | --- |
| SHARE-MW-01 | Seluruh nomor aktif user dapat memilih dan mencatat ke shared wallet yang memang dapat diakses user tersebut |
| SHARE-MW-02 | Undangan shared wallet tetap ditujukan ke nomor spesifik dan hanya dapat diterima dari nomor tujuan tersebut |
| SHARE-MW-03 | Menerima undangan tidak otomatis menjadikan nomor tujuan sebagai nomor utama |
| SHARE-MW-04 | Audit transaksi shared wallet mencatat user dan phone link yang mengirim pesan |

## 6. Pengalaman Pengguna

### 6.1 Settings → WhatsApp

Halaman menampilkan:

- kartu untuk setiap nomor dengan label, nomor termasking, status notifikasi,
  waktu terhubung, dan badge `Utama`;
- tombol `Tambah nomor` yang nonaktif saat tiga slot terpakai;
- aksi `Jadikan utama`, `Ubah label`, `Atur notifikasi`, dan `Lepaskan`;
- penjelasan bahwa semua nomor mempunyai akses ke data akun yang sama.

### 6.2 Alur Menambah Nomor

```text
Settings → Tambah nomor → buat challenge satu kali
→ buka WhatsApp pada nomor yang ingin ditambahkan
→ kirim HUBUNGKAN <token>
→ webhook memverifikasi nomor dan kapasitas akun secara atomik
→ nomor muncul pada daftar perangkat/nomor terhubung
```

### 6.3 Alur Nomor Hilang atau Didaur Ulang

User dapat melepas nomor dari web setelah re-autentikasi. Jika user tidak lagi
menguasai nomor, semua sesi dan delivery destination nomor tersebut dicabut.
Dokumentasi keamanan harus menganjurkan pelepasan nomor sebelum nomor operator
dinonaktifkan.

## 7. Model Data Tingkat Tinggi

### 7.1 Tabel Baru `wa_phone_links`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `userId` | uuid | Pemilik akun, FK ke users |
| `phone` | varchar(20) | Nomor format E.164 tanpa `+`, unique global |
| `label` | varchar(30) | Label buatan user |
| `isPrimary` | boolean | Nomor tujuan utama |
| `notificationsEnabled` | boolean | Opt-in menerima notifikasi proaktif |
| `linkedAt` | timestamp | Waktu verifikasi selesai |
| `lastInboundAt` | timestamp nullable | Aktivitas pesan terakhir |
| `revokedAt` | timestamp nullable | Soft revoke untuk audit |
| `createdAt`, `updatedAt` | timestamp | Audit timestamp |

Constraint dan index minimum:

- unique nomor aktif secara global;
- index `(userId, revokedAt)` untuk lookup daftar aktif;
- partial unique index agar hanya ada satu `isPrimary=true` per user aktif;
- limit tiga row aktif ditegakkan dalam DB transaction dengan lock pada user.

### 7.2 Perubahan Tabel Lain

| Tabel | Perubahan |
| --- | --- |
| `transactions` | Tambah nullable `recordedByWaPhoneId` |
| `wa_link_challenges` | Tambah purpose/metadata label dan status revoke; challenge tidak berisi nomor yang belum terverifikasi |
| `wa_sessions` | Tetap keyed per nomor; tambahkan FK phone link bila aman setelah migrasi |
| `wa_notification_deliveries` | Gunakan `waPhoneLinkId` sebagai destination identity |

### 7.3 Migrasi Data

1. Buat `wa_phone_links` tanpa menghapus kolom lama.
2. Salin setiap `users.waPhone` menjadi phone link primary dan aktif.
3. Ubah seluruh lookup dan outbound delivery agar membaca tabel baru.
4. Jalankan verifikasi jumlah, uniqueness, dan parity hasil routing.
5. Hapus `users.waPhone` dan `users.waLinkedAt` hanya pada migration terpisah
   setelah versi aplikasi baru stabil.

Migration harus dapat diulang dengan aman pada staging snapshot dan tidak boleh
mengubah nomor yang sudah terhubung.

## 8. API Tingkat Tinggi

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/users/whatsapp/numbers` | Daftar nomor terhubung |
| `POST` | `/api/users/whatsapp/numbers/challenge` | Buat challenge tambah nomor |
| `PATCH` | `/api/users/whatsapp/numbers/:id` | Ubah label atau preferensi notifikasi |
| `POST` | `/api/users/whatsapp/numbers/:id/primary` | Jadikan nomor utama |
| `DELETE` | `/api/users/whatsapp/numbers/:id` | Revoke nomor |

Endpoint lama `/api/users/whatsapp` tetap kompatibel selama masa transisi dan
mengembalikan nomor primary sebagai `phone`.

## 9. Concern dan Mitigasi

| Concern | Risiko | Mitigasi wajib |
| --- | --- | --- |
| Account takeover | Nomor tambahan memperoleh akses penuh data finansial | Challenge dari nomor, sesi web terautentikasi, re-auth untuk aksi sensitif, audit log |
| SIM recycling | Pemilik baru nomor dapat mengakses bot | Fitur revoke cepat, tampilkan aktivitas terakhir, kebijakan re-verifikasi untuk nomor lama/tidak aktif |
| Kebocoran data di perangkat bersama | Semua nomor melihat data akun yang sama | Disclosure jelas saat link, masking UI, kemampuan revoke dari web |
| Notifikasi rangkap | Satu alert terkirim ke tiga nomor | Primary-only sebagai default, opt-in tambahan, idempotency per destination |
| Biaya Meta/AI meningkat | Tiga nomor meningkatkan volume pesan | Quota gabungan per user, rate limit per nomor, usage monitoring |
| Race condition limit | Request paralel membuat nomor keempat | Transaction + row lock saat consume challenge |
| Ambiguitas audit | Tidak diketahui nomor mana yang mencatat | Simpan `recordedByWaPhoneId` dan label snapshot bila diperlukan |
| Unlink saat job antre | Pesan tetap terkirim ke nomor yang dicabut | Re-check status destination tepat sebelum send |
| Shared wallet privilege | Nomor tambahan disalahartikan sebagai anggota baru | Authorization selalu berdasarkan user pemilik phone link |
| Backup dan privacy | Nomor pribadi ikut terbawa atau tertinggal | Backup v3 mencakup metadata aman; export termasking; delete account menghapus/revoke seluruh link |

## 10. Acceptance Criteria

- User dapat menambah nomor melalui challenge valid selama masih di bawah
  entitlement membership dan hard maximum tiga nomor.
- Free tidak dapat menambah nomor kedua; Plus tidak dapat menambah nomor ketiga;
  Pro tidak dapat menambah nomor keempat, termasuk pada request paralel.
- Satu nomor tidak dapat terhubung ke dua akun.
- Incoming message dari ketiga nomor mengakses user yang sama tetapi memiliki
  sesi konfirmasi yang terpisah.
- Tepat satu nomor aktif menjadi primary setelah add, change primary, atau unlink.
- Notifikasi default hanya terkirim ke primary dan tidak duplikat setelah retry.
- Unlink menghapus akses bot nomor tersebut seketika tanpa memengaruhi nomor lain.
- Migrasi mempertahankan semua koneksi satu nomor dari v1.4.
- Nomor penuh tidak muncul pada log aplikasi umum, analytics, atau error response.
- Unit test, integration test webhook, migration test, build, dan lint lulus.

## 11. Metrik Keberhasilan

| Metrik | Target awal |
| --- | --- |
| Keberhasilan link challenge | ≥ 95% untuk challenge valid |
| Akun dengan nomor tambahan | Diukur sebagai adoption, tanpa target pemaksaan |
| Duplicate proactive delivery | < 0,1% event |
| Unauthorized cross-account routing | 0 kejadian |
| Waktu revoke sampai akses ditolak | Efektif pada request berikutnya |

## 12. Out of Scope

- Satu nomor terhubung ke lebih dari satu akun Money Flow.
- Hak akses berbeda per nomor dalam akun yang sama.
- Nomor tambahan sebagai anggota keluarga dengan identitas dan permission sendiri.
- Mengelola lebih dari tiga nomor.
- Memindahkan kepemilikan nomor antar akun tanpa unlink dan verifikasi ulang.
- Dukungan provider WhatsApp selain Meta Cloud API.

## 13. Definition of Done

v1.5 selesai ketika relasi multi-nomor, migrasi backward-compatible, routing
incoming, nomor primary, notifikasi multi-destination opt-in, revoke, audit,
backup, UI settings, dan test keamanan telah tersedia. Batas aktif harus dapat
dikendalikan entitlement v1.7 tanpa mengubah hard maximum platform. Dokumentasi
WhatsApp dan production runbook harus diperbarui sebelum rollout.
