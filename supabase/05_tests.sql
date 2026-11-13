-- ============================================================
-- SIMLU · Tahap 1 · File 5/5: Query uji RLS per role
-- Jalankan setelah 04_seed.sql.
-- Semua uji dalam transaksi yang di-ROLLBACK → tidak mengubah data.
-- Hasil dibaca dari kolom `lulus`: true = lulus, false = gagal.
--
-- CATATAN: uji akses silang antar-mahasiswa butuh 2 akun mahasiswa;
-- karena Tahap 0 hanya membuat 3 akun demo, bagian itu diberi
-- tempat kosong di bagian B2 — isi setelah akun kedua dibuat.
--
-- CATATAN 2: UUID akun demo diambil dari auth.users SEKALI di blok
-- prasiap di bawah (sebelum `set local role authenticated`), disimpan
-- ke GUC tingkat SESI (is_local = false, sehingga selamat melewati
-- commit/rollback antar-blok), lalu dibaca lewat current_setting di
-- semua blok uji. Alasan: sebagai `authenticated`, subquery ke
-- auth.users ditolak (permission denied); id akun juga berbeda per
-- project, jadi tidak boleh ditulis keras.
-- ============================================================

-- ============================================================
-- 0. PRASIAP: simpan UUID akun demo ke GUC sesi (jalankan dulu)
-- ============================================================
do $$
declare
  v_mhs   text;
  v_koor  text;
  v_admin text;
begin
  select id::text into v_mhs   from auth.users where email = '12510207@student.unklab.ac.id';
  select id::text into v_koor  from auth.users where email = 'm.sumampouw@unklab.ac.id';
  select id::text into v_admin from auth.users where email = 'labor@unklab.ac.id';
  if v_mhs is null or v_koor is null or v_admin is null then
    raise exception 'Akun demo tidak lengkap di auth.users — jalankan tahap 0 dulu (mhs=%, koor=%, admin=%)', v_mhs, v_koor, v_admin;
  end if;
  perform set_config('simlu.uid.mhs',   v_mhs,   false);
  perform set_config('simlu.uid.koor',  v_koor,  false);
  perform set_config('simlu.uid.admin', v_admin, false);
end $$;

-- ============================================================
-- A. ANON (belum login)
-- ============================================================
begin;
set local role anon;
select 'A1 · anon baca units (untuk Home/Daftar)' as uji, count(*) >= 6 as lulus from public.units;
select 'A2 · anon TIDAK bisa baca attendance' as uji, count(*) = 0 as lulus from public.attendance;
select 'A3 · anon TIDAK bisa baca profiles' as uji, count(*) = 0 as lulus from public.profiles;
select 'A4 · anon TIDAK bisa baca notifications' as uji, count(*) = 0 as lulus from public.notifications;
select 'A5 · anon TIDAK bisa baca requests' as uji, count(*) = 0 as lulus from public.requests;
commit;

-- ============================================================
-- B. MAHASISWA (12510207@student.unklab.ac.id)
-- ============================================================
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.mhs', true), 'role', 'authenticated')::text, true);

-- B1 · Bisa membaca barisnya sendiri
select 'B1a · mahasiswa baca attendance sendiri (>= 7)' as uji, count(*) >= 7 as lulus from public.attendance;
select 'B1b · mahasiswa baca shifts sendiri (= 4)' as uji, count(*) = 4 as lulus from public.shifts;
select 'B1c · mahasiswa baca requests sendiri (= 4)' as uji, count(*) = 4 as lulus from public.requests;
select 'B1d · mahasiswa baca reports sendiri (= 4)' as uji, count(*) = 4 as lulus from public.reports;
select 'B1e · mahasiswa baca notifications sendiri (= 4)' as uji, count(*) = 4 as lulus from public.notifications;
-- B1f · Diri sendiri + STAF AKTIF (koordinator & admin — cabang staf
--       policy profiles_select, migration simlu_05_staff_profiles_readable;
--       dipakai kartu "Koordinator"). Dengan 3 akun demo = 3. Mahasiswa
--       lain TETAP tersembunyi — diuji di B2 dan bagian F3.
select 'B1f · mahasiswa lihat diri + staf aktif (= 3)' as uji, count(*) = 3 as lulus from public.profiles;

