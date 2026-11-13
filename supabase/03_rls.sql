-- ============================================================
-- SIMLU · Tahap 1 · File 3/5: Row Level Security
-- Jalankan setelah 02_functions.sql.
-- Wajib: publishable key dibaca siapa pun dari situs publik.
-- Aturan (bagian E): mahasiswa = barisnya sendiri · koordinator =
-- unitnya · admin = semua · anon = hanya select units.
--
-- Catatan versi paling aman (lihat docs/koordinasi-supabase.md
-- → Catatan balasan):
--   * Mahasiswa TIDAK punya policy tulis pada `attendance` —
--     check-in/out wajib lewat RPC (02_functions.sql) supaya
--     jamnya selalu dari server (keputusan terkunci #6).
--   * Kolom `role`, `status`, `unit_id` di `profiles` dikunci
--     lewat `with check` (mahasiswa tidak bisa mengubahnya sendiri).
-- ============================================================

alter table public.profiles        enable row level security;
alter table public.applications    enable row level security;
alter table public.units           enable row level security;
alter table public.shifts          enable row level security;
alter table public.attendance      enable row level security;
alter table public.requests        enable row level security;
alter table public.reports         enable row level security;
alter table public.class_schedules enable row level security;
alter table public.notifications   enable row level security;

-- ============================================================
-- profiles
-- ============================================================

-- Baca: baris sendiri, admin, koordinator melihat anggota unitnya, dan
-- SEMUA akun login boleh membaca profil STAF AKTIF (koordinator/admin
-- berstatus active) — supaya nama koordinator tampil di kartu
-- "Koordinator" Dashboard/Absensi/Profil mahasiswa (hasil uji web).
-- Pengecekan koordinator memakai fungsi security definer (BUKAN
-- subquery ke profiles) supaya tidak memicu rekursi policy RLS; cabang
-- staf memakai kolom role/status baris yang dibaca itu sendiri (bukan
-- subquery), jadi juga aman dari rekursi.
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
    or (role in ('coordinator','admin') and status = 'active')
  );

-- Ubah: baris sendiri, tetapi role/status/unit_id TERKUNCI pada
-- nilai lama (dicek lewat fungsi definer yang membaca baris lama).
-- Kunci nim/email/name dilakukan trigger protect_profile_columns
-- (02_functions.sql) — bukan subquery di policy ini, supaya tidak
-- ada query ke profiles di dalam policy profiles (hasil review tahap 1,
-- celah 3). Admin bebas mengubah apa pun.
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_admin())
  )
  with check (
    (select public.is_admin())
    or (
      id = (select auth.uid())
      and role = (select public.my_role())
      and status = (select public.my_status())
      and unit_id is not distinct from (select public.my_unit())
    )
  );

-- Hapus: admin saja.
create policy "profiles_delete" on public.profiles
  for delete to authenticated
  using ((select public.is_admin()));

-- ============================================================
-- units
-- ============================================================

-- Baca: siapa saja termasuk anon (dipakai Home dan halaman Daftar).
create policy "units_select" on public.units
  for select to anon, authenticated
  using (true);

-- Tulis: admin saja.
create policy "units_insert" on public.units
  for insert to authenticated
  with check ((select public.is_admin()));

create policy "units_update" on public.units
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "units_delete" on public.units
  for delete to authenticated
  using ((select public.is_admin()));

-- ============================================================
-- applications
-- ============================================================

-- Baca: pemilik, admin, atau koordinator unit pilihan.
create policy "applications_select" on public.applications
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or (select public.is_admin())
    or (
      (select public.is_coordinator_of(unit_choice))
    )
  );

-- Daftar: pemilik, status awal wajib pending.
create policy "applications_insert" on public.applications
  for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and status = 'pending'
  );

-- Keputusan: admin. Pembatalan mandiri: pemilik selama masih pending.
create policy "applications_update" on public.applications
  for update to authenticated
  using (
    (select public.is_admin())
    or (profile_id = (select auth.uid()) and status = 'pending')
  )
  with check (
    (select public.is_admin())
    or (profile_id = (select auth.uid()) and status = 'pending')
  );

create policy "applications_delete" on public.applications
  for delete to authenticated
  using (
    (select public.is_admin())
    or (profile_id = (select auth.uid()) and status = 'pending')
  );

-- ============================================================
-- shifts
-- ============================================================

-- Baca: pemilik, admin, atau koordinator unitnya.
create policy "shifts_select" on public.shifts
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
  );

