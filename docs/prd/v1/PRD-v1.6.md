# Product Requirements Document — Money Flow v1.6

## Accounts, Account Sharing, Transfers, Smart Rules & Financial Health

**Versi:** 1.6  
**Status:** In Development
**Terakhir diperbarui:** September 2026  
**Berdasarkan:** PRD v1.5

---

## 1. Ringkasan

Money Flow v1.6 mengubah pencatatan dari satu saldo agregat menjadi ledger per
akun. User dapat memisahkan uang tunai, rekening bank, e-wallet, dan kartu
kredit; memindahkan uang antar akun tanpa dianggap sebagai pemasukan atau
pengeluaran; membagikan account/pocket tertentu kepada user lain melalui email;
membuat aturan kategorisasi otomatis; serta melihat skor kesehatan finansial
yang transparan dan dapat ditindaklanjuti.

Account/pocket juga berfungsi sebagai **Source Wallet**. Satu pocket selalu
aktif di navbar dan menjadi konteks untuk membaca ledger serta mencatat
transaksi baru. Dengan demikian, transaksi bukan sekadar data global yang
dipindahkan antar-pocket; setiap pocket mempunyai ledger dan histori sendiri.

Shared Wallet pada versi sebelumnya diselaraskan menjadi **Shared Account**.
Sharing berlaku pada account yang dipilih, bukan pada seluruh data pemilik.
Identitas dan authorization selalu menggunakan user Money Flow yang login dengan
email. Nomor WhatsApp bukan identitas anggota dan hanya dapat digunakan sebagai
kanal notifikasi tambahan.

Rilis ini menjadi fondasi data untuk financial goals, forecast, subscription,
net worth, dan integrasi eksternal pada versi berikutnya.

## 2. Sasaran Produk

| Sasaran | Indikator selesai |
| --- | --- |
| Saldo akurat | User dapat melihat saldo total dan saldo setiap akun |
| Transfer benar | Perpindahan uang tidak mengubah income/expense |
| Kolaborasi aman | User dapat berbagi account tertentu tanpa membuka account lain miliknya |
| Input makin cepat | Merchant berulang dikategorikan otomatis oleh smart rules |
| Insight mudah dipahami | Health score menjelaskan faktor, tren, dan tindakan yang disarankan |
| Fondasi siap berkembang | Model ledger mendukung goals, net worth, import, dan bank sync |

## 3. Target User

- User yang menggunakan lebih dari satu rekening atau e-wallet.
- User kartu kredit yang ingin memisahkan liability dari saldo kas.
- User rutin yang lelah mengategorikan merchant yang sama.
- User baru yang membutuhkan satu indikator sederhana untuk memahami kondisi
  finansialnya.
- Pasangan, keluarga, atau rekan yang perlu melihat dan mencatat pada satu
  account/pocket bersama tanpa memakai credential yang sama.

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
| ACCT-10 | Pemilihan akun tersedia pada web, offline queue, OCR review, recurring, shared account, dan WhatsApp |
| ACCT-11 | Daftar account user memisahkan dengan jelas account milik sendiri dan account yang dibagikan kepadanya |
| ACCT-12 | Setiap account memiliki tepat satu owner; sharing tidak memindahkan ownership |
| ACCT-13 | Satu account ditetapkan sebagai `active account` atau `active pocket` yang menjadi konteks utama aplikasi |
| ACCT-14 | Navbar selalu menampilkan active pocket dan menyediakan switcher ke account milik sendiri atau shared account yang dapat diakses |
| ACCT-15 | Transaksi income/expense baru otomatis menggunakan active pocket; pergantian pocket tidak memindahkan histori yang sudah ada |
| ACCT-16 | Dashboard, daftar transaksi, analytics, pencarian, export, dan perhitungan pengeluaran budget menggunakan ledger active pocket |
| ACCT-17 | Active pocket disimpan sebagai preferensi user agar konsisten lintas perangkat dan channel; jika tidak valid sistem kembali ke default account |
| ACCT-18 | Shared account dengan role `viewer` dapat menjadi active pocket untuk membaca, tetapi seluruh aksi pencatatan dinonaktifkan |
| ACCT-19 | Transfer tetap meminta source dan destination secara eksplisit; active pocket hanya menjadi nilai awal source account |

### 4.2 Account Sharing

