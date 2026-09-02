# Money Flow — WhatsApp Quota, Rate Limit & Cost Guard

**Status:** Target specification for PRD v1.7  
**Last reviewed:** 1 September 2026  
**Scope:** Incoming webhook, bot processing, outbound replies, proactive templates,
membership quota, and provider budget

---

## 1. Tujuan

Dokumen ini memisahkan empat kontrol yang sering disebut sebagai “limit”:

| Kontrol | Contoh | Tujuan |
| --- | --- | --- |
| Membership quota | Free 100 chat/bulan | Membatasi entitlement produk |
| Anti-abuse rate limit | 10 pesan/menit/nomor | Menahan spam dan burst |
| Provider throughput | Queue outbound sesuai kapasitas provider | Mencegah HTTP 429 dan overload |
| Cost guard | Free 0 proactive billable delivery | Mencegah biaya tidak terduga |

Keempatnya wajib berjalan bersamaan. Provider masih dapat menolak pesan karena
quality, policy, template, throughput, atau limit akun walaupun Money Flow belum
mencapai limit internal.

## 2. Definisi Unit

### 2.1 Chat Action

Satu inbound WhatsApp message unik yang masuk ke handler domain:

- text, voice note, atau interactive/button reply dihitung satu;
- satu pesan yang menghasilkan beberapa transaksi tetap dihitung satu;
- konfirmasi `ya/tidak` adalah message baru dan dihitung satu;
- duplicate Meta message ID tidak dihitung;
- delivery/read status tidak dihitung;
- linking challenge tidak dihitung;
- internal failure sebelum handler mulai tidak dihitung atau direfund dengan
  compensating usage event.

### 2.2 Outbound Message

Satu payload message yang dikirim Money Flow ke provider. Satu chat action dapat
menghasilkan lebih dari satu outbound message, sehingga inbound quota tidak
cukup untuk mengendalikan amplification.

### 2.3 Billable Delivery

Outbound message yang berhasil delivered dan menurut aturan Meta/provider pada
waktu pengiriman dapat dikenai biaya. Status `accepted` belum selalu berarti
delivered, sehingga sistem memakai reservation lalu settlement.

## 3. Kebijakan Free Tier

| Item | Batas |
| --- | ---: |
| Nomor WhatsApp aktif | 1 |
| Chat action per bulan | 100 |
| Service reply safety cap per bulan | 300 |
| Maksimum service reply per inbound | 3 |
| Voice note | 10 menit per bulan |
| Proactive message yang diperkirakan billable | 0 |
| Informational command setelah quota habis | 5 per hari |

Dengan aturan Meta yang terverifikasi pada 1 September 2026, balasan service
dalam customer service window 24 jam tidak dikenai biaya Meta. Karena itu, 100
chat Free secara normal dapat dibalas tanpa biaya variabel Meta. Money Flow tetap
membatasi maksimum 300 service replies per bulan untuk mencegah satu inbound
memicu banyak balasan, bug loop, atau perubahan kebijakan provider.

Angka 300 bukan jatah gratis Meta. Ini adalah safety cap Money Flow. Tidak ada
template reminder proaktif berbayar pada Free. Reminder Web Push tetap dapat
digunakan jika fitur tersebut tersedia.

Jika pricing/window tidak dapat ditentukan, pesan diperlakukan sebagai billable
dan tidak dikirim untuk Free.

## 4. Membership Quota

| Plan | Chat/bulan | Service reply cap | Voice minutes | Proactive billable/bulan |
| --- | ---: | ---: | ---: | ---: |
| Free | 100 | 300 | 10 | 0 |
| Plus | 1.000 | 3.000 | 60 | 30 |
| Pro | 5.000 | 15.000 | 300 | 150 |

Seluruh linked number dalam satu user menggunakan bucket yang sama. Quota
periode berjalan disimpan sebagai snapshot agar perubahan konfigurasi plan tidak
mengubah histori.

### Threshold Notice

- 70%: pemberitahuan ringan;
- 90%: warning dan link plan;
- 100%: mutating/analytics command ditolak, hanya command `kuota`, `membership`,
  dan `bantuan` yang tetap tersedia dengan daily cap.

