-- ============================================================
-- SIMLU · Tahap 1 · File 4/5: Seed data demo
-- Jalankan setelah 03_rls.sql, SETELAH Tahap 0 selesai
-- (3 akun demo sudah dibuat di dashboard, lihat README.md).
--
-- Sumber data: js/demo-data.js + js/store.js (SEED).
-- Aturan seed:
--   * TIDAK meng-insert ke auth.users — akun diambil lewat email.
--   * Aman dijalankan ulang: units pakai `on conflict`,
--     tabel isi dihapus dulu (delete-first) lalu diisi ulang.
--   * Zona waktu WITA = UTC+08 tetap (Asia/Makassar, tanpa DST).
--
-- Batas diketahui (lihat docs/koordinasi-supabase.md → Catatan
-- balasan): hanya 3 akun demo yang ada, jadi baris milik mahasiswa
-- lain (Grace, Sarah, Kevin, Daniel, Maria, Yohanes) dan 4 pendaftar
-- TIDAK ikut di-seed — butuh akun Auth masing-masing.
-- ============================================================

begin;

-- ---------- 0. ID akun demo ----------
create temp table demo_ids on commit drop as
  select email, id
  from auth.users
  where email in (
    '12510207@student.unklab.ac.id',
    'm.sumampouw@unklab.ac.id',
    'labor@unklab.ac.id'
  );

do $$
declare v_n integer;
begin
  select count(*) into v_n from demo_ids;
  if v_n < 3 then
    raise warning
      'Akun demo belum lengkap (% dari 3). Seed untuk akun yang hilang dilewati. Cek README.md bagian Tahap 0.',
      v_n;
  end if;
end $$;

-- ---------- 1. Units ----------
insert into public.units (name, description, quota, max_hours, target_hours)
values
  ('Perpustakaan',       'Sirkulasi, shelving, layanan ruang baca',   6, 20, 16),
  ('Kafetaria',          'Penyajian, kasir, kebersihan dapur',        5, 20, 16),
  ('IT Support',         'Helpdesk, perawatan lab komputer',          4, 20, 16),
  ('Asrama',             'Administrasi dan kebersihan asrama',        4, 16, 12),
  ('Kebersihan Kampus',  'Area gedung kuliah dan taman',              3, 20, 16),
  ('Administrasi',       'Arsip dan layanan front office',            2, 12, 8)
on conflict (name) do update
  set description = excluded.description,
      quota       = excluded.quota,
      max_hours   = excluded.max_hours,
      target_hours = excluded.target_hours;

-- ---------- 2. Profiles 3 akun demo (akun dibuat lewat dashboard;
--              trigger 02 sudah membuat barisnya, di sini diperbarui) ----------
update public.profiles
  set name = 'Raolika, Yolen Irane',
      nim = '12510207',
      phone = '0812 3456 7890',
      program = 'Informatika',
      role = 'student',
      status = 'active',
      unit_id = (select id from public.units where name = 'Perpustakaan')
where email = '12510207@student.unklab.ac.id';

update public.profiles
  set name = 'M. Sumampouw',
      phone = '0813 2222 1100',
      role = 'coordinator',
      status = 'active',
      unit_id = (select id from public.units where name = 'Perpustakaan')
where email = 'm.sumampouw@unklab.ac.id';

update public.profiles
  set name = 'Admin Labor',
      phone = '0431 000 000',
      role = 'admin',
      status = 'active',
      unit_id = null
where email = 'labor@unklab.ac.id';

-- ---------- 3. Koordinator unit Perpustakaan ----------
update public.units
  set coordinator_id = (select id from demo_ids where email = 'm.sumampouw@unklab.ac.id')
where name = 'Perpustakaan';

-- ---------- 4. Hapus isi demo lama supaya aman dijalankan ulang ----------
delete from public.attendance      where student_id in (select id from demo_ids);
delete from public.requests        where student_id in (select id from demo_ids);
delete from public.reports         where student_id in (select id from demo_ids);
delete from public.shifts          where student_id in (select id from demo_ids);
delete from public.class_schedules where student_id in (select id from demo_ids);
delete from public.notifications   where profile_id in (select id from demo_ids);