-- B2 · Uji akses silang antar-mahasiswa:
--      butuh akun mahasiswa kedua (di luar 3 akun demo).
--      Setelah akun kedua dibuat + diberi data, tempel di sini:
--        select 'B2 · mahasiswa TIDAK bisa baca absensi akun lain' as uji,
--               count(*) = 0 as lulus from public.attendance
--         where student_id = (select id from auth.users
--                             where email = 'EMAIL_AKUN_KEDUA');

-- B3 · Mahasiswa mencoba mengubah role sendiri → trigger silent reset:
--      nilai lama dikembalikan diam-diam, role di baris tetap 'student'
--      (gaya sama dengan E4; bukan menuntut error)
do $$
declare
  v_before text;
  v_after  text;
begin
  select role::text into v_before from public.profiles where id = (select auth.uid());

  update public.profiles set role = 'admin' where id = (select auth.uid());

  select role::text into v_after from public.profiles where id = (select auth.uid());

  if v_after = v_before and v_after = 'student' then
    raise notice 'LULUS B3: role tetap % setelah update (silent reset oleh trigger)', v_after;
  else
    raise exception 'GAGAL B3: role berubah menjadi %', v_after;
  end if;
end $$;

-- B4 · Mahasiswa TIDAK bisa menetapkan skor laporannya sendiri
do $$
begin
  insert into public.reports (student_id, unit_id, week, summary, status, score)
  values ((select auth.uid()), (select public.my_unit()), 47, 'uji skor', 'draft', 50);
  raise exception 'GAGAL: mahasiswa bisa menetapkan skor sendiri';
exception
  when insufficient_privilege or check_violation then
    raise notice 'LULUS: mahasiswa tidak bisa menetapkan skor sendiri';
end $$;

-- B5 · Mahasiswa TIDAK bisa menulis attendance langsung (policy tulis
--      tidak ada) — update langsung harus menyentuh 0 baris.
--      Jalannya: RPC check_in_attendance / check_out_attendance.
with u as (
  update public.attendance set check_in = now() where student_id = (select auth.uid())
  returning 1
)
select 'B5 · mahasiswa update attendance langsung = 0 baris' as uji, count(*) = 0 as lulus from u;

-- B6 · Mahasiswa BISA mengajukan izin (uji positif, ikut rollback)
with u as (
  insert into public.requests (student_id, unit_id, type, reason, status)
  values ((select auth.uid()), (select public.my_unit()), 'izin', 'uji otomatis', 'pending')
  returning 1
)
select 'B6 · mahasiswa bisa membuat pengajuan baru' as uji, count(*) = 1 as lulus from u;

-- B7 · Check-out lewat RPC mengisi waktu SERVER (uji positif)
with r as (
  select public.check_out_attendance(
    (select id from public.attendance
     where student_id = (select auth.uid()) and check_out is null
     limit 1)
  ) as res
)
select 'B7 · RPC check-out mengisi check_out (waktu server)' as uji,
       (r.res).check_out is not null as lulus
from r;

rollback;

-- ============================================================
-- C. KOORDINATOR (m.sumampouw@unklab.ac.id — unit Perpustakaan)
-- ============================================================
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.koor', true), 'role', 'authenticated')::text, true);

-- C1 · Koordinator melihat dirinya + mahasiswa unitnya + admin aktif
--      (cabang staf policy profiles_select — staf aktif boleh dibaca
--      semua akun login; migration simlu_05_staff_profiles_readable).
--      Dengan 3 akun demo = 3; unit lain tidak terlihat.
select 'C1 · koordinator lihat diri + unitnya + staf aktif (= 3)' as uji, count(*) = 3 as lulus from public.profiles;

-- C2 · Koordinator melihat absensi unitnya (>= 7, semua milik unit Perpustakaan)
select 'C2 · koordinator baca absensi unitnya (>= 7)' as uji, count(*) >= 7 as lulus from public.attendance;

