# Product Requirements Document — Money Flow v1.1

## Cinematic Theme & Experience Refresh

**Versi:** 1.1  
**Status:** Proposed  
**Terakhir diperbarui:** Agustus 2026  
**Berdasarkan:** Money Flow v1, v1.2, dan v1.3
**Cakupan:** Frontend web/PWA, design system, visualisasi data, dan motion

---

## 1. Ringkasan

Money Flow v1.1 memperbarui keseluruhan pengalaman visual menjadi financial
tracker yang premium, ekspresif, dan terasa hidup tanpa mengurangi kejelasan
data. Arah desain diberi nama **Cinematic Financial Calm**: antarmuka memiliki
kedalaman, pencahayaan lembut, permukaan berlapis, dan motion tiga dimensi yang
terukur, sementara nominal, status anggaran, dan tindakan finansial tetap
menjadi fokus utama.

Rilis ini menyediakan dua tema setara:

- **Dawn Ledger** — tema terang yang bersih, hangat, dan optimistis.
- **Midnight Treasury** — tema gelap yang tenang, dalam, dan nyaman untuk
  penggunaan malam hari.

Tema tidak sekadar membalik warna. Masing-masing memiliki pencahayaan,
elevasi, bayangan, warna chart, dan intensitas efek yang dirancang khusus.

Rilis v1.1 tidak mengubah logika bisnis, API, atau struktur database. Semua
fitur yang sudah ada—dashboard, transaksi, analitik, budget, utang/piutang,
recurring, import, pengaturan, dan WhatsApp—mendapat lapisan visual baru yang
konsisten.

---

## 2. Latar Belakang

Money Flow saat ini fungsional dan mudah digunakan, tetapi bahasa visualnya
masih menyerupai dashboard administratif umum. Ringkasan finansial belum
memiliki hierarki emosional yang kuat, grafik belum terasa sebagai satu cerita,
dan transisi antarkondisi masih minim.

Financial tracker digunakan berulang kali untuk aktivitas singkat. Pengalaman
yang terasa tenang, cepat, dan menyenangkan dapat membuat pengguna lebih betah
mencatat transaksi tanpa mengubah aplikasi menjadi produk hiburan.

### Permasalahan yang diselesaikan

| Masalah                                                      | Dampak saat ini                                 | Respons v1.1                                                |
| ------------------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------- |
| Semua card memiliki bobot visual serupa                      | Saldo dan insight utama tidak langsung terlihat | Hierarki permukaan dan hero finansial                       |
| Dark mode hanya mengganti token warna dasar                  | Terasa datar dan kurang dirancang               | Palet, glow, chart, dan elevation khusus dark               |
| Perubahan data terasa mendadak                               | Interaksi kurang memberi umpan balik            | Motion semantik dan transisi angka                          |
| Grafik berdiri sendiri                                       | Pengguna harus menyimpulkan cerita data         | Narasi visual, annotation, dan tooltip kontekstual          |
| Loading dan empty state generik                              | Produk terasa belum matang                      | Skeleton, empty state, dan recovery state tematik           |
| Visual desktop dan mobile kurang memiliki karakter yang sama | Pengalaman PWA tidak terasa native              | Sistem responsif dan motion berdasarkan kemampuan perangkat |

---

## 3. Visi Produk

> Setiap kali Money Flow dibuka, pengguna langsung merasa memahami keadaan
> uangnya—dengan tenang, percaya diri, dan tanpa perlu membaca seluruh layar.

### Sasaran

1. Membuat kondisi finansial utama dapat dipahami dalam lima detik.
2. Memberi karakter premium yang tetap relevan untuk personal finance.
3. Menyediakan kualitas visual dan keterbacaan yang setara pada light dan dark.
4. Menggunakan motion untuk menjelaskan hubungan, perubahan, dan keberhasilan.
5. Menjaga pengalaman mulus pada perangkat mobile kelas menengah.
6. Membentuk design system reusable untuk pengembangan Money Flow berikutnya.

### Prinsip desain

1. **Clarity before spectacle** — nominal dan tindakan selalu lebih dominan
   daripada dekorasi.
2. **Depth with purpose** — elevasi menunjukkan hierarki atau interaksi, bukan
   sekadar membuat semua elemen melayang.
3. **Motion explains change** — gerakan muncul karena aksi pengguna atau
   perubahan state.
4. **Calm confidence** — visual terasa mapan, tidak agresif seperti aplikasi
   trading dan tidak riuh seperti gim.
5. **Premium, not exclusive** — tetap ramah bagi pengguna baru yang sedang
   belajar mengelola keuangan.
6. **Accessible by default** — warna bukan satu-satunya pembeda; motion dapat
   dikurangi; angka selalu terbaca.

---

## 4. Target Pengguna dan Jobs to Be Done

