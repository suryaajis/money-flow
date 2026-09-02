# Product Requirements Document — Money Flow v1.6

## Accounts, Transfers, Smart Rules & Financial Health

**Versi:** 1.6  
**Status:** Planning  
**Terakhir diperbarui:** September 2026  
**Berdasarkan:** PRD v1.5

---

## 1. Ringkasan

Money Flow v1.6 mengubah pencatatan dari satu saldo agregat menjadi ledger per
akun. User dapat memisahkan uang tunai, rekening bank, e-wallet, dan kartu
kredit; memindahkan uang antar akun tanpa dianggap sebagai pemasukan atau
pengeluaran; membuat aturan kategorisasi otomatis; serta melihat skor kesehatan
finansial yang transparan dan dapat ditindaklanjuti.

Rilis ini menjadi fondasi data untuk financial goals, forecast, subscription,
net worth, dan integrasi eksternal pada versi berikutnya.

## 2. Sasaran Produk

| Sasaran | Indikator selesai |
| --- | --- |
| Saldo akurat | User dapat melihat saldo total dan saldo setiap akun |
| Transfer benar | Perpindahan uang tidak mengubah income/expense |
| Input makin cepat | Merchant berulang dikategorikan otomatis oleh smart rules |
| Insight mudah dipahami | Health score menjelaskan faktor, tren, dan tindakan yang disarankan |
| Fondasi siap berkembang | Model ledger mendukung goals, net worth, import, dan bank sync |

## 3. Target User

- User yang menggunakan lebih dari satu rekening atau e-wallet.
- User kartu kredit yang ingin memisahkan liability dari saldo kas.
- User rutin yang lelah mengategorikan merchant yang sama.
- User baru yang membutuhkan satu indikator sederhana untuk memahami kondisi
  finansialnya.

## 4. Requirement Fungsional

### 4.1 Account Foundation

| ID | Requirement |
| --- | --- |
| ACCT-01 | User dapat membuat akun bertipe `cash`, `bank`, `e_wallet`, `credit_card`, atau `other` |
| ACCT-02 | Setiap akun memiliki nama, warna/icon, currency, opening balance, status aktif, dan urutan tampilan |
| ACCT-03 | User baru memperoleh satu akun default saat onboarding |
| ACCT-04 | Setiap transaksi baru wajib mempunyai `accountId`; transaksi lama dimigrasikan ke akun default |
| ACCT-05 | Dashboard menampilkan saldo total dan saldo per akun tanpa mencampur currency secara diam-diam |
| ACCT-06 | User dapat mengarsipkan akun tanpa menghapus histori |
| ACCT-07 | Akun yang memiliki transaksi tidak dapat dihapus permanen dari UI |
| ACCT-08 | Koreksi saldo dibuat sebagai adjustment transaction dengan alasan, bukan mengubah histori |
| ACCT-09 | Akun kartu kredit menampilkan outstanding sebagai liability dan pembayaran kartu sebagai transfer |
| ACCT-10 | Pemilihan akun tersedia pada web, offline queue, OCR review, recurring, shared wallet, dan WhatsApp |

### 4.2 Transfer Antar Akun

| ID | Requirement |
| --- | --- |
| TRF-01 | User dapat mentransfer nominal dari satu akun ke akun lain miliknya |
| TRF-02 | Transfer disimpan sebagai satu domain transfer dengan dua ledger entries yang dibuat atomik |
| TRF-03 | Transfer tidak dihitung sebagai income atau expense pada dashboard, budget, dan analytics |
| TRF-04 | Edit atau delete transfer selalu mengubah kedua sisi dalam satu DB transaction |
| TRF-05 | Transfer tidak boleh membuat source dan destination account yang sama |
| TRF-06 | Transfer lintas currency menyimpan source amount, destination amount, dan exchange rate yang dikonfirmasi user |
| TRF-07 | Pembayaran kartu kredit dapat dibuat sebagai transfer dari akun kas/bank ke akun kartu kredit |
| TRF-08 | Offline sync menggunakan idempotency key yang sama untuk kedua sisi transfer |