-- C3 · Koordinator TIDAK bisa membuat shift di unit lain
do $$
begin
  insert into public.shifts (student_id, unit_id, day, start_time, end_time)
  values ((select auth.uid()), (select id from public.units where name = 'Kafetaria'), 0, '08:00', '12:00');
  raise exception 'GAGAL: koordinator bisa menulis di luar unitnya';
exception
  when insufficient_privilege or check_violation then
    raise notice 'LULUS: koordinator tidak bisa menulis di luar unitnya';
end $$;

-- C4 · Koordinator bisa menilai laporan unitnya (uji positif, ikut rollback)
with u as (
  update public.reports
    set status = 'graded', score = 90, comment = 'uji penilaian'
  where student_id = current_setting('simlu.uid.mhs', true)::uuid
    and week = 45
  returning 1
)
select 'C4 · koordinator bisa menilai laporan unitnya' as uji, count(*) = 1 as lulus from u;

rollback;

-- ============================================================
-- D. ADMIN (labor@unklab.ac.id)
-- ============================================================
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.admin', true), 'role', 'authenticated')::text, true);

-- D1 · Admin melihat semua profile (= 3)
select 'D1 · admin lihat semua profiles (= 3)' as uji, count(*) = 3 as lulus from public.profiles;

-- D2 · Admin melihat semua attendance (>= 7)
select 'D2 · admin baca semua attendance (>= 7)' as uji, count(*) >= 7 as lulus from public.attendance;

-- D3 · Admin bisa membuat unit baru (uji positif, ikut rollback)
with u as (
  insert into public.units (name, description, quota)
  values ('Unit Uji Sementara', 'dibuat oleh 05_tests.sql, langsung di-rollback', 0)
  returning 1
)
select 'D3 · admin bisa membuat unit' as uji, count(*) = 1 as lulus from u;

-- D4 · Admin bisa mengubah role profil siapa pun (uji positif, ikut rollback)
with u as (
  update public.profiles
    set role = 'coordinator'
  where email = '12510207@student.unklab.ac.id'
  returning 1
)
select 'D4 · admin bisa mengubah role profil' as uji, count(*) = 1 as lulus from u;

rollback;

-- ============================================================
-- E. Uji tambahan hasil review tahap 1 (perbaikan 4 celah)
-- ============================================================

-- ------------------------------------------------------------
-- E1 · Celah 1: RPC check-in hanya untuk mahasiswa AKTIF;
--      unit, tanggal, dan jam diambil dari server/tabel, bukan klien.
-- ------------------------------------------------------------
-- E1a · Koordinator/admin memanggil check-in → ditolak
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.koor', true), 'role', 'authenticated')::text, true);
do $$
declare v_msg text;
begin
  begin
    perform public.check_in_attendance((select id from public.shifts limit 1));
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is not null then
    raise notice 'LULUS E1a: koordinator ditolak check-in (pesan: %)', v_msg;
  else
    raise exception 'GAGAL E1a: koordinator berhasil check-in';
  end if;
end $$;
rollback;

-- E1b · Mahasiswa berstatus inactive → check-in ditolak
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.admin', true), 'role', 'authenticated')::text, true);
update public.profiles set status = 'inactive' where email = '12510207@student.unklab.ac.id';
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.mhs', true), 'role', 'authenticated')::text, true);
do $$
declare v_msg text;
begin
  begin
    perform public.check_in_attendance((select id from public.shifts limit 1));
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is not null then
    raise notice 'LULUS E1b: mahasiswa inactive ditolak check-in (pesan: %)', v_msg;
  else
    raise exception 'GAGAL E1b: mahasiswa inactive berhasil check-in';
  end if;
end $$;
rollback;

