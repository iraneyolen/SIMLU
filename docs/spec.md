# Spec: SIMLU — Sistem Informasi Mahasiswa Labor Universitas Klabat (v3)

> Status: disetujui (12 Nov 2026) · Deadline: ≤ 7 hari · Progress check: 12 Nov 2026 (static UI)

## Objective
Website dinamis (MPA, vanilla JS) untuk mengelola mahasiswa labor **seluruh Universitas Klabat**:
absensi online, jadwal kerja & kuliah, dan dashboard statistik admin. Minggu ini: progress check
memperlihatkan static UI; versi dinamis (data JSON + simulasi auth) menyusul dalam 7 hari.
Data disimpan di `data/*.json` yang skemanya identik dengan tabel Supabase agar migrasi nyata.

## Keputusan terkunci
- **Static-first**: tanpa backend. Baca = `data/*.json`, tulis = `localStorage` (overlay).
  `js/db.js` meniru bentuk API Supabase (list/insert/update/remove).
- **2 role**: `student` dan `admin`. Login tersimulasi (email terdaftar di users.json,
  password apa pun diterima pada mode demo). Sesi di `sessionStorage`.
- **Desktop-first, responsive**: layout dasar = desktop 1440; turun ke tablet/laptop (max-lg) dan HP (max-md).
- **Identitas visual**: biru `#1B76BC` + kuning `#FFC20E` dari logo Computer Science · Universitas Klabat.
- **Offline coding**: Tailwind v4 + Chart.js di-vendor lokal; tanpa build step.

## Tech Stack
Tailwind CSS v4 (vendored) · Vanilla JS · Chart.js v4 (vendored) · Bootstrap Icons (CDN)
· Data: `data/*.json` + `localStorage` · Hosting: GitHub Pages (`iraneyolen/SIMLU`)

## Commands
```
Dev:     python -m http.server 8137    (dari root repo; atau VS Code Live Server)
Deploy:  git push origin main          (Pages otomatis)
```
Server lokal wajib karena browser memblokir `fetch()` JSON pada `file://`.

## Project Structure
```
index.html              Home publik
pages/{login,register,dashboard,history,schedule,admin}/  Halaman inti
pages/{requests,notifications,profile}/                    P1 (setelah inti stabil)
assets/vendor/          tailwindcss-browser.js · chart.js.umd.js
assets/css/theme.css    Token brand + komponen inti
assets/js/tailwind-boot.js   Suntik theme.css ke @tailwindcss/browser
js/db.js                Lapisan data (bentuk Supabase)
js/auth.js              Sesi tersimulasi + guard role
data/*.json             users · shifts · attendance · class-schedule · requests
docs/                   spec.md · design-system.md · test-matrix.md
```

## Code Style
Konvensi: bahasa UI Indonesia konsisten ("Check-In", "Izin", "Shift"); Bootstrap Icons (tanpa emoji);
tanpa em dash pada teks UI; label selalu di atas input; error spesifik per field;
setiap aksi destruktif pakai modal konfirmasi dengan "Batalkan".

```js
// js/db.js — satu-satunya akses data. Migrasi Supabase = ganti isi file ini.
const rows = await db.list('attendance');
await db.insert('attendance', { student_id: 'u1', date: '2026-11-12', check_in: '13:00', ... });
```

## Testing Strategy
Checklist manual per halaman (dicatat di `docs/test-matrix.md`):
1. Buka pada 1440px dan 375px — layout tidak rusak.
2. Semua tombol/link berfungsi tanpa error console.
3. State kosong & loading tersedia (skeleton/empty text).
4. Fokus keyboard terlihat, target sentuh ≥ 44px.

## Boundaries
- **Always:** validasi input + pesan error spesifik; guard role di setiap halaman privat; commit kecil per halaman.
- **Ask first:** menambah library baru; mengubah skema `data/*.json`; mengubah token warna.
- **Never:** menulis password asli di JSON; mengganti istilah UI antar halaman; menghapus halaman P0 demi P1.

## Success Criteria
1. **Progress check (12 Nov):** 7 halaman P0 tampil di desktop & 375px, navigasi jalan, jadwal kuliah asli tampil.
2. **H+7:** login 2 role + redirect benar; check-in/out mencatat riwayat; admin melihat KPI + grafik dari data gabungan.
3. Semua halaman lolos checklist tanpa error console.

## Open Questions
1. File logo resmi (png/svg) untuk ekstraksi warna presisi + dipasang di navbar.
2. Tanggal final deadline pasti.
