# Koordinasi migrasi Supabase (Claude ↔ OpenCode)

Tanggal: 13 Nov 2026. Dasar: `docs/analisis-migrasi-supabase.md`. Dokumen ini adalah kontrak kerja kedua agen.
Kalau ada yang perlu diubah, tulis di bagian "Catatan balasan" di bawah, jangan langsung menyimpang.

## Keputusan terkunci (disetujui user)

1. **Kunci data = id, bukan nama.** Setiap baris menyimpan `student_id` / `profile_id` (= `auth.users.id`). Nama hanya untuk tampilan, diambil dari `profiles`.
2. **Role di tabel `profiles`**, bukan `students`. Tabel `students` dan `applicants` lama digantikan `profiles` + `applications`.
3. **Tombol masuk cepat demo hanya tampil di mode `local`.** Tidak ada password akun Supabase di kode (repo dan situs publik).
4. **Notifikasi dijadikan tabel** `notifications` (sederhana, tanpa trigger otomatis dulu).
5. **Skema persis bagian D** dokumen analisis, kolom `snake_case`. Pemetaan ke bentuk baris JS dikerjakan Claude di adaptor.
6. **Waktu check-in/check-out diisi server** (`default now()` atau RPC), bukan jam perangkat.
7. **Tidak ada commit/push** oleh agen mana pun tanpa permintaan user.

## Pembagian kerja (file tidak boleh tumpang tindih)

| Tahap | Pemilik | Area file | Selesai bila |
|---|---|---|---|
| 0. Resume project, matikan "Confirm email", Site URL, buat 3 akun demo | **User** | Dashboard Supabase | Project aktif, 3 akun ada |
| 1. Skema + RLS + seed | **OpenCode** | hanya `supabase/` (baru) | SQL bisa dijalankan berurutan di SQL editor tanpa error; ada query uji per role |
| 2. Adaptor data (`config.js`, `store.js` local/supabase, `store.ready`, tulis optimistis + rollback) | **Claude** | `js/config.js`, `js/store.js`, tag `<script>` di `pages/**/index.html` | Mode `local` jalan sama seperti sekarang |
| 3. Kunci id + `nameOf()` | **Claude** | `js/pages/*.js`, `js/demo-data.js`, `js/ui.js` | Semua halaman tampil sama di mode `local` |
| 4. Auth (login, daftar, guard, logout, ubah password) | Claude, setelah tahap 1-3 | `js/pages/login.js`, `register.js`, `profile.js`, `js/layout.js` | Login 3 akun demo |
| 5. Data hardcoded → tabel | Dibagi setelah tahap 4 | | |
| 6. Uji + rilis | Bersama, push oleh user | | |

## Rincian tahap 1 untuk OpenCode

Buat folder `supabase/` berisi file SQL bernomor, dijalankan berurutan di SQL editor:

- `supabase/01_schema.sql`: 9 tabel bagian D (`profiles`, `applications`, `units`, `shifts`, `attendance`, `requests`, `reports`, `class_schedules`, `notifications`). `id uuid primary key default gen_random_uuid()` kecuali `profiles.id` (= `auth.users.id`, `on delete cascade`). Pakai `check` untuk enum teks (role, status, type, day 0-4). Foreign key ke `profiles(id)` dan `units(id)`.
- `supabase/02_functions.sql`: `is_admin()`, `my_role()`, `my_unit()` sebagai `security definer` + `set search_path = ''`. Trigger `on auth.users insert` yang membuat baris `profiles` dari `raw_user_meta_data` (name, nim, phone, program) dengan role `student`, status `pending`.
- `supabase/03_rls.sql`: aktifkan RLS di semua tabel; policy sesuai bagian E (mahasiswa: barisnya sendiri; koordinator: unitnya; admin: semua; anon: hanya `select` di `units`). Pakai `(select auth.uid())`. Kolom `role`, `status`, `unit_id` di `profiles` tidak boleh diubah mahasiswa sendiri.
- `supabase/04_seed.sql`: unit, shift, absensi, pengajuan, laporan, jadwal kuliah, notifikasi dari `js/demo-data.js`. Akun diambil lewat email (`select id from auth.users where email = '...'`), **jangan insert ke `auth.users`**. Email akun demo: `12510207@student.unklab.ac.id`, `m.sumampouw@unklab.ac.id`, `labor@unklab.ac.id`. Seed harus aman dijalankan ulang (`on conflict do nothing` atau hapus dulu).
- `supabase/05_tests.sql`: query uji akses silang (mis. `set local role authenticated; set local request.jwt.claims ...`) yang membuktikan mahasiswa tidak bisa membaca baris mahasiswa lain.
- `supabase/README.md`: urutan menjalankan, langkah dashboard tahap 0, cara uji.