-- E1c · Mahasiswa aktif: check-in sukses, unit & tanggal dari SERVER
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.mhs', true), 'role', 'authenticated')::text, true);
with r as (
  select public.check_in_attendance(
    (select id from public.shifts where student_id = (select auth.uid()) limit 1)
  ) as res
)
select 'E1c · check-in RPC: unit = unit saya, tanggal = tanggal server (WITA)' as uji,
       ((r.res).unit_id is not distinct from (select public.my_unit())
        and (r.res).date = (now() at time zone 'Asia/Makassar')::date
        and (r.res).check_in is not null) as lulus
from r;
rollback;

-- E1d · Mahasiswa tidak bisa check-in pakai shift orang lain
--       (diharapkan ditolak; shift milik orang lain belum ada karena
--       seed hanya 3 akun — tempel shift_id akun kedua bila sudah ada)
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.mhs', true), 'role', 'authenticated')::text, true);
do $$
declare v_msg text;
begin
  begin
    perform public.check_in_attendance('00000000-0000-0000-0000-000000000000');
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is not null then
    raise notice 'LULUS E1d: shift tidak valid ditolak (pesan: %)', v_msg;
  else
    raise exception 'GAGAL E1d: check-in dengan shift tak dikenal berhasil';
  end if;
end $$;
rollback;

-- ------------------------------------------------------------
-- E2 · Celah 2a: requests mahasiswa hanya unit sendiri + akun aktif
-- ------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.mhs', true), 'role', 'authenticated')::text, true);
do $$
declare v_msg text;
begin
  begin
    insert into public.requests (student_id, unit_id, type, reason, status)
    values ((select auth.uid()), (select id from public.units where name = 'Kafetaria'),
            'izin', 'uji lintas unit', 'pending');
  exception when insufficient_privilege or check_violation then v_msg := sqlerrm;
  end;
  if v_msg is not null then
    raise notice 'LULUS E2a: pengajuan ke unit lain ditolak (pesan: %)', v_msg;
  else
    raise exception 'GAGAL E2a: pengajuan ke unit lain berhasil';
  end if;
end $$;

-- E2b · Mahasiswa berstatus pending TIDAK bisa mengajukan
--       (status diubah oleh admin, lalu claims kembali ke mahasiswa)
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.admin', true), 'role', 'authenticated')::text, true);
update public.profiles set status = 'pending' where email = '12510207@student.unklab.ac.id';
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.mhs', true), 'role', 'authenticated')::text, true);
do $$
declare v_msg text;
begin
  begin
    insert into public.requests (student_id, unit_id, type, reason, status)
    values ((select auth.uid()), (select public.my_unit()), 'izin', 'uji akun pending', 'pending');
  exception when insufficient_privilege or check_violation then v_msg := sqlerrm;
  end;
  if v_msg is not null then
    raise notice 'LULUS E2b: akun pending ditolak mengajukan (pesan: %)', v_msg;
  else
    raise exception 'GAGAL E2b: akun pending berhasil mengajukan';
  end if;
end $$;

-- E2c · Mahasiswa tidak bisa memindahkan pengajuannya ke unit lain
--       (status dikembalikan ke active oleh admin dulu)
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.admin', true), 'role', 'authenticated')::text, true);
update public.profiles set status = 'active' where email = '12510207@student.unklab.ac.id';
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.mhs', true), 'role', 'authenticated')::text, true);
do $$
declare v_msg text;
begin
  begin
    update public.requests
      set unit_id = (select id from public.units where name = 'Kafetaria')
    where student_id = (select auth.uid()) and status = 'pending';
  exception when insufficient_privilege or check_violation then v_msg := sqlerrm;
  end;
  if v_msg is not null then
    raise notice 'LULUS E2c: memindahkan pengajuan ke unit lain ditolak (pesan: %)', v_msg;
  else
    raise exception 'GAGAL E2c: pengajuan berhasil dipindahkan ke unit lain';
  end if;
end $$;
rollback;

-- ------------------------------------------------------------
-- E3 · Celah 2b: reports mahasiswa — tanpa skor, tanpa 'graded',
--      hanya unit sendiri, akun aktif
-- ------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.mhs', true), 'role', 'authenticated')::text, true);

