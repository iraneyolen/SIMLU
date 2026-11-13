-- ============================================================
-- SIMLU · Tahap 1 · File 2/5: Fungsi bantu + trigger
-- Jalankan setelah 01_schema.sql.
-- Semua fungsi "security definer" memakai `set search_path = ''`
-- dan nama tabel yang diqualifikasi penuh (pola wajib Supabase,
-- mencegah pembajakan search_path).
-- ============================================================

-- ---------- Fungsi bantu untuk policy RLS ----------

-- Apakah user saat ini admin aktif?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and status = 'active'
  );
$$;

-- Role user saat ini (null kalau belum login / belum punya profile)
create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

-- Unit user saat ini (uuid koordinator/mahasiswa; null untuk admin)
create or replace function public.my_unit()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select unit_id from public.profiles where id = (select auth.uid());
$$;

-- Status user saat ini (dipakai untuk mengunci kolom profiles)
create or replace function public.my_status()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select status from public.profiles where id = (select auth.uid());
$$;

-- Apakah user saat ini koordinator AKTIF dari unit tertentu?
-- Satu pintu untuk semua policy koordinator (hasil review tahap 1):
-- role DAN status active dicek di satu tempat.
create or replace function public.is_coordinator_of(p_unit uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'coordinator'
      and status = 'active'
      and unit_id is not distinct from p_unit
  );
$$;

-- ---------- RPC absensi: waktu diisi SERVER (keputusan terkunci #6) ----------
-- Mahasiswa TIDAK punya policy insert/update langsung pada attendance;
-- satu-satunya jalannya adalah dua RPC ini, sehingga jam check-in/out
-- selalu dari server, bukan dari jam perangkat.

-- Check-in: membuat baris absensi dengan check_in = now().
-- Baris "Terjadwal" di layar dibuat oleh adaptor di cache (tanpa DB).
-- HASIL REVIEW TAHAP 1 (celah 1): unit, tanggal, dan jam TIDAK diambil
-- dari klien. Parameter hanya id shift milik penelepon; unit dan jam
-- dibaca dari tabel `shifts`, tanggal dari server (WITA). Hanya
-- mahasiswa berstatus active yang boleh memanggil.
create or replace function public.check_in_attendance(
  p_shift_id uuid
)
returns public.attendance
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_shift public.shifts;
  v_row   public.attendance;
begin
  if v_uid is null then
    raise exception 'Harus login untuk check-in';
  end if;
  if public.my_role() <> 'student' or public.my_status() <> 'active' then
    raise exception 'Check-in hanya untuk mahasiswa dengan status aktif';
  end if;

  select * into v_shift from public.shifts
  where id = p_shift_id and student_id = v_uid;
  if v_shift is null then
    raise exception 'Shift tidak ditemukan atau bukan milikmu';
  end if;

  insert into public.attendance
    (student_id, unit_id, date, shift_start, shift_end, check_in)
  values
    (v_uid,
     v_shift.unit_id,
     (now() at time zone 'Asia/Makassar')::date,
     v_shift.start_time,
     v_shift.end_time,
     now())
  on conflict (student_id, date, shift_start) do nothing
  returning * into v_row;

  -- Sudah pernah check-in di shift yang sama hari ini: kembalikan barisnya
  if v_row is null then
    select * into v_row from public.attendance
    where student_id = v_uid
      and date = (now() at time zone 'Asia/Makassar')::date
      and shift_start = v_shift.start_time;
  end if;

  return v_row;
end;
$$;

-- Check-out: mengisi check_out = now() pada baris milik sendiri
-- yang belum di-check-out. Tidak bisa mengulang (check_out sudah terisi).
create or replace function public.check_out_attendance(
  p_attendance_id uuid
)
returns public.attendance
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.attendance;
begin
  if (select auth.uid()) is null then
    raise exception 'Harus login untuk check-out';
  end if;
  if public.my_role() <> 'student' or public.my_status() <> 'active' then
    raise exception 'Check-out hanya untuk mahasiswa dengan status aktif';
  end if;

  update public.attendance
    set check_out = now()
  where id = p_attendance_id
    and student_id = (select auth.uid())
    and check_out is null
  returning * into v_row;

  return v_row;
end;
$$;

-- Eksekusi RPC oleh user yang login (Supabase biasanya memberikan
-- grant ini otomatis; dinyatakan eksplisit supaya pasti)
grant execute on function public.check_in_attendance(uuid) to authenticated;
grant execute on function public.check_out_attendance(uuid) to authenticated;

-- ---------- Trigger: setiap akun Auth baru → baris profiles ----------
-- role awal 'student', status 'pending'. Admin/koordinator diangkat
-- dari dashboard atau SQL editor (bukan dari UI).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles
    (id, name, nim, email, phone, program, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'nim', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'program', ''),
    'student',
    'pending'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Trigger hanya boleh dipicu oleh supabase_auth_admin; tidak ada
-- alasan dipanggil langsung oleh client (hardening advisor tahap 1).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_columns() from public, anon, authenticated;

-- ---------- Trigger: kunci kolom identitas/otorisasi profil ----------
-- HASIL REVIEW TAHAP 1 (celah 3): nim, email, name (dan kolom
-- otorisasi role/status/unit_id) tidak boleh diubah oleh pemiliknya.
-- Mekanisme: BEFORE UPDATE yang mengembalikan nilai LAMA (silent reset,
-- bukan raise) — supaya adaptor yang mengirim patch seluruh baris tetap
-- berhasil dan cukup mengabaikan kolom yang dikunci. Email berubah
-- lewat auth.updateUser, bukan tabel ini.
--
-- Guard penting: kalau TIDAK ada sesi login (auth.uid() null — mis.
-- SQL editor / seed), trigger tidak mengunci apa pun, sehingga seed
-- dan perbaikan manual di dashboard tetap bebas mengubah profil.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Tanpa sesi login (SQL editor / seed): jangan kunci.
  if (select auth.uid()) is null then
    return new;
  end if;

  -- Admin bebas mengubah apa pun (persetujuan pendaftar, pengangkatan role).
  if (select public.is_admin()) then
    return new;
  end if;

  new.nim     := old.nim;
  new.email   := old.email;
  new.name    := old.name;
  new.role    := old.role;
  new.status  := old.status;
  new.unit_id := old.unit_id;
  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row
  execute function public.protect_profile_columns();