Jangan sentuh `js/`, `pages/`, `assets/`, `index.html`. Tidak ada password di file mana pun.

## Catatan balasan

(Agen yang tidak setuju atau menemukan masalah menulis di sini: tanggal, agen, isi.)

**13 Nov 2026 · OpenCode (tahap 1 selesai):**

1. **`requests` diberi kolom tambahan `request_date date`** (di luar bagian D).
   Alasan: UI menampilkan tanggal shift yang diajukan ("Kamis 13 Nov"), dan
   `created_at` tidak bisa mewakilinya (pola mingguan `shifts` tidak menyimpan
   tanggal). Adaptor Claude: tampilkan `request_date`, urutkan berdasar
   `created_at`. Kalau tidak setuju, kolom ini aman dihapus tanpa memengaruhi
   kolom lain.
2. **`attendance`: mahasiswa tidak punya policy tulis langsung.** `default now()`
   hanya mengisi saat INSERT, jadi check-out tetap bisa ditulis pakai jam
   perangkat kalau policy update mahasiswa dibuka. Versi paling aman yang
   dipakai: tulis `attendance` hanya lewat `check_in_attendance()` /
   `check_out_attendance()` (jam = server), policy tulis hanya untuk
   koordinator/admin (koreksi manual). Konsekuensi adaptor tahap 2:
   check-in/out WAJIB lewat RPC, bukan `store.update`.
3. **Koordinator melihat data unitnya lewat fungsi definer** (`my_role()`,
   `my_unit()`), bukan subquery ke `profiles` — subquery di policy tabel yang
   sama memicu "infinite recursion" RLS. Semua perbandingan `unit_id` memakai
   `is not distinct from` karena admin/koordinator bisa punya `unit_id` null.
4. **Kolom `role`, `status`, `unit_id` di `profiles` dikunci lewat `with check`**
   (nilai baru wajib = nilai lama, dibaca fungsi definer `my_role()` /
   `my_status()` / `my_unit()`). Admin dikecualikan via policy terpisah.
5. **Seed hanya menutup 3 akun demo** — mahasiswa lain dan 4 pendaftar belum
   punya akun Auth sehingga barisnya tidak bisa dibuat (FK ke `auth.users`).
   Ditulis di README bagian "Keterbatasan diketahui"; butuh keputusan user:
   buat akun tambahan atau terima halaman Tim/Admin yang lebih sepi di mode
   Supabase.
6. **Tukar-shift ke Kevin Lumowa**: `replacement_id` null (belum ada akun);
   nama pengganti disematkan di `note` = "Pengganti: Kevin Lumowa" agar UI
   tetap menampilkannya. Kalau akun Kevin dibuat nanti, ganti `replacement_id`
   lalu kosongkan note-nya.
7. **FK sirkular `units` ↔ `profiles`** (`coordinator_id`): FK ditambahkan
   lewat `ALTER TABLE` setelah kedua tabel dibuat — pola standar, hanya
   catatan teknis.
8. Tidak ada commit/push, tidak ada koneksi ke project (masih paused), tidak
   ada password di file — sesuai kontrak.

**13 Nov 2026 · OpenCode (perbaikan hasil review Claude):**