### 4.3 Smart Rules

| ID | Requirement |
| --- | --- |
| RULE-01 | User dapat membuat rule berdasarkan merchant/description, source, account, amount range, atau tipe transaksi |
| RULE-02 | Action minimum meliputi set category, tags, account default, dan normalisasi merchant |
| RULE-03 | Rules memiliki priority, status aktif, dan opsi berhenti setelah match pertama |
| RULE-04 | Preview rule menunjukkan transaksi historis yang akan cocok tanpa langsung mengubah data |
| RULE-05 | User dapat menjalankan rule ke transaksi lama setelah melihat preview dan mengonfirmasi jumlah perubahan |
| RULE-06 | Perubahan massal dapat dibatalkan melalui audit batch selama periode retensi |
| RULE-07 | Sistem dapat menyarankan rule dari koreksi kategori berulang, tetapi tidak mengaktifkannya tanpa persetujuan user |
| RULE-08 | Rules dijalankan konsisten pada web, WhatsApp, OCR, offline sync, CSV import, dan sumber eksternal masa depan |

### 4.4 Financial Health Score

| ID | Requirement |
| --- | --- |
| HEALTH-01 | Sistem menghitung skor 0–100 menggunakan formula deterministik dan versioned |
| HEALTH-02 | Komponen minimum: savings rate, budget adherence, cashflow stability, debt pressure, dan data completeness |
| HEALTH-03 | Setiap komponen menampilkan nilai, bobot, alasan, dan data periode yang dipakai |
| HEALTH-04 | Jika data belum cukup, UI menampilkan `Belum cukup data`, bukan skor yang menyesatkan |
| HEALTH-05 | Skor dapat dibandingkan dengan periode sebelumnya dan disertai maksimal tiga tindakan yang relevan |
| HEALTH-06 | Skor tidak menggunakan perbandingan antar-user dan tidak menyatakan diagnosis atau nasihat investasi |
| HEALTH-07 | User dapat menonaktifkan health score tanpa menghapus data transaksi |
| HEALTH-08 | Formula version disimpan agar histori tetap dapat dijelaskan setelah algoritma berubah |

## 5. Aturan Perhitungan Saldo

```text
Current balance = opening balance
                + seluruh income yang posted
                - seluruh expense yang posted
                + transfer masuk
                - transfer keluar
                + adjustment
```

- Saldo total lintas currency hanya ditampilkan setelah dikonversi menggunakan
  rate dan timestamp yang terlihat.
- Transfer tidak masuk perhitungan income/expense dan savings rate.
- Akun kartu kredit berkontribusi sebagai liability, bukan aset positif.
- Transaksi pending atau gagal sync tidak boleh dihitung ganda.

## 6. Pengalaman Pengguna

### 6.1 Halaman Accounts

- Ringkasan total aset kas dan total liability.
- Kartu saldo tiap akun dengan last activity dan currency.
- Aksi tambah akun, transfer, adjustment, edit, dan archive.
- Warning bila saldo hasil ledger berbeda dengan saldo yang dimasukkan user.

### 6.2 Input Transaksi

Account selector muncul setelah nominal dan mengingat akun terakhir berdasarkan
source. WhatsApp menerima format seperti:

```text
kopi 25rb dari gopay
transfer 500rb dari BCA ke DANA
bayar kartu 1jt dari Mandiri
```

Jika nama akun ambigu, bot meminta satu klarifikasi sebelum menyimpan.

### 6.3 Health Score

Dashboard menampilkan skor ringkas. Detail score menjelaskan kontribusi setiap
faktor, perubahan dari bulan sebelumnya, kualitas data, dan tindakan yang dapat
dilakukan. Bahasa harus suportif dan tidak mempermalukan user.

## 7. Model Data Tingkat Tinggi