| Pengguna                 | Kebutuhan                                        | Ekspektasi pengalaman                                 |
| ------------------------ | ------------------------------------------------ | ----------------------------------------------------- |
| Pencatat keuangan pemula | Mengetahui saldo dan pengeluaran tanpa kewalahan | Ringkas, ramah, tidak menghakimi                      |
| Pengguna rutin           | Mencatat transaksi secepat mungkin               | Interaksi cepat dan feedback instan                   |
| Budget-conscious user    | Melihat apakah pengeluaran masih aman            | Status jelas tanpa hanya mengandalkan warna           |
| Pengguna mobile/PWA      | Menggunakan aplikasi beberapa kali sehari        | Navigasi native-feeling dan tap target nyaman         |
| Pengguna analitik        | Memahami tren dan kategori dominan               | Chart presisi, tooltip informatif, perbandingan jelas |
| Pengguna malam hari      | Mencatat tanpa silau                             | Dark theme dalam, kontras aman, tanpa glow berlebihan |

---

## 5. Identitas Visual

### 5.1 Konsep: Flow of Value

Elemen visual utama terinspirasi dari aliran nilai, lapisan ledger, dan bentuk
orbit yang melambangkan siklus pemasukan, pengeluaran, tabungan, dan rencana.
Kurva lembut digunakan untuk aliran; grid presisi digunakan untuk data.

Karakter visual:

- permukaan bersih dengan gradasi sangat halus;
- sudut membulat yang matang, bukan bubble berlebihan;
- highlight seperti cahaya yang menyapu permukaan kaca matte;
- garis kontur dan grid tipis pada area analitik;
- depth bertingkat maksimal tiga lapisan dalam satu viewport;
- ikon outline konsisten dengan ketebalan optis yang seragam;
- angka menggunakan tabular numerals agar nominal tidak bergeser.

### 5.2 Logo dan motif

Logo tetap mempertahankan identitas Money Flow. Motif pendukung berupa dua
garis aliran yang saling mengimbangi, digunakan sangat halus pada:

- background hero dashboard;
- empty state;
- splash/install screen PWA;
- skeleton chart;
- halaman autentikasi.

Motif tidak boleh berada di belakang teks utama dengan opacity lebih dari 8%.

### 5.3 Playful warmth — Flow Buddy

Money Flow memiliki companion visual kecil bernama **Flow Buddy**, berbentuk
soft-square orb dengan ekspresi `• ᴗ •`. Karakternya hadir sebagai aksen hangat,
bukan maskot yang mengambil alih produk.

Flow Buddy dapat muncul pada:

- sapaan dashboard dan autentikasi;
- empty state yang membutuhkan dorongan positif;
- panel bantuan singkat di sidebar;
- status koneksi atau pencapaian yang aman dirayakan.

Microcopy boleh terasa ringan dan lucu, misalnya “Dompet kecilnya masih santai”
atau “Pelan-pelan, uangmu mulai lebih tertata”, tetapi dilarang bercanda pada
saldo negatif, utang jatuh tempo, kegagalan pembayaran, error keamanan, dan
aksi destruktif. Flow Buddy tidak bergerak terus-menerus dan tetap dekoratif
bagi screen reader kecuali membawa informasi yang benar-benar bermakna.

---

## 6. Sistem Tema

### 6.1 Mode tema

Pengguna dapat memilih:

- **Terang** — selalu Dawn Ledger;
- **Gelap** — selalu Midnight Treasury;
- **Sistem** — mengikuti `prefers-color-scheme` secara real-time.

Pilihan disimpan di perangkat. Tema harus diterapkan sebelum first paint agar
tidak terjadi kilatan light theme saat pengguna memilih dark theme.

### 6.2 Dawn Ledger — light theme

Tema terang menggunakan canvas dingin yang sangat lembut, surface putih, tinta
navy, primary indigo, dan aksen emerald. Bayangan memiliki sedikit bias biru
agar terlihat bersih.

| Token semantik   |              Nilai awal | Penggunaan                         |
| ---------------- | ----------------------: | ---------------------------------- |
| `canvas`         |               `#F5F7FC` | Background aplikasi                |
| `canvas-subtle`  |               `#EEF2FF` | Ambient gradient dan selected zone |
| `surface`        |               `#FFFFFF` | Card dan form utama                |
| `surface-raised` |               `#FAFBFF` | Card bertingkat dan popover        |
| `surface-glass`  | `rgba(255,255,255,.76)` | Header/sidebar translucent         |
| `text-primary`   |               `#101828` | Judul dan nominal utama            |
| `text-secondary` |               `#475467` | Deskripsi                          |
| `text-muted`     |               `#667085` | Metadata                           |
| `border`         |               `#E4E7EC` | Pemisah standar                    |
| `border-strong`  |               `#CDD5DF` | Input aktif dan tabel              |
| `brand`          |               `#4F46E5` | CTA utama                          |
| `brand-hover`    |               `#4338CA` | Hover CTA                          |
| `brand-soft`     |               `#EEF2FF` | Latar aksen                        |
| `income`         |               `#047857` | Pemasukan                          |
| `income-soft`    |               `#D1FAE5` | Latar pemasukan                    |
| `expense`        |               `#C2415A` | Pengeluaran                        |
| `expense-soft`   |               `#FFE4E9` | Latar pengeluaran                  |
| `warning`        |               `#B45309` | Budget mendekati batas             |
| `danger`         |               `#B42318` | Aksi destruktif dan over budget    |
| `info`           |               `#0369A1` | Informasi sistem                   |