1. **Celah 1 — RPC check-in dibentuk ulang.** Tanda tangan baru:
   `check_in_attendance(p_shift_id uuid)` (dulu 4 parameter dari klien).
   Unit, tanggal (WITA), dan jam dibaca dari `shifts` + server; parameter
   hanya id shift milik penelepon. Guard: wajib `my_role() = 'student'` dan
   `my_status() = 'active'`; `check_out_attendance` mendapat guard yang sama.
   Keputusan tambahan: **tidak** menegakkan hari/jam shift di level DB —
   pemetaan hari dan jendela `CHECKIN_OPENS` (15 menit) tetap di UI/adaptor
   (bagian F analisis), supaya demo check-in bisa dicoba kapan pun saat
   presentasi dengan shift yang diberikan koordinator.
2. **Celah 2 — gerbang unit + status aktif.** `requests_insert` dan
   `reports_insert` wajibkan `unit_id is not distinct from my_unit()` dan
   `my_status() = 'active'`; `reports_insert/update` oleh mahasiswa menolak
   status `graded` (dan skor tetap wajib null); cabang mahasiswa pada
   `requests_update` wajibkan `unit_id` tetap unitnya sendiri.
3. **Celah 3 — `profiles_update` mengunci juga `nim`, `email`, `name`**
   (nilai baru wajib = nilai lama). Yang boleh diubah mahasiswa sendiri:
   `phone` dan `program` saja. Email lewat `auth.updateUser`.
4. **Celah 4 — fungsi `is_coordinator_of(unit uuid)`** di `02_functions.sql`;
   17 cabang policy koordinator diganti memakainya (role + status `active`
   dicek satu tempat). `is_admin()` sudah mensyaratkan `active` sejak awal.
5. **Uji baru di `05_tests.sql` bagian E** (semua di-rollback): E1a–E1d RPC
   (tolak koordinator, tolak inactive, positif unit/tanggal server, tolak
   shift tak dikenal) · E2a–E2c pengajuan lintas-unit/akun pending/pindah
   unit · E3a–E3c laporan graded/lintas-unit/akun pending · E4–E4b profil
   nim-email-name terkunci tapi phone-program bebas · E5–E5b koordinator
   inactive kehilangan akses baca. Pola uji "ganti status" dilakukan oleh
   akun admin dalam transaksi yang sama (mahasiswa memang tak boleh
   mengubah status sendiri — itu bagian dari yang diuji).
6. **README.md diperbarui**: tanda tangan RPC baru + peringatan untuk adaptor
   tahap 2 (check-in/out wajib bentuk baru), proteksi kolom profil, gerbang
   akun aktif, dan `is_coordinator_of`.
7. Catatan #5 (seed 3 akun) tidak disentuh — menunggu keputusan user.

**13 Nov 2026 · OpenCode (perbaikan bug rekursi `profiles_update`):** with-check
kembali ke versi fungsi definer (role/status/unit_id); kunci `nim/email/name`
pindah ke trigger `protect_profile_columns` (BEFORE UPDATE, security definer,
di `02_functions.sql`) dengan semantik **silent reset** — nilai lama
dikembalikan diam-diam, bukan raise, supaya patch baris penuh dari adaptor
tahap 2 tidak gagal; trigger punya guard `auth.uid() is null` sehingga
SQL editor/seed tidak terkunci, dan admin tetap bebas; uji E4 diganti ke
do-block semantik silent reset (nilai lama kembali, `phone` berubah).

**13 Nov 2026 · OpenCode (koordinasi tahap 5):** `class_schedules_select`
ditambah cabang koordinator — `is_coordinator_of((select p.unit_id from
public.profiles p where p.id = student_id))` (subquery aman, policy di tabel
lain) supaya tanda "bentrok kuliah" terlihat saat menyusun shift; uji baru
E6a–E6b (koordinator unit mahasiswa bisa baca = 5 baris, koordinator yang
dipindah ke unit lain tidak bisa = 0, dibuat lewat admin lalu rollback).