-- E3a · Mengirim laporan berstatus 'graded' → ditolak
do $$
declare v_msg text;
begin
  begin
    insert into public.reports (student_id, unit_id, week, summary, status, score)
    values ((select auth.uid()), (select public.my_unit()), 48, 'uji status graded', 'graded', 80);
  exception when insufficient_privilege or check_violation then v_msg := sqlerrm;
  end;
  if v_msg is not null then
    raise notice 'LULUS E3a: status graded oleh mahasiswa ditolak (pesan: %)', v_msg;
  else
    raise exception 'GAGAL E3a: mahasiswa berhasil mengirim laporan graded';
  end if;
end $$;

-- E3b · Mengirim laporan ke unit lain → ditolak
do $$
declare v_msg text;
begin
  begin
    insert into public.reports (student_id, unit_id, week, summary, status)
    values ((select auth.uid()), (select id from public.units where name = 'Kafetaria'), 48, 'uji lintas unit', 'submitted');
  exception when insufficient_privilege or check_violation then v_msg := sqlerrm;
  end;
  if v_msg is not null then
    raise notice 'LULUS E3b: laporan ke unit lain ditolak (pesan: %)', v_msg;
  else
    raise exception 'GAGAL E3b: laporan ke unit lain berhasil';
  end if;
end $$;

-- E3c · Akun pending → tidak bisa mengirim laporan
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.admin', true), 'role', 'authenticated')::text, true);
update public.profiles set status = 'pending' where email = '12510207@student.unklab.ac.id';
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.mhs', true), 'role', 'authenticated')::text, true);
do $$
declare v_msg text;
begin
  begin
    insert into public.reports (student_id, unit_id, week, summary, status)
    values ((select auth.uid()), (select public.my_unit()), 48, 'uji akun pending', 'submitted');
  exception when insufficient_privilege or check_violation then v_msg := sqlerrm;
  end;
  if v_msg is not null then
    raise notice 'LULUS E3c: akun pending ditolak mengirim laporan (pesan: %)', v_msg;
  else
    raise exception 'GAGAL E3c: akun pending berhasil mengirim laporan';
  end if;
end $$;
rollback;

-- ------------------------------------------------------------
-- E4 · Celah 3: nim/email/name dikunci lewat trigger (nilai lama
--      dikembalikan diam-diam); phone/program tetap bisa diubah
-- ------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.mhs', true), 'role', 'authenticated')::text, true);
do $$
declare
  v_old record;
  v_new record;
begin
  select nim, email, name, phone into v_old from public.profiles where id = (select auth.uid());

  update public.profiles
    set nim = '99999999', email = 'ubah@contoh.com', name = 'Nama Ubahan',
        phone = '0811 9999 9999', program = 'Sistem Informasi'
  where id = (select auth.uid());

  select nim, email, name, phone into v_new from public.profiles where id = (select auth.uid());

  if v_new.nim = v_old.nim
     and v_new.email = v_old.email
     and v_new.name = v_old.name
     and v_new.phone <> v_old.phone then
    raise notice 'LULUS E4: nim/email/name terkunci oleh trigger, phone tetap bisa diubah';
  else
    raise exception 'GAGAL E4: kolom profil tidak terkunci sebagaimana mestinya';
  end if;
end $$;
rollback;

-- ------------------------------------------------------------
-- E5 · Celah 4: koordinator harus status 'active'
-- ------------------------------------------------------------
begin;
set local role authenticated;
-- Nonaktifkan koordinator (sebagai admin), lalu lihat dari matanya
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.admin', true), 'role', 'authenticated')::text, true);
update public.profiles set status = 'inactive' where email = 'm.sumampouw@unklab.ac.id';
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.koor', true), 'role', 'authenticated')::text, true);
select 'E5 · koordinator inactive tidak bisa baca absensi unitnya' as uji, count(*) = 0 as lulus from public.attendance;
rollback;

-- E5b · Koordinator aktif: is_coordinator_of(unit sendiri) = true
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.koor', true), 'role', 'authenticated')::text, true);
select 'E5b · koordinator aktif mengenali unitnya sendiri' as uji,
       (select public.is_coordinator_of((select public.my_unit()))) as lulus;