Ambient background menggunakan kombinasi radial gradient indigo, cyan, dan
mint dengan opacity maksimum 12%. Area baca utama tetap solid.

### 6.3 Midnight Treasury — dark theme

Tema gelap menggunakan navy hampir hitam, bukan hitam murni. Permukaan terangkat
melalui luminance, border, dan ambient glow yang terkontrol. Teks putih murni
dibatasi untuk angka atau judul penting agar mata tidak cepat lelah.

| Token semantik   |           Nilai awal | Penggunaan                      |
| ---------------- | -------------------: | ------------------------------- |
| `canvas`         |            `#080B14` | Background aplikasi             |
| `canvas-subtle`  |            `#0D1220` | Area sekunder                   |
| `surface`        |            `#101625` | Card dan form                   |
| `surface-raised` |            `#161E30` | Popover/modal                   |
| `surface-glass`  | `rgba(16,22,37,.78)` | Header/sidebar translucent      |
| `text-primary`   |            `#F5F7FF` | Judul dan nominal utama         |
| `text-secondary` |            `#CBD5E1` | Deskripsi                       |
| `text-muted`     |            `#94A3B8` | Metadata                        |
| `border`         |            `#273149` | Pemisah standar                 |
| `border-strong`  |            `#3A4661` | Input aktif dan tabel           |
| `brand`          |            `#818CF8` | CTA utama                       |
| `brand-hover`    |            `#A5B4FC` | Hover CTA                       |
| `brand-soft`     |            `#202653` | Latar aksen                     |
| `income`         |            `#34D399` | Pemasukan                       |
| `income-soft`    |            `#103A32` | Latar pemasukan                 |
| `expense`        |            `#FB7185` | Pengeluaran                     |
| `expense-soft`   |            `#451B2A` | Latar pengeluaran               |
| `warning`        |            `#FBBF24` | Budget mendekati batas          |
| `danger`         |            `#FDA29B` | Aksi destruktif dan over budget |
| `info`           |            `#38BDF8` | Informasi sistem                |

Glow hanya boleh muncul pada elemen aktif atau hero. Blur maksimum 48px dan
opacity maksimum 18%. Tabel, modal, dan form tidak menggunakan glow.

### 6.4 Theme transition

Pada browser yang mendukung View Transitions API, pergantian tema memakai
soft radial reveal selama 320ms yang berpusat dari tombol theme toggle. Browser
lain menggunakan crossfade token 180ms. Tidak boleh ada flash atau layout shift.

Jika `prefers-reduced-motion: reduce`, tema berubah langsung tanpa reveal.

---

## 7. Typography dan Format Angka

### 7.1 Tipografi

Geist tetap menjadi font utama untuk menghindari biaya migrasi dan menjaga
performa. Hirarki diperbarui sebagai berikut:

| Role            | Desktop |  Mobile |  Weight | Line height |
| --------------- | ------: | ------: | ------: | ----------: |
| Display balance | 44–56px | 34–40px | 650–700 |        1.05 |
| Page title      | 28–32px | 24–28px |     650 |         1.2 |
| Section title   | 18–20px | 17–18px |     600 |         1.3 |
| Card value      | 24–30px | 22–26px |     650 |        1.15 |
| Body            | 14–16px | 15–16px |     400 |        1.55 |
| Label/meta      | 12–14px | 12–14px |     500 |         1.4 |

Nominal menggunakan `font-variant-numeric: tabular-nums lining-nums`. Angka
tidak dipadatkan sampai kehilangan makna. Compact notation (`1,2 jt`) hanya
digunakan pada axis chart sempit; nilai utama tetap lengkap.

### 7.2 Bahasa visual nominal

- Pemasukan selalu memiliki tanda `+`, label, atau ikon—bukan warna saja.
- Pengeluaran selalu memiliki tanda `−`, label, atau ikon.
- Saldo negatif ditampilkan jelas tanpa animasi alarm atau efek berkedip.
- Nilai kosong ditampilkan sebagai `Rp0`, bukan `—`, jika bermakna nol.
- Nilai belum tersedia menggunakan `—` dengan keterangan yang dapat dipahami.
- Perubahan persentase selalu menyebut periode pembanding.

---

## 8. Grid, Spacing, dan Responsivitas

