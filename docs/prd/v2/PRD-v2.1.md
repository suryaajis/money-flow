# Product Requirements Document — Money Flow v2.1

## Split Bill, PDF Reports & Bank Statement CSV Import

**Versi:** 2.1  
**Status:** Planning  
**Terakhir diperbarui:** September 2026  
**Berdasarkan:** PRD v2.0

---

## 1. Ringkasan

Money Flow v2.1 memperkuat kolaborasi dan portabilitas data. User dapat membagi
tagihan dengan orang lain, membuat laporan PDF yang siap dibagikan, dan
mengimpor mutasi bank dari CSV melalui proses mapping, preview, validasi, serta
deduplikasi.

Rilis ini belum melakukan koneksi langsung ke bank. Semua import dimulai oleh
user dan tidak membutuhkan credential internet banking.

## 2. Sasaran

| Sasaran | Indikator selesai |
| --- | --- |
| Pengeluaran bersama jelas | Setiap split mempunyai participant, share, dan status settlement |
| Laporan mudah dibagikan | PDF konsisten dengan filter dan angka di aplikasi |
| Migrasi data mudah | CSV berbagai format dapat dipetakan tanpa edit manual di luar aplikasi |
| Data tetap bersih | Preview dan dedup mencegah import salah atau ganda |

## 3. Requirement Fungsional

### 3.1 Split Bill

| ID | Requirement |
| --- | --- |
| SPLIT-01 | User dapat membuat split dari transaksi expense yang dimilikinya |
| SPLIT-02 | Participant dapat berupa user Money Flow, anggota shared wallet, atau kontak manual tanpa akun |
| SPLIT-03 | Metode pembagian mendukung sama rata, nominal tetap, dan persentase |
| SPLIT-04 | Total seluruh share harus sama dengan total transaksi setelah aturan pembulatan |
| SPLIT-05 | User dapat menandai share sebagai pending, partially_paid, paid, forgiven, atau cancelled |
| SPLIT-06 | Settlement dapat dihubungkan ke transaksi/transfer penerimaan agar tidak dihitung ganda |
| SPLIT-07 | Split dapat menghasilkan debt/piutang terhubung, bukan record utang terpisah tanpa relasi |
| SPLIT-08 | Participant tanpa akun dapat menerima link ringkasan read-only bertoken, expiry, dan revoke |
| SPLIT-09 | Pengiriman reminder via WhatsApp membutuhkan consent dan nomor tujuan yang valid |
| SPLIT-10 | Edit transaksi induk setelah ada payment memerlukan warning dan rekonsiliasi ulang |
| SPLIT-11 | User dapat mengekspor atau menghapus data participant sesuai kebijakan privacy |

### 3.2 Laporan PDF

| ID | Requirement |
| --- | --- |
| PDF-01 | User dapat membuat laporan bulanan, rentang tanggal custom, net worth, budget, atau goal progress |
| PDF-02 | Filter minimum: account, category, tags, currency, source, dan shared wallet |
| PDF-03 | PDF menampilkan identitas laporan, periode, timezone, currency, generatedAt, ringkasan, tabel, dan chart yang relevan |
| PDF-04 | Total PDF harus sama dengan endpoint analytics untuk filter yang sama |
| PDF-05 | User dapat menyembunyikan nama, email, merchant detail, dan catatan sensitif |
| PDF-06 | PDF harus terbaca, selectable, memiliki urutan heading yang logis, dan tidak hanya berupa screenshot |
| PDF-07 | Generation besar berjalan sebagai job dengan status, expiry file, retry aman, dan batas ukuran |
| PDF-08 | Download menggunakan signed URL singkat; file tidak public dan otomatis dihapus setelah retensi |
| PDF-09 | Tersedia mode personal dan mode share dengan disclosure berbeda |

### 3.3 Import Mutasi CSV

| ID | Requirement |
| --- | --- |
| CSV-01 | User dapat upload CSV dengan batas ukuran dan jumlah row yang terdokumentasi |
| CSV-02 | Sistem mendeteksi delimiter, encoding umum, header row, dan format tanggal/nominal secara aman |
| CSV-03 | Mapping wizard mendukung date, description, debit, credit, signed amount, balance, reference, dan currency |
| CSV-04 | User memilih target account sebelum commit import |
| CSV-05 | Preview menampilkan row valid, warning, invalid, duplicate, dan projected balance impact |
| CSV-06 | Import tidak melakukan write sebelum user mengonfirmasi preview |
| CSV-07 | Deduplikasi menggunakan fingerprint stabil dan dapat ditinjau user |
| CSV-08 | Commit import berjalan atomik per batch atau mempunyai rollback batch penuh |
| CSV-09 | Smart rules v1.6 dapat diterapkan pada preview sebelum commit |
| CSV-10 | Formula spreadsheet, HTML, dan konten berbahaya diperlakukan sebagai teks inert |
| CSV-11 | File mentah memiliki retensi minimum, terenkripsi saat disimpan sementara, lalu dihapus |
| CSV-12 | Import batch menyimpan provenance tanpa menyimpan data sensitif yang tidak diperlukan |
| CSV-13 | User dapat menyimpan mapping template per institusi secara lokal di akun |

