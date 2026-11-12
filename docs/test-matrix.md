# Test Matrix — SIMLU (versi statis)

> Tanggal: 12 Nov 2026 · Verifikasi otomatis yang bisa dilakukan: HTTP 200 semua halaman + inspeksi kode.
> **Yang belum diuji: klik visual di browser asli** (tool browser tidak tersedia saat pengerjaan) —
> itu bagian tim. Kolom "Manual" di bawah adalah checklist untuk dijalankan manusia.

## Konfigurasi uji

- **Server:** `python -m http.server 8137` dari root repo (wajib; `fetch()` JSON diblokir di `file://`)
- **Ukuran layar:** 1440px (dasar desktop-first) dan 375px (turun `max-md`)
- **Akun demo:** `raolika@unklab.ac.id` (mahasiswa) · `admin@unklab.ac.id` (admin) — password bebas

## Hasil terverifikasi otomatis (HTTP 200 @ localhost:8137)

| Halaman | Path | Status |
|---|---|---|
| Home | `/` | 200 |
| Masuk | `/pages/login/` | 200 |
| Daftar | `/pages/register/` | 200 |
| Dashboard | `/pages/dashboard/` | 200 |
| Riwayat | `/pages/history/` | 200 |
| Jadwal | `/pages/schedule/` | 200 |
| Admin | `/pages/admin/` | 200 |
| Pengajuan | `/pages/requests/` | 200 |
| Notifikasi | `/pages/notifications/` | 200 |
| Profil | `/pages/profile/` | 200 |

Inspeksi kode (terverifikasi dengan grep/review, bukan asumsi): guard role di semua halaman privat;
`.catch(db.fail)` + banner error global; tabel dibungkus `overflow-x-auto` + `min-w-[600px]`;
empty state di setiap list; `:focus-visible` global; tombol/link `min-height: 44px`;
tanggal lokal WITA (`db.todayISO()`); indikator wajib `*` di semua form.

## Matriks manual (tugas tim — centang saat menguji)

Legend: ✔ = lulus · ✘ = gagal (catat di bawah) · – = belum diuji

| # | Pemeriksaan | 1440px | 375px |
|---|---|---|---|
| 1 | Home: hero, CTA daftar/masuk, footer nama tim | – | – |
| 2 | Masuk: email terdaftar → masuk; email asing → error spesifik | – | – |
| 3 | Daftar: semua field wajib; NIM/email duplikat ditolak | – | – |
| 4 | Dashboard: check-in → status berubah; check-out → jam terisi | – | – |
| 5 | Dashboard: KPI + riwayat + jadwal tampil dari data | – | – |
| 6 | Riwayat: filter bulan berfungsi; bulan kosong → "Belum ada riwayat" | – | – |
| 7 | Jadwal: tabel shift + jadwal kuliah tampil | – | – |
| 8 | Pengajuan: kirim izin → muncul di daftar sebagai Pending | – | – |
| 9 | Notifikasi: status pengajuan tampil; kosong → empty state | – | – |
| 10 | Profil: data diri tampil dari users.json | – | – |
| 11 | Admin: buat shift → tampil di tabel | – | – |
| 12 | Admin: setujui/tolak pengajuan → status berubah | – | – |
| 13 | Admin: grafik 7 hari render (Chart.js) | – | – |
| 14 | Keluar → kembali ke halaman Masuk; halaman privat tak bisa dibuka tanpa sesi | – | – |
| 15 | Guard role: mahasiswa membuka `/pages/admin/` → ditolak | – | – |
| 16 | Redirect benar per role setelah login | – | – |
| 17 | Sidebar slide-over di 375px (buka/tutup, backdrop klik) | – | – |
| 18 | Tabel lebar menggulir horizontal, tidak terpotong | – | – |
| 19 | Tab keyboard: fokus terlihat di semua kontrol; urutan logis | – | – |
| 20 | Banner error: matikan server → muat dashboard → banner merah + tombol muat ulang | – | – |
| 21 | Console bersih (tanpa error merah) di semua 10 halaman | – | – |

## Catatan uji

(kosong — isi temuan saat menguji manual)