### 8.1 Grid

- Desktop ≥1280px: 12 kolom, max content width 1440px.
- Laptop 1024–1279px: 12 kolom dengan sidebar compact.
- Tablet 768–1023px: 8 kolom.
- Mobile <768px: 4 kolom, single-column reading flow.
- Jarak horizontal mobile minimum 16px; desktop 24–32px.
- Spacing memakai skala 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px.

### 8.2 Radius dan elevasi

| Elemen             |  Radius | Elevasi           |
| ------------------ | ------: | ----------------- |
| Input/button kecil | 10–12px | Flat atau level 1 |
| Card standar       |    16px | Level 1           |
| Card hero          | 22–24px | Level 2           |
| Modal/drawer       |    24px | Level 3           |
| Pill/badge         |   999px | Flat              |

Maksimal tiga tingkat depth terlihat bersamaan. Nested card memakai perbedaan
luminance atau border; tidak setiap lapisan membutuhkan shadow.

### 8.3 Mobile

- Bottom navigation selalu mempertimbangkan safe area.
- FAB tambah transaksi berada di zona jangkauan ibu jari dan tidak menutup data.
- Tabel transaksi berubah menjadi transaction ledger cards, bukan tabel yang
  dipaksa horizontal scroll.
- Hover-only interaction wajib memiliki padanan tap/focus.
- Efek pointer parallax dinonaktifkan pada perangkat touch.

---

## 9. Motion System

Motion Money Flow disebut **Measured Momentum**. Semua gerakan terasa memiliki
bobot, berhenti dengan lembut, dan tidak terus berjalan tanpa alasan.

### 9.1 Motion token

| Token        | Durasi | Easing                    | Penggunaan                 |
| ------------ | -----: | ------------------------- | -------------------------- |
| `instant`    |  100ms | ease-out                  | Press/tap feedback         |
| `fast`       |  160ms | ease-out                  | Hover, focus, tooltip      |
| `standard`   |  240ms | cubic-bezier(.2,.8,.2,1)  | Card, drawer kecil         |
| `expressive` |  420ms | cubic-bezier(.16,1,.3,1)  | Hero dan chart entrance    |
| `narrative`  |  600ms | cubic-bezier(.22,1,.36,1) | Sequence dashboard pertama |

Gerakan berulang tanpa input pengguna dilarang, kecuali progress/loading yang
sedang berlangsung. Tidak ada marquee, floating loop, atau pulse permanen.

### 9.2 Efek 3D yang diizinkan

#### Balance Vault Card

Hero dashboard memiliki konstruksi tiga lapis:

1. ambient halo di belakang card;
2. card utama dengan gradient mesh lembut;
3. ledger plane tipis di belakang yang bergerak berlawanan secara halus.

Pada desktop dengan pointer presisi, card dapat tilt maksimal `3deg`, translate
maksimal `6px`, dan highlight mengikuti pointer. Saat pointer keluar, card
kembali dengan spring lembut. Nominal tidak berubah perspektif lebih dari
`1deg` agar tetap mudah dibaca.

Pada mobile, card tidak mengikuti gerakan gyroscope. Entrance hanya berupa
translate Y 8px, scale 0.99 ke 1, dan fade.

#### Layered Cashflow Ribbon

Grafik arus kas dapat memiliki dua layer garis: garis data utama dan soft depth
shadow dengan offset 2–3px. Saat periode berubah, garis lama mereda dan garis
baru terbentuk dari kiri ke kanan. Animasi tidak memanipulasi nilai atau axis.

#### Budget Rings

Progress budget memakai ring berlapis dengan inner bevel tipis. Fill bergerak
satu kali saat masuk viewport. Status warning dan over-budget berubah melalui
warna, label, ikon, dan pola ring; tidak memakai pulse terus-menerus.

#### Transaction Lift

Pada desktop, row transaksi naik maksimal 2px saat hover dan menampilkan accent
rail di sisi kiri. Pada mobile, tap memberi press depth 1px selama 100ms.

#### Success Ripple

Saat transaksi berhasil disimpan, tombol membentuk ripple lembut lalu nominal
baru melakukan count transition. Tidak ada confetti, hujan koin, atau suara.

### 9.3 Choreography dashboard

Ketika dashboard pertama kali dimuat:

1. shell dan navigation tampil tanpa menunggu chart;
2. balance hero masuk selama 420ms;
3. summary metrics menyusul dengan stagger maksimal 40ms per card;
4. chart menggambar setelah layout stabil;
5. recent transactions fade-in sebagai satu grup.

Total choreography tidak boleh membuat konten utama tertunda lebih dari 700ms.
Navigasi kembali ke dashboard dalam sesi yang sama tidak mengulang seluruh
sequence; hanya data yang berubah yang bertransisi.

### 9.4 Route dan state transition

