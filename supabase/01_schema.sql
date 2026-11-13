-- ============================================================
-- SIMLU · Tahap 1 · File 1/5: Skema (9 tabel)
-- Jalankan pertama di SQL editor Supabase (project harus sudah
-- di-resume dari dashboard — lihat README.md).
-- Semua kolom snake_case sesuai bagian D docs/analisis-migrasi-supabase.md.
-- Catatan tambahan (lihat docs/koordinasi-supabase.md → Catatan balasan):
--   * requests punya kolom ekstra `request_date` (UI menampilkan
--     tanggal pengajuan, tidak bisa dirender dari created_at saja).
-- ============================================================

-- ---------- units (dibuat lebih dulu tanpa FK koordinator,
--             karena profiles ↔ units saling mereferensi;
--             FK-nya ditambahkan di bagian bawah file ini) ----------
create table public.units (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  description    text not null default '',
  coordinator_id uuid,                        -- FK ditambahkan setelah profiles
  quota          integer not null default 0 check (quota >= 0),
  max_hours      integer not null default 0 check (max_hours >= 0),
  target_hours   integer not null default 0 check (target_hours >= 0)
);

-- ---------- profiles (id = akun Supabase Auth; menggantikan
--             tabel students + profiles lama) ----------
create table public.profiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  name      text not null,
  nim       text unique,
  email     text not null unique,
  phone     text not null default '',
  program   text not null default '',
  role      text not null default 'student'
              check (role in ('student', 'coordinator', 'admin')),
  unit_id   uuid references public.units (id) on delete set null,
  status    text not null default 'pending'
              check (status in ('pending', 'active', 'rejected', 'inactive'))
);

-- ---------- applications (menggantikan applicants) ----------
create table public.applications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  unit_choice uuid references public.units (id) on delete set null,
  unit_alt    uuid references public.units (id) on delete set null,
  motivation  text not null default '',
  drive_link  text not null default '',
  status      text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  note        text not null default '',
  created_at  timestamptz not null default now()
);

-- ---------- shifts (pola mingguan; day: 0 = Senin … 4 = Jumat) ----------
create table public.shifts (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  unit_id     uuid not null references public.units (id) on delete cascade,
  day         integer not null check (day between 0 and 4),
  start_time  time not null,
  end_time    time not null,
  flag        text check (flag in ('conflict', 'leave')),  -- null = biasa
  constraint shifts_time_check check (end_time > start_time)
);

-- ---------- attendance (waktu diisi server, bukan jam perangkat:
--             check_in punya default now(); check-out lewat RPC
--             check_out_attendance() di 02_functions.sql) ----------
create table public.attendance (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  unit_id     uuid not null references public.units (id) on delete cascade,
  date        date not null,
  shift_start time not null,
  shift_end   time not null,
  check_in    timestamptz default now(),      -- diisi server saat insert
  check_out   timestamptz,                    -- diisi server lewat RPC
  leave       boolean not null default false,
  -- satu catatan per mahasiswa per tanggal per shift (mencegah
  -- check-in ganda dan membuat seed aman dijalankan ulang)
  constraint attendance_unique_row unique (student_id, date, shift_start)
);

-- ---------- requests (izin / tukar shift) ----------
create table public.requests (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.profiles (id) on delete cascade,
  unit_id        uuid not null references public.units (id) on delete cascade,
  type           text not null check (type in ('izin', 'tukar_shift')),
  shift_id       uuid references public.shifts (id) on delete set null,
  replacement_id uuid references public.profiles (id) on delete set null,
  reason         text not null default '',
  status         text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
  note           text not null default '',
  request_date   date,                        -- tambahan: tanggal shift yang diajukan (lihat Catatan balasan)
  created_at     timestamptz not null default now()
);

-- ---------- reports (laporan mingguan) ----------
create table public.reports (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  unit_id    uuid not null references public.units (id) on delete cascade,
  week       integer not null check (week between 1 and 53),
  summary    text not null default '',
  note       text not null default '',
  status     text not null default 'draft'
                check (status in ('draft', 'submitted', 'late', 'graded')),
  score      integer check (score between 0 and 100),
  comment    text not null default '',
  sent_at    timestamptz,
  -- satu laporan per mahasiswa per minggu
  constraint reports_unique_week unique (student_id, week)
);

-- ---------- class_schedules (jadwal kuliah) ----------
create table public.class_schedules (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  day        integer not null check (day between 0 and 4),
  start_time time not null,
  end_time   time not null,
  course     text not null,
  room       text not null default '',
  constraint class_time_check check (end_time > start_time)
);

-- ---------- notifications (sederhana, tanpa trigger otomatis) ----------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  body       text not null default '',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- FK sirkular: units.coordinator_id → profiles.id ----------
alter table public.units
  add constraint units_coordinator_id_fkey
  foreign key (coordinator_id) references public.profiles (id)
  on delete set null;

-- ---------- Index pada FK (Postgres tidak membuatnya otomatis) ----------
create index idx_applications_profile  on public.applications (profile_id);
create index idx_applications_unit     on public.applications (unit_choice);
create index idx_shifts_student        on public.shifts (student_id);
create index idx_shifts_unit           on public.shifts (unit_id);
create index idx_attendance_student    on public.attendance (student_id);
create index idx_attendance_unit       on public.attendance (unit_id);
create index idx_attendance_date       on public.attendance (date);
create index idx_requests_student      on public.requests (student_id);
create index idx_requests_unit         on public.requests (unit_id);
create index idx_requests_shift        on public.requests (shift_id);
create index idx_reports_student       on public.reports (student_id);
create index idx_reports_unit          on public.reports (unit_id);
create index idx_class_student         on public.class_schedules (student_id);
create index idx_notifications_profile on public.notifications (profile_id);
-- FK yang tersisa (ditemukan advisor performa tahap 1):
create index idx_applications_unit_alt on public.applications (unit_alt);
create index idx_profiles_unit         on public.profiles (unit_id);
create index idx_requests_replacement  on public.requests (replacement_id);
create index idx_units_coordinator     on public.units (coordinator_id);
