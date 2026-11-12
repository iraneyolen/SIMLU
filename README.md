# SIMLU — Sistem Informasi Mahasiswa Labor Universitas Klabat

Website kelola mahasiswa labor: absensi online, jadwal kerja & kuliah, dashboard statistik admin.
Dibangun sebagai project Perancangan Web (Web Design Course), Universitas Klabat 2026.

**Status:** static-first demo (data `data/*.json` + `localStorage`) — siap migrasi ke Supabase.

## Tim
Pankey · Raolika · Mondong · Sahabir

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
| Dashboard (absensi) | `/pages/dashboard/` | Student |
| Riwayat | `/pages/history/` | Student |
| Jadwal | `/pages/schedule/` | Student |
| Pengajuan izin / tukar shift | `/pages/requests/` | Student |
| Notifikasi status pengajuan | `/pages/notifications/` | Student |
| Profil | `/pages/profile/` | Student |
| Admin (statistik + kelola) | `/pages/admin/` | Admin |

## Struktur
```
index.html              Home publik
pages/                  9 halaman (login, register, dashboard, history, schedule, admin, requests, notifications, profile)
assets/                 tailwind v4 + chart.js vendored (offline) · theme.css token brand · tailwind-boot.js
js/                     db.js lapisan data bentuk Supabase · auth.js sesi demo + guard role
data/                   users · shifts · attendance · class-schedule · requests
docs/                   spec.md · design-system.md · test-matrix.md
DESIGN.md               design system (token + aturan bernama)
PRODUCT.md              ringkasan produk
```


## Migrasi ke Supabase
Skema `data/*.json` = tabel Supabase 1:1 (`users`, `shifts`, `attendance`, `requests`).
Migrasi: ganti isi `js/db.js` dengan supabase-js + ganti `js/auth.js` ke Supabase Auth.
Halaman tidak perlu diubah.

## Docs
- [PRODUCT.md](PRODUCT.md) — ringkasan produk & status
- [DESIGN.md](DESIGN.md) — design system (token, aturan, dial)
- [docs/spec.md](docs/spec.md) — spesifikasi & keputusan
- [docs/design-system.md](docs/design-system.md) — token warna & komponen (logo Computer Science Unklab)
- [docs/test-matrix.md](docs/test-matrix.md) — matriks uji manual per halaman
