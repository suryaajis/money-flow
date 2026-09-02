# Product Requirements Document — Money Flow v2.0

## Goals, Forecast, Subscriptions & Net Worth

**Versi:** 2.0  
**Status:** Planning  
**Terakhir diperbarui:** September 2026  
**Berdasarkan:** PRD v1.6

---

## 1. Ringkasan

Money Flow v2.0 memperluas produk dari pencatatan dan kontrol harian menjadi
perencanaan finansial. User dapat membuat tujuan tabungan, melihat prediksi
cashflow, memantau biaya langganan, serta menghitung net worth dari aset dan
liability yang dimiliki.

Seluruh fitur menggunakan account ledger v1.6 sebagai sumber kebenaran. v2.0
tidak melakukan transaksi bank atau pembayaran otomatis.

## 2. Visi Produk

```text
Catat → Pahami → Rencanakan → Bertindak → Capai tujuan
```

| Outcome | Indikator |
| --- | --- |
| User mempunyai arah | Ada goal dengan target dan kontribusi terukur |
| User dapat mengantisipasi masalah | Forecast memberi warning sebelum saldo diproyeksikan negatif |
| Biaya rutin terlihat | Subscription mempunyai jadwal, biaya, dan tren |
| Posisi finansial utuh | Aset dan liability terangkum sebagai net worth |

## 3. Requirement Fungsional

### 3.1 Financial Goals

| ID | Requirement |
| --- | --- |
| GOAL-01 | User dapat membuat goal dengan nama, target amount, currency, target date, icon, dan prioritas |
| GOAL-02 | Goal dapat dihubungkan ke satu account khusus atau memakai contribution ledger virtual |
| GOAL-03 | Kontribusi goal tidak dihitung sebagai expense apabila hanya memindahkan uang antar akun milik user |
| GOAL-04 | Sistem menghitung progress, sisa target, dan kebutuhan kontribusi per minggu/bulan |
| GOAL-05 | User dapat menambah, mengurangi, atau mengoreksi kontribusi dengan histori auditable |
| GOAL-06 | Goal dapat berstatus active, paused, completed, atau cancelled tanpa menghapus histori |
| GOAL-07 | Sistem memberi warning jika target date tidak realistis berdasarkan kontribusi dan forecast saat ini |
| GOAL-08 | User dapat mengaktifkan reminder Web Push atau WhatsApp untuk kontribusi yang tertinggal |
| GOAL-09 | Goal template minimum: dana darurat, liburan, pendidikan, gadget, dan custom |
| GOAL-10 | Shared Wallet tidak otomatis berbagi goal; sharing goal menjadi opt-in eksplisit jika didukung kemudian |

### 3.2 Cashflow Forecast

| ID | Requirement |
| --- | --- |
| FORE-01 | Forecast menampilkan proyeksi saldo harian untuk 30, 60, dan 90 hari |
| FORE-02 | Input deterministik meliputi current account balance, recurring transaction, subscription, debt due, budget pace, dan planned goal contribution |
| FORE-03 | User dapat memilih account tertentu atau seluruh akun dengan currency yang kompatibel |
| FORE-04 | Forecast memisahkan confirmed event dan estimated spending |
| FORE-05 | UI menampilkan tanggal saldo terendah, projected ending balance, dan risiko saldo negatif |
| FORE-06 | User dapat membuat skenario what-if tanpa mengubah data asli, misalnya mengurangi hiburan atau menunda pembelian |
| FORE-07 | Setiap proyeksi menampilkan asumsi dan waktu kalkulasi terakhir |
| FORE-08 | Forecast dihitung ulang setelah perubahan relevan dan tidak memakai data lintas user |
| FORE-09 | Sistem tidak menyatakan hasil sebagai kepastian atau nasihat investasi |

### 3.3 Subscription Tracker