- Pergantian halaman: fade 0→1 dan translate Y 6→0 selama 220ms.
- Modal: backdrop fade 160ms, panel scale .985→1 selama 240ms.
- Drawer mobile: spring singkat tanpa overshoot lebih dari 4px.
- Filter data: hasil memakai crossfade; header/tombol tidak ikut bergeser.
- Skeleton ke content: dissolve tanpa menampilkan dua versi angka bersamaan.
- Toast: slide-in maksimal 12px, auto-dismiss dengan progress non-distracting.

### 9.5 Reduced motion

Jika `prefers-reduced-motion: reduce`:

- parallax, tilt, chart draw, stagger, dan count-up dimatikan;
- perubahan state menggunakan fade maksimum 100ms atau langsung;
- loading memakai progress statis atau opacity sederhana;
- tidak ada informasi yang hilang karena animasi dinonaktifkan.

---

## 10. Spesifikasi Pengalaman per Area

### 10.1 App Shell

| ID       | Requirement                                                             |
| -------- | ----------------------------------------------------------------------- |
| SHELL-01 | Canvas memiliki ambient gradient statis yang berbeda per tema           |
| SHELL-02 | Sidebar memakai glass matte dengan border kontras aman                  |
| SHELL-03 | Item aktif memiliki indicator rail, icon container, dan label           |
| SHELL-04 | Header sticky tetap terbaca di atas chart dan modal                     |
| SHELL-05 | Mobile bottom nav memiliki selected island tanpa mengubah ukuran layout |
| SHELL-06 | FAB memiliki depth dan press response, tanpa bobbing animation          |
| SHELL-07 | Semua navigation state terlihat pada hover, active, dan keyboard focus  |

### 10.2 Dashboard

Dashboard menjadi financial cockpit yang tenang dengan urutan informasi:

1. saldo dan periode aktif;
2. pemasukan, pengeluaran, dan net flow;
3. tren enam bulan;
4. distribusi kategori dan status budget;
5. transaksi terbaru dan insight.

| ID        | Requirement                                                            |
| --------- | ---------------------------------------------------------------------- |
| DASH-V-01 | Balance Vault Card menjadi focal point pertama                         |
| DASH-V-02 | Income dan expense tidak hanya dibedakan warna, tetapi juga ikon/label |
| DASH-V-03 | Grafik memiliki tooltip terformat, focus state, dan summary teks       |
| DASH-V-04 | Card dapat direflow tanpa kehilangan urutan informasi di mobile        |
| DASH-V-05 | Empty dashboard memberi satu CTA jelas untuk transaksi pertama         |
| DASH-V-06 | Angka baru bertransisi tanpa flash atau perubahan lebar karakter       |
| DASH-V-07 | Decorative depth tidak boleh menutupi axis, legend, atau tooltip       |

### 10.3 Transactions

- Desktop menggunakan ledger table dengan sticky header dan density nyaman.
- Mobile menggunakan card per transaksi dengan nominal sebagai anchor visual.
- Filter aktif muncul sebagai removable chips.
- Bulk action muncul sebagai contextual action bar, bukan memindahkan header.
- Add/edit transaction menggunakan modal desktop dan bottom sheet mobile.
- Delete tetap tenang tetapi eksplisit: tindakan destruktif tidak diberi motion
  menyenangkan yang dapat mengecilkan konsekuensi.

### 10.4 Analytics

- Setiap chart memiliki judul berupa pertanyaan yang dijawab, misalnya
  “Ke mana pengeluaranmu mengalir bulan ini?”
- Tooltip menjelaskan nilai, persentase, dan periode.
- Selected data point dapat dipertahankan lewat keyboard atau tap.
- Chart palette memiliki versi light/dark dan aman untuk color-vision deficiency.
- Insight card memakai editorial hierarchy: finding, evidence, next action.
- Dekorasi 3D hanya pada container, bukan batang/pie yang dapat mendistorsi skala.

### 10.5 Budget

- Overview menampilkan status **Aman**, **Mendekati batas**, atau **Terlewati**.
- Budget ring menggunakan label numerik dan sisa nominal.
- Over budget tidak membuat seluruh layar merah.
- Copy budget dan edit limit diberi preview dampak sebelum konfirmasi.
- Motion ring hanya berjalan saat nilai pertama kali terlihat atau benar-benar
  berubah setelah transaksi.

### 10.6 Utang dan Piutang

- Dua arah hubungan dipisahkan dengan copy yang eksplisit: “Kamu berutang” dan
  “Mereka berutang kepadamu”.
- Status jatuh tempo mendapat indicator waktu, bukan hanya warna.
- Penyelesaian utang memakai motion penutupan ledger yang lembut, lalu item
  berpindah ke riwayat.
- Tidak ada ilustrasi atau bahasa yang mempermalukan pengguna.

### 10.7 Recurring Transactions

