# Money Flow — Biaya WhatsApp Business Platform & Kirimdev

**Status:** Operational pricing reference  
**Terakhir diverifikasi:** 1 September 2026  
**Pasar utama:** Indonesia  
**Peringatan:** Harga dan kebijakan dapat berubah. Halaman resmi provider adalah
sumber kebenaran pada saat keputusan billing atau deployment dibuat.

---

## 1. Ringkasan Eksekutif

Biaya WhatsApp untuk Money Flow mempunyai beberapa lapisan:

```text
Total biaya WhatsApp
= biaya platform/BSP (jika memakai Kirimdev)
+ biaya pesan Meta yang billable
+ biaya AI/transkripsi
+ infrastruktur queue, database, storage, dan observability
```

Kesimpulan operasional per 1 September 2026:

- Meta mengenakan biaya per pesan yang berhasil delivered, bukan sekadar
  request send.
- Harga bergantung pada negara tujuan dan kategori message.
- Service reply dalam customer service window 24 jam tidak dikenai biaya Meta.
- Utility message yang dikirim sebagai respons dalam window user juga tidak
  dikenai biaya Meta menurut halaman pricing resmi saat verifikasi.
- Marketing, authentication, dan utility di luar free window dapat dikenai
  biaya per delivered message.
- Entry point tertentu dari Click-to-WhatsApp Ad atau Facebook Page CTA memberi
  window gratis 72 jam untuk semua kategori sesuai ketentuan Meta.
- Kirimdev mengenakan subscription software terpisah; biaya template Meta tetap
  berada di WABA dan bukan termasuk subscription Kirimdev.
- Free tier Money Flow 100 chat/bulan adalah kebijakan Money Flow, bukan free
  allowance Meta.

Sumber utama:

