# PRODUCT.md — SIMLU

## Product Overview

**Name:** SIMLU — Sistem Informasi Mahasiswa Labor Universitas Klabat

**One-liner:** Satu tempat untuk mahasiswa labor mengelola absensi, jadwal kerja dan kuliah, serta pengajuan izin — dan untuk admin melihat statistik kehadiran seluruh kampus.

**Problem it solves:** Mahasiswa labor di Universitas Klabat mengurus kehadiran, shift kerja, dan jadwal kuliah di tempat terpisah (formulir kertas, papan pengumuman, pesan pribadi). SIMLU menyatukannya: check-in/check-out online, jadwal shift dan kuliah berdampingan, pengajuan izin/swap dengan status yang terpantau, dan dashboard statistik untuk admin.

**Target user:**
- **Mahasiswa labor** (role `student`) — melakukan check-in/out, melihat jadwal, mengajukan izin/tukar shift, memantau status pengajuan.
- **Admin labor** (role `admin`) — membuat shift, menyetujui/menolak pengajuan, memantau KPI kehadiran lewat grafik.

**Value in one sentence:** Data absensi dan pengajuan yang tadinya berserakan jadi tercatat, terpantau, dan bisa diaudit — tanpa kertas.

## Scope

### In scope (tahap statis, saat ini)
- MPA (multi-page app) vanilla JS tanpa backend: data dibaca dari `data/*.json`, penulisan disimpan sebagai overlay `localStorage` di `js/db.js` — bentuk API-nya meniru Supabase (`list/insert/update/remove`) supaya migrasi backend nyata hanya mengganti isi satu file.
- Login demo: email terdaftar di `data/users.json`, password apa pun diterima di mode demo; sesi di `sessionStorage`; guard role di setiap halaman privat.
- 10 halaman: Home, Masuk, Daftar, Dashboard, Riwayat, Jadwal, Admin, Pengajuan, Notifikasi, Profil.
- Identitas visual dari logo Computer Science · Universitas Klabat (biru `#1B76BC` + kuning `#FFC20E`); desktop-first (dasar 1440px, turun via `max-lg`/`max-md`).
- Tailwind v4 + Chart.js di-vendor lokal — situs tetap jalan tanpa internet kecuali font/ikon CDN.

### Out of scope (tahap statis)
- Backend asli, autentikasi nyata, dan multi-perangkat sync — masuk tahap migrasi Supabase (skema JSON sudah 1:1 dengan tabel yang direncanakan).
- Password asli di file data — selalu demo, tidak pernah disimpan di JSON.

## Users & Journey

1. **Mahasiswa baru** → halaman Daftar → login → dashboard → check-in saat mulai shift, check-out saat selesai; status dan total jam tercatat otomatis.
2. **Mahasiswa sakit/berhalangan** → halaman Pengajuan → kirim izin atau tukar shift → menerima pembaruan status di halaman Notifikasi.
3. **Admin** → halaman Admin → buat shift untuk mahasiswa, setujui/tolak pengajuan, pantau grafik kehadiran 7 hari.

## Constraints

- **Offline coding:** tanpa build step; Tailwind v4 dan Chart.js di-vendor.
- **Desktop-first:** dasar 1440px, degradasi bertahap — bukan mobile-first.
- **2 role saja:** `student` dan `admin`.
- **Waktu:** progress check 12 Nov 2026 (static UI); versi dinamis ≤ 7 hari. Tanggal deadline final: belum dikonfirmasi.

## Team

Group Project WDC · Universitas Klabat: **Pankey** · **Raolika** · **Mondong** · **Sahabir**

## Hosting

GitHub Pages dari `https://github.com/iraneyolen/SIMLU.git` (branch `main`) → live di `https://iraneyolen.github.io/SIMLU/`. Deploy otomatis ±1–2 menit setelah push.

## Status

- [x] Versi statis utuh (10 halaman + data demo + auth demo)
- [ ] Konfirmasi visual di Pages (hard refresh setelah deploy)
- [ ] Logo resmi Computer Science Unklab (masih placeholder "S")
- [ ] NIM & email asli tim (masih placeholder demo)
- [ ] Migrasi Supabase (tahap berikutnya)
