# Product Requirements Document — Money Flow v1.4

## Reliability, Accessibility & Integration Completion

**Versi:** 1.4
**Status:** In Development
**Terakhir diperbarui:** Agustus 2026
**Berdasarkan:** Audit implementasi PRD v1.0–v1.3

---

## 1. Ringkasan

Money Flow v1.4 menutup gap implementasi yang tersisa dari v1.0–v1.3.
Rilis ini tidak menambah domain produk baru; fokusnya adalah membuat fitur yang
sudah dijanjikan benar-benar aman, dapat diakses, tahan kondisi offline, dan
siap dipakai pada deployment production.

## 2. Sasaran

| Sasaran | Indikator selesai |
| --- | --- |
| Integritas data | Kategori terpakai dapat dihapus tanpa menggagalkan transaksi |
| Reliability | Transaksi dapat dicatat offline dan disinkronkan saat online |
| Recovery | Email reset password benar-benar dikirim pada production |
| Data portability | Backup mencakup semua domain data pengguna dan restore bersifat atomik |
| Accessibility | Modal, chart, motion, dan feedback memenuhi acceptance criteria v1.1 |
| WhatsApp safety | Webhook memiliki rate limit, idempotensi, confidence gate, dan invite terverifikasi |
| Notification delivery | Reminder browser dan WhatsApp dapat berjalan tanpa halaman aktif |

## 3. Requirement v1.4

### 3.1 Data Integrity & API Validation

| ID | Requirement |
| --- | --- |
| DATA-01 | `transactions.categoryId` nullable dan tetap menampilkan `Unknown` setelah kategori dihapus |
| DATA-02 | API menolak nominal transaksi `<= 0` |
| DATA-03 | API menolak tanggal transaksi di masa depan |
| DATA-04 | API memvalidasi kategori milik user dan kompatibel dengan tipe transaksi |
| DATA-05 | Tersedia `GET /tags` untuk daftar tag unik user |

### 3.2 OCR & Offline

| ID | Requirement |
| --- | --- |
| OCR-10 | Halaman pertama PDF dirender menjadi gambar sebelum diproses Tesseract |
| OCR-11 | HEIC/HEIF dikonversi ke JPEG sebelum OCR |
| OFF-01 | GET transaksi terakhir disimpan di IndexedDB untuk fallback offline |
| OFF-02 | Create/update/delete transaksi offline masuk durable sync queue |
| OFF-03 | Queue disinkronkan otomatis saat event `online` dan statusnya terlihat bagi user |

### 3.3 Account, Backup & Currency

| ID | Requirement |
| --- | --- |
| ACC-01 | Production SMTP mengirim reset link dengan timeout dan error logging aman |
| BAK-05 | Backup v2 mencakup kategori, transaksi, budget, recurring, debt, shared wallet, dan preferences |
| BAK-06 | Payload restore divalidasi sebelum write dan dijalankan dalam satu DB transaction |
| CUR-05 | User dapat memilih currency per transaksi; API hanya menerima currency yang didukung |

### 3.4 Theme, Motion & Accessibility Completion

| ID | Requirement |
| --- | --- |
| UX-01 | Theme toggle menggunakan View Transition radial reveal dengan fallback dan reduced-motion |
| UX-02 | Perubahan nominal memakai `NumericTransition` yang aman untuk reduced-motion |
| UX-03 | Modal mengunci focus, fokus elemen awal, dan mengembalikan focus saat ditutup |
| UX-04 | Chart memiliki ringkasan teks/data yang dapat dibaca screen reader |
| UX-05 | Feedback save/error menggunakan `aria-live`; tersedia primitive toast dan skeleton |
| UX-06 | Pengguna baru melihat onboarding tiga langkah: catat, pahami, rencanakan |
| UX-07 | Feature flag rollout dapat menonaktifkan enhancement v1.4 tanpa memengaruhi data |

### 3.5 Background Web Push

| ID | Requirement |
| --- | --- |
| PUSH-01 | Browser dapat subscribe/unsubscribe Web Push menggunakan VAPID |
| PUSH-02 | Subscription disimpan per user dan endpoint dilindungi JWT |
| PUSH-03 | Scheduler backend mengirim daily reminder sesuai waktu/hari pilihan user |
| PUSH-04 | Service worker membuka aplikasi ketika notifikasi diklik |

### 3.6 WhatsApp Completion

| ID | Requirement |
| --- | --- |
| WA-08 | Incoming webhook dibatasi per nomor dan per IP dengan respons ramah |
| NLP-08 | Parser menghasilkan confidence dan field ambigu; transaksi confidence rendah wajib dikonfirmasi |
| NLP-09 | Provider AI dapat memilih Claude atau Gemini melalui env dengan fallback template parser |
| CMD-10 | Export command mendukung `format=csv` dan `format=xlsx` pada signed URL satu jam |
| NOT-WA-05 | Daily input reminder dapat diatur jamnya dan hanya terkirim bila belum ada transaksi hari itu |

### 3.7 Shared Wallet Completion

| ID | Requirement |
| --- | --- |
| SHARE-07 | Invite memakai nomor WhatsApp terdaftar dan dikirim melalui template WA |
| SHARE-08 | Invite token hashed, memiliki expiry, dan hanya dapat diterima akun/nomor tujuan |
| SHARE-09 | Member dapat memilih shared wallet target ketika mencatat melalui WhatsApp |
| SHARE-10 | Setiap transaksi anggota menghasilkan notification delivery idempotent tersendiri |

## 4. Acceptance Criteria

- Migration dapat dijalankan pada database berisi transaksi dan kategori aktif.
- Semua endpoint baru dilindungi auth, tervalidasi, dan tidak mengekspos token mentah.
- Queue offline tidak menggandakan transaksi setelah retry atau reload.
- Restore invalid tidak mengubah data apa pun.
- Tanpa SMTP/VAPID/Meta/AI credential, aplikasi tetap build dan memberi pesan konfigurasi yang jelas.
- Reduced motion menonaktifkan radial reveal, tilt, chart animation, dan numeric animation.
- Modal dapat digunakan hanya dengan keyboard dan focus kembali ke trigger.
- Low-confidence WhatsApp input tidak disimpan sebelum konfirmasi.
- Invite shared wallet tidak dapat diambil oleh akun selain tujuan.
- Build web/API, lint, unit test, dan integration test yang relevan lulus.

## 5. Konfigurasi Baru

| Variable | Keterangan |
| --- | --- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Pengiriman reset email |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push |
| `AI_PROVIDER=claude\|gemini\|auto` | Provider NLP utama |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Claude Messages API |
| `WA_TEMPLATE_SHARED_INVITE` | Template undangan shared wallet |
| `WA_TEMPLATE_DAILY_INPUT` | Template reminder input harian |

## 6. Out of Scope

- Sinkronisasi rekening bank.
- OCR multi-halaman PDF; v1.4 memproses halaman pertama.
- Konflik offline lintas perangkat yang memerlukan CRDT.
- Provider email, push, atau WhatsApp credential yang dikelola Money Flow.
- Perubahan total visual brand di luar penyelesaian acceptance criteria v1.1.

## 7. Definition of Done

v1.4 selesai ketika seluruh requirement DATA, OCR/OFF, ACC/BAK/CUR, UX, PUSH,
WA/NLP/CMD/NOT-WA, dan SHARE di atas memiliki implementasi, migration, serta
test; seluruh build lulus; dan batas verifikasi yang memerlukan credential
production terdokumentasi eksplisit.
