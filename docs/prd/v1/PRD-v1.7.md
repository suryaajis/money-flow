# Product Requirements Document — Money Flow v1.7

## Membership & WhatsApp Entitlements

**Versi:** 1.7  
**Status:** Planning  
**Terakhir diperbarui:** 1 September 2026  
**Berdasarkan:** PRD v1.5 dan PRD v1.6  
**Scope membership saat ini:** WhatsApp saja

---

## 1. Ringkasan

Money Flow v1.7 memperkenalkan membership pada level user. Pada rilis ini,
membership hanya mengatur entitlement WhatsApp: jumlah nomor yang dapat
dihubungkan, jumlah chat bot per bulan, penggunaan voice note, dan jumlah pesan
proaktif berbayar yang boleh dikirim.

Seluruh fitur web personal finance tetap tersedia seperti sebelum v1.7. Model
membership dibuat generik agar fitur versi berikutnya dapat memakai entitlement
yang sama tanpa mengubah struktur utama.

Free tier mendapatkan satu nomor WhatsApp dan 100 chat action per bulan. Kuota
ini adalah kebijakan produk Money Flow, bukan kuota gratis dari Meta.

## 2. Sasaran

| Sasaran | Indikator selesai |
| --- | --- |
| Biaya terkendali | Pesan dan fitur berbiaya tidak dapat melewati entitlement atau budget guard |
| Batas mudah dipahami | User dapat melihat pemakaian, periode, dan waktu reset |
| Upgrade konsisten | Perubahan plan segera membuka entitlement tambahan tanpa kehilangan data |
| Aman saat downgrade | Nomor dan histori tidak langsung dihapus ketika entitlement turun |
| Siap dikembangkan | Entitlement baru dapat ditambah tanpa kolom plan-specific pada `users` |

## 3. Definisi

| Istilah | Definisi |
| --- | --- |
| Membership | Plan produk yang dimiliki user |
| Entitlement | Batas atau kemampuan yang diberikan plan |
| Chat action | Satu inbound message unik dari nomor terhubung yang diterima untuk diproses bot |
| Service reply | Balasan bot dalam customer service window Meta |
| Proactive message | Pesan yang dimulai Money Flow, umumnya memakai template |
| Billable delivery | Pesan outbound yang menurut kategori, window, market, dan status delivery dapat menimbulkan biaya provider |
| Usage period | Rentang waktu atomik tempat penggunaan dihitung |
| Cost guard | Pemeriksaan sebelum pengiriman yang mencegah pengeluaran di luar budget |

## 4. Plan dan Entitlement Awal

Angka selain Free adalah default perencanaan awal dan wajib disimpan sebagai
konfigurasi plan/versioned seed, bukan konstanta yang tersebar di kode.

| Entitlement WhatsApp | Free | Plus | Pro |
| --- | ---: | ---: | ---: |
| Nomor aktif | 1 | 2 | 3 |
| Chat action per bulan | 100 | 1.000 | 5.000 |
| Safety cap service reply per bulan | 300 | 3.000 | 15.000 |
| Voice note minutes per bulan | 10 | 60 | 300 |
| Proactive billable delivery per bulan | 0 | 30 | 150 |
| Tujuan notifikasi proaktif | Tidak tersedia di luar free window | Primary saja | Maks. 3 nomor, opt-in |
| Smart fallback saat AI budget habis | Rule-based parser | Rule-based parser | Rule-based parser |

Ketentuan:

- hard maximum platform tetap tiga nomor per user sesuai PRD v1.5;
- usage seluruh nomor digabung pada user yang sama;
- tidak ada plan `unlimited` pada v1.7;
- nominal harga Plus/Pro, trial, promo, pajak, dan payment provider belum dikunci
  oleh PRD ini;
- admin tidak boleh menaikkan limit dengan mengubah row usage; entitlement harus
  melalui plan version atau explicit grant yang diaudit.

## 5. Aturan Penghitungan Chat

### 5.1 Mengonsumsi Satu Chat Action

- text message yang diterima untuk diproses;
- voice note yang diterima untuk ditranskripsi;
- interactive/button reply, termasuk konfirmasi transaksi;
- pesan yang formatnya salah atau tidak dipahami setelah berhasil masuk ke
  domain handler;