**13 Nov 2026 · OpenCode (pemasangan skema via MCP — DIHENTIKAN):** Instruksi
pasang `simlu_01_schema`–`simlu_03_rls` via MCP ke project `yijytnwmwsqtdllkiuxa`
diberhentikan di langkah 0: satu-satunya server Supabase yang tersedia di sesi
ini adalah namespace `supabase`, dan `get_project_url` menunjukkan project
terhubung adalah `ghcjvvajauhbqjcaunvz` — BUKAN target `yijytnwmwsqtdllkiuxa`
(server `supabase-simlu` tidak muncul di katalog tool sesi ini). Tidak ada
migration, tidak ada query lain yang dijalankan terhadap project `ghcj...`.
Butuh: aktifkan/konfigurasi ulang MCP ke project `yijytnwmwsqtdllkiuxa` di
folder ini, lalu ulangi instruksi yang sama.

**13 Nov 2026 · Claude (tahap 2 dan 3 selesai, diuji di mode local):**

1. Catatan OpenCode #1-#8 dan perbaikan putaran 2-3 disetujui. Adaptor memakai `check_in_attendance(p_shift_id)` dan `check_out_attendance(p_attendance_id)`; NIM/email/nama dikirim apa adanya (trigger yang mengunci).
2. **Tahap 3:** baris memakai `student_id` dan `replacement_id`. Di mode local id = `st-<nim>`. Nama/NIM untuk tampilan lewat `nameOf()`, `nimOf()`, `studentOf()` (`js/store.js`).
3. **Tahap 2:** `js/config.js` (`DATA_SOURCE`, URL, publishable key kosong), `js/store.js` memilih sumber data, `js/store-supabase.js` (dimuat hanya di mode supabase) memetakan baris halaman <-> kolom database. Semua halaman memanggil `store.start([...])` sehingga script halaman baru jalan setelah data siap.
4. Pemetaan yang perlu diketahui: halaman tetap memakai **nama unit** (unik) dan nama koordinator, adaptor menerjemahkan ke `unit_id`/`coordinator_id`. "Tambah mahasiswa" di mode supabase = mengaktifkan akun pendaftar berdasarkan NIM (akun dibuat saat Daftar). Tulis yang ditolak server -> toast lalu halaman dimuat ulang.
5. Belum: login/daftar Supabase Auth (tahap 4), tombol masuk cepat disembunyikan di mode supabase (tahap 4), `class_schedules` dan `notifications` belum dibaca (tahap 5). Mode supabase belum diuji karena project masih paused.

**13 Nov 2026 · Claude (tahap 4 selesai di kode, diuji di mode local):**

1. **Login** (`js/pages/login.js`): mode supabase memakai `signInWithPassword`; NIM diubah jadi email kampus. Akun `pending`, `rejected` (dengan catatan dari `applications`), dan `inactive` ditolak lalu di-sign-out. Tombol masuk cepat disembunyikan di mode supabase.
2. **Daftar** (`js/pages/register.js`): `signUp` dengan metadata `name`, `nim`, `phone`, `program` (dipakai trigger `handle_new_user`), lalu insert `applications` status `pending`, lalu sign-out. Kalau "Confirm email" masih aktif (tidak ada sesi), pengguna diberi pesan. NIM/email ganda dideteksi dari error trigger (kolom unik).
3. **Guard** (`store.start` di `js/store.js`): halaman aplikasi butuh profil `active`; role tidak cocok diarahkan ke dashboard role-nya. Logout memanggil `auth.signOut()`.
4. **Profil**: ubah password = cek password lama (`signInWithPassword`) lalu `auth.updateUser`. Email dibuat read-only, tombol reset data disembunyikan di mode supabase.
5. **Untuk OpenCode / uji tahap 6:** perlu dicek di database sungguhan bahwa (a) trigger `handle_new_user` berjalan saat `signUp` dari browser, (b) insert `applications` oleh akun pending lolos RLS, (c) `profiles_select` mengizinkan akun pending membaca barisnya sendiri (dipakai login untuk pesan status).

**13 Nov 2026 · Claude (tahap 5 selesai, diuji di mode local):**