rollback;

-- ------------------------------------------------------------
-- E6 · class_schedules: koordinator unit mahasiswa bisa membaca
--      (untuk tanda "bentrok kuliah" saat menyusun shift);
--      koordinator unit lain tidak.
-- ------------------------------------------------------------
-- E6a · Koordinator Perpustakaan membaca jadwal kuliah mahasiswa
--       unitnya (seed membuat 5 baris untuk mahasiswa demo)
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.koor', true), 'role', 'authenticated')::text, true);
select 'E6a · koordinator baca class_schedules mahasiswa unitnya (= 5)' as uji,
       count(*) = 5 as lulus
from public.class_schedules
where student_id = current_setting('simlu.uid.mhs', true)::uuid;
rollback;

-- E6b · Koordinator yang DIUBAH ke unit lain (sebagai admin, lalu
--       rollback) tidak bisa membaca jadwal kuliah mahasiswa itu
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.admin', true), 'role', 'authenticated')::text, true);
update public.profiles
  set unit_id = (select id from public.units where name = 'Kafetaria')
where email = 'm.sumampouw@unklab.ac.id';
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.koor', true), 'role', 'authenticated')::text, true);
select 'E6b · koordinator unit lain tidak baca class_schedules mahasiswa (= 0)' as uji,
       count(*) = 0 as lulus
from public.class_schedules
where student_id = current_setting('simlu.uid.mhs', true)::uuid;
rollback;

-- ------------------------------------------------------------
-- F · Profil staf aktif dapat dibaca semua akun login
--     (migration simlu_05_staff_profiles_readable): tanpa ini kartu
--     "Koordinator" di Dashboard/Absensi/Profil mahasiswa tampil "-".
--     Mahasiswa lain / staf nonaktif TETAP tersembunyi.
-- ------------------------------------------------------------
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.mhs', true), 'role', 'authenticated')::text, true);

-- F1 · Mahasiswa bisa membaca profil koordinator unitnya
select 'F1 · mahasiswa baca profil koordinator unitnya (= 1)' as uji,
       count(*) = 1 as lulus
from public.profiles
where role = 'coordinator' and unit_id = (select public.my_unit());

-- F2 · Mahasiswa bisa membaca profil admin aktif
select 'F2 · mahasiswa baca profil admin aktif (= 1)' as uji,
       count(*) = 1 as lulus
from public.profiles
where role = 'admin' and status = 'active';

-- F3 · Mahasiswa TETAP tidak bisa membaca profil mahasiswa lain.
--      Seed 3 akun demo tidak punya mahasiswa kedua / profil
--      pending-rejected, jadi diuji lewat hasil baca: tidak boleh ada
--      baris student selain dirinya sendiri (tambah uji eksplisit
--      antar-mahasiswa di B2 begitu akun kedua dibuat).
select 'F3 · mahasiswa tidak melihat profil mahasiswa lain (= 0)' as uji,
       count(*) = 0 as lulus
from public.profiles
where role = 'student' and id <> (select auth.uid());
rollback;

-- F4 · Staf NONAKTIF tidak terlihat oleh mahasiswa (syarat
--      status = 'active' pada cabang staf; koordinator di-nonaktifkan
--      oleh admin dalam transaksi, lalu di-rollback)
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.admin', true), 'role', 'authenticated')::text, true);
update public.profiles set status = 'inactive' where email = 'm.sumampouw@unklab.ac.id';
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('simlu.uid.mhs', true), 'role', 'authenticated')::text, true);
select 'F4 · koordinator nonaktif tidak terlihat mahasiswa (= 0)' as uji,
       count(*) = 0 as lulus
from public.profiles
where role = 'coordinator';
rollback;

-- ============================================================
-- Selesai. Bila ada uji `lulus` = false atau notice "GAGAL", catat
-- barisnya dan laporkan ke OpenCode (bagian Catatan balasan).
-- ============================================================
