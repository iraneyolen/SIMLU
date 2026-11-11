# Impeccable Audit — SIMLU (12 Nov 2026)

Target: seluruh 9 halaman (`index.html` + `pages/*/index.html`), `theme.css`, `db.js`/`auth.js`.
Mode command: `$impeccable audit` (cek kualitas teknis, tanpa memperbaiki).

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3/4 | Chart tanpa alternatif teks; reduced-motion mematikan semua transisi global |
| 2 | Performance | 3/4 | Tailwind runtime compiler (tradeoff offline yang disengaja) |
| 3 | Theming | 3/4 | Drift token kecil: `bg-red-50`, `#1B76BC` hard-coded di Chart.js |
| 4 | Responsive Design | 3/4 | Tabel 5 kolom di dalam card `overflow-hidden` bisa terpotong di layar sempit |
| 5 | Implementation Integrity | 3/4 | Detektor: flat type hierarchy (sebagian false positive, sebagian valid) |
| **Total** | | **15/20** | **Good (address weak dimensions)** |

## Implementation Integrity Verdict

**PASS dengan catatan.** Implementasi mengekspresikan sistem yang koheren dan spesifik produk:
token warna bersumber dari logo (biru `#1B76BC` + kuning `#FFC20E`), komponen inti konsisten
(`.btn`, `.card-soft`, `.badge-*`, `.field`), data mengalir nyata lewat `db.js`, tidak ada
konten dekoratif palsu. Detektor menemukan 8× `flat-type-hierarchy` — saya verifikasi:
**sebagian false positive** karena scan statis tidak melihat style runtime Tailwind (`h1`
sebenarnya 24px, bukan 16px), **tetapi langkah h2 (16px) vs body (14px) = 1.14× itu valid**
dan berulang di semua halaman. Drift token yang terverifikasi: `bg-red-50` (default Tailwind,
bukan token `bad`) dan `backgroundColor: '#1B76BC'` hard-coded di config Chart.js.

## Executive Summary

- Audit Health Score: **15/20** (Good)
- Total temuan: 10 (0×P0, 2×P1, 4×P2, 4×P3)
- Top issues: tabel terpotong di layar sempit; tidak ada penanganan error fetch; heading section terlalu dekat dengan body
- Rekomendasi: `harden` → `adapt` → `typeset` → `document` → `polish`

## Detailed Findings by Severity

### [P1] Tabel lebar bisa terpotong, tidak bisa digulir, di layar sempit
- **Location**: semua card-soft berisi tabel 4-5 kolom — `pages/history`, `pages/schedule`, `pages/admin` (2 tabel), `pages/dashboard`
- **Category**: Responsive (WCAG 1.4.10 Reflow)
- **Impact**: di viewport sempit, sel dengan padding 24px melampaui lebar kartu; `overflow-hidden` memotongnya tanpa cara scroll → data tidak terbaca
- **Standard**: WCAG 1.4.10 (konten harus bisa dilihat tanpa scroll dua dimensi)
- **Recommendation**: bungkus tabel dengan wrapper `overflow-x-auto`, hapus `overflow-hidden` dari card tabel
- **Suggested command**: `$impeccable adapt`

### [P1] Tidak ada penanganan kegagalan fetch data
- **Location**: `js/db.js` `list()` (throw tidak pernah ditangani); semua halaman pemanggil
- **Category**: Implementation Integrity
- **Impact**: saat JSON gagal dimuat (offline, 404, deploy subpath salah), UI macet di "Memuat…" tanpa pesan; pengguna tidak tahu apa yang terjadi; sudah pernah terjadi nyata (insiden theme.css 404 di Pages)
- **Recommendation**: try/catch di setiap init/render + panel error "Gagal memuat data, coba lagi"
- **Suggested command**: `$impeccable harden`

### [P2] Chart kehadiran tanpa alternatif aksesibel
- **Location**: `pages/admin/index.html` — `<canvas id="chartAttendance">`
- **Category**: Accessibility
- **Impact**: pengguna screen reader mendapat elemen kosong; ada heading + deskripsi teks, tapi angka per hari tidak tersedia
- **Recommendation**: `role="img"` + `aria-label` ringkas (mis. "Kehadiran 7 hari: Sen 1, Sel 2, …") atau tabel sr-only
- **Suggested command**: `$impeccable harden`

### [P2] Langkah tipografi heading section terlalu datar
- **Location**: semua halaman — `h2` section `text-base` (16px) vs body `text-sm` (14px) = 1.14×
- **Category**: Implementation Integrity (detektor: flat-type-hierarchy, 8 file)
- **Impact**: hierarki visual melemah; judul section hampir tak terbedakan dari isi
- **Catatan**: klaim detektor bahwa h1 = 16px adalah false positive (h1 = `text-2xl` 24px via Tailwind runtime); bagian h2 yang valid
- **Recommendation**: naikkan heading section ke `text-lg`/`text-xl` atau turunkan body agar langkah ≥ 1.25×
- **Suggested command**: `$impeccable typeset`