- Jadwal divisualkan sebagai timeline ringan.
- Transaksi berikutnya lebih dominan daripada riwayat.
- Pause/resume menggunakan state transition yang jelas dan reversible.
- Frekuensi dan tanggal selalu tampil sebagai teks, tidak hanya ikon.

### 10.8 Import dan OCR

- Dropzone menyerupai scan surface dengan frame empat sudut.
- Saat OCR aktif, sweep line boleh bergerak satu arah dengan opacity rendah.
- Progress nyata harus ditampilkan; animasi tidak boleh memberi kesan proses
  lebih cepat dari kondisi sebenarnya.
- Hasil ekstraksi muncul sebagai document layer yang terangkat dari preview.
- Confidence rendah mendapat penjelasan dan highlight field yang perlu ditinjau.

### 10.9 Settings dan WhatsApp

- Pengaturan dikelompokkan sebagai cards sederhana, tanpa ambient effect berat.
- Status WhatsApp menggunakan tiga state: Belum terhubung, Menunggu verifikasi,
  dan Terhubung.
- State Terhubung memiliki secure-link visual dan waktu koneksi.
- Membuat link menampilkan expiry dengan countdown teks; animasi countdown
  dibatasi pada progress bar yang lembut.
- Notification toggle menjelaskan pemicu dan kanal sebelum diaktifkan.

### 10.10 Auth dan Onboarding

- Desktop menggunakan split composition: form solid dan atmospheric financial
  canvas yang tidak menampilkan data palsu berlebihan.
- Mobile memprioritaskan form dalam satu kolom.
- Password/error state tidak mengguncang seluruh form; gunakan inline feedback.
- Onboarding pertama menjelaskan tiga aksi: catat, pahami, rencanakan.

---

## 11. Komponen Design System

### 11.1 Fondasi

| Grup       | Token/komponen                                                         |
| ---------- | ---------------------------------------------------------------------- |
| Color      | canvas, surface, text, border, brand, income, expense, warning, danger |
| Typography | display, heading, body, label, numeric                                 |
| Space      | 4–64px scale                                                           |
| Shape      | radius, border width, icon size                                        |
| Depth      | surface level 0–3, shadow, highlight, ambient glow                     |
| Motion     | duration, easing, distance, spring, reduced-motion behavior            |
| Data viz   | categorical palette, grid, axis, tooltip, selection                    |

### 11.2 Komponen wajib

- Button: primary, secondary, ghost, danger, icon-only.
- Input: text, currency, date, select, textarea, search.
- Card: standard, metric, hero, interactive, inset.
- Badge/status: neutral, success, warning, danger, info.
- Tooltip/popover/dropdown.
- Modal desktop dan bottom sheet mobile.
- Toast dan inline alert.
- Tabs dan segmented control.
- Filter chip dan date range control.
- Skeleton berdasarkan bentuk konten.
- Empty, error, offline, dan permission state.
- Chart frame, legend, tooltip, annotation, dan accessible summary.
- Numeric transition yang menghormati reduced motion.
- Three-dimensional tilt wrapper yang hanya aktif pada pointer presisi.

Setiap komponen harus memiliki state default, hover, pressed, focus-visible,
disabled, loading, error, dan dark-mode bila relevan.

---

## 12. Accessibility

| ID      | Acceptance criteria                                               |
| ------- | ----------------------------------------------------------------- |
| A11Y-01 | Teks normal memenuhi WCAG 2.2 AA minimal 4.5:1                    |
| A11Y-02 | Teks besar dan elemen non-text penting memenuhi minimal 3:1       |
| A11Y-03 | Seluruh aplikasi dapat digunakan dengan keyboard                  |
| A11Y-04 | Focus ring terlihat pada kedua tema dan tidak tertutup overflow   |
| A11Y-05 | Tap target utama minimal 44×44px                                  |
| A11Y-06 | Warna bukan satu-satunya penanda income/expense/status            |
| A11Y-07 | Chart memiliki summary teks atau data table yang setara           |
| A11Y-08 | Screen reader mendapat announcement untuk save/error penting      |
| A11Y-09 | Zoom 200% tidak menghilangkan aksi atau memicu horizontal scroll  |
| A11Y-10 | `prefers-reduced-motion` mematikan seluruh motion non-esensial    |
| A11Y-11 | Theme control memiliki nama state yang dapat dibaca screen reader |
| A11Y-12 | Modal mengunci focus dan mengembalikan focus saat ditutup         |

---

## 13. Performa dan Batas Efek

Visual premium tidak boleh mengorbankan respons aplikasi.

| Metrik                                   |                                Target |
| ---------------------------------------- | ------------------------------------: |
| Lighthouse Performance mobile            |            ≥ 90 pada build production |
| Largest Contentful Paint                 | ≤ 2.5 detik pada jaringan 4G simulasi |
| Cumulative Layout Shift                  |                                 ≤ 0.1 |
| Interaction to Next Paint                |                               ≤ 200ms |
| Route transition setelah bundle tersedia |                               ≤ 300ms |
| Animasi transform/opacity                |                          target 60fps |
| Tambahan JavaScript motion gzip          |                                ≤ 35KB |