| ID | Requirement |
| --- | --- |
| SHARE-01 | Owner dapat mengundang user Money Flow lain ke account tertentu menggunakan email |
| SHARE-02 | Email tujuan harus dinormalisasi dan dihubungkan ke `userId`; credential dan authorization tidak boleh bergantung pada nomor WhatsApp |
| SHARE-03 | Undangan memiliki token acak yang hanya disimpan sebagai hash, masa berlaku terbatas, status, dan hanya dapat diterima oleh user dengan email tujuan |
| SHARE-04 | Akses hanya berlaku untuk account yang dipilih; member tidak dapat melihat account lain, profil privat, atau seluruh wallet owner |
| SHARE-05 | Role minimum adalah `viewer` dan `contributor`; viewer hanya dapat melihat, sedangkan contributor dapat melihat dan mencatat income/expense |
| SHARE-06 | Contributor tidak dapat melakukan adjustment, archive, delete account, mengubah permission, membagikan ulang account, atau mencatat transfer dari account shared pada v1.6 |
| SHARE-07 | Owner dapat mengubah role atau mencabut akses; member dapat meninggalkan shared account |
| SHARE-08 | Account milik sendiri dan shared account muncul dalam account selector, dashboard account, transaksi, dan filter dengan label ownership yang jelas |
| SHARE-09 | Transaksi pada shared account tetap masuk ke ledger account tersebut dan menyimpan `recordedByUserId` untuk audit |
| SHARE-10 | Saldo dan histori yang dilihat member dihitung dari ledger yang sama dengan owner, sesuai role dan account scope |
| SHARE-11 | Undangan utama dikirim melalui email; WhatsApp dapat menjadi notifikasi tambahan jika user telah menghubungkannya, tetapi bukan syarat menerima akses |
| SHARE-12 | Satu user tidak dapat diundang dua kali ke account yang sama dan owner tidak dapat mengundang dirinya sendiri |

Istilah **Pocket** dapat digunakan di UI sebagai nama yang lebih ramah, tetapi
model domain dan API tetap menggunakan `account`. "Shared Wallet" dipertahankan
hanya sebagai istilah kompatibilitas/migrasi dari versi sebelumnya.
Istilah **Source Wallet** pada produk berarti active account dan tidak sama
dengan kolom teknis `transactions.source` yang mencatat channel input seperti
web, WhatsApp, OCR, atau shared contributor.

### 4.3 Transfer Antar Akun

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

### 4.4 Smart Rules

| ID | Requirement |
| --- | --- |
| RULE-01 | User dapat membuat rule berdasarkan merchant/description, source, account, amount range, atau tipe transaksi |
| RULE-02 | Action minimum meliputi set category, tags, dan normalisasi merchant; rule tidak boleh memindahkan transaksi keluar dari active pocket |
| RULE-03 | Rules memiliki priority, status aktif, dan opsi berhenti setelah match pertama |
| RULE-04 | Preview rule menunjukkan transaksi historis yang akan cocok tanpa langsung mengubah data |
| RULE-05 | User dapat menjalankan rule ke transaksi lama setelah melihat preview dan mengonfirmasi jumlah perubahan |
| RULE-06 | Perubahan massal dapat dibatalkan melalui audit batch selama periode retensi |
| RULE-07 | Sistem dapat menyarankan rule dari koreksi kategori berulang, tetapi tidak mengaktifkannya tanpa persetujuan user |
| RULE-08 | Rules dijalankan konsisten pada web, WhatsApp, OCR, offline sync, CSV import, dan sumber eksternal masa depan |

### 4.5 Financial Health Score

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
- Pemisahan visual antara `Account Saya` dan `Dibagikan ke Saya`.
- Badge owner, role, dan daftar member pada shared account.
- Aksi tambah akun, transfer, adjustment, edit, dan archive.
- Warning bila saldo hasil ledger berbeda dengan saldo yang dimasukkan user.

### 6.2 Active Pocket dan Navigasi

- Navbar menampilkan nama, currency, ownership, dan role active pocket.
- User dapat mengganti pocket tanpa meninggalkan halaman yang sedang dibuka.
- Setelah switch, dashboard, transaksi terbaru, daftar transaksi, analytics,
  pencarian, dan export langsung menggunakan ledger pocket yang dipilih.