### [P2] Drift token warna
- **Location**: `pages/admin/index.html` Chart.js `backgroundColor: '#1B76BC'`; `bg-red-50` di 3 form alert (login, register, requests)
- **Category**: Theming
- **Impact**: dua sumber kebenaran warna; kalau brand diganti, chart & alert tidak ikut
- **Recommendation**: baca CSS var di config chart (`getComputedStyle`), ganti `bg-red-50` jadi token `bad` tint
- **Suggested command**: `$impeccable document` (kunci sistem dulu) lalu `$impeccable polish`

### [P2] Ukuran font dalam px, bukan rem
- **Location**: `assets/css/theme.css` (`.btn` 14px, `.field` 14px, `.badge` 11px, `.label` 13px, dst.)
- **Category**: Accessibility (WCAG 1.4.4 Resize Text)
- **Impact**: font-size px tidak ikut saat user memperbesar ukuran font default browser
- **Recommendation**: konversi ke rem (14px → 0.875rem dst.)
- **Suggested command**: `$impeccable typeset`

### [P3] Reduced-motion mematikan semua animasi global dengan 0.01ms
- **Location**: `assets/css/theme.css` `@media (prefers-reduced-motion)`
- **Category**: Accessibility
- **Impact**: pola "global kill" yang lazim dikritik; state tetap berubah (aman), tapi feedback transisi hilang total termasuk yang berguna
- **Recommendation**: pertahankan, tapi batasi ke properti non-esensial atau dokumentasikan keputusannya
- **Suggested command**: `$impeccable polish`

### [P3] Indikator required field tidak ada
- **Location**: form login, register, requests, form shift admin
- **Category**: Accessibility (WCAG 3.3.2, sebagian)
- **Impact**: semua field divalidasi `required`, tapi tidak ada tanda visual; user baru tahu setelah submit
- **Recommendation**: tanda `*` + keterangan, atau hapus `required` non-semantik
- **Suggested command**: `$impeccable clarify`

### [P3] Bootstrap Icons dimuat utuh untuk ±10 ikon
- **Location**: semua halaman, CDN CSS + font ±130KB
- **Category**: Performance
- **Impact**: bayanan jaringan jauh melebihi kebutuhan; tradeoff kecil karena CDN cache
- **Recommendation**: subset ikon atau SVG inline jika suatu saat offline penuh diutamakan
- **Suggested command**: `$impeccable optimize`

### [P3] `db.list('attendance')` dipanggil 3× paralel di Dashboard
- **Location**: `pages/dashboard/index.html` — `renderKPI`, `renderAbsen`, `renderHistory`
- **Category**: Performance
- **Impact**: tiga fetch file yang sama tiap load; diserap HTTP cache, jadi murah — tapi boros
- **Recommendation**: ambil sekali, pass ke tiga fungsi
- **Suggested command**: `$impeccable optimize`

## Patterns & Systemic Issues

- **Satu sumber kebenaran belum total**: token ada dan dipakai luas, tapi 2 titik lolos (chart JS, alert merah). Pola: "CSS pakai token, JS pakai hex".
- **Tabel di dalam kartu**: semua tabel mewarisi `overflow-hidden` kartu — risiko yang sama muncul 4 halaman sekaligus; perbaiki sekali di pola, bukan per halaman.
- **Tipografi section**: semua heading section dibuat dengan gaya yang sama (`text-base font-semibold`), jadi satu perubahan token tipografi memperbaiki 8 halaman.

## Positive Findings

- **Kontras AA terverifikasi di pasangan warna kunci**: mute/putih ≈ 5.0:1, primary-100 di primary-900 ≈ 7.8:1, sidebar ≈ 6.7:1, badge status ≈ 5.0:1 — dihitung, bukan dikira.
- **Sistem token nyata**: `theme.css` = satu file sumber warna/radius/shadow/font, dipakai konsisten lintas 9 halaman.
- **Landmark & semantik rapi**: `nav/main/aside/footer`, `th` sungguhan, `dl/dt/dd` di Profil, `aria-hidden` konsisten di ikon dekoratif.
- **Fokus keyboard global**: `:focus-visible` outline biru 2px tanpa `outline: none` di mana pun.
- **Form matang untuk level ini**: label di atas field, error spesifik per field, `role="alert"`, `autocomplete` benar, `novalidate` + validasi JS.
- **Performa dasar sehat**: Chart.js `defer` + hanya di admin, `preconnect` fonts, `display=swap`, tanpa gambar berat, tanpa layout thrashing (jam update `textContent` tiap detik).

## Recommended Actions

1. **[P1] `$impeccable harden`**: tambahkan error state fetch + tabel sr-only/aria untuk chart + edge case data kosong
2. **[P1] `$impeccable adapt`**: wrapper `overflow-x-auto` untuk semua tabel lebar, verifikasi 375px
3. **[P2] `$impeccable typeset`**: langkah heading ≥ 1.25× + konversi px → rem di theme.css
4. **[P2] `$impeccable document`**: tulis DESIGN.md dari implementasi (proyek belum punya; context loader menandainya) — sekaligus kunci keputusan token
5. **[P3] `$impeccable polish`**: bersihkan sisa drift (chart hex, bg-red-50, reduced-motion, required indicator)

> Kamu bisa minta saya menjalankan ini satu per satu, sekaligus, atau dalam urutan apa pun yang kamu mau.
> Jalankan ulang `$impeccable audit` setelah perbaikan untuk melihat skornya naik.