| ID | Requirement |
| --- | --- |
| SUB-01 | User dapat membuat subscription dengan merchant, amount, frequency, next charge date, account, category, dan status |
| SUB-02 | Sistem dapat menyarankan subscription dari pola transaksi berulang, tetapi membutuhkan konfirmasi user |
| SUB-03 | Subscription mendukung interval mingguan, bulanan, tahunan, dan custom sederhana |
| SUB-04 | User melihat total biaya subscription per bulan dan per tahun |
| SUB-05 | Reminder dapat dikirim sebelum tanggal tagihan sesuai preferensi user |
| SUB-06 | Sistem menandai kemungkinan kenaikan harga berdasarkan transaksi aktual yang cocok |
| SUB-07 | User dapat menandai cancelled tanpa menghapus histori |
| SUB-08 | Subscription dapat dihubungkan ke recurring transaction, tetapi keduanya tidak boleh membuat transaksi ganda |
| SUB-09 | Money Flow tidak mengklaim telah membatalkan layanan pihak ketiga; aksi cancel hanya tracking status |

### 3.4 Net Worth

| ID | Requirement |
| --- | --- |
| NW-01 | Net worth dihitung sebagai total aset dikurangi total liability pada tanggal tertentu |
| NW-02 | Aset minimum meliputi account balance dan manual asset; liability minimum meliputi credit card, debt, dan manual liability |
| NW-03 | User dapat menambahkan aset/liability manual dengan nama, jenis, nilai, currency, dan tanggal valuasi |
| NW-04 | Nilai manual tidak berubah tanpa input user atau sumber integrasi yang disetujui |
| NW-05 | Multi-currency menggunakan exchange rate dan timestamp yang terlihat |
| NW-06 | Grafik histori menggunakan snapshot periodik dan mempertahankan provenance sumber nilai |
| NW-07 | User dapat mengecualikan account atau item tertentu dari net worth tanpa menghapusnya |
| NW-08 | Dashboard membedakan liquid assets, non-liquid assets, dan liabilities |
| NW-09 | Tidak ada harga saham/crypto real-time atau rekomendasi alokasi pada scope v2.0 |

## 4. Pengalaman Pengguna

### 4.1 Halaman Plan

Satu area `Plan` berisi:

- goal aktif dan progress;
- forecast 30 hari dengan warning utama;
- subscription yang akan ditagih;
- tindakan singkat seperti `Tambah kontribusi` dan `Buat skenario`.

### 4.2 Halaman Net Worth

Menampilkan total net worth, perubahan bulanan, komposisi aset/liability, dan
daftar sumber nilai. Setiap angka dapat ditelusuri ke account, debt, atau valuasi
manual asalnya.

### 4.3 WhatsApp

Perintah minimum:

```text
goal
goal dana darurat
forecast
langganan
net worth
```

Perintah bersifat read-only kecuali kontribusi goal yang selalu meminta
konfirmasi dan account sumber.

## 5. Logika Forecast Tingkat Tinggi

```text
Projected balance hari N = current ledger balance
                          + confirmed income sampai hari N
                          - confirmed expense sampai hari N
                          - estimated variable spending
                          - planned goal contributions
```

Aturan:

- confirmed event berasal dari recurring, subscription, dan debt due;
- estimated spending memakai budget pace atau median histori yang cukup;
- data yang kurang menghasilkan confidence rendah dan penjelasan, bukan angka
  presisi palsu;
- what-if scenario disimpan terpisah dan tidak membuat transaction/recurring;
- forecast tidak mencampur currency tanpa rate yang diketahui.

## 6. Model Data Tingkat Tinggi

| Entitas | Kolom penting |
| --- | --- |
| `financial_goals` | user, name, target, currency, targetDate, priority, linkedAccount, status |
| `goal_contributions` | goal, transaction/transfer reference, amount, date, source, note |
| `forecast_scenarios` | user, name, horizon, assumption overrides, expiresAt |
| `subscriptions` | user, merchant, amount, frequency, nextChargeAt, account, category, status |
| `manual_assets` | user, kind, name, value, currency, valuedAt, excluded |
| `manual_liabilities` | user, kind, name, value, currency, valuedAt, excluded |
| `net_worth_snapshots` | user, date, totals, currency, rate snapshot, source breakdown |

