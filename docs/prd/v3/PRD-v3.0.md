# Product Requirements Document — Money Flow v3.0

## Bank, Marketplace & QRIS Integrations

**Versi:** 3.0  
**Status:** Discovery / Planning  
**Terakhir diperbarui:** September 2026  
**Berdasarkan:** PRD v2.1

---

## 1. Ringkasan

Money Flow v3.0 mengurangi input manual melalui integrasi read-only dengan bank,
marketplace, dan sumber transaksi QRIS. Data eksternal dinormalisasi ke staging,
ditinjau, dideduplikasi, lalu diposting ke account ledger dengan provenance yang
jelas.

PRD ini bersifat provider-agnostic. Implementasi hanya boleh dimulai setelah
discovery legal, keamanan, biaya, cakupan institusi, SLA, dan metode consent
selesai. Money Flow tidak meminta atau menyimpan username, password, PIN, OTP,
atau credential internet banking user.

## 2. Prinsip Produk

1. Read-only terlebih dahulu; tidak ada transfer atau pembayaran.
2. Consent spesifik, dapat dicabut, dan mudah dipahami.
3. Credential provider disimpan terenkripsi dan dipisahkan dari data aplikasi.
4. External event tidak langsung mengubah ledger tanpa dedup dan validation.
5. User selalu dapat melihat sumber, status sync, dan alasan perubahan.
6. Integrasi gagal tidak boleh menghalangi pencatatan manual.
7. Provider dan institusi dipilih melalui discovery, bukan diasumsikan tersedia.

## 3. Gate Sebelum Implementasi

| Gate | Bukti kelulusan |
| --- | --- |
| Legal/regulatory | Review kewajiban perlindungan data, payment/open finance, consent, dan lokasi pemrosesan |
| Provider due diligence | Security posture, data coverage, webhook/polling, sandbox, SLA, pricing, dan exit plan |
| Security threat model | Token theft, replay, webhook spoofing, tenant isolation, insider access, dan incident response |
| Data quality pilot | Akurasi amount/date/reference, pending-posted lifecycle, reversal, refund, dan duplicate rate |
| Unit economics | Biaya per connected account dan per active user masih sesuai model bisnis |
| Support readiness | Prosedur reconnect, institution outage, dispute data, revoke, dan deletion |

Jika salah satu gate kritis belum lulus, scope terkait tetap berstatus discovery
dan tidak boleh dirilis ke production.

## 4. Requirement Fungsional

### 4.1 Integration Platform Foundation

| ID | Requirement |
| --- | --- |
| INT-01 | Adapter interface memisahkan provider eksternal dari domain Money Flow |
| INT-02 | Connection mempunyai provider, external account reference, consent scope, status, last sync, dan expiry |
| INT-03 | Token/secret dienkripsi dengan key management dan tidak pernah dikirim ke frontend atau log |
| INT-04 | Webhook diverifikasi signature, timestamp, replay window, dan idempotency key |
| INT-05 | Polling memakai distributed lock, backoff, jitter, quota awareness, dan cursor incremental |
| INT-06 | Raw event disimpan dengan retention minimum dan akses sangat terbatas; normalized event menjadi sumber proses |
| INT-07 | Semua external transaction mempunyai provenance provider, external ID, connection, timestamps, dan sync batch |
| INT-08 | Connection dapat pause, reconnect, revoke, dan delete sesuai kemampuan provider |
| INT-09 | User melihat status sehat, perlu tindakan, terlambat, atau terputus |
| INT-10 | Feature flag dan kill switch tersedia per provider dan per institution |

### 4.2 Bank Integration

| ID | Requirement |
| --- | --- |
| BANK-01 | User menghubungkan rekening melalui consent flow provider resmi tanpa memberikan credential sensitif kepada Money Flow |
| BANK-02 | Rekening eksternal dipetakan ke account Money Flow yang dipilih atau dibuat user |
| BANK-03 | Sync mendukung transaksi pending, posted, reversed, refunded, dan fee sesuai data provider |
| BANK-04 | Perubahan pending ke posted memperbarui record yang sama dan tidak membuat duplikat |
| BANK-05 | Transfer antar rekening milik user dideteksi sebagai kandidat transfer dan memerlukan konfirmasi bila confidence rendah |
| BANK-06 | Saldo eksternal ditampilkan dengan timestamp dan dapat direkonsiliasi terhadap ledger |
| BANK-07 | Gap data, downtime, atau consent expiry terlihat dan tidak ditutupi dengan saldo lama tanpa label |
| BANK-08 | User dapat memilih auto-post atau review-first per connection; rollout awal wajib review-first |

### 4.3 Marketplace Integration