- Form transaksi, OCR/import, recurring baru, dan offline queue menggunakan
  active pocket secara otomatis dan tetap mengirim `accountId` eksplisit.
- Pocket viewer dapat dipilih untuk membaca. Tombol tambah transaksi, OCR,
  recurring baru, dan aksi tulis lain harus dinonaktifkan.
- Jika active pocket diarsipkan, aksesnya dicabut, atau tidak lagi tersedia,
  aplikasi kembali ke default account aktif milik user.
- Tidak tersedia pilihan virtual `Semua Account` sebagai active pocket. Tampilan
  lintas-account, bila dibutuhkan, merupakan mode laporan terpisah dan tidak
  dapat menjadi sumber transaksi.

### 6.3 Account Sharing

- Owner memilih satu account, memasukkan email user, lalu memilih role
  `viewer` atau `contributor`.
- Penerima memperoleh email berisi link undangan, login dengan account Money
  Flow yang dituju, lalu menerima atau menolak undangan.
- Setelah diterima, account muncul pada bagian `Dibagikan ke Saya` tanpa
  mengekspos account lain milik owner.
- Owner dapat melihat status undangan, mengganti role, dan mencabut akses.
- Member dapat melihat siapa owner account dan meninggalkan shared account.
- Aktivitas contributor menampilkan identitas pencatat kepada owner dan member
  lain yang memiliki akses.

### 6.4 Input Transaksi

Form transaksi menampilkan active pocket sebagai source yang terkunci. Pergantian
pocket dilakukan melalui navbar agar konteks daftar dan form tidak berbeda.
WhatsApp menggunakan active pocket user jika nama account tidak disebutkan dan
menerima override eksplisit seperti:

```text
kopi 25rb dari gopay
transfer 500rb dari BCA ke DANA
bayar kartu 1jt dari Mandiri
```

Jika nama akun ambigu, bot meminta satu klarifikasi sebelum menyimpan.

Contributor dapat memilih shared account saat mencatat transaksi. Selector harus
menampilkan nama account, owner, dan badge `Shared` agar transaksi tidak masuk ke
account yang salah. Viewer tidak melihat shared account sebagai pilihan tujuan
input.

### 6.5 Health Score

Dashboard menampilkan skor ringkas. Detail score menjelaskan kontribusi setiap
faktor, perubahan dari bulan sebelumnya, kualitas data, dan tindakan yang dapat
dilakukan. Bahasa harus suportif dan tidak mempermalukan user.

## 7. Model Data Tingkat Tinggi

| Entitas | Kolom penting |
| --- | --- |
| `accounts` | `ownerUserId`, `name`, `type`, `currency`, `openingBalance`, `isDefault`, `archivedAt` |
| `users` | tambah `activeAccountId` sebagai preferensi active pocket lintas perangkat/channel |
| `account_shares` | `accountId`, `memberUserId`, `invitedEmail`, `role`, `status`, `inviteTokenHash`, `inviteExpiresAt`, `acceptedAt`, `revokedAt` |
| `transactions` | tambah `accountId`, `recordedByUserId`, `transferId`, `entryRole`, `adjustmentReason` |
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
| `GET/PUT` | `/api/accounts/active` | Baca atau ganti active pocket user |
| `PATCH/DELETE` | `/api/accounts/:id` | Edit atau archive akun |
| `POST` | `/api/accounts/:id/adjustments` | Koreksi saldo auditable |
| `GET/POST` | `/api/accounts/:id/shares` | Daftar member dan undang berdasarkan email |
| `PATCH/DELETE` | `/api/accounts/:id/shares/:shareId` | Ubah role atau cabut akses |
| `GET` | `/api/account-invitations` | Daftar undangan untuk user login |
| `POST` | `/api/account-invitations/:token/accept` | Terima undangan sebagai email tujuan |
| `POST` | `/api/account-invitations/:token/decline` | Tolak undangan |
| `DELETE` | `/api/shared-accounts/:shareId/leave` | Keluar dari shared account |
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
7. Membership Shared Wallet lama yang sudah diterima dipetakan ke default account
   milik owner dengan role `contributor` dan mempertahankan audit pencatat.
8. Undangan Shared Wallet lama yang masih pending tidak dipindahkan sebagai token
   aktif; sistem menerbitkan ulang undangan berbasis email bila `memberUserId`
   dan email tujuan masih valid.
