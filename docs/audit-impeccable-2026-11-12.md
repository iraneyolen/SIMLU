# Audit impeccable — SI Mahasiswa Labor Unklab (folder Claude)

Tanggal: 12 Nov 2026 · Skill: impeccable 4.8.2, `reference/audit.md` · Mode surface: Operate (UI aplikasi)
Catatan: launcher/detector impeccable (binary .exe) tidak dijalankan, jadi pemeriksaan otomatis
dari detector bawaan tidak ada. Temuan di bawah berasal dari baca kode + pengukuran di browser
(iframe 375/800/1024/1280/1440 px) + perhitungan kontras WCAG.

## Skor

| # | Dimensi | Skor | Temuan utama |
|---|---|---|---|
| 1 | Aksesibilitas | 3 | `.text-warning` (kehadiran < 90%) kontras 1,63:1 |
| 2 | Performa | 3 | Aman untuk skala demo; Bootstrap/ikon/font penuh dari CDN |
| 3 | Theming | 2 | Token rapi, tapi warna default Bootstrap bocor; tidak ada dark mode |
| 4 | Responsif | 2 | Tabel terpotong (tidak bisa di-scroll) di lebar 768–1439 px |
| 5 | Integritas implementasi | 2 | Data/teks tidak jujur: tanggal minggu salah, "jam dari server", statistik dashboard statis |
| **Total** | | **12/20** | **Acceptable** |

## Integritas implementasi: LULUS dengan catatan
Sistemnya koheren dan khas produk ini: token warna dari Figma, satu kosakata komponen (badge,
kartu, tabel→kartu di HP, modal form) dipakai konsisten di 19 halaman. Masalahnya ada di kejujuran
konten demo, bukan di sistem desain.

## Temuan per tingkat

### P1
1. **Tabel terpotong di laptop/tablet.** `assets/css/style.css:143` `.table-wrap { overflow: hidden }`.
   Terukur di 1024 px: Mahasiswa 886>687, Jadwal Shift 791>687, Absensi 851>687,
   Laporan (mahasiswa) 589>390, Pengajuan 500>399; di 1280 px Laporan masih 589>539.
   Kolom kanan (tombol Ubah/Hapus/Koreksi, Total jam) hilang tanpa scroll. Perbaikan:
   `overflow-x: auto` di ≥768 px (border-radius tetap). → `$impeccable adapt`
2. **Kontras gagal WCAG AA.** `js/pages/students.js:27` memakai `.text-warning` Bootstrap
   (#FFC107 di putih = 1,63:1, butuh 4,5:1). Ganti ke token `--warning` (#B45309, 4,51:1 di subtle,
   ±5:1 di putih). WCAG 1.4.3. → `$impeccable polish`

### P2
3. **Fokus hilang setelah modal ditutup** (activeElement = BODY), dan saat modal hapus dibuka dari
   modal ubah (`js/pages/shifts.js`), body tidak terkunci scroll + dua elemen `#formModalTitle`
   sementara. Kembalikan fokus ke tombol pemicu; buka modal kedua setelah `hidden.bs.modal`.
   WCAG 2.4.3. → `$impeccable harden`
4. **Teks menyesatkan:** `js/pages/attendance.js` "Jam diambil dari server, bukan dari perangkat
   kamu" padahal mode demo memakai jam perangkat. → `$impeccable clarify`
5. **Tanggal minggu salah:** `js/demo-data.js` `week` menulis "Rabu 12 Nov" padahal 12 Nov 2026
   hari Kamis; `todayIndex: 1` tetap, jadi "hari ini" di Jadwal salah. Hitung dari `new Date()`.
   → `$impeccable harden`
6. **Statistik dashboard mahasiswa statis** (`DEMO.stats`: 95%, 32 j, 1× telat) tidak sama dengan
   Riwayat/Kinerja yang dihitung dari tabel `attendance`. → `$impeccable harden`
