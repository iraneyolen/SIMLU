# SIMLU — Sistem Informasi Mahasiswa Labor Universitas Klabat

Website kelola mahasiswa labor: absensi online, jadwal kerja & kuliah, dashboard statistik admin.
Dibangun sebagai project Perancangan Web (Web Design Course), Universitas Klabat 2026.

**Status:** static-first demo (data `data/*.json` + `localStorage`) — siap migrasi ke Supabase.

## Tim
Warikkie · Raolika · Mondong · Sahabir

## Menjalankan
Butuh web server lokal (browser memblokir `fetch()` JSON pada `file://`):

```bash
python -m http.server 8137     # atau: ekstensi Live Server di VS Code
# buka http://localhost:8137
```

Akun demo (password apa pun):
- `admin@unklab.ac.id` — Dashboard Admin (statistik)
- `raolika@unklab.ac.id` — Dashboard Mahasiswa (absensi)

## Halaman
| Halaman | Path | Role |
|---|---|---|
| Home | `/` | Publik |
| Login / Register | `/pages/login/` `/pages/register/` | Publik |
| Dashboard | `/pages/dashboard/` | Student |
| Riwayat | `/pages/history/` | Student |
| Jadwal | `/pages/schedule/` | Student |
| Admin (statistik + kelola) | `/pages/admin/` | Admin |

## Struktur
```
index.html · pages/ · assets/ (tailwind v4 + chart.js vendored, offline)
js/ (db.js lapisan data bentuk Supabase · auth.js sesi demo + guard)
data/*.json (users · shifts · attendance · class-schedule · requests)
docs/ (spec.md · design-system.md)
```

## Migrasi ke Supabase
Skema `data/*.json` = tabel Supabase 1:1 (`users`, `shifts`, `attendance`, `requests`).
Migrasi: ganti isi `js/db.js` dengan supabase-js + ganti `js/auth.js` ke Supabase Auth.
Halaman tidak perlu diubah.

## Docs
- [docs/spec.md](docs/spec.md) — spesifikasi & keputusan
- [docs/design-system.md](docs/design-system.md) — token warna & komponen (logo Computer Science Unklab)