Aturan implementasi:

- Gunakan `transform` dan `opacity` untuk motion utama.
- Hindari animasi `box-shadow`, blur besar, width, height, top, dan left.
- Maksimal dua area backdrop blur besar per viewport.
- Pointer tracking dijadwalkan melalui `requestAnimationFrame`.
- Tilt/parallax tidak diinisialisasi pada touch atau reduced-motion.
- Chart di bawah fold boleh lazy-load.
- Decorative asset memakai SVG/CSS; raster besar harus dioptimalkan.
- Data dan action tidak menunggu library animasi selesai dimuat.

---

## 14. Arsitektur Frontend yang Direkomendasikan

Stack tetap menggunakan Next.js 16, React 19, Tailwind CSS 4, Recharts, dan
Zustand. Tidak ada perubahan backend.

Struktur yang disarankan:

```text
apps/web/
├── app/
│   └── globals.css                  # semantic theme tokens
├── components/
│   ├── motion/
│   │   ├── MotionProvider.tsx
│   │   ├── PageTransition.tsx
│   │   ├── TiltSurface.tsx
│   │   └── NumericTransition.tsx
│   ├── visualization/
│   │   ├── ChartFrame.tsx
│   │   ├── ChartTooltip.tsx
│   │   └── AccessibleChartSummary.tsx
│   └── ui/
│       ├── surface.tsx
│       ├── status.tsx
│       ├── skeleton.tsx
│       └── toast.tsx
├── hooks/
│   ├── useReducedMotion.ts
│   └── usePointerTilt.ts
└── lib/
    ├── design-tokens.ts
    └── motion.ts
```

Library motion dapat ditambahkan hanya jika ukuran dan aksesibilitasnya memenuhi
budget. Jika menggunakan Motion for React, fitur harus diimpor secara modular.
Efek dasar tetap memiliki implementasi CSS agar konten tidak bergantung pada
JavaScript.

Theme bootstrap harus berjalan sebelum hydration melalui script kecil di root
layout atau mekanisme setara. Provider bertanggung jawab pada pilihan
`light | dark | system`, sedangkan warna komponen hanya mengonsumsi semantic
tokens—tidak membaca theme secara manual.

---

## 15. Acceptance Criteria Rilis

### Theme

- Light, dark, dan system dapat dipilih serta persisten setelah reload.
- Tidak ada flash tema salah sebelum hydration.
- Seluruh halaman dan state memiliki styling untuk dua tema.
- Browser `theme-color` mengikuti tema aktif.
- Chart, tooltip, scrollbar, modal, dan native form control mengikuti tema.

### Motion

- Balance Vault Card memiliki depth responsif tanpa mengganggu nominal.
- Chart transition tidak mengubah interpretasi data.
- Save transaksi memberikan feedback visual dalam ≤300ms.
- Tidak ada loop dekoratif permanen.
- Reduced-motion mematikan 3D tilt, stagger, count-up, dan chart draw.
- Interaksi tetap lengkap saat JavaScript motion gagal dimuat.

### Responsiveness

- Tidak ada horizontal scrolling pada viewport 320px ke atas.
- Mobile transaction ledger tetap menampilkan tanggal, kategori, dan nominal.
- Bottom navigation/FAB tidak menutupi konten atau safe area.
- Layout teruji pada 320, 375, 390, 768, 1024, 1280, dan 1440px.

### Quality

- Tidak ada regresi pada pembuatan/edit/hapus transaksi.
- Semua CTA utama memiliki loading dan disabled state.
- Error API tidak menghilangkan data yang masih dapat ditampilkan.
- Empty/loading/error/offline state tersedia pada halaman utama.
- Audit WCAG AA dan performance budget lulus sebelum rollout penuh.

---

## 16. Tahapan Implementasi

### Fase 1 — Foundation

- Finalisasi semantic color, typography, spacing, radius, depth, dan motion token.
- Perbaiki theme bootstrap agar bebas flash.
- Refactor primitive button, input, card, modal, badge, dan skeleton.
- Buat katalog state komponen light/dark.

**Exit criteria:** primitive UI stabil, kedua tema lulus contrast audit.

### Fase 2 — Shell dan Core Journey

- App shell, sidebar, header, mobile nav, FAB.
- Dashboard lengkap dengan Balance Vault dan chart frame.
- Transactions desktop/mobile serta add/edit flow.
- Auth dan onboarding.

**Exit criteria:** login → dashboard → tambah transaksi dapat diuji end-to-end.

### Fase 3 — Financial Modules

- Analytics, budget, categories, recurring, debts.
- Import/OCR dan seluruh settings.
- WhatsApp linking dan notification settings.

