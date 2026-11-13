# Migrasi Supabase — Tahap 1: Skema, Fungsi, RLS, Seed, Uji

Milik tahap 1 dari `docs/koordinasi-supabase.md`. SQL dijalankan **berurutan**
di SQL editor Supabase (Dashboard → SQL Editor → New query → tempel satu file
→ Run). Semua file aman dijalankan ulang, kecuali dinyatakan lain.

## Urutan menjalankan

| # | File | Isi | Perlu |
|---|---|---|---|
| 0 | — (dashboard) | Persiapan project — lihat di bawah | — |
| 1 | `01_schema.sql` | 9 tabel + FK + index | project aktif |
| 2 | `02_functions.sql` | `is_admin()`, `my_role()`, `my_unit()`, `my_status()`, RPC check-in/out, trigger profiles | 01 |
| 3 | `03_rls.sql` | RLS + policy per role | 02 |
| 4 | `04_seed.sql` | data demo dari `js/demo-data.js` | 03 + Tahap 0 selesai |
| 5 | `05_tests.sql` | uji akses per role | 04 |

## Tahap 0 — persiapan di Dashboard (dikerjakan user)

1. **Resume project** (kalau berstatus paused): Project Settings → Restore.
2. **Matikan konfirmasi email**: Authentication → Sign In / Providers →
   "Confirm email" = OFF. (Email `nim@student.unklab.ac.id` adalah email asli
   mahasiswa; tanpa ini, pendaftar demo tidak bisa langsung mencoba login.)
3. **Site URL**: Authentication → URL Configuration → Site URL =
   `https://iraneyolen.github.io/SIMLU/` (agar link reset password & redirect
   benar). Tambahkan juga `http://localhost:8137` ke Redirect URLs untuk uji lokal.
4. **Buat 3 akun demo** (Authentication → Users → Add user, isi password lalu
   Auto Confirm User = ON). Metadata (name/nim/phone/program) bisa dikosongkan —
   file seed yang mengisi profil. Yang penting email-nya persis:
   - `12510207@student.unklab.ac.id` — mahasiswa demo
   - `m.sumampouw@unklab.ac.id` — koordinator
   - `labor@unklab.ac.id` — admin

   > Setelah `04_seed.sql` dijalankan, role dan status ketiganya otomatis
   > benar (student active · coordinator active · admin active). Sebelum seed
   > dijalankan, trigger dari `02_functions.sql` membuat profil mereka sebagai
   > `student`/`pending` — itu normal.

## Yang dihasilkan

- **9 tabel** `public`: `profiles`, `applications`, `units`, `shifts`,
  `attendance`, `requests`, `reports`, `class_schedules`, `notifications`.
  Semua RLS aktif. Kunci relasi = `student_id`/`profile_id`/`unit_id`
  (keputusan terkunci #1–2 di kontrak).
- **RPC absensi** (jam diisi server, keputusan terkunci #6):
  - `check_in_attendance(shift_id)` → baris absensi dengan `check_in = now()`.
    Parameter hanya id shift milik penelepon; **unit, tanggal (WITA), dan jam
    diambil dari tabel `shifts` + server, bukan dari klien** (hasil review
    tahap 1, celah 1). Hanya mahasiswa berstatus `active`. Aman dipanggil
    ulang (mengembalikan baris yang sudah ada). *Catatan: tanda tangannya
    berubah dari versi awal (dulu 4 parameter dari klien) — adaptor tahap 2
    wajib memakai bentuk ini.*
  - `check_out_attendance(attendance_id)` → mengisi `check_out = now()` pada
    baris milik sendiri yang belum check-out; tidak bisa diulang. Hanya
    mahasiswa berstatus `active`.
  - Mahasiswa **tidak** punya akses tulis langsung ke tabel `attendance`
    (lihat Catatan balasan #3) — adaptor (tahap 2) wajib memakai dua RPC ini.
  - Policy koordinator memakai fungsi tunggal `is_coordinator_of(unit_id)`
    yang menuntut role `coordinator` **dan** status `active`
    (hasil review tahap 1, celah 4).
- **Proteksi kolom profil** (hasil review tahap 1, celah 3): mahasiswa hanya
  bisa mengubah `phone` dan `program` di profilnya sendiri; `role`, `status`,
  `unit_id`, `nim`, `email`, `name` terkunci. Mekanismenya **trigger**
  `protect_profile_columns` (BEFORE UPDATE di `02_functions.sql`): nilai lama
  dikembalikan diam-diam (silent reset), bukan error — supaya adaptor yang
  mengirim patch seluruh baris tetap berhasil. Trigger tidak aktif tanpa sesi
  login (SQL editor/seed tetap bebas). Email berubah lewat `auth.updateUser`,
  bukan tabel.
- **Gerbang akun aktif**: membuat pengajuan/laporan hanya untuk akun
  `student` berstatus `active`, wajib di unitnya sendiri, dan mahasiswa
  tidak bisa menetapkan status `graded` atau skor sendiri
  (hasil review tahap 1, celah 2).
- **Trigger** `on_auth_user_created`: setiap akun Auth baru otomatis mendapat
  baris `profiles` (role `student`, status `pending`) dari metadata signup.

## Cara uji

1. Jalankan `05_tests.sql` — baca kolom `lulus`; semua harus `true`.
   Pesan `NOTICE: LULUS: ...` muncul untuk uji negatif (yang diharapkan error).
2. Uji manual cepat di SQL editor (opsional):
   ```sql
   select id, email, role, status from public.profiles order by email;
   select date, shift_start, check_in, check_out, leave
     from public.attendance order by date desc;
   ```
3. Data yang diharapkan: 6 unit, 3 profil aktif, 4 shift + 7 absensi + 4
   pengajuan + 4 laporan + 5 jadwal kuliah + 4 notifikasi milik mahasiswa demo.

## Keterbatasan diketahui

- **Seed hanya menutup 3 akun demo.** Mahasiswa lain (Grace, Sarah, Kevin,
  Daniel, Maria, Yohanes) dan 4 pendaftar tidak punya akun Auth, dan karena
  `profiles.id` = `auth.users.id`, baris mereka tidak bisa dibuat oleh seed.
  Akibatnya halaman Tim/Admin lebih sepi di mode Supabase daripada mode local.
  Solusi: buat akun untuk mereka di dashboard lalu tambahkan barisnya (atau
  minta penambahan di seed).
- Penggantian tukar-shift (Kevin Lumowa) belum punya akun → `replacement_id`
  null; nama penggantinya disimpan di kolom `note` ("Pengganti: Kevin Lumowa").
- Uji antar-mahasiswa (`05_tests.sql` bagian B2) baru bisa dijalankan setelah
  ada akun mahasiswa kedua.

## Troubleshooting

- **`Database is possibly not accessible`** — project masih paused; resume
  dari dashboard dulu (proyek free-tier berhenti otomatis setelah ~7 hari
  tidak aktif — ingat ini menjelang hari demo).
- **Seed me-warning "Akun demo belum lengkap"** — akun belum dibuat atau
  email salah ketik; seed tetap jalan untuk akun yang ada; perbaiki lalu
  jalankan ulang `04_seed.sql` (aman diulang).
- **`set local role authenticated` ditolak** di uji — pastikan dijalankan
  di SQL editor project ini (role `postgres`), bukan koneksi eksternal.
- **Transaksi macet setelah uji negatif gagal tak terduga** — jalankan
  `rollback;` lalu ulangi file uji.