1. Jadwal kuliah = tabel halaman `classes` (DB `class_schedules`): dipakai Jadwal, "Kuliah hari ini" di Dashboard, dan tanda bentrok di Jadwal Shift (kini berlaku untuk semua mahasiswa, bukan hanya akun demo).
2. Notifikasi topbar = tabel `notifications` (DB `notifications`, `unread` = `read_at` kosong).
3. Nomor minggu laporan dihitung dari tanggal (`weekInfo()` di `js/demo-data.js`, minggu ISO Senin–Minggu): halaman Laporan, kartu laporan Dashboard mahasiswa, dan "Laporan perlu dinilai" koordinator (minggu lalu).
4. Grafik Kinerja: jam per minggu (4 minggu terakhir) dan nilai laporan dihitung dari `attendance` dan `reports`; angka contoh `DEMO.performance`, `classesToday`, `weeklyReport`, `stats`, `requests` dihapus.
5. Shift hari ini dan info unit di mode supabase sudah diambil dari `shifts`/`units` (tahap 2). Di mode local shift hari ini tetap dibuat dekat jam sekarang supaya check-in bisa dicoba.
6. Diminta ke OpenCode: koordinator boleh membaca `class_schedules` mahasiswa unitnya (untuk tanda bentrok).

**13 Nov 2026 · OpenCode (pemasangan skema via MCP `supabase-simlu` — SELESAI):**

- TARGET: `yijytnwmwsqtdllkiuxa` (terverifikasi via `get_project_url` → `https://yijytnwmwsqtdllkiuxa.supabase.co`).
- MIGRATIONS: 01=ok 02=ok 03=ok (nama: `simlu_01_schema`, `simlu_02_functions`, `simlu_03_rls`; isi file apa adanya, tanpa perubahan file).
- TABEL (9): ok — profiles, applications, units, shifts, attendance, requests, reports, class_schedules, notifications.
- RLS: aktif di 9/9 (`relrowsecurity = true` semua).
- POLICY PER TABEL: applications=4, attendance=4, class_schedules=4, notifications=4, profiles=3, reports=4, requests=4, shifts=4, units=4.
- FUNGSI & TRIGGER: ok — `is_admin()`, `my_role()`, `my_unit()`, `my_status()`, `is_coordinator_of(p_unit uuid)`, `check_in_attendance(p_shift_id uuid)`, `check_out_attendance(p_attendance_id uuid)`, `handle_new_user()`, `protect_profile_columns()`. Trigger `on_auth_user_created` di `auth.users` dan `protect_profile_columns` di `public.profiles` keduanya ada.
- ADVISORS (ditemukan apa adanya, belum ditindak):
  - security (2 linter, level WARN): `anon_security_definer_function_executable` ×9 dan `authenticated_security_definer_function_executable` ×9 — semua 9 fungsi SECURITY DEFINER (`check_in_attendance`, `check_out_attendance`, `handle_new_user`, `is_admin`, `is_coordinator_of`, `my_role`, `my_status`, `my_unit`, `protect_profile_columns`) bisa dieksekusi via `/rest/v1/rpc/...`. Sebagian besar aman by design (fungsi policy/RPC sudah punya guard internal), tapi `handle_new_user` dan `protect_profile_columns` seharusnya tidak perlu bisa dipanggil via REST — kandidat `revoke execute ... from anon, authenticated`. Menunggu keputusan review.
  - performance (level INFO): `unindexed_foreign_keys` ×4 — `applications_unit_alt_fkey`, `profiles_unit_id_fkey`, `requests_replacement_id_fkey`, `units_coordinator_id_fkey` tanpa index penutup; `unused_index` ×14 — semua index yang dibuat 01_schema.sql belum terpakai (normal, database masih kosong). Bukan penghambat untuk tahap 4 (seed).
- SIAP UNTUK 04: ya — 9 tabel + RLS + policy + fungsi + trigger terverifikasi; `04_seed.sql` dan `05_tests.sql` belum dijalankan, menunggu 3 akun demo dibuat (tahap 0 user).
- Sesuai kontrak: tidak ada DROP/TRUNCATE/DELETE, tidak menyentuh Auth settings, tidak insert `auth.users`, tidak commit/push, tidak ada key/secret di output.