## 4. Alur Utama

### 4.1 Split Bill

```text
Pilih transaksi → Split bill → tambah participant
→ pilih metode pembagian → preview pembulatan
→ simpan → kirim ringkasan opsional
→ catat settlement → seluruh share selesai
```

### 4.2 CSV Import

```text
Upload → parse terisolasi → pilih/muat mapping
→ validasi + dedup → preview
→ terapkan smart rules → konfirmasi
→ commit batch → reconciliation summary
```

### 4.3 PDF Report

```text
Pilih jenis + periode + filter → preview summary
→ atur privacy → generate job
→ download signed URL → file expired otomatis
```

## 5. Model Data Tingkat Tinggi

| Entitas | Kolom penting |
| --- | --- |
| `split_bills` | owner, transactionId, total, currency, method, status |
| `split_participants` | splitBillId, user/contact reference, displayName, amount, percentage, status |
| `split_settlements` | participant, amount, transactionId, paidAt, source |
| `share_links` | resource, tokenHash, expiresAt, revokedAt, access count |
| `report_jobs` | user, type, filters, privacy config, status, object key, expiresAt |
| `import_batches` | user, account, filename metadata, mapping version, counts, status, committedAt |
| `import_rows` | batch, row number, normalized fields, fingerprint, validation state, transactionId |
| `import_mapping_templates` | user, institution label, column mapping, date/amount locale |

Kontak manual disimpan seminimal mungkin. Nomor telepon tidak wajib untuk
membuat split dan tidak boleh dipakai untuk marketing.

## 6. API Tingkat Tinggi

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET/POST` | `/api/split-bills` | Daftar dan buat split |
| `PATCH` | `/api/split-bills/:id` | Edit split sebelum/selama settlement |
| `POST` | `/api/split-bills/:id/settlements` | Catat pembayaran share |
| `POST/DELETE` | `/api/split-bills/:id/share-link` | Buat atau revoke link |
| `POST` | `/api/reports` | Buat report job |
| `GET` | `/api/reports/:id` | Status dan signed download |
| `POST` | `/api/imports/csv/preview` | Upload, parse, dan preview |
| `POST` | `/api/imports/:id/commit` | Commit import batch |
| `POST` | `/api/imports/:id/rollback` | Rollback batch bila memenuhi syarat |
| `GET/POST` | `/api/import-mappings` | Kelola mapping template |

## 7. Security dan Privacy

| Area | Ketentuan |
| --- | --- |
| File upload | Validasi MIME dan ukuran, random object key, malware scanning bila storage eksternal dipakai |
| CSV parser | Tidak mengeksekusi formula, script, macro, URL, atau embedded content |
| Report | Signed URL singkat, authorization sebelum generate, encryption at rest, auto-delete |
| Share link | Token hash, expiry, revoke, rate limit, data minimum, tanpa indexing |
| Participant | Consent sebelum reminder; dukung delete/anonymize kontak manual |
| Logging | Tidak mencatat isi mutasi, nomor rekening penuh, atau signed URL |
| Authorization | Semua split, import, report, account, dan transaction diverifikasi ownership-nya |

## 8. Acceptance Criteria

- Total share selalu sama dengan transaksi setelah pembulatan deterministik.
- Settlement terhubung tidak dihitung sebagai income tambahan tanpa aturan yang jelas.
- Participant read-only tidak dapat melihat transaksi lain milik user.
- PDF menghasilkan total yang sama dengan analytics untuk filter identik.
- PDF tetap dapat dibaca tanpa mengandalkan gambar chart saja.
- CSV preview tidak melakukan write ke ledger.
- Upload CSV yang sama dua kali ditandai duplicate sebelum commit.
- Commit atau rollback import tidak meninggalkan batch parsial.
- Formula injection dan HTML tidak pernah dieksekusi atau dirender aktif.
- Temporary file dan generated report terhapus sesuai retention policy.
- Build, lint, parser tests, authorization tests, dan accessibility lulus.

## 9. Metrik Keberhasilan

| Metrik | Target awal |
| --- | --- |
| Split bill mencapai status selesai | ≥ 60% dalam 30 hari |
| Error perhitungan share | 0 pada invariant test/production audit |
| Report job berhasil | ≥ 99% di bawah batas ukuran |
| Row CSV valid yang berhasil diimpor | ≥ 95% setelah mapping dikonfirmasi |
| Duplicate import yang lolos | < 0,1% row |

## 10. Out of Scope

- Penagihan uang atau payment gateway.
- Escrow dan penyelesaian sengketa participant.
- Mengirim laporan lewat email/WhatsApp tanpa aksi eksplisit user.
- Parsing PDF statement atau spreadsheet dengan macro.
- Koneksi credential internet banking.
- Sinkronisasi bank otomatis.

## 11. Definition of Done

v2.1 selesai ketika split dan settlement dapat direkonsiliasi, PDF private dan
accessible dapat dihasilkan, CSV import memiliki mapping-preview-dedup-rollback,
serta seluruh alur terintegrasi dengan account ledger, smart rules, backup,
privacy controls, dan observability.