## 7. API Tingkat Tinggi

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET/POST` | `/api/goals` | Daftar dan buat goal |
| `PATCH` | `/api/goals/:id` | Edit atau ubah status goal |
| `POST` | `/api/goals/:id/contributions` | Catat kontribusi |
| `GET` | `/api/forecast` | Forecast default |
| `POST` | `/api/forecast/scenarios` | Kalkulasi what-if |
| `GET/POST` | `/api/subscriptions` | Daftar dan buat subscription |
| `PATCH` | `/api/subscriptions/:id` | Edit/status subscription |
| `POST` | `/api/subscriptions/detect` | Deteksi kandidat dari histori |
| `GET` | `/api/net-worth` | Ringkasan dan breakdown |
| `GET/POST` | `/api/net-worth/assets` | Manual assets |
| `GET/POST` | `/api/net-worth/liabilities` | Manual liabilities |

## 8. Notifikasi

| Event | Default | Ketentuan |
| --- | --- | --- |
| Goal tertinggal | Off | Opt-in per goal, maksimal satu per minggu |
| Subscription segera ditagih | Off | Opt-in, lead time configurable |
| Forecast saldo negatif | Off | Kirim hanya saat risiko baru atau memburuk material |
| Net worth snapshot siap | Off | Maksimal bulanan |

Delivery mengikuti preferensi Web Push dan nomor WhatsApp primary dari v1.5,
dengan idempotency per event dan channel.

## 9. Acceptance Criteria

- Kontribusi berupa transfer internal tidak meningkatkan expense.
- Progress goal dapat direkonsiliasi terhadap contribution ledger.
- Forecast menampilkan asumsi, confidence/data quality, dan timestamp.
- Skenario what-if tidak mengubah transaksi atau saldo asli.
- Subscription yang linked ke recurring tidak menciptakan transaksi duplikat.
- Net worth dapat ditelusuri ke seluruh sumber aset/liability.
- Snapshot multi-currency menyimpan rate yang digunakan.
- Semua resource terisolasi per user dan masuk backup/restore schema terbaru.
- Build, lint, unit test kalkulasi, authorization test, dan accessibility lulus.

## 10. Metrik Keberhasilan

| Metrik | Target awal |
| --- | --- |
| User aktif membuat minimal satu goal | ≥ 30% MAU |
| Goal dengan kontribusi kedua dalam 30 hari | ≥ 40% goal aktif |
| User membuka forecast bulanan | ≥ 25% MAU |
| Kandidat subscription yang dikonfirmasi | ≥ 60% kandidat ditinjau |
| Retensi 30 hari user Plan | Lebih tinggi daripada user tanpa Plan |

## 11. Risiko dan Mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Forecast dianggap pasti | Tampilkan asumsi, range/confidence, dan disclaimer yang jelas |
| Double-count goal/subscription | Referensi ledger tunggal dan invariant test |
| Net worth tidak akurat | Tampilkan freshness dan provenance setiap nilai |
| Reminder berlebihan | Default off, frequency cap, dan quiet hours |
| User merasa dihakimi | Bahasa netral, kontrol opt-out, tanpa perbandingan sosial |

## 12. Out of Scope

- Eksekusi pembayaran atau auto-debit.
- Sharing goal kompleks dengan permission anggota.
- Investasi, portfolio rebalancing, atau harga pasar real-time.
- Machine-learning forecast tanpa explainability.
- Bank sync, marketplace sync, atau QRIS sync.

## 13. Definition of Done

v2.0 selesai ketika goals, contribution ledger, forecast explainable,
subscription tracker, net worth, notifikasi opt-in, WhatsApp read commands,
backup/restore, dan test kalkulasi tersedia tanpa double counting terhadap
account ledger v1.6.