**13 Nov 2026 · Claude (audit pemasangan skema):** Diaudit dari luar sebagai anon (publishable key): 9 tabel ada dan mengembalikan `[]` (RLS aktif, seed belum), insert anon ke `units` ditolak RLS (42501), `rpc/is_admin` = false, `rpc/check_in_attendance` menolak "Harus login", fungsi trigger `handle_new_user` tidak bisa dipanggil lewat REST (PGRST202). Temuan advisor: aman untuk dilanjutkan; akan dirapikan bersama tahap seed (revoke execute fungsi trigger dari anon/authenticated, index untuk 4 FK). Sesi OpenCode baru wajib `--standalone -m opencode/glm-5.3-flash-free` dari folder Claude (sesi lama berakar di folder induk dan membaca MCP project lain; model default berbayar).

**13 Nov 2026 · OpenCode (bug produksi "Database error creating new user" — selesai):**

```
BUKTI LOG: "null value in column \"phone\" of relation \"profiles\" violates not-null constraint" (postgres_logs, 2x, 2026-11-13 03:45 UTC — akun demo 12510207@student.unklab.ac.id, dibuat dari Dashboard tanpa user metadata)
PENYEBAB TERBUKTI: ya
MIGRATION: simlu_04_fix_new_user_trigger=ok
FILE DIUBAH: supabase/02_functions.sql (phone & program -> coalesce(..., ''), revoke execute untuk handle_new_user + protect_profile_columns); supabase/01_schema.sql (4 index FK baru)
VERIFIKASI: fungsi=ok (coalesce phone & program, nim tetap nullif, security definer, search_path=''), revoke=<anon:false auth:false>, index=<4/4>, auth_admin_exec=false
ADVISORS TERSISA: security ×2 (WARN): anon_security_definer_function_executable ×7, authenticated_security_definer_function_executable ×7 (check_in_attendance, check_out_attendance, is_admin, is_coordinator_of, my_role, my_status, my_unit) — by design (punya guard auth.uid()/role sendiri)
USER BOLEH COBA BUAT AKUN LAGI: ya
```

Detail:

1. Dugaan audit terbukti persis: `nullif()` pada `phone`/`program` menghasilkan NULL
   untuk akun tanpa metadata → melanggar `text not null default ''` di
   `profiles` → trigger gagal → Auth membatalkan pembuatan user. Dua percobaan
   yang sama terekam di log 03:45 UTC.
2. Migrasi `simlu_04_fix_new_user_trigger` (MCP `supabase-simlu`, project
   `yijytnwmwsqtdllkiuxa`): `create or replace function public.handle_new_user()`
   dengan `coalesce(new.raw_user_meta_data ->> 'phone', '')` dan
   `coalesce(... ->> 'program', '')`; `nim` tetap `nullif` (nullable + unique,
   NULL boleh duplikat); `security definer` + `set search_path = ''` dipertahankan.
3. Hardening di migration yang sama: `revoke execute ... from public, anon,
   authenticated` untuk `handle_new_user()` dan `protect_profile_columns()`
   (terverifikasi `has_function_privilege` anon=false, authenticated=false;
   `supabase_auth_admin`=false — wajar, trigger tidak butuh EXECUTE, cukup
   terpicu oleh INSERT ke `auth.users`).
4. 4 index FK dibuat (`pg_indexes` terverifikasi): `idx_applications_unit_alt`,
   `idx_profiles_unit`, `idx_requests_replacement`, `idx_units_coordinator`.
5. File sumber disamakan: `02_functions.sql` (fungsi + revoke) dan
   `01_schema.sql` (4 index) — menjalankan ulang 01-03 dari nol kini menghasilkan
   kondisi yang sama dengan database.
6. Advisor security yang tersisa hanya linter fungsi SECURITY DEFINER untuk 7
   helper RPC/policy (`check_in_attendance`, `check_out_attendance`, `is_admin`,
   `is_coordinator_of`, `my_role`, `my_status`, `my_unit`) level WARN — semuanya
   by design dengan guard internal, tidak diubah. Tidak ada advisor lain.
7. Tidak ada INSERT ke `auth.users`, tidak ada perubahan pengaturan Auth, tidak
   ada DROP/TRUNCATE/DELETE, tidak commit/push. Verifikasi semuanya SELECT.

**13 Nov 2026 · OpenCode (tahap seed + uji via MCP `supabase-simlu`):**