| ID | Requirement |
| --- | --- |
| MKT-01 | Integrasi hanya memakai API/ekspor resmi atau mekanisme yang diizinkan provider |
| MKT-02 | Order, refund, shipping, fee, voucher, dan payout dinormalisasi tanpa menghitung satu pembelian dua kali |
| MKT-03 | User memilih apakah order diposting sebagai satu transaksi atau breakdown item/kategori |
| MKT-04 | Refund menaut ke transaksi asal bila reference tersedia |
| MKT-05 | Data item sensitif dapat disembunyikan dari description dan report |
| MKT-06 | Payout seller tidak boleh disamakan dengan gross sales tanpa memperhitungkan fee dan refund |
| MKT-07 | Smart rules dapat mengategorikan merchant/item setelah normalized preview |

### 4.4 QRIS Integration

| ID | Requirement |
| --- | --- |
| QRIS-01 | Sumber QRIS harus berasal dari provider/acquirer resmi atau feed yang diizinkan |
| QRIS-02 | Event menyimpan merchant, amount, transaction time, reference, fee, status, dan settlement reference bila tersedia |
| QRIS-03 | Incoming dan outgoing QRIS dibedakan secara eksplisit |
| QRIS-04 | Refund/reversal mengubah lifecycle transaksi asal dan tidak dicatat sebagai transaksi bebas tanpa relasi |
| QRIS-05 | Untuk merchant, gross transaction, fee, dan net settlement dapat direkonsiliasi |
| QRIS-06 | QRIS event yang juga muncul pada bank feed didedup lintas connector menggunakan reference dan heuristic yang dapat dijelaskan |

### 4.5 Review, Matching & Reconciliation

| ID | Requirement |
| --- | --- |
| MATCH-01 | Semua event baru masuk normalized staging sebelum posting ke ledger |
| MATCH-02 | Matching engine mencari exact external ID, reference, amount/date, dan kandidat transaksi manual |
| MATCH-03 | Exact match yang aman dapat di-merge; fuzzy match membutuhkan review pada rollout awal |
| MATCH-04 | User dapat memilih post, merge, ignore, atau mark transfer dengan bulk action terbatas |
| MATCH-05 | Keputusan user dapat menjadi smart-rule suggestion, bukan rule tersembunyi |
| MATCH-06 | Reconciliation menunjukkan external balance, ledger balance, delta, dan item penyebab |
| MATCH-07 | Semua merge/unmerge/post mempunyai audit event dan dapat dipulihkan selama retention window |

## 5. Arsitektur Tingkat Tinggi

```text
Provider webhook/poll
        ↓
Verified raw event (restricted retention)
        ↓
Provider adapter + normalized transaction
        ↓
Idempotency and matching engine
        ↓
Review queue / safe auto-post policy
        ↓
Account ledger + provenance + reconciliation
```

Komponen minimum:

- connector service terisolasi;
- encrypted connection vault/reference;
- webhook ingress dengan signature verification;
- sync scheduler dan distributed lock;
- normalized staging store;
- matching/dedup engine;
- reconciliation UI;
- audit dan provider health monitoring.

## 6. Model Data Tingkat Tinggi

| Entitas | Kolom penting |
| --- | --- |
| `integration_connections` | user, provider, type, status, consent scopes, secretRef, expiresAt, lastSyncAt |
| `external_accounts` | connection, externalRefHash, maskedName/number, currency, mappedAccountId |
| `sync_batches` | connection, cursor, startedAt, completedAt, counts, error code |
| `external_events` | provider event ID, type, payload reference, receivedAt, signature state, retention |
| `normalized_transactions` | connection, external ID, amount, currency, timestamps, status, merchant, reference, provenance |
| `transaction_matches` | normalized transaction, ledger transaction, method, confidence, decision, decidedBy |
| `reconciliation_snapshots` | external account, external balance, ledger balance, delta, observedAt |

Nomor rekening penuh dan credential tidak disimpan pada entitas domain biasa.
Identifier eksternal yang sensitif di-hash atau dimasking jika exact value tidak
diperlukan untuk operasi.