- satu pesan multi-transaksi tetap dihitung satu chat action.

### 5.2 Tidak Mengonsumsi Chat Action

- webhook delivery/read status;
- retry webhook dengan Meta message ID yang sama;
- webhook tanpa signature valid;
- linking challenge `HUBUNGKAN <token>`;
- kegagalan internal sebelum handler domain mulai, yang harus direfund melalui
  usage adjustment auditable;
- perintah `kuota`, `membership`, dan `bantuan` setelah limit habis, maksimal
  lima request gabungan per hari untuk mencegah bypass abuse.

### 5.3 Urutan Enforcement

```text
Verify signature
→ reject duplicate Meta message ID
→ resolve active phone link dan user
→ apply burst rate limit
→ atomically reserve membership usage
→ process command
→ settle usage atau create compensating adjustment on internal failure
→ send reply through outbound safety cap
```

Usage tidak boleh dihitung hanya dari log karena retry, multi-instance, dan
partial failure dapat menghasilkan angka yang salah.

## 6. Requirement Fungsional

### 6.1 Membership Lifecycle

| ID | Requirement |
| --- | --- |
| MEM-01 | Setiap user baru otomatis memperoleh plan Free aktif |
| MEM-02 | Status membership mendukung `free`, `trialing`, `active`, `grace_period`, `past_due`, `cancelled`, dan `expired` |
| MEM-03 | Membership menyimpan plan version agar perubahan limit tidak mengubah periode historis |
| MEM-04 | Upgrade berlaku segera dan mempertahankan usage periode berjalan |
| MEM-05 | Downgrade terjadwal berlaku pada awal periode berikutnya, kecuali tindakan fraud/admin yang diaudit |
| MEM-06 | Aktivasi plan berbayar hanya boleh berasal dari billing adapter/webhook terverifikasi atau admin grant dengan audit reason |
| MEM-07 | Kegagalan payment tidak menghapus data dan mengikuti grace period yang dapat dikonfigurasi |
| MEM-08 | Pricing display harus membedakan limit Money Flow dari biaya Meta/provider |

### 6.2 Entitlement Enforcement

| ID | Requirement |
| --- | --- |
| ENT-01 | Seluruh entitlement dibaca melalui membership service tunggal |
| ENT-02 | Penambahan nomor memeriksa `min(planLimit, platformHardLimit)` secara atomik |
| ENT-03 | Chat quota direservasi dengan operasi database atomik dan aman terhadap request paralel |
| ENT-04 | Semua nomor user memakai usage bucket yang sama |
| ENT-05 | Shared-wallet command mengonsumsi quota user pengirim, bukan pemilik wallet |
| ENT-06 | Outbound notification ke owner mengonsumsi entitlement proactive milik owner |
| ENT-07 | Entitlement response menyertakan limit, used, remaining, period start/end, dan source plan version |
| ENT-08 | Client tidak dapat meningkatkan limit melalui request payload atau local state |

### 6.3 Usage Experience

| ID | Requirement |
| --- | --- |
| USAGE-01 | Settings menampilkan plan, usage bar, tanggal reset, dan fitur yang terkunci |
| USAGE-02 | Bot mendukung perintah `kuota` dan mengembalikan remaining chat serta voice minutes |
| USAGE-03 | User menerima warning saat pemakaian mencapai 70%, 90%, dan 100%, maksimal sekali per threshold per period |
| USAGE-04 | Saat quota habis, bot tidak memproses mutasi finansial dan memberi instruksi upgrade atau menunggu reset |
| USAGE-05 | Web app tetap dapat dipakai saat quota WhatsApp habis |
| USAGE-06 | Pesan gagal karena limit tidak boleh disimpan sebagai transaksi parsial |
| USAGE-07 | Usage historis tersedia minimum 12 periode untuk support dan dispute |

### 6.4 Outbound Cost Guard