| Entitas | Kolom penting |
| --- | --- |
| `accounts` | `userId`, `name`, `type`, `currency`, `openingBalance`, `isDefault`, `archivedAt` |
| `transactions` | tambah `accountId`, `transferId`, `entryRole`, `adjustmentReason` |
| `transfers` | `userId`, `sourceAccountId`, `destinationAccountId`, amounts, rate, date, idempotencyKey |
| `smart_rules` | conditions JSON tervalidasi, actions JSON tervalidasi, priority, active |
| `rule_execution_batches` | rule, affected transaction IDs, before snapshot, createdAt, reversibleUntil |
| `financial_health_snapshots` | user, period, score, component JSON, formulaVersion, dataQuality |

Semua nominal memakai tipe decimal database; perhitungan uang tidak menggunakan
floating point JavaScript tanpa decimal handling.

## 8. API Tingkat Tinggi

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET/POST` | `/api/accounts` | Daftar dan buat akun |
| `PATCH/DELETE` | `/api/accounts/:id` | Edit atau archive akun |
| `POST` | `/api/accounts/:id/adjustments` | Koreksi saldo auditable |
| `GET/POST` | `/api/transfers` | Daftar dan buat transfer |
| `PATCH/DELETE` | `/api/transfers/:id` | Edit atau hapus transfer atomik |
| `GET/POST` | `/api/smart-rules` | Daftar dan buat rule |
| `POST` | `/api/smart-rules/:id/preview` | Preview kecocokan |
| `POST` | `/api/smart-rules/:id/apply` | Terapkan ke histori |
| `POST` | `/api/rule-batches/:id/undo` | Batalkan batch dalam masa retensi |
| `GET` | `/api/financial-health` | Skor dan komponen periode aktif |

## 9. Migrasi dan Kompatibilitas

1. Buat satu default account untuk setiap user yang belum memilikinya.
2. Isi `accountId` semua transaksi historis dalam batch yang dapat dilanjutkan.
3. Validasi jumlah dan total income/expense sebelum menjadikan kolom non-null.
4. Recurring template tanpa akun diarahkan ke akun default.
5. Backup schema dinaikkan versinya dan restore lama memetakan transaksi ke
   akun default.
6. Client lama yang tidak mengirim `accountId` sementara menggunakan default
   account sampai compatibility window berakhir.

## 10. Acceptance Criteria

- Seluruh transaksi mempunyai account yang dimiliki user yang sama.
- Migrasi tidak mengubah total income, expense, dan net cashflow historis.
- Transfer membuat dua entry atomik dan tidak muncul sebagai income/expense.
- Cross-currency transfer menyimpan kedua nominal serta rate yang digunakan.
- Rule preview tidak melakukan write; apply dapat diaudit dan di-undo.
- Health score dengan data tidak cukup tidak menghasilkan skor palsu.
- Setiap faktor skor dapat dijelaskan dari data user dan formula version.
- WhatsApp, OCR, offline, recurring, backup, dan shared wallet mendukung account.
- Test ledger invariant, authorization, migration, build, lint, dan accessibility lulus.

## 11. Metrik Keberhasilan

| Metrik | Target awal |
| --- | --- |
| User aktif dengan ≥2 akun | ≥ 25% dalam 90 hari |
| Transfer yang memengaruhi income/expense | 0 |
| Transaksi yang dikategorikan smart rule | ≥ 20% pada user yang mengaktifkan rule |
| Koreksi kategori berulang | Turun ≥ 30% pada user rule aktif |
| User membuka detail health score | ≥ 30% MAU |

## 12. Out of Scope

- Sinkronisasi otomatis ke bank, e-wallet, marketplace, atau QRIS.
- Rekening bersama dengan ownership dan permission kompleks.
- Investasi, harga aset real-time, atau rekomendasi investasi.
- Credit scoring untuk keputusan pinjaman.
- Rule yang menjalankan pembayaran atau tindakan eksternal.

## 13. Definition of Done

v1.6 selesai ketika account ledger, transfer atomik, smart rules, health score,
migrasi histori, integrasi seluruh input channel, backup/restore, dan invariant
test tersedia. Tidak boleh ada jalur pencatatan yang menciptakan transaksi tanpa
account atau menghitung transfer sebagai income/expense.