-- Tulis: koordinator unitnya atau admin (pembuatan/pengubahan jadwal).
create policy "shifts_insert" on public.shifts
  for insert to authenticated
  with check (
    (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
  );

create policy "shifts_update" on public.shifts
  for update to authenticated
  using (
    (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
  )
  with check (
    (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
  );

create policy "shifts_delete" on public.shifts
  for delete to authenticated
  using (
    (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
  );

-- ============================================================
-- attendance
-- ============================================================

-- Baca: pemilik, admin, atau koordinator unitnya.
create policy "attendance_select" on public.attendance
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
  );

-- Tulis langsung: koordinator unitnya atau admin saja (koreksi manual).
-- Mahasiswa hanya lewat RPC check_in_attendance / check_out_attendance
-- (jam diisi server, keputusan terkunci #6).
create policy "attendance_insert" on public.attendance
  for insert to authenticated
  with check (
    (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
  );

create policy "attendance_update" on public.attendance
  for update to authenticated
  using (
    (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
  )
  with check (
    (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
  );

create policy "attendance_delete" on public.attendance
  for delete to authenticated
  using (
    (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
  );

-- ============================================================
-- requests
-- ============================================================

-- Baca: pemilik, admin, atau koordinator unitnya.
create policy "requests_select" on public.requests
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
  );

-- Ajukan: pemilik, selalu status pending, HANYA unitnya sendiri,
-- dan hanya akun aktif (hasil review tahap 1, celah 2).
create policy "requests_insert" on public.requests
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and status = 'pending'
    and unit_id is not distinct from (select public.my_unit())
    and (select public.my_status()) = 'active'
  );

-- Keputusan: koordinator unitnya atau admin.
-- Pembatalan/penyuntingan mandiri: pemilik selama masih pending
-- (with check status='pending' memaksa mahasiswa tidak bisa
-- menyetujui pengajuannya sendiri).
create policy "requests_update" on public.requests
  for update to authenticated
  using (
    (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
    or (student_id = (select auth.uid()) and status = 'pending')
  )
  with check (
    (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
    or (student_id = (select auth.uid()) and status = 'pending'
        and unit_id is not distinct from (select public.my_unit()))
  );

create policy "requests_delete" on public.requests
  for delete to authenticated
  using (
    (select public.is_admin())
    or (student_id = (select auth.uid()) and status = 'pending')
  );

-- ============================================================
-- reports
-- ============================================================

-- Baca: pemilik, admin, atau koordinator unitnya.
create policy "reports_select" on public.reports
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
  );

-- Kirim: pemilik, selama belum dinilai (score wajib null → mahasiswa
-- tidak bisa menetapkan nilai sendiri), status tidak boleh 'graded',
-- HANYA unitnya sendiri, dan hanya akun aktif
-- (hasil review tahap 1, celah 2).
create policy "reports_insert" on public.reports
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and score is null
    and status in ('draft', 'submitted', 'late')
    and unit_id is not distinct from (select public.my_unit())
    and (select public.my_status()) = 'active'
  );

-- Ubah: pemilik selama belum dinilai dan tidak menetapkan skor,
-- ATAU koordinator unitnya / admin (menilai: score, comment, graded).
create policy "reports_update" on public.reports
  for update to authenticated
  using (
    (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
    or (student_id = (select auth.uid()) and status <> 'graded')
  )
  with check (
    (select public.is_admin())
    or (select public.is_coordinator_of(unit_id))
    or (
      student_id = (select auth.uid())
      and score is null
      and status in ('draft', 'submitted', 'late')
      and unit_id is not distinct from (select public.my_unit())
    )
  );

-- Hapus: admin saja.
create policy "reports_delete" on public.reports
  for delete to authenticated
  using ((select public.is_admin()));

-- ============================================================
-- class_schedules
-- ============================================================

-- Baca: pemilik, admin, atau koordinator unit mahasiswa itu
-- (dibutuhkan untuk tanda "bentrok kuliah" saat menyusun shift —
-- hasil koordinasi tahap 5). Subquery ke profiles aman di sini
-- karena policy-nya berada di tabel class_schedules, bukan profiles.
create policy "class_schedules_select" on public.class_schedules
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.is_admin())
    or (
      (select public.is_coordinator_of(
        (select p.unit_id from public.profiles p where p.id = student_id)
      ))
    )
  );

-- Tulis: pemilik (mahasiswa mengelola jadwalnya sendiri) atau admin.
create policy "class_schedules_insert" on public.class_schedules
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    or (select public.is_admin())
  );

create policy "class_schedules_update" on public.class_schedules
  for update to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.is_admin())
  )
  with check (
    student_id = (select auth.uid())
    or (select public.is_admin())
  );

create policy "class_schedules_delete" on public.class_schedules
  for delete to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.is_admin())
  );

-- ============================================================
-- notifications
-- ============================================================

-- Baca: pemilik atau admin.
create policy "notifications_select" on public.notifications
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or (select public.is_admin())
  );

-- Kirim: admin, atau koordinator untuk anggota unitnya.
create policy "notifications_insert" on public.notifications
  for insert to authenticated
  with check (
    (select public.is_admin())
    or exists (
      select 1 from public.profiles t
      where t.id = profile_id
        and (select public.is_coordinator_of(t.unit_id))
    )
  );

-- Tandai dibaca: pemilik. Admin juga boleh.
create policy "notifications_update" on public.notifications
  for update to authenticated
  using (
    profile_id = (select auth.uid())
    or (select public.is_admin())
  )
  with check (
    profile_id = (select auth.uid())
    or (select public.is_admin())
  );

create policy "notifications_delete" on public.notifications
  for delete to authenticated
  using ((select public.is_admin()));