| ID | Requirement |
| --- | --- |
| COST-01 | Setiap outbound message diklasifikasikan sebagai service, utility, authentication, atau marketing sebelum send |
| COST-02 | Sistem menentukan apakah customer service/free-entry window aktif menggunakan timestamp inbound yang tervalidasi |
| COST-03 | Free tier tidak mengirim proactive message yang diperkirakan billable |
| COST-04 | Paid proactive quota direservasi sebelum send dan diselesaikan berdasarkan delivery status |
| COST-05 | Marketing message tidak digunakan oleh fitur Money Flow v1.7 |
| COST-06 | Satu inbound chat menghasilkan maksimal tiga outbound service replies kecuali flow eksplisit yang diaudit |
| COST-07 | Global monthly provider budget dan kill switch dapat menghentikan proactive send tanpa mematikan inbound bot |
| COST-08 | Unknown pricing/category/window diperlakukan sebagai berpotensi billable, bukan gratis |
| COST-09 | Semua cost decision menyimpan category, market, window state, rate version, dan alasan keputusan |

## 7. Periode dan Reset

- Free memakai bulan kalender zona `Asia/Jakarta`.
- Paid plan dapat memakai billing cycle, tetapi setiap usage row wajib mempunyai
  `periodStart` dan `periodEnd` eksplisit dalam UTC.
- Reset dilakukan dengan membuat usage bucket periode baru, bukan mengubah
  histori lama menjadi nol.
- Upgrade di tengah periode memperbesar limit pada bucket yang sama.
- Downgrade tidak mengurangi limit periode berjalan di bawah usage yang sudah
  sah.
- Jam atau timezone client tidak menjadi sumber kebenaran.

## 8. Downgrade dan Nomor Berlebih

Jika user turun dari Pro/Plus ke plan dengan limit nomor lebih kecil:

1. tidak ada nomor atau histori yang langsung dihapus;
2. primary number tetap aktif;
3. user mendapat grace period tujuh hari untuk memilih nomor yang dipertahankan;
4. nomor di atas entitlement berubah menjadi `restricted`, tidak dapat memakai
   bot atau menerima notifikasi;
5. setelah grace period, sistem mempertahankan primary lalu nomor aktif tertua
   sampai limit terpenuhi;
6. upgrade kembali dapat mengaktifkan nomor restricted setelah verifikasi status
   kepemilikan masih valid.

## 9. Rate Limit dan Quota Default

Membership quota tidak menggantikan anti-abuse rate limit.

| Layer | Default v1.7 | Tujuan |
| --- | ---: | --- |
| Inbound per nomor | 10/minute burst | Mencegah spam satu nomor |
| Inbound per user seluruh nomor | 20/minute, 60/hour | Mencegah bypass melalui multi-number |
| Exempt command setelah quota habis | 5/day | Tetap memberi akses informasi tanpa abuse |
| Rate-limit warning reply | 1/5 minutes per nomor | Mencegah reply amplification |
| Outbound service reply per inbound | Maks. 3 | Membatasi amplification dan provider traffic |
| Proactive per user | Maks. 1/day dan sesuai plan monthly cap | Mengendalikan biaya dan fatigue |

Nilai harus configurable dan disimpan pada distributed limiter. Detail lengkap
ada di [`WHATSAPP-RATE-LIMITS.md`](./WHATSAPP-RATE-LIMITS.md).

## 10. Model Data Tingkat Tinggi

| Entitas | Kolom penting |
| --- | --- |
| `membership_plans` | code, version, name, active, effectiveAt |
| `plan_entitlements` | planVersion, key, integer/boolean value |
| `user_memberships` | user, planVersion, status, period, renew/cancel timestamps, billing reference |
| `membership_grants` | user, entitlement override, value, expiresAt, reason, grantedBy |
| `usage_buckets` | user, entitlement key, period, used, reserved, limit snapshot, version |
| `usage_events` | bucket, idempotency key, delta, state, source, reason, timestamps |
| `membership_audit_events` | user, actor, old/new plan/status, reason, metadata |

Nama entitas `user_memberships` sengaja dibedakan dari subscription tracker
finansial pada PRD v2.0.

Perubahan domain WhatsApp:

- `wa_phone_links` memperoleh state `active/restricted/revoked`;
- `wa_outbound_messages` menyimpan category, market, window state, usage event,
  estimated cost, rate version, dan delivery settlement;
- `wa_webhook_events` menyimpan usage event reference setelah reservasi berhasil.

