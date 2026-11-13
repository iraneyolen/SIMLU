# SI Mahasiswa Labor Unklab: demo statis

HTML + Tailwind CSS v4 (versi browser, lokal) + JavaScript biasa + Chart.js. Arah desain: [DESIGN.md](DESIGN.md). Belum memakai database: semua data CRUD
disimpan di **localStorage** browser lewat `js/store.js`. Nanti diganti Supabase tanpa mengubah halaman.

## Menjalankan (VS Code Live Server)

1. Buka folder `Claude` (atau `project 3`) di VS Code.
2. Klik kanan `index.html` → **Open with Live Server**.
3. Masuk dari halaman Login, pakai tombol akun demo: **Mahasiswa**, **Koordinator**, atau **Admin**.
   Password apa pun diterima.

Wajib lewat server lokal (Live Server): `js/boot.js` memuat `assets/css/app.css` dengan `fetch()`, yang tidak jalan
kalau file dibuka langsung (`file://`). Kalau tampilan belum berubah setelah edit, tekan **Ctrl+F5**.
Butuh internet untuk font, ikon Phosphor, dan Chart.js (CDN). Tailwind sendiri sudah lokal di `assets/vendor/`.
Semua path relatif, jadi tidak tergantung folder mana yang jadi root Live Server.

Tema terang/gelap: tombol bulan/matahari di kanan atas. Default mengikuti pengaturan perangkat.

## Yang bisa dicoba (CRUD)

| Role | Halaman | Aksi |
|---|---|---|
| Publik | Daftar | Kirim pendaftaran → masuk ke tabel `applicants` |
| Admin | Pendaftar | Setujui (jadi mahasiswa, bisa login) / tolak dengan alasan / hapus |
| Admin | Mahasiswa | Tambah, ubah, hapus, ekspor CSV |
| Admin | Unit Kerja | Tambah, ubah, hapus (diblok kalau masih ada mahasiswa aktif) |
| Koordinator/Admin | Kelola Shift | Tambah, ubah, hapus shift (cek tumpang tindih + batas jam unit) |
| Koordinator/Admin | Absensi | Koreksi jam check-in/out, tandai izin, ekspor CSV |
| Koordinator | Laporan Mingguan | Beri nilai + komentar |
| Koordinator | Pengajuan | Setujui (tukar shift memindahkan shift) / tolak dengan alasan |
| Mahasiswa | Absensi | Check-in / check-out → muncul di Riwayat dan Absensi Tim |
| Mahasiswa | Laporan Mingguan | Kirim, simpan draf, ubah, hapus |
| Mahasiswa | Pengajuan | Ajukan izin / tukar shift, batalkan |
| Semua | Profil | Ubah email dan No. HP |

Tombol **Reset data demo** di halaman Profil mengembalikan semua data ke isi awal.

## Struktur

```
index.html                 Home publik
pages/<nama>/index.html    Satu folder per halaman
js/demo-data.js            Data awal (dummy) + pembantu waktu + role demo
js/store.js                CRUD localStorage (list/get/add/update/remove/reset)
js/boot.js                 Tema terang/gelap + memuat app.css ke Tailwind (di <head>)
js/ui.js                   Tag status, ringkasan angka, tabel, modal <dialog>, toast, form, ekspor CSV
js/layout.js               Sidebar + topbar halaman setelah login
js/pages/<nama>.js         Script tiap halaman
assets/css/app.css         Token warna (terang + gelap) + komponen Tailwind
assets/vendor/             tailwindcss-browser.js (v4.3.5)
```

## Sumber data: local atau Supabase

1. Salin `.env.example` jadi `.env` (sudah ada di `.gitignore`, jadi tidak ikut ter-commit).
2. Isi `DATA_SOURCE=supabase` dan `SUPABASE_KEY=` dengan **publishable key** (`sb_publishable_...`).
3. Buka lewat Live Server seperti biasa. Tanpa `.env`, web memakai `js/config.js` (mode `local`).

Catatan keamanan: `.env` dibaca oleh browser, jadi isinya tetap bisa dilihat siapa pun yang membuka web.
Gunanya menjaga key keluar dari repo publik, bukan merahasiakannya. Data di Supabase aman karena RLS
(folder `supabase/`). Jangan pernah menaruh secret key, service_role key, atau password database di `.env`.

Skema, aturan akses, seed, dan uji database ada di `supabase/README.md`. Pembagian kerja Claude/OpenCode
ada di `docs/koordinasi-supabase.md`.

## Deploy (GitHub Pages + Supabase)

Workflow `.github/workflows/deploy-pages.yml` berjalan setiap push ke `main`:
menyalin `index.html`, `pages/`, `js/`, `assets/` ke folder situs, lalu menulis `js/config.js` dari repository
secret `SUPABASE_URL` dan `SUPABASE_KEY` (wajib publishable key; workflow menolak key lain). Dokumen, SQL, dan
`.env` tidak ikut dipublikasikan, dan key tidak tersimpan di repo.

Persiapan sekali di GitHub: Settings → Secrets and variables → Actions (isi dua secret di atas), lalu
Settings → Pages → Source = **GitHub Actions**. Di Supabase: Authentication → URL Configuration, isi Site URL
dengan alamat Pages.

## Sebelum dikumpulkan / dipublikasikan

Versi browser Tailwind menyusun CSS saat halaman dibuka (cocok untuk demo, bukan produksi).
Untuk versi final, ganti dengan Tailwind CLI standalone yang menghasilkan file CSS statis.