7. **Warna Bootstrap bocor dari token:** `text-primary` (#0D6EFD, bukan #1E56B8) di
   `layout.js:64`, `home.js:11`, `report.js:24`, `schedule.js:29`; `form-check-input`, toast
   `text-bg-dark`; warna hover tombol ditulis langsung (#126C34, #991B1B). → `$impeccable polish`
8. **Tabel→kartu di HP mengubah `display` tr/td**, sebagian pembaca layar (Safari/VoiceOver)
   kehilangan semantik tabel. Tambah `role="table/row/cell"` eksplisit. → `$impeccable harden`
9. **Pesan error form tidak terhubung** ke input (`invalid-feedback` tanpa `aria-describedby`),
   jadi pembaca layar tidak membacakannya. WCAG 3.3.1. → `$impeccable harden`

### P3
10. Lebih dari satu `<h1>` di Home (3) dan Login (2). → `$impeccable polish`
11. Link "Lupa password?" mengarah ke `#`; subjudul Laporan terkunci "Minggu ke-45" walau filter
    diganti; notifikasi lonceng statis. → `$impeccable clarify`

## Pola sistemik
- Kelas utilitas warna Bootstrap dipakai di luar token di 5 tempat; buat utilitas sendiri
  (`.text-brand`, `.text-warn`) atau timpa variabel `--bs-*` sekali di `:root`.
- Angka/teks "demo" yang ditulis langsung tidak ikut data CRUD (stats, minggu, notifikasi).

## Yang sudah baik
- Semua token teks lolos AA (muted 5,20:1 di kartu, 4,84:1 di latar; badge 4,51–6,00:1; navy 7,79:1).
- Label di atas setiap input, `aria-label` di semua tombol ikon (0 tombol tanpa label), toast
  `role="status"`, error login `role="alert"`, `prefers-reduced-motion` ditangani Bootstrap.
- Tidak ada scroll horizontal halaman di 375/800/1280 px; target sentuh ≥ 24 px (lolos WCAG 2.5.8).
- Tabel berubah jadi kartu di HP; state kosong punya ikon + teks; aksi hapus selalu dikonfirmasi.

## Rekomendasi urutan
1. [P1] `$impeccable adapt`: tabel bisa di-scroll horizontal di 768–1439 px.
2. [P1] `$impeccable polish`: ganti `.text-warning`/`.text-primary` ke token.
3. [P2] `$impeccable harden`: fokus modal, aria error form, semantik tabel HP, data dashboard dan tanggal dari data nyata.
4. [P2] `$impeccable clarify`: teks "jam dari server", subjudul minggu, link lupa password.
5. `$impeccable polish`: pass akhir.

## Status perbaikan (12 Nov 2026)

P1 dan P2 (no. 1–9) sudah diperbaiki dan dicek ulang di browser (iframe 375/800/1024/1280 px):

| No | Perbaikan | Bukti |
|---|---|---|
| 1 | `.table-wrap` jadi `overflow-x: auto` | 5 halaman: `auto`, isi bisa digeser, radius 8px tetap, tanpa scroll halaman |
| 2 | Utilitas Bootstrap ditimpa token (`--bs-warning-rgb`, dst.) | `.text-warning` = rgb(180,83,9) (#B45309) |
| 3 | Fokus kembali ke pemicu, modal kedua dibuka setelah modal pertama tertutup, ID judul unik | Fokus balik ke tombol Ubah/chip shift; 1 modal tampil, `modal-open` aktif |
| 4 | Teks absensi: "Mode demo: jam diambil dari perangkat ini." | Teks tampil di halaman Absensi |
| 5 | Tanggal minggu + hari ini dihitung dari kalender | "9 Nov – 13 November 2026", sorotan di Kamis 12 Nov |
| 6 | Statistik dashboard dari `shifts` + `attendance` | Jam bulan ini & telat sama dengan Riwayat (11 j 53 m, 1 kali) |
| 7 | `text-primary`, form-check, toast, hover tombol ikut token | `.text-primary` = rgb(30,86,184) |
| 8 | `role` table/row/cell eksplisit di `renderTable` | Di semua tabel |
| 9 | `aria-describedby` ke pesan error; kolom wajib di modal punya pesan | Register `#nim` dan input modal punya `feedback-*` |

Belum dikerjakan: P3 (no. 10–11).