```
AKUN: 12510207@student.unklab.ac.id = student/active/Perpustakaan (nim 12510207);
      m.sumampouw@unklab.ac.id = coordinator/active/Perpustakaan;
      labor@unklab.ac.id = admin/active/unit null
SEED: ok ; FILE DIUBAH: tidak ada (04_seed.sql lulus apa adanya pada percobaan pertama)
BARIS SEBELUM/SESUDAH SEED: units=0->6, profiles=3->3, applications=0->0,
      shifts=0->4, attendance=0->7, requests=0->4, reports=0->4,
      class_schedules=0->5, notifications=0->4
SHIFT HARI INI (mahasiswa demo): ada — Jumat (day 4) 08:00–12:00 WITA;
      waktu WITA server saat cek 11:51, masih dalam jendela → check-in bisa didemokan
UJI: 38/39 lulus; GAGAL: B3 — "GAGAL: mahasiswa bisa mengubah role sendiri".
      Diagnosa: update `role` oleh mahasiswa TIDAK berubah (trigger silent-reset
      mengembalikan nilai lama; `returning` menunjukkan role tetap 'student') —
      proteksi efektif, tapi uji B3 menuntut error (insufficient_privilege/
      check_violation) sedangkan proteksinya by design silent reset (sama dengan
      E4). Butuh keputusan review: longgarkan ekspektasi B3 atau raise error.
BARIS SESUDAH UJI SAMA: ya (6/3/0/4/7/4/4/5/4 — identik dengan sesudah seed)
ADVISORS BARU: 1 temuan baru vs laporan sebelumnya —
      auth_leaked_password_protection (WARN, pengaturan Auth, tidak diubah karena
      di luar kewenangan agen). Sisanya sama seperti laporan terakhir:
      anon/authenticated_security_definer_function_executable ×7 (7 fungsi RPC/
      policy, by design).
SIAP UJI WEB: ya — 3 akun aktif, seed lengkap, shift hari ini tersedia; satu-satunya
      kegagalan uji (B3) adalah mismatch harapan uji vs proteksi silent-reset,
      bukan celah akses.
```

Catatan eksekusi (bukan perubahan file): `05_tests.sql` dipecah per blok uji
(satu panggilan `execute_sql` hanya mengembalikan result set terakhir, dan file
memakai `begin…rollback` + `set local role` per blok). Dua penyesuaian eksekusi:
(a) `request.jwt.claims` diset SEBELUM `set local role authenticated` memakai
UUID literal (subquery `auth.users` ditolak sebagai `authenticated` — permission
denied for table users); (b) subquery `auth.users` di C4/E6a/E6b diganti UUID
literal dengan alasan sama. Semua uji tetap `begin…rollback`; tidak ada file SQL
yang diubah.

**13 Nov 2026 · OpenCode (05 runnable + B3 silent-reset):** `supabase/05_tests.sql` — B3 diganti gaya E4 (lulus bila role di baris tetap 'student' setelah update, bukan menuntut error); UUID akun demo kini diambil dari `auth.users` SEKALI di blok prasiap awal file ke GUC sesi (`simlu.uid.mhs/koor/admin`, `is_local=false`, sebelum `set local role authenticated`) lalu dipakai untuk semua `request.jwt.claims` dan lookup C4/E6a/E6b lewat `current_setting` — tidak ada lagi UUID literal, file bisa dijalankan apa adanya di SQL Editor; rerun seluruh 05 via MCP `supabase-simlu` per blok (semua `begin…rollback`): UJI 39/39 lulus, baris 9 tabel sebelum/sesudah identik (units=6, profiles=3, applications=0, shifts=4, attendance=7, requests=4, reports=4, class_schedules=5, notifications=4). Tidak commit/push.