- [WhatsApp Business Platform Pricing — official](https://whatsappbusiness.com/products/platform-pricing/)
- [Kirimdev Pricing — official](https://kirimdev.com/#pricing)

## 2. Model Pricing Meta Saat Ini

Halaman resmi Meta/WhatsApp menyatakan bisnis dikenai biaya per message yang
delivered. Rate ditentukan oleh pasangan market–category.

### 2.1 Kategori Pesan

| Kategori | Contoh Money Flow | Kondisi biaya saat verifikasi |
| --- | --- | --- |
| Service | Balasan `saldo`, hasil catat transaksi, klarifikasi bot | Gratis dalam customer service window 24 jam |
| Utility | Rekap, alert budget, reminder utang, aktivitas shared wallet | Gratis bila respons terhadap user dalam active window; dapat billable di luar window |
| Authentication | OTP/verifikasi identitas | Umumnya billable per delivered template sesuai market/rate |
| Marketing | Promo, penawaran, upsell | Billable; tidak digunakan oleh scope Money Flow v1.7 |

Template category ditentukan/review oleh Meta. Money Flow tidak boleh
mengklasifikasikan pesan promotional sebagai utility hanya untuk menghindari
biaya.

### 2.2 Customer Service Window 24 Jam

Ketika user mengirim pesan, customer service window terbuka selama 24 jam dan
di-reset oleh pesan user berikutnya. Dalam window ini:

- bot dapat membalas dengan service message;
- service reply tidak dikenai biaya Meta menurut pricing resmi saat review;
- utility yang benar-benar merespons user juga disebut tidak dikenai biaya;
- marketing dan authentication tidak otomatis gratis hanya karena window aktif;
- setelah window berakhir, free-form service message tidak digunakan untuk
  memulai percakapan; gunakan template yang approved dan evaluasi biayanya.

Money Flow menyimpan `lastInboundAt` per nomor untuk menentukan window, tetapi
keputusan provider/Meta tetap final.

### 2.3 Free Entry Point 72 Jam

Meta menyatakan ketika user memulai chat dari Click-to-WhatsApp Ad atau tombol
call-to-action Facebook Page yang memenuhi syarat, pesan selama 72 jam tidak
dikenai biaya. Money Flow tidak mengasumsikan semua inbound chat memperoleh
window ini. Entry-point metadata harus tersedia dan tervalidasi sebelum cost
guard menganggap 72-hour window aktif.

### 2.4 Delivered, Bukan Sent

Cost ledger harus membedakan:

| Status | Perlakuan internal |
| --- | --- |
| Queued/reserved | Tahan entitlement dan estimated budget |
| Accepted/sent | Belum dianggap final billable settlement |
| Delivered | Settle sesuai rate/category/window |
| Failed | Release reservation setelah status final |
| Unknown/no callback | Tahan lalu rekonsiliasi dengan provider |

Perhitungan hanya dari API request count dapat melebihkan atau meremehkan biaya.

### 2.5 Market dan Currency

Rate Meta mengikuti market penerima, bukan lokasi server Money Flow. Nomor
Indonesia biasanya memakai market Indonesia berdasarkan country calling code,
tetapi mapping final mengikuti definisi regional Meta.

Simpan:

- market yang dipakai;
- category;
- rate dan currency;
- rate source/effective date;
- volume tier;
- exchange rate jika laporan dikonversi ke IDR.

## 3. Rate Indonesia

Nominal rate marketing, utility, authentication, dan authentication-international
tidak disalin sebagai konstanta di dokumen ini karena Meta menampilkannya melalui
selector market/currency dan dapat mengubahnya. Operator wajib mengambil angka
terbaru dari official pricing calculator dengan pilihan:

```text
Market: Indonesia
Currency: currency billing WABA
Category: Marketing / Utility / Authentication / Service
```

Catat hasilnya dalam rate registry:

| Field | Contoh isi |
| --- | --- |
| Provider | `meta` |
| Market | `ID` |
| Category | `utility` |
| Currency | Currency billing WABA |
| Unit rate | Nilai dari official calculator |
| Effective from | Tanggal berlaku dari Meta |
| Verified at | Waktu operator mengecek |
| Source URL | Official pricing/rate card URL |
| Reviewer | Operator yang memverifikasi |

### Snapshot Kebijakan, Bukan Nominal

| Jenis delivery | Rate snapshot 1 Sep 2026 |
| --- | --- |
| Service dalam 24-hour customer service window | Tidak dikenai biaya Meta |
| Utility sebagai respons dalam active user window | Tidak dikenai biaya Meta |
| Utility di luar active window | Gunakan current Indonesia utility rate |
| Authentication | Gunakan current Indonesia authentication rate |
| Marketing | Gunakan current Indonesia marketing rate |
| Qualifying 72-hour free entry point | Tidak dikenai biaya selama window berlaku |

Jangan memakai artikel lama tentang “1.000 free conversations” sebagai dasar
budget. Pricing page resmi saat ini menjelaskan pricing per message dan free
window berdasarkan kategori, bukan entitlement Free Money Flow.

## 4. Volume Tiers Meta

Meta menyediakan volume tiers untuk utility dan authentication. Discount dapat
bergantung pada pasangan market–category dan hanya berlaku pada volume dalam
tier terkait.

Implikasi:

- jangan mengasumsikan seluruh volume memperoleh rate tier tertinggi;
- cost estimator harus menghitung marginal tier, bukan `total × cheapest rate`;
- marketing tidak boleh diasumsikan mendapat utility/authentication discount;
- volume tier Meta tidak mengubah membership quota user;
- rekonsiliasi invoice tetap diperlukan karena provider adalah sumber final.

## 5. Kirimdev

Kirimdev adalah platform/BSP yang dapat menjadi lapisan di atas WhatsApp
Business Platform. Menggunakannya adalah pilihan arsitektur; implementasi saat
ini mengirim langsung ke Meta Graph API dan tidak otomatis membutuhkan Kirimdev.

### 5.1 Harga yang Ditampilkan pada 1 September 2026

| Plan Kirimdev | Harga bulanan | Broadcast/bulan | Message/bulan | WhatsApp account | Member | History | Storage |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| Starter | Rp25.000 | 2.000 | 200.000 | 1 | 5 | 90 hari | 500 MB |
| Pro | Rp149.000 | 10.000 | 500.000 | 7 | 10 | 365 hari | 2 GB |
| Business | Rp199.000 | 50.000 | 1.000.000 | 10 | 20 | 365 hari | 5 GB |

Kirimdev menyebut tersedia add-on Extra WhatsApp Number, tetapi harga add-on
tidak ditampilkan pada halaman pricing saat review. Verifikasi langsung sebelum
membuat proyeksi.

### 5.2 Biaya Kirimdev dan Meta Terpisah

Menurut halaman Kirimdev:

- subscription adalah biaya software Kirimdev;
- balasan dalam customer service window mengikuti ketentuan gratis Meta;
- template marketing, utility, atau authentication yang billable ditagih Meta
  langsung ke akun WhatsApp Business;
- quota message/broadcast Kirimdev adalah platform limit, bukan pengganti biaya
  Meta.

Dengan demikian:

```text
Invoice/biaya efektif jika memakai Kirimdev
= subscription Kirimdev
+ Meta delivered template charges pada WABA
+ AI dan infrastructure Money Flow
```

### 5.3 “WhatsApp Account” Bukan Linked Number User

Satu WhatsApp account pada plan Kirimdev berarti satu akun/nomor bisnis pengirim
yang terhubung ke platform Kirimdev. Nomor WhatsApp user Money Flow pada PRD
v1.5 adalah recipient identity yang mengirim chat ke nomor bot.

Akibatnya:

- Free user dengan satu nomor tidak memakai satu slot WhatsApp account Kirimdev;
- Pro user dengan tiga nomor juga tidak memakai tiga slot sender account;
- satu sender bot Money Flow dapat melayani banyak recipient user;
- slot tambahan diperlukan jika Money Flow mengoperasikan lebih dari satu nomor
  bisnis pengirim, brand, tenant, atau WABA sesuai arsitektur provider.

## 6. Apakah 100 Chat Free Benar-Benar Gratis?

### Skenario A — Direct Meta, User-Initiated

```text
100 inbound chat action
100 normal service reply dalam masing-masing 24-hour window
0 proactive template
```

Estimated Meta variable message cost berdasarkan kebijakan saat review: nol.
Money Flow tetap menanggung AI parser, voice transcription, database, queue,
storage, logging, dan hosting.

### Skenario B — Menggunakan Kirimdev Starter

Flow message yang sama dapat tidak menimbulkan variable Meta charge, tetapi
Money Flow tetap membayar minimum subscription Kirimdev Rp25.000/bulan pada
harga yang ditampilkan saat review.

### Skenario C — Daily Reminder Free User

Jika reminder dikirim saat tidak ada active customer service window, utility
template dapat billable. Karena itu Free v1.7 menetapkan proactive billable
quota `0`. Web Push dipakai sebagai alternatif tanpa biaya template WhatsApp.

### Skenario D — Multi-Number Pro

Satu reminder yang dikirim ke tiga nomor adalah tiga delivery terpisah. Jika
billable, estimasi dasarnya:

```text
3 × current market/category unit rate
```

Karena itu notifikasi nomor tambahan harus opt-in dan mengonsumsi proactive
quota per destination.

## 7. Rumus Estimasi

```text
MetaCost = Σ deliveredMessages(market, category, tier, window)
           × applicableUnitRate

ProviderCost = subscription
             + add-ons
             + overage, jika ada

AiCost = textParseTokens
       + transcriptionMinutes
       + retries yang tidak ditanggung provider

TotalCost = MetaCost + ProviderCost + AiCost + InfrastructureCost
```

Simpan estimated cost saat enqueue dan reconciled cost setelah status/invoice.
Jangan menampilkan estimasi sebagai invoice final.

## 8. Rekomendasi Kebijakan Money Flow

### Free

- satu linked number;
- 100 inbound chat action per bulan;
- maksimal 300 service replies dalam active window;
- 10 menit voice note;
- nol proactive delivery yang diperkirakan billable;
- Web Push untuk reminder;
- fallback rule parser bila AI budget habis.

### Plus

- dua linked number;
- 1.000 chat action;
- 30 proactive billable delivery per bulan;
- proactive destination hanya primary number;
- warning sebelum quota/budget habis.

### Pro

- tiga linked number;
- 5.000 chat action;
- 150 proactive billable delivery per bulan;
- nomor tambahan opt-in;
- tidak unlimited dan tetap tunduk pada global budget/quality guard.

Angka Plus/Pro harus divalidasi melalui beta unit economics sebelum harga
membership dikunci.

## 9. Cost Guard Wajib

| Guard | Ketentuan |
| --- | --- |
| Per-user quota | Reserve sebelum send, settle saat delivered |
| Per-plan budget | Sponsored delivery tidak melewati budget plan |
| Daily global budget | Pause proactive queue saat threshold tercapai |
| Monthly global budget | Kill switch proactive, inbound service tetap aktif |
| Unknown rate | Block Free; gunakan safe maximum atau block paid |
| Category drift | Block template yang berubah/reclassified sampai direview |
| Currency drift | Simpan billing currency dan rate conversion timestamp |
| Multi-number | Charge quota per destination, bukan per logical event |

## 10. Review Checklist

Lakukan sebelum production launch dan minimal setiap bulan:

1. Buka official WhatsApp pricing page.
2. Pilih Indonesia dan currency billing WABA.
3. Rekam rate setiap category dan effective date.
4. Verifikasi free service/utility window dan 72-hour entry-point policy.
5. Cek volume tier dan threshold terbaru.
6. Cek invoice/billing settings WABA.
7. Jika memakai Kirimdev, cek plan, add-on, overage, dan terms terbaru.
8. Update rate registry serta cost estimator.
9. Jalankan simulation untuk Free, Plus, Pro, dan multi-number.
10. Pastikan global kill switch dan alert budget bekerja.

Perubahan pricing harus menghasilkan change record dan review entitlement. Jangan
langsung mengubah quota user tanpa melihat usage distribution dan margin.

## 11. Concern Tambahan

- Meta dapat mengubah rate atau policy; snapshot dokumen bisa kedaluwarsa.
- Category template dapat direklasifikasi dan mengubah biaya.
- Quality rating atau user feedback dapat membatasi delivery walaupun budget ada.
- AI/transcription dapat menjadi biaya lebih besar daripada message delivery
  untuk bot finansial yang aktif.
- Kirimdev menambah fixed cost, tetapi dapat memberi operational tooling; nilai
  tersebut harus dibandingkan dengan direct Meta integration yang sudah ada.
- Pajak, FX, dan cara invoice WABA dapat membuat nilai IDR berbeda dari rate
  display.
- Retry yang tidak idempotent dapat membuat delivery dan biaya ganda.
- Multi-number notification dapat mengalikan biaya per user.

## 12. Sumber dan Status Verifikasi

| Sumber | Dipakai untuk | Status 1 Sep 2026 |
| --- | --- | --- |
| [WhatsApp Business Platform Pricing](https://whatsappbusiness.com/products/platform-pricing/) | Per-message delivered, category/market, free windows, volume tier | Official, primary |
| [WhatsApp Service Messages](https://whatsappbusiness.com/products/conversation-categories/service/) | Definisi service message | Official, primary |
| [Kirimdev Pricing](https://kirimdev.com/#pricing) | Subscription dan platform quota | Official provider source |

Jika isi dokumen berbeda dengan halaman official terbaru atau invoice provider,
gunakan sumber official terbaru dan perbarui dokumen beserta tanggal verifikasi.