9. Endpoint Shared Wallet lama diberi compatibility window dan tidak boleh
   menciptakan membership berbasis nomor WhatsApp baru setelah Account Sharing
   aktif.

## 10. Acceptance Criteria

- Seluruh transaksi mempunyai account milik owner ledger; `recordedByUserId`
  harus menunjuk owner atau contributor dengan permission aktif saat pencatatan.
- Query account mengembalikan account milik user dan shared account yang telah
  diterima tanpa membocorkan account owner lainnya.
- Undangan hanya dapat diterima oleh user dengan email tujuan.
- Viewer tidak dapat membuat transaksi; contributor dapat membuat income/expense
  dengan `recordedByUserId` yang benar.
- Pencabutan akses berlaku segera pada API dan tidak mengubah histori ledger.
- Migrasi tidak mengubah total income, expense, dan net cashflow historis.
- Transfer membuat dua entry atomik dan tidak muncul sebagai income/expense.
- Cross-currency transfer menyimpan kedua nominal serta rate yang digunakan.
- Rule preview tidak melakukan write; apply dapat diaudit dan di-undo.
- Health score dengan data tidak cukup tidak menghasilkan skor palsu.
- Setiap faktor skor dapat dijelaskan dari data user dan formula version.
- WhatsApp, OCR, offline, recurring, backup, dan account sharing mendukung account.
- Navbar switcher mengganti scope dashboard, transaksi, analytics, pencarian,
  export, dan input baru tanpa mengubah histori.
- Active pocket viewer tidak dapat dipakai menulis; active pocket yang tidak
  valid otomatis kembali ke default account.
- Test ledger invariant, authorization, migration, build, lint, dan accessibility lulus.

## 11. Metrik Keberhasilan

| Metrik | Target awal |
| --- | --- |
| User aktif dengan ≥2 akun | ≥ 25% dalam 90 hari |
| Undangan account yang diterima | ≥ 50% dari undangan valid dalam 7 hari |
| Akses data account di luar permission | 0 insiden |
| Transfer yang memengaruhi income/expense | 0 |
| Transaksi yang dikategorikan smart rule | ≥ 20% pada user yang mengaktifkan rule |
| Koreksi kategori berulang | Turun ≥ 30% pada user rule aktif |
| User membuka detail health score | ≥ 30% MAU |

## 12. Catatan Evolusi Account Investasi dan Trading

Model account v1.6 harus dapat dikembangkan untuk account investasi, brokerage,
trading, atau aset kripto. Tujuan masa depan adalah agar user dapat melihat nilai
portofolio, modal, realized profit/loss, unrealized atau floating profit/loss,
fee, serta histori transaksi investasi.

Catatan ini bukan requirement implementasi v1.6. Implementasi investasi tidak
boleh hanya memakai rumus saldo account biasa karena membutuhkan model tambahan
seperti instrument, quantity, lot/cost basis, trade, market-price snapshot,
valuation currency, fee, pajak, dan corporate action. Tipe account investasi
baru ditambahkan setelah aturan valuation dan profit/loss didefinisikan dalam
PRD tersendiri.

Account investasi nantinya dapat memakai mekanisme Account Sharing yang sama,
tetapi permission untuk trading atau tindakan finansial eksternal harus terpisah
dari permission melihat dan mencatat.

## 13. Out of Scope

- Sinkronisasi otomatis ke bank, e-wallet, marketplace, atau QRIS.
- Co-ownership, pemindahan ownership, role selain `viewer`/`contributor`, dan
  permission kompleks pada shared account.
- Account investasi/trading, market price, portfolio valuation, serta perhitungan
  realized dan floating profit/loss.
- Rekomendasi investasi.
- Credit scoring untuk keputusan pinjaman.
- Rule yang menjalankan pembayaran atau tindakan eksternal.

## 14. Definition of Done

v1.6 selesai ketika account ledger, account sharing berbasis email, transfer
atomik, smart rules, health score, migrasi histori, integrasi seluruh input
channel, backup/restore, dan invariant test tersedia. Tidak boleh ada jalur
pencatatan yang menciptakan transaksi tanpa account, menghitung transfer sebagai
income/expense, atau memberi akses account tanpa permission aktif.