## 11. API Tingkat Tinggi

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/membership` | Membership dan plan aktif |
| `GET` | `/api/membership/plans` | Plan publik dan entitlement aktif |
| `GET` | `/api/membership/usage` | Usage periode berjalan |
| `POST` | `/api/membership/change-plan` | Memulai perubahan plan melalui billing adapter |
| `POST` | `/api/webhooks/billing/:provider` | Webhook billing terverifikasi di masa depan |
| `GET` | `/api/users/whatsapp/quota` | Ringkasan entitlement WhatsApp |

Endpoint admin grant tidak diekspos pada public API dan wajib menggunakan audit,
RBAC, serta reason.

## 12. Billing Boundary

v1.7 membangun membership, plan, entitlement, usage, dan enforcement. Pemilihan
payment gateway, harga rupiah Plus/Pro, invoice, refund pembayaran, pajak, promo,
dan checkout merupakan keputusan billing terpisah. Sebelum billing adapter
tersedia, plan berbayar hanya dapat diaktifkan pada environment non-production
atau melalui admin grant production yang sangat terbatas dan diaudit.

Biaya Kirimdev atau Meta adalah biaya operasional Money Flow dan tidak otomatis
sama dengan harga membership user. Lihat
[`WHATSAPP-PRICING-META.md`](./WHATSAPP-PRICING-META.md).

## 13. Security dan Abuse Prevention

| Risiko | Mitigasi |
| --- | --- |
| Parallel quota bypass | Atomic conditional update dan idempotency key Meta message ID |
| Multi-number quota bypass | Bucket pada user, limiter pada nomor dan user |
| Fake billing webhook | Signature verification, replay defense, event idempotency |
| Admin abuse | RBAC, immutable audit, reason wajib, alert untuk grant besar |
| Cost explosion | Paid-message reservation, global budget, daily cap, kill switch |
| Reply loop | Per-inbound reply cap, cooldown warning, bot-message detection bila tersedia |
| Downgrade data loss | Restricted state dan grace period, bukan delete |
| Usage dispute | Versioned limit snapshot dan immutable usage events |

## 14. Acceptance Criteria

- User baru otomatis memperoleh Free dengan satu nomor dan 100 chat action.
- User Free tidak dapat menghubungkan nomor kedua.
- Satu pesan multi-transaksi mengonsumsi satu chat action.
- Duplicate webhook tidak mengonsumsi quota kedua kali.
- Usage 100/100 menolak mutasi berikutnya tetapi mengizinkan command quota yang
  dibatasi.
- Chat dari seluruh nomor Plus/Pro mengonsumsi bucket user yang sama.
- Free tidak mengirim template yang diperkirakan billable.
- Upgrade memperbesar entitlement tanpa reset atau kehilangan usage.
- Downgrade tidak menghapus nomor; nomor berlebih masuk restricted setelah grace.
- Shared-wallet usage dibebankan pada actor yang mengirim chat.
- Cost guard tetap bekerja ketika rate card tidak tersedia.
- Unit, concurrency, idempotency, authorization, downgrade, dan cost-guard test
  lulus bersama build dan lint.

## 15. Metrik Keberhasilan

| Metrik | Target awal |
| --- | --- |
| Duplicate usage charge | 0 |
| Quota bypass pada concurrency test | 0 |
| Outbound billable Free tanpa explicit sponsorship | 0 |
| Usage discrepancy antara event dan bucket | < 0,1% |
| User melihat warning sebelum limit | ≥ 95% user yang mencapai threshold |
| Membership-related support dispute | Dipantau sebelum pricing dikunci |

## 16. Out of Scope

- Membatasi fitur web non-WhatsApp berdasarkan membership.
- Unlimited plan.
- Family billing atau satu membership untuk beberapa user.
- Marketplace subscription pada App Store/Play Store.
- Payment gateway tertentu, invoice, pajak, dan refund pembayaran.
- Menjual ulang kuota Meta sebagai saldo uang user.
- Marketing/broadcast campaign.

## 17. Definition of Done

v1.7 selesai ketika Free diberikan otomatis, entitlement WhatsApp ditegakkan
secara atomik, usage terlihat user, downgrade aman, paid outbound mempunyai cost
guard, limiter bekerja lintas instance, dokumentasi biaya/rate limit tersedia,
dan tidak ada jalur WhatsApp yang dapat melewati quota melalui retry,
multi-number, shared wallet, atau concurrency.
