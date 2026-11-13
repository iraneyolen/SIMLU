// Adaptor Supabase untuk store.js (dimuat hanya kalau CONFIG.DATA_SOURCE = "supabase").
// Cara kerja: semua tabel yang boleh dibaca akun ini dimuat sekali ke cache, lalu diubah ke bentuk baris
// yang dipakai halaman (sama seperti mode local). Tulis langsung mengubah cache, lalu dikirim ke server;
// kalau server menolak (RLS, jaringan), muncul pesan dan halaman dimuat ulang supaya layar = database.
//
// Bentuk baris di halaman memakai nama unit (unik) dan nama koordinator; database memakai id.
// Pemetaan dua arah ada di MAP di bawah. Login/daftar dikerjakan di tahap 4 (auth).

async function createSupabaseBackend(config) {
  if (!config.SUPABASE_KEY) throw new Error("SUPABASE_KEY belum diisi di file .env (lihat .env.example)");
  const db = supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
  const { data: { session } } = await db.auth.getSession();
  const me = session?.user?.id || "";

  // ---------- Pembantu konversi ----------
  const TZ = "Asia/Makassar"; // WITA
  const hhmm = (t) => (t ? t.slice(0, 5) : "");
  const clock = (ts) => (ts ? new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }) : "");
  const stamp = (date, hm) => (hm ? `${date}T${hm}:00+08:00` : null);
  const shortDate = (value) => (value ? new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: TZ }) : "");
  const sentText = (ts) => (ts ? new Date(ts).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: TZ }) : "");
  // Tanggal (YYYY-MM-DD) hari ke-n (0 = Senin) pada minggu berjalan
  const weekDate = (day) => {
    const [y, m, d] = store.today.split("-").map(Number);
    const now = new Date(y, m - 1, d);
    const monday = new Date(y, m - 1, d - ((now.getDay() + 6) % 7));
    const t = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + day);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  };
  const dayLabel = (date) => new Date(`${date}T12:00:00+08:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", timeZone: TZ });

  // ---------- Muat data mentah ----------
  const RAW_TABLES = ["units", "profiles", "applications", "shifts", "attendance", "requests", "reports", "class_schedules", "notifications"];
  const raw = {};
  await Promise.all(RAW_TABLES.map(async (t) => {
    const { data, error } = await db.from(t).select("*");
    if (error) throw new Error(`Tabel ${t}: ${error.message}`);
    raw[t] = data;
  }));

  const profileOf = (id) => raw.profiles.find((p) => p.id === id) || null;
  const unitById = (id) => raw.units.find((u) => u.id === id) || null;
  const unitName = (id) => unitById(id)?.name || "";
  const unitIdOf = (name) => raw.units.find((u) => u.name === name)?.id || null;
  const coordinatorIdOf = (name) => raw.profiles.find((p) => p.role === "coordinator" && p.name === name)?.id || null;
  const myProfile = profileOf(me);
  // Jam kerja bulan ini (dari check-in sampai check-out) untuk kolom "Jam bulan ini"
  const monthHours = (id) => formatDuration(raw.attendance
    .filter((a) => a.student_id === id && a.date.startsWith(store.today.slice(0, 7)) && a.check_in && a.check_out)
    .reduce((sum, a) => sum + Math.round((new Date(a.check_out) - new Date(a.check_in)) / 60000), 0));
  const ROLE_KEY = myProfile?.role || "student";

  // ---------- Pemetaan tabel halaman <-> tabel database ----------
  // from(dbRow) -> baris halaman, to(baris halaman) -> kolom database. to() null = tidak didukung.
  const MAP = {
    units: {
      table: "units",
      rows: () => [...raw.units].sort((a, b) => a.name.localeCompare(b.name, "id")),
      from: (u) => ({ id: u.id, name: u.name, desc: u.description, coordinator: profileOf(u.coordinator_id)?.name || "",
        quota: u.quota, max: u.max_hours, target: u.target_hours }),
      to: (r) => ({ name: r.name, description: r.desc || "", coordinator_id: coordinatorIdOf(r.coordinator),
        quota: r.quota, max_hours: r.max, target_hours: r.target }),
    },
    students: {
      table: "profiles",
      rows: () => raw.profiles.filter((p) => p.role === "student" && (p.status === "active" || p.status === "inactive")),
      from: (p) => ({ id: p.id, name: p.name, nim: p.nim || "", program: p.program, email: p.email, phone: p.phone,
        unit: unitName(p.unit_id), coordinator: profileOf(unitById(p.unit_id)?.coordinator_id)?.name || "",
        active: p.status === "active", hours: monthHours(p.id), rate: null }),
      to: (r) => ({ name: r.name, nim: r.nim, program: r.program, unit_id: unitIdOf(r.unit), status: r.active ? "active" : "inactive" }),
    },
    applicants: {
      table: "applications",
      rows: () => raw.applications,
      from: (a) => {
        const p = profileOf(a.profile_id) || {};
        return { id: a.id, profile_id: a.profile_id, name: p.name || "", nim: p.nim || "", email: p.email || "", phone: p.phone || "",
          program: p.program || "", unit: unitName(a.unit_choice), alt: unitName(a.unit_alt) || "-", motivation: a.motivation,
          driveLink: a.drive_link, date: shortDate(a.created_at), status: a.status, note: a.note };
      },
      to: (r) => ({ unit_choice: unitIdOf(r.unit), unit_alt: unitIdOf(r.alt), motivation: r.motivation, drive_link: r.driveLink,
        status: r.status, note: r.note || "" }),
    },
    shifts: {
      table: "shifts",
      rows: () => raw.shifts,
      from: (s) => ({ id: s.id, student_id: s.student_id, unit: unitName(s.unit_id), day: s.day,
        start: hhmm(s.start_time), end: hhmm(s.end_time), flag: s.flag || "" }),
      to: (r) => ({ student_id: r.student_id, unit_id: unitIdOf(r.unit), day: r.day, start_time: r.start, end_time: r.end, flag: r.flag || null }),
    },
    attendance: {
      table: "attendance",
      rows: () => raw.attendance,
      from: (a) => ({ id: a.id, student_id: a.student_id, unit: unitName(a.unit_id), date: a.date,
        shift: `${hhmm(a.shift_start)}–${hhmm(a.shift_end)}`, in: clock(a.check_in), out: clock(a.check_out), leave: a.leave }),
      to: (r) => {
        const [start, end] = r.shift.split("–");
        return { student_id: r.student_id, unit_id: unitIdOf(r.unit), date: r.date, shift_start: start, shift_end: end,
          check_in: stamp(r.date, r.in), check_out: stamp(r.date, r.out), leave: Boolean(r.leave) };
      },
    },
    requests: {
      table: "requests",
      rows: () => raw.requests,
      from: (q) => {
        const shift = raw.shifts.find((s) => s.id === q.shift_id);
        const when = q.request_date ? dayLabel(q.request_date) : "";
        return { id: q.id, student_id: q.student_id, unit: unitName(q.unit_id), type: q.type === "izin" ? "Izin" : "Tukar shift",
          shift: shift ? `${when} · ${hhmm(shift.start_time)}–${hhmm(shift.end_time)}` : when, shiftId: q.shift_id || "",
          replacement_id: q.replacement_id || "", reason: q.reason, status: q.status, note: q.note, date: shortDate(q.created_at),
          _requestDate: q.request_date };
      },
      to: (r) => {
        const shift = raw.shifts.find((s) => s.id === r.shiftId);
        return { student_id: r.student_id, unit_id: unitIdOf(r.unit), type: r.type === "Izin" ? "izin" : "tukar_shift",
          shift_id: r.shiftId || null, replacement_id: r.replacement_id || null, reason: r.reason || "", status: r.status,
          note: r.note || "", request_date: r._requestDate || (shift ? weekDate(shift.day) : null) };
      },
    },
    reports: {
      table: "reports",
      rows: () => raw.reports,
      from: (r) => ({ id: r.id, student_id: r.student_id, unit: unitName(r.unit_id), week: r.week, summary: r.summary, note: r.note,
        sent: sentText(r.sent_at), _sentAt: r.sent_at, status: r.status, score: r.score, comment: r.comment }),
      to: (r) => ({ student_id: r.student_id, unit_id: unitIdOf(r.unit), week: r.week, summary: r.summary, note: r.note || "",
        status: r.status, score: r.score ?? null, comment: r.comment || "",
        sent_at: r.sent ? r._sentAt || new Date().toISOString() : null }),
    },
    classes: {
      table: "class_schedules",
      rows: () => raw.class_schedules,
      from: (c) => ({ id: c.id, student_id: c.student_id, day: c.day, start: hhmm(c.start_time), end: hhmm(c.end_time), course: c.course, room: c.room }),
      to: (r) => ({ student_id: r.student_id, day: r.day, start_time: r.start, end_time: r.end, course: r.course, room: r.room || "" }),
    },
    notifications: {
      table: "notifications",
      rows: () => [...raw.notifications].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      from: (n) => ({ id: n.id, title: n.title, sub: n.body, unread: !n.read_at, _readAt: n.read_at }),
      to: (r) => ({ read_at: r.unread ? null : r._readAt || new Date().toISOString() }),
    },
    // Data diri akun yang login. Halaman memakai id = role (lihat currentUser() di demo-data.js).
    profiles: {
      table: "profiles",
      rows: () => (myProfile ? [myProfile] : []),
      from: (p) => ({ id: ROLE_KEY, name: p.name, nim: p.nim || "",
        initials: p.name.split(/[\s,]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase(), email: p.email, phone: p.phone, program: p.program,
        unitName: unitName(p.unit_id) || "Semua unit" }),
      to: (r) => ({ phone: r.phone, program: r.program }), // nama, NIM, email dikunci di database
      dbId: () => me,
    },
  };

  // ---------- Cache dalam bentuk baris halaman ----------
  const cache = {};
  const build = () => { for (const [t, m] of Object.entries(MAP)) cache[t] = m.rows().map(m.from); };
  build();

  // Tulis ke server di belakang. Kalau gagal: beri tahu, lalu muat ulang supaya layar kembali sama dengan database.
  function send(promise, what) {
    Promise.resolve(promise).then(({ error } = {}) => { if (error) throw error; }).catch((err) => {
      console.error(what, err);
      toast(`Gagal menyimpan ke server (${err.message || err}). Halaman dimuat ulang.`);
      setTimeout(() => location.reload(), 2500);
    });
  }
  const unsupported = (msg) => { toast(msg); return null; };

  const list = (t) => cache[t] || [];
  const get = (t, id) => list(t).find((r) => r.id === id) || null;

  function add(t, row) {
    const m = MAP[t];
    if (!m) return null;
    if (t === "students") return activateStudent(row);
    if (t === "applicants" || t === "profiles") return unsupported("Pendaftaran dan akun baru dibuat lewat halaman Daftar.");
    const item = { id: crypto.randomUUID(), ...row };
    cache[t].push(item);
    send(db.from(m.table).insert({ id: item.id, ...m.to(item) }), `tambah ${t}`);
    return item;
  }

  function update(t, id, patch) {
    const m = MAP[t];
    const i = list(t).findIndex((r) => r.id === id);
    if (!m || i < 0) return null;
    const item = { ...cache[t][i], ...patch };
    cache[t][i] = item;
    const dbId = m.dbId ? m.dbId() : id;
    send(db.from(m.table).update(m.to(item)).eq("id", dbId), `ubah ${t}`);
    // Keputusan pendaftaran ikut mengubah status akun pendaftar
    if (t === "applicants" && patch.status === "rejected") send(db.from("profiles").update({ status: "rejected" }).eq("id", item.profile_id), "tolak akun");
    return item;
  }

  function remove(t, id) {
    const m = MAP[t];
    if (!m) return;
    cache[t] = list(t).filter((r) => r.id !== id);
    send(db.from(m.table).delete().eq("id", id), `hapus ${t}`);
  }

  // "Tambah mahasiswa" di Supabase = mengaktifkan akun pendaftar (akun dibuat sendiri oleh mahasiswa saat Daftar)
  function activateStudent(row) {
    const p = raw.profiles.find((x) => x.nim === row.nim);
    if (!p) return unsupported("Mahasiswa harus mendaftar dulu lewat halaman Daftar supaya punya akun.");
    const patch = { role: "student", status: row.active === false ? "inactive" : "active", unit_id: unitIdOf(row.unit) };
    Object.assign(p, patch);
    build();
    send(db.from("profiles").update(patch).eq("id", p.id), "aktifkan mahasiswa");
    return get("students", p.id);
  }

  // ---------- Absensi mahasiswa: jam dari server ----------
  const replaceAttendance = (dbRow, tempId) => {
    if (!dbRow) return;
    raw.attendance = [...raw.attendance.filter((a) => a.id !== tempId && a.id !== dbRow.id), dbRow];
    build();
  };
  function checkIn(shift) {
    if (!shift?.id) return unsupported("Tidak ada shift hari ini.");
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    raw.attendance.push({ id: tempId, student_id: me, unit_id: myProfile?.unit_id, date: store.today,
      shift_start: shift.start, shift_end: shift.end, check_in: now, check_out: null, leave: false });
    build();
    send(db.rpc("check_in_attendance", { p_shift_id: shift.id }).then((res) => { replaceAttendance(res.data, tempId); return res; }), "check-in");
  }
  function checkOut(row) {
    const a = raw.attendance.find((x) => x.id === row.id);
    if (a) { a.check_out = new Date().toISOString(); build(); }
    send(db.rpc("check_out_attendance", { p_attendance_id: row.id }).then((res) => { replaceAttendance(res.data); return res; }), "check-out");
  }

  // ---------- Sesuaikan data demo dengan akun yang login ----------
  if (myProfile) {
    sessionStorage.setItem("demoRole", myProfile.role);
    const unit = unitById(myProfile.unit_id);
    if (unit) Object.assign(DEMO.unit, { id: unit.id, name: unit.name, coordinatorName: profileOf(unit.coordinator_id)?.name || "-",
      maxHoursPerWeek: unit.max_hours, targetHoursPerWeek: unit.target_hours });
    // Shift hari ini diambil dari tabel shifts (bukan shift contoh yang dibuat-buat)
    // Kalau ada beberapa shift hari ini, pilih yang sedang berjalan atau berikutnya; kalau semua sudah lewat, yang terakhir
    const todays = DEMO.todayIndex >= 0 ? raw.shifts.filter((s) => s.student_id === me && s.day === DEMO.todayIndex && s.flag !== "leave")
      .sort((x, y) => x.start_time.localeCompare(y.start_time)) : [];
    const todayShift = todays.find((s) => toMinutes(hhmm(s.end_time)) > nowMinutes()) || todays.at(-1);
    DEMO.todayShift = todayShift ? { id: todayShift.id, start: hhmm(todayShift.start_time), end: hhmm(todayShift.end_time), task: "" } : null;
  }

  return {
    me, db, profile: myProfile, list, get, add, update, remove, checkIn, checkOut,
    reset: () => unsupported("Reset data hanya tersedia di mode demo lokal."),
  };
}