Threshold notice tidak boleh memakai template berbayar untuk Free. Notice dapat
ditampilkan pada balasan service yang sedang aktif dan pada web app.

## 5. Anti-Abuse Rate Limit Target

| Scope | Limit default | Window/cooldown | Respons |
| --- | ---: | --- | --- |
| Webhook aggregate per app/WABA | Configurable, queue-aware | 1 minute | Tetap 200 setelah event aman dicatat; shed non-message noise bila perlu |
| Inbound per nomor | 10 | 1 minute | Satu warning, lalu silent cooldown |
| Inbound per user | 20 | 1 minute | Satu warning per 5 menit |
| Inbound sustained per user | 60 | 1 hour | Cooldown bertahap |
| Link challenge create | 5 | 1 hour/user | HTTP 429 pada API settings |
| Link challenge consume gagal | 5 | 15 minutes/nomor | Silent delay/neutral error |
| Exempt command setelah quota habis | 5 | 1 day/user | Tolak tanpa balasan setelah limit |
| Outbound reply amplification | 3 | per inbound message | Gabungkan konten sebelum send |
| Proactive notification | 1 | 1 day/user | Skip dan audit |
| Template send global | Berdasarkan budget dan provider queue | rolling | Queue/pause/kill switch |

Nilai ini adalah default produk, bukan batas Meta. Semua nilai harus dapat diubah
melalui konfigurasi tervalidasi tanpa deploy dan mempunyai minimum/maximum aman.

### Multi-Number

Rate limit berlaku berlapis:

```text
phone link → user gabungan → app/WABA → provider queue → cost budget
```

Dengan demikian Pro tidak dapat mengalikan rate limit user tiga kali hanya
karena mempunyai tiga nomor.

## 6. Audit Implementasi Saat Ini

Implementasi sebelum v1.7 menggunakan map in-memory dengan fixed window satu
menit:

- 120 webhook request per source IP per menit;
- 30 inbound message per nomor per menit;
- limiter hilang ketika process restart;
- setiap API instance memiliki bucket sendiri;
- duplicate retry melewati rate check sebelum idempotency insert;
- pesan rate-limit dapat dikirim berulang dan menciptakan reply amplification.

Concern tambahan: webhook Meta dapat berasal dari infrastruktur bersama. Limit
rendah berdasarkan source IP berpotensi membatasi banyak user sekaligus dan
tidak boleh dianggap identitas end-user.

Target v1.7:

- limiter distributed (misalnya Redis) atau database-backed untuk limit penting;
- signature verification dan ingress protection tetap paling awal;
- Meta message ID dedup dilakukan sebelum membership usage;
- source IP hanya menjadi sinyal ingress, bukan bucket user utama;
- rate-limit warning mempunyai cooldown;
- metric dan keputusan limiter dapat ditelusuri tanpa menyimpan nomor penuh.

## 7. Atomic Usage Reservation

Pseudoflow:

```text
BEGIN
  insert webhook event by unique Meta message ID
  resolve user from active phone link
  conditional increment usage bucket when used + reserved < limit
  create usage event with same idempotency key
COMMIT
```

Setelah proses:

- sukses: reservation menjadi used;
- kegagalan input user: tetap used karena compute sudah dikonsumsi;
- kegagalan internal sebelum domain handler: compensating adjustment;
- retry: membaca usage event existing, tidak increment lagi.

Jangan memakai pola `SELECT used` lalu `UPDATE used + 1` tanpa lock/conditional
update karena request paralel dapat melewati quota.

## 8. Outbound Classification dan Window

Sebelum send, simpan:

- message category;
- template name bila ada;
- tujuan market berdasarkan nomor penerima;
- timestamp inbound terakhir yang membuka window;
- `withinCustomerServiceWindow`;
- pricing/rule version;
- membership usage reservation;
- estimated maximum cost dan currency.

Aturan default:

| Situasi | Free | Plus/Pro |
| --- | --- | --- |
| Service reply dalam window 24 jam | Kirim jika reply cap tersedia | Kirim jika reply cap tersedia |
| Utility response dalam active window | Kirim jika provider mengizinkan dan diklasifikasikan benar | Sama |
| Utility template di luar window | Jangan kirim | Reserve proactive quota dan cost budget |
| Authentication template | Jangan kirim pada fitur v1.7 | Hanya flow yang disetujui dan budget tersedia |
| Marketing template | Jangan kirim | Tidak didukung v1.7 |
| Category/window unknown | Jangan kirim | Treat as billable dan minta cost guard |