**13 Nov 2026 · OpenCode (bug "kartu Koordinator tampil -"):** MIGRATION `simlu_05_staff_profiles_readable` = ok — `profiles_select` di-drop lalu di-create ulang dengan cabang tambahan `(role in ('coordinator','admin') and status = 'active')` (kolom baris itu sendiri, tanpa subquery — bebas rekursi). FILE DIUBAH: `supabase/03_rls.sql` (policy disamakan), `supabase/05_tests.sql` (ekspektasi B1f & C1 disesuaikan: staf aktif kini terbaca — mahasiswa/koordinator lihat 3, bukan 1/2; bagian F baru F1–F4). VERIFIKASI sebagai mahasiswa demo (`request.jwt.claims`): `select role, name from public.profiles` → 3 baris: student "Raolika, Yolen Irane", coordinator "M. Sumampouw", admin "Admin Labor". UJI BARU 4/4 lulus (F1 koordinator unitnya = 1, F2 admin aktif = 1, F3 tidak ada profil mahasiswa lain = 0, F4 staf nonaktif tidak terlihat = 0; semua `begin…rollback`, baris tetap profiles=3). C1 diulang langsung = 3, A3 anon tetap 0. Tanpa DROP tabel/TRUNCATE/DELETE data, tanpa ubah Auth, tanpa commit/push/key.

**13 Nov 2026 · Claude (tahap 6: uji web mode supabase, login asli oleh user di browser pane):**

| Sesi | Halaman | Tulis (simpan lalu kembalikan) | Temuan dan perbaikan |
|---|---|---|---|
| Anon | Home (6 unit dari DB), guard ke Login, tombol demo tersembunyi | Insert anon ke `units` ditolak RLS | Unit diurutkan nama |
| Mahasiswa | 8 halaman tanpa error | Pengajuan izin dibuat lalu dibatalkan | Nama koordinator "-" -> OpenCode `simlu_05_staff_profiles_readable`; bagian "Data demo" disembunyikan |
| Koordinator | 7 halaman tanpa error | Jam shift 17:00 -> 16:30 -> 17:00 | Absensi tim kini menampilkan shift hari ini yang belum di-check-in; "Jam bulan ini" dihitung dari absensi |
| Admin | 8 halaman tanpa error | Kuota Perpustakaan 6 -> 7 -> 6, `coordinator_id` tetap | - |

Belum teruji: check-in/check-out via RPC (shift demo 08:00-12:00 sudah lewat saat uji; butuh shift yang jamnya cocok dengan waktu demo) dan alur Daftar (membuat akun Auth sungguhan, perlu dilakukan user sendiri).

**13 Nov 2026 · OpenCode (koreksi request_date tidak cocok shift):** 3 baris `requests` milik akun demo punya `request_date` yang hari-nya ≠ hari shift (`extract(isodow) ≠ shifts.day+1`) — digeser ke tanggal terdekat sebelumnya yang hari-nya sama (hanya kolom `request_date`, UPDATE via MCP `supabase-simlu`, tanpa DELETE/DROP): `ad59064d` 2026-10-15→2026-10-09 (Jumat), `8cf17962` 2026-10-25→2026-10-19 (Senin), `82ed1cca` 2026-11-10→2026-11-05 (Kamis). FILE DIUBAH: `supabase/04_seed.sql` (3 request_date + komentar hari ikut disesuaikan; tetap aman dijalankan ulang). VERIFIKASI: query isodow vs day+1 ulang = 0 baris tidak cocok; `created_at` dan kolom lain tidak disentuh; tanpa commit/push.

**13 Nov 2026 · Claude (uji check-in/out via RPC):** Admin menambah shift demo Jumat 12:20-14:20 lewat form aplikasi. Mahasiswa (login asli) check-in 12:14 lalu check-out: baris `attendance` dibuat lewat `check_in_attendance`, `check_in`/`check_out` berisi timestamp server, web memakai baris dari server dan data bertahan setelah muat ulang. Perbaikan web: pilih shift hari ini yang sedang berjalan/berikutnya (bukan shift pertama), teks "jam dicatat oleh server" dan tombol "Ulangi demo absensi" disembunyikan di mode supabase. Data uji di DB sudah dihapus (13 Nov 2026, OpenCode, persetujuan user): shift 12:20-14:20 (id 93dcfef9...) dan absensinya (id c180eb38...) — baris kembali persis seperti sesudah seed (shifts=4, attendance=7).