-- ---------- 5. Shifts mahasiswa demo (pola mingguan, dari DEMO.shiftGrid) ----------
insert into public.shifts (student_id, unit_id, day, start_time, end_time, flag) values
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'), 0, '13:00', '17:00', null),   -- Senin
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'), 1, '13:00', '17:00', 'conflict'), -- Selasa (bentrok kuliah)
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'), 3, '13:00', '17:00', 'leave'),   -- Kamis (izin diajukan)
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'), 4, '08:00', '12:00', null);   -- Jumat

-- ---------- 6. Attendance mahasiswa demo (dari DEMO.history + HISTORY_DATES) ----------
-- WITA tetap UTC+08, ditulis eksplisit sebagai "+08" supaya tidak
-- tergantung zona waktu server.
insert into public.attendance (student_id, unit_id, date, shift_start, shift_end, check_in, check_out, leave) values
  -- Senin 10 Nov · 13:00–17:00 · tepat waktu
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'),
   '2026-11-10', '13:00', '17:00', '2026-11-10 12:57+08', '2026-11-10 17:02+08', false),
  -- Jumat 7 Nov · 08:00–12:00 · telat 14 m
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'),
   '2026-11-07', '08:00', '12:00', '2026-11-07 08:14+08', '2026-11-07 12:00+08', false),
  -- Kamis 6 Nov · 13:00–17:00 · belum check-out
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'),
   '2026-11-06', '13:00', '17:00', '2026-11-06 12:55+08', null, false),
  -- Rabu 5 Nov · 13:00–17:00 · izin
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'),
   '2026-11-05', '13:00', '17:00', null, null, true),
  -- Senin 3 Nov · 13:00–17:00 · tepat waktu
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'),
   '2026-11-03', '13:00', '17:00', '2026-11-03 12:58+08', '2026-11-03 17:00+08', false),
  -- Jumat 31 Okt · 08:00–12:00 · tepat waktu
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'),
   '2026-10-31', '08:00', '12:00', '2026-10-31 07:59+08', '2026-10-31 12:01+08', false),
  -- Kamis 30 Okt · 13:00–17:00 · tepat waktu
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'),
   '2026-10-30', '13:00', '17:00', '2026-10-30 12:52+08', '2026-10-30 17:05+08', false);

-- ---------- 7. Requests mahasiswa demo (dari DEMO.requestHistory) ----------
insert into public.requests
  (student_id, unit_id, type, shift_id, replacement_id, reason, status, note, request_date, created_at)
values
  -- Izin · Kamis 5 Nov 13:00–17:00 · Menunggu
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'),
   'izin',
   (select s.id from public.shifts s
    where s.student_id = (select id from demo_ids where email = '12510207@student.unklab.ac.id')
      and s.day = 3 and s.start_time = '13:00'),
   null,
   'Ujian praktikum', 'pending', '', '2026-11-05', '2026-11-10 08:30+08'),
  -- Tukar shift · Rabu 5 Nov 13:00–17:00 · Disetujui
  -- (pengganti Kevin Lumowa belum punya akun Auth → replacement_id null,
  --  nama disimpan di note agar UI tetap menampilkan penggantinya)
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'),
   'tukar_shift',
   null,
   null,
   'Bentrok kuliah tambahan', 'approved', 'Pengganti: Kevin Lumowa', '2026-11-03', '2026-11-03 08:00+08'),
  -- Izin · Senin 19 Okt 13:00–17:00 · Ditolak
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'),
   'izin',
   (select s.id from public.shifts s
    where s.student_id = (select id from demo_ids where email = '12510207@student.unklab.ac.id')
      and s.day = 0 and s.start_time = '13:00'),
   null,
   'Acara keluarga', 'rejected', 'Pengajuan kurang dari 24 jam sebelum shift.', '2026-10-19', '2026-10-25 09:00+08'),
  -- Izin · Jumat 9 Okt 08:00–12:00 · Disetujui
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'),
   'izin',
   (select s.id from public.shifts s
    where s.student_id = (select id from demo_ids where email = '12510207@student.unklab.ac.id')
      and s.day = 4 and s.start_time = '08:00'),
   null,
   'Sakit', 'approved', '', '2026-10-09', '2026-10-15 10:00+08');