## 9. Provider Queue dan Retry

- Outbound message masuk queue durable sebelum dikirim.
- Queue menggunakan idempotency key per logical delivery.
- HTTP 429 mengikuti `Retry-After` bila tersedia, exponential backoff, dan jitter.
- 5xx dapat retry terbatas; permanent 4xx tidak diulang otomatis.
- Status `accepted`, `sent`, `delivered`, `read`, dan `failed` diperbarui dari
  webhook.
- Reservation billable diselesaikan saat delivered; failed release reservation;
  unknown status ditahan sampai reconciliation timeout.
- Retry tidak membuat entitlement charge baru.
- Nomor revoked/restricted dan membership expired diperiksa ulang tepat sebelum
  actual send.

## 10. Cost Budget

Kontrol minimum:

| Budget | Perilaku saat tercapai |
| --- | --- |
| Per-user proactive quota | Skip message dan tampilkan alasan di settings |
| Per-plan sponsored budget | Stop sponsored send pada plan terkait |
| Daily provider budget | Pause proactive queue, inbound service tetap berjalan |
| Monthly provider budget | Kill switch proactive; alert operator |
| Unknown rate exposure | Treat as maximum configured rate atau block |

Budget disimpan dalam currency billing provider. Konversi ke IDR hanya untuk
reporting dan menyimpan exchange rate/time yang digunakan.

## 11. Observability

Metric minimum:

- inbound unique/duplicate/rate-limited/quota-denied;
- usage reservation success/conflict/adjustment;
- outbound per category/window/status/plan;
- reply amplification ratio;
- proactive reserved/delivered/failed/skipped;
- HTTP 429, provider latency, queue depth, oldest job age;
- estimated dan reconciled provider cost;
- number quality/template status bila provider menyediakannya.

Label metric tidak boleh memakai nomor telepon, user ID mentah ber-cardinality
tinggi, message content, atau token.

Alert minimum:

- spike duplicate/rate-limit/429;
- proactive spend mencapai 70%, 90%, atau 100% budget;
- cost per active user naik material;
- outbound delivered tanpa usage/cost decision;
- queue tertahan melewati SLA;
- reply amplification > 3.

## 12. Acceptance Test Matrix

| Skenario | Hasil |
| --- | --- |
| Webhook message ID sama dikirim 3 kali | Satu processing dan satu usage event |
| User Free mengirim message ke-100 | Diproses, remaining menjadi 0 |
| User Free mengirim message ke-101 | Tidak ada mutasi; quota response mengikuti cooldown |
| Satu message berisi 5 transaksi | Satu chat action |
| Tiga nomor Pro mengirim paralel | Satu atomic user bucket, tidak overrun |
| Bot mencoba 4 reply untuk satu inbound | Reply digabung atau reply ke-4 diblok |
| Free scheduler membuat template di luar window | Diblok sebelum provider call |
| Plus proactive message gagal delivery | Reservation direlease sesuai reconciliation rule |
| Provider mengembalikan 429 | Durable retry dengan backoff, tanpa duplicate charge |
| Instance restart | Rate/quota penting tetap konsisten |
| Pricing lookup gagal | Free block; paid memakai safe maximum atau block |

## 13. Operasional

Review limit dilakukan:

- setiap bulan selama beta;
- setelah perubahan pricing/provider;
- setelah penambahan nomor/tier;
- jika p95 latency, 429, abuse, atau cost per user berubah material.

Perubahan limit harus mempunyai owner, alasan, effective date, rollback value,
dan dashboard pembanding sebelum/sesudah.

## 14. Referensi

- [PRD v1.7 Membership](./PRD-v1.7.md)
- [Biaya WhatsApp Meta dan Kirimdev](./WHATSAPP-PRICING-META.md)
- [WhatsApp Production Runbook](./WHATSAPP-PRODUCTION.md)
- [WhatsApp Business Platform Pricing](https://whatsappbusiness.com/products/platform-pricing/)
- [Kirimdev Pricing](https://kirimdev.com/#pricing)