**Exit criteria:** seluruh route memiliki visual, loading, empty, dan error state.

### Fase 4 — Motion dan Polish

- Page transitions, numeric transition, tilt, chart draw, theme reveal.
- Reduced-motion audit.
- Touch, keyboard, screen reader, dan color-vision testing.
- Performance profiling perangkat mobile kelas menengah.

**Exit criteria:** tidak ada motion blocker, long task, atau kontras kritis.

### Fase 5 — Rollout

- Internal dogfooding.
- Feature flag untuk pengguna development/staging.
- Perbaiki regresi berdasarkan visual QA.
- Rollout bertahap 10% → 50% → 100% jika metrik stabil.

---

## 17. QA Matrix

| Dimensi       | Variasi minimum                                               |
| ------------- | ------------------------------------------------------------- |
| Theme         | Light, dark, system berubah saat app aktif                    |
| Motion        | Normal, reduced motion                                        |
| Input         | Mouse, touch, keyboard                                        |
| Viewport      | 320, 390, 768, 1024, 1440px                                   |
| Data          | Kosong, normal, nominal panjang, saldo negatif, dataset padat |
| Network       | Online cepat, slow 4G, offline, API error                     |
| Browser       | Chrome, Edge, Firefox, Safari/iOS                             |
| PWA           | Browser tab dan installed standalone                          |
| Accessibility | Screen reader, zoom 200%, high contrast                       |

Visual regression snapshot wajib mencakup dashboard, transactions, analytics,
budget, modal transaksi, sidebar, dan bottom navigation pada kedua tema.

---

## 18. Metrik Keberhasilan

| Metrik                                                     | Target setelah 30 hari |
| ---------------------------------------------------------- | ---------------------: |
| Waktu menemukan saldo utama                                |       median < 5 detik |
| Completion rate tambah transaksi                           |             naik ≥ 10% |
| Drop-off form transaksi                                    |            turun ≥ 15% |
| Pengguna yang memilih tema secara eksplisit                |   ≥ 25% pengguna aktif |
| Error frontend terkait layout/theme                        |            < 0.5% sesi |
| Pengguna reduced-motion yang tetap menyelesaikan core flow |    setara baseline ±2% |
| Lighthouse Accessibility                                   |                   ≥ 95 |
| Lighthouse Performance mobile                              |                   ≥ 90 |

Metrik produk tidak boleh dicapai melalui dark pattern, urgency palsu, atau
gamifikasi yang mendorong pengguna terlalu sering membuka data finansial.

---

## 19. Risiko dan Mitigasi

| Risiko                                    | Mitigasi                                        |
| ----------------------------------------- | ----------------------------------------------- |
| Motion terasa berlebihan                  | Batas rotasi/jarak, tanpa loop, reduced-motion  |
| Dark mode memiliki glow yang melelahkan   | Glow dibatasi pada hero/active state            |
| Chart terlihat indah tetapi kurang akurat | 3D hanya pada container, bukan data marks       |
| Bundle membesar                           | Modular import, lazy-load, budget gzip 35KB     |
| Regressions akibat refactor global        | Implementasi bertahap dan visual regression     |
| Device mobile mengalami jank              | Capability detection dan efek desktop-only      |
| Warna income/expense tidak aksesibel      | Tambahkan tanda, ikon, label, dan pattern       |
| Produk terasa seperti trading app         | Copy tenang, tanpa ticker, alarm, atau flashing |

---

## 20. Out of Scope

- Perubahan API atau schema database.
- Sinkronisasi rekening/bank otomatis.
- Grafik candlestick, market ticker, atau tema aplikasi trading.
- Avatar 3D, dunia virtual, NFT, atau gamifikasi berbasis hadiah finansial.
- Motion berbasis gyroscope perangkat.
- Musik, suara UI, haptic khusus, atau video background.
- Kustomisasi tema bebas oleh pengguna di luar light/dark/system.
- Layout dashboard drag-and-drop pada rilis awal v1.1.
- Perubahan logo utama tanpa studi brand terpisah.

---

## 21. Definition of Done

Money Flow v1.1 dianggap selesai ketika:

1. seluruh route aktif menggunakan semantic design tokens;
2. Dawn Ledger dan Midnight Treasury memiliki kualitas setara;
3. core flow lolos functional regression;
4. semua motion memiliki tujuan, batas, dan reduced-motion fallback;
5. contrast, keyboard, screen reader, zoom, dan touch target lolos audit;
6. performance budget terpenuhi pada production build;
7. visual QA disetujui untuk desktop, mobile web, dan installed PWA;
8. dokumentasi komponen serta aturan penggunaan token tersedia;
9. tidak ada efek visual yang menyamarkan nilai, status, biaya, atau konsekuensi
   finansial;
10. rollout dapat dihentikan atau dikembalikan melalui feature flag tanpa
    memengaruhi data pengguna.