-- ---------- 8. Reports mahasiswa demo (dari DEMO.reportHistory + reportsAll) ----------
insert into public.reports (student_id, unit_id, week, summary, note, status, score, comment, sent_at) values
  -- Minggu 42 · Terlambat · 82
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'),
   42, 'Membantu persiapan pameran buku.', '', 'late', 82, '', null),
  -- Minggu 43 · Dinilai · 90
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'),
   43, 'Layanan sirkulasi dan input data anggota baru.', '', 'graded', 90, '', null),
  -- Minggu 44 · Dinilai · 85 · komentar koordinator terakhir
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'),
   44, 'Shelving rak 500-an, merapikan ruang baca.', '', 'graded', 85,
   'Kerja rapi. Lain kali catat jumlah buku yang diproses supaya laporannya lebih terukur.', null),
  -- Minggu 45 · Menunggu nilai
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   (select id from public.units where name = 'Perpustakaan'),
   45,
   'Membantu inventaris koleksi baru dan layanan peminjaman. Kendala: scanner barcode sering error.',
   '', 'submitted', null, '', '2026-11-09 20:14+08');

-- ---------- 9. Class schedules mahasiswa demo (dari DEMO.week, type = class) ----------
insert into public.class_schedules (student_id, day, start_time, end_time, course, room) values
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'), 0, '08:00', '09:40', 'Perancangan Web', 'GK2 · Lab 3'),
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'), 1, '08:00', '09:40', 'Perancangan Web', 'GK2 · Lab 3'),
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'), 1, '10:00', '11:40', 'Basis Data',      'GK1 · R. 204'),
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'), 1, '15:00', '16:40', 'Statistika',     'GK2 · R. 105'),
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'), 3, '08:00', '09:40', 'Statistika',     'GK2 · R. 105');

-- ---------- 10. Notifications mahasiswa demo (dari DEMO.notifications) ----------
insert into public.notifications (profile_id, title, body, read_at, created_at) values
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   'Shift hari ini 13:00–17:00', 'Perpustakaan', null, '2026-11-13 07:00+08'),
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   'Tukar shift disetujui', 'Kamis 13 Nov → Kevin L.', null, '2026-11-12 16:00+08'),
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   'Laporan minggu ke-46 belum diisi', 'Batas Minggu 16 Nov 23:59', null, '2026-11-12 09:00+08'),
  ((select id from demo_ids where email = '12510207@student.unklab.ac.id'),
   'Jadwal minggu depan sudah dibuat', 'Kemarin', now(), '2026-11-11 18:00+08');

-- ---------- 11. Verifikasi ----------
select 'units' as tabel, count(*) as baris, 6 as diharapkan from public.units
union all
select 'profiles (3 akun demo)', count(*), 3
  from public.profiles
 where email in ('12510207@student.unklab.ac.id', 'm.sumampouw@unklab.ac.id', 'labor@unklab.ac.id')
union all
select 'shifts', count(*), 4
  from public.shifts
 where student_id = (select id from demo_ids where email = '12510207@student.unklab.ac.id')
union all
select 'attendance', count(*), 7
  from public.attendance
 where student_id = (select id from demo_ids where email = '12510207@student.unklab.ac.id')
union all
select 'requests', count(*), 4
  from public.requests
 where student_id = (select id from demo_ids where email = '12510207@student.unklab.ac.id')
union all
select 'reports', count(*), 4
  from public.reports
 where student_id = (select id from demo_ids where email = '12510207@student.unklab.ac.id')
union all
select 'class_schedules', count(*), 5
  from public.class_schedules
 where student_id = (select id from demo_ids where email = '12510207@student.unklab.ac.id')
union all
select 'notifications', count(*), 4
  from public.notifications
 where profile_id = (select id from demo_ids where email = '12510207@student.unklab.ac.id');

commit;