## 7. API Tingkat Tinggi

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/integrations/providers` | Provider/institusi yang tersedia |
| `POST` | `/api/integrations/connections` | Mulai consent flow |
| `GET/PATCH` | `/api/integrations/connections/:id` | Status dan pengaturan sync |
| `POST` | `/api/integrations/connections/:id/sync` | Trigger sync terbatas |
| `DELETE` | `/api/integrations/connections/:id` | Revoke dan putuskan connection |
| `POST` | `/api/webhooks/integrations/:provider` | Webhook ingress terverifikasi |
| `GET` | `/api/integrations/review` | Review normalized events |
| `POST` | `/api/integrations/review/actions` | Post/merge/ignore/transfer |
| `GET` | `/api/accounts/:id/reconciliation` | Status rekonsiliasi account |

## 8. Security, Privacy & Compliance

| Area | Requirement minimum |
| --- | --- |
| Credential | OAuth/consent resmi; tidak pernah meminta PIN, password, atau OTP bank |
| Encryption | Secret encrypted dengan rotation; field sensitif encrypted at rest |
| Isolation | Authorization user dan ownership check pada setiap resource dan job |
| Webhook | Signature, timestamp, replay defense, allowlist bila didukung, rate limit |
| Logging | Redaction wajib untuk token, account number, payload transaksi, dan PII |
| Consent | Scope, provider, tujuan pemrosesan, retention, revoke, dan deletion terlihat |
| Data minimization | Simpan hanya field yang diperlukan untuk fitur yang disetujui |
| Incident response | Kill switch, token revoke, audit trail, notification plan, runbook |
| Vendor risk | DPA/contract, subprocessor visibility, breach SLA, export dan deletion support |
| Production access | Least privilege, audited break-glass, dan pemisahan environment |

## 9. Rollout

### Fase A — Discovery dan Sandbox

- Pilih satu use case dan provider berdasarkan gate.
- Validasi sandbox, lifecycle transaksi, dedup, dan biaya.
- Tidak ada data production user.

### Fase B — Internal Alpha

- Institution terbatas, review-first wajib.
- Read-only, tanpa auto-post.
- Observability dan reconciliation diaudit manual.

### Fase C — Closed Beta

- Consent eksplisit dan waitlist.
- Auto-post hanya untuk exact match/rule yang disetujui.
- Kill switch per connector.

### Fase D — General Availability

- Hanya setelah error, duplicate rate, support load, security review, dan unit
  economics memenuhi launch criteria.

## 10. Acceptance Criteria

- Money Flow tidak menerima atau menyimpan credential internet banking user.
- Duplicate provider event tidak menghasilkan duplicate ledger transaction.
- Pending→posted dan refund/reversal mempertahankan lifecycle yang dapat diaudit.
- Revoke connection menghentikan sync baru dan menjalankan kebijakan penghapusan token.
- User dapat melihat freshness dan status setiap connection/account.
- Review queue dapat post, merge, ignore, dan undo tanpa merusak ledger invariant.
- Event yang sama dari QRIS dan bank feed dapat ditandai sebagai kandidat duplikat.
- Provider outage tidak menghalangi input manual atau akses data lokal yang sudah tersimpan.
- Threat model, penetration test scope, privacy review, backup/restore, build, lint,
  integration test, dan incident runbook selesai sebelum production.

## 11. Metrik Keberhasilan dan Guardrail

| Metrik | Target launch |
| --- | --- |
| Duplicate ledger posting | < 0,1% normalized transaction |
| Successful incremental sync | ≥ 99% di luar outage provider |
| Transaction auto-match precision | ≥ 99,5% sebelum auto-merge diaktifkan |
| Connection needing reconnect | Dipantau per provider dan institution |
| Median data freshness | Sesuai SLA provider dan terlihat oleh user |
| Unauthorized data access | 0 kejadian |
| Support ticket per 100 connections | Di bawah threshold launch yang ditetapkan saat beta |

## 12. Concern Utama

- Ketersediaan API resmi dan cakupan institusi dapat berbeda-beda.
- Biaya aggregator dapat membuat fitur memerlukan paket berbayar.
- Kualitas reference dan lifecycle transaksi tidak seragam antar-provider.
- QRIS merchant settlement dapat berbeda dari nominal transaksi karena fee dan
  batch settlement.
- Marketplace order, payment, refund, dan payout berpotensi double count.
- Consent expiry dan reconnect dapat meningkatkan support load.
- Integrasi finansial memperbesar dampak security incident dan kewajiban privacy.

Keputusan provider, pricing, dan launch market harus dibuat setelah discovery,
bukan dikunci oleh PRD ini.

## 13. Out of Scope

- Transfer uang, pembayaran, auto-debit, atau write access ke provider.
- Penyimpanan password, PIN, OTP, atau credential internet banking.
- Screen scraping yang melanggar ketentuan provider.
- Lending, credit underwriting, atau rekomendasi produk finansial.
- Trading dan sinkronisasi portfolio real-time.
- Menjamin dukungan semua bank, marketplace, dan acquirer QRIS pada rilis awal.

## 14. Definition of Done

v3.0 selesai ketika minimal satu integration vertical lulus seluruh gate,
berjalan read-only melalui consent resmi, memiliki staging-dedup-review-
reconciliation, aman dicabut, dan memenuhi guardrail production. Vertical yang
belum lulus gate tetap berstatus beta/discovery dan tidak boleh diklaim selesai.
