// Lapisan data. Halaman hanya memanggil store.*; sumbernya dipilih di js/config.js:
//   "local"    -> localStorage (demo offline), isi awal dari demo-data.js
//   "supabase" -> database; data dimuat sekali ke cache saat halaman dibuka (js/store-supabase.js)
//
//   store.list("units")                 -> semua baris
//   store.get("units", id)              -> satu baris
//   store.add("units", { name: ... })   -> baris baru (id otomatis)
//   store.update("units", id, { ... })  -> gabungkan perubahan
//   store.remove("units", id)
//   store.reset()                       -> kembalikan semua data ke isi awal (mode local)
//   store.start([...script])            -> jalankan script halaman setelah data siap
//
// API tetap sinkron: di mode supabase, tulis langsung mengubah cache lalu dikirim ke server di belakang.
// Butuh config.js dan demo-data.js lebih dulu.

const store = (() => {
  const PREFIX = "labor:";
  const memory = {}; // cadangan kalau localStorage diblokir browser
  let counter = 0;
  const newId = () => Date.now().toString(36) + (counter++).toString(36) + Math.random().toString(36).slice(2, 5);

  const readRaw = (key) => { try { return localStorage.getItem(PREFIX + key); } catch { return memory[key] ?? null; } };
  const writeRaw = (key, value) => { memory[key] = value; try { localStorage.setItem(PREFIX + key, value); } catch { /* pakai memory */ } };

  // ---------- Isi awal ----------
  // Baris saling terhubung lewat id mahasiswa (`student_id`), bukan nama. Di Supabase id = id akun Auth;
  // di mode lokal id dibuat tetap dari NIM supaya data seed konsisten.
  const studentIdOf = (nim) => `st-${nim}`;
  const ME = studentIdOf(DEMO.user.nim); // id mahasiswa demo, identitasnya diatur di demo-data.js
  // Nama di data contoh lama -> id. "Kevin L." / "Sarah K." (nama singkat) dicocokkan dengan nama depan.
  const sid = (name) => {
    const s = DEMO.students.find((x) => x.name === name) || DEMO.students.find((x) => x.name.split(" ")[0] === name.split(" ")[0]);
    return s ? studentIdOf(s.nim) : "";
  };
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = iso(new Date());

  const HISTORY_DATES = ["2026-11-10", "2026-11-07", "2026-11-06", "2026-11-05", "2026-11-03", "2026-10-31", "2026-10-30"];

  const SEED = {
    units: DEMO.unitsAdmin.map((u) => ({
      name: u.name, coordinator: u.coordinator, quota: u.quota, max: u.max, target: u.target,
      desc: (DEMO.units.find((x) => x.name === u.name) || {}).desc || "",
    })),

    students: DEMO.students.map((s) => ({ id: studentIdOf(s.nim), ...s, email: `${s.nim}@student.unklab.ac.id` })),

    applicants: DEMO.applicants.map((a) => ({
      ...a, email: `${a.nim}@student.unklab.ac.id`, driveLink: "https://drive.google.com/drive/folders/contoh", status: "pending", note: "",
    })),

    // day: 0 = Senin ... 4 = Jumat
    shifts: DEMO.shiftGrid.flatMap((row) => row.days.map((d, day) => d && {
      student_id: sid(row.name), unit: row.unit, day, start: d.t.split("–")[0], end: d.t.split("–")[1], flag: d.flag || "",
    })).filter(Boolean),

    requests: [
      ...DEMO.requestHistory.map((r, i) => ({
        student_id: ME, unit: "Perpustakaan", type: r.type, shift: r.shift, replacement_id: r.replacement === "-" ? "" : sid(r.replacement),
        reason: ["Ujian praktikum", "Bentrok kuliah tambahan", "Acara keluarga", "Sakit"][i] || "",
        status: { Menunggu: "pending", Disetujui: "approved", Ditolak: "rejected" }[r.status[0]], note: r.note || "",
        date: ["10 Nov", "3 Nov", "25 Okt", "15 Okt"][i],
      })),
      ...DEMO.pendingRequests.filter((r) => sid(r.name) !== ME).map((r) => ({
        student_id: sid(r.name), unit: r.unit, type: r.type, shift: r.detail.split(" → ")[0], replacement_id: r.detail.includes(" → ") ? sid(r.detail.split(" → ")[1]) : "",
        reason: r.reason, status: "pending", note: "", date: "11 Nov",
      })),
    ],

    // status: draft | submitted | late | graded
    reports: [
      ...DEMO.reportHistory.slice(1).map((r) => ({
        student_id: ME, unit: "Perpustakaan", week: Number(r.week.replace(/\D/g, "")), summary: r.summary, note: "",
        sent: "", status: "graded", score: Number(r.score), comment: "",
      })),
      ...DEMO.reportsAll.filter((r) => r.text).map((r) => ({
        student_id: sid(r.name), unit: r.unit, week: 45, summary: r.text, note: "", sent: r.sent,
        status: { "Menunggu nilai": "submitted", Terlambat: "late", Dinilai: "graded" }[r.status[0]], score: r.score,
        comment: "",
      })),
    ],

    // in / out: "HH:MM" atau "" ; leave: true kalau izin disetujui
    attendance: [
      ...DEMO.history.map((h, i) => ({
        student_id: ME, unit: "Perpustakaan", date: HISTORY_DATES[i], shift: h.shift,
        in: h.in === "-" ? "" : h.in, out: h.out === "-" ? "" : h.out, leave: h.status[0] === "Izin",
      })),
      ...DEMO.attendanceToday.filter((a) => sid(a.name) !== ME).map((a) => ({
        student_id: sid(a.name), unit: a.unit, date: today, shift: a.shift,
        in: a.in === "-" ? "" : a.in, out: a.out === "-" ? "" : a.out, leave: false,
      })),
    ],

    profiles: [],

    // Jadwal kuliah mahasiswa demo (nanti dari SI Unklab). day: 0 = Senin ... 4 = Jumat
    classes: DEMO.week.flatMap((d, day) => d.items.filter((it) => it.type === "class").map((it) => ({
      student_id: ME, day, start: it.start, end: it.end, course: it.title, room: it.sub,
    }))),

    notifications: DEMO.notifications.map((n) => ({ title: n.title, sub: n.sub, unread: n.unread })),
  };
  // Nilai minggu ke-45 mahasiswa demo masih menunggu, komentar terakhir ada di minggu ke-44
  SEED.reports.find((r) => r.student_id === ME && r.week === 44).comment = DEMO.lastComment;

  // ---------- CRUD ----------
  function list(table) {
    const raw = readRaw(table);
    if (raw == null) {
      const rows = (SEED[table] || []).map((r) => ({ id: newId(), ...r }));
      save(table, rows);
      return rows;
    }
    try { return JSON.parse(raw); } catch { return []; }
  }
  const save = (table, rows) => writeRaw(table, JSON.stringify(rows));
  const get = (table, id) => list(table).find((r) => r.id === id) || null;

  function add(table, row) {
    const item = { id: newId(), ...row };
    save(table, [...list(table), item]);
    return item;
  }
  function update(table, id, patch) {
    let updated = null;
    save(table, list(table).map((r) => (r.id === id ? (updated = { ...r, ...patch }) : r)));
    return updated;
  }
  const remove = (table, id) => save(table, list(table).filter((r) => r.id !== id));
  function reset() { for (const table of Object.keys(SEED)) save(table, SEED[table].map((r) => ({ id: newId(), ...r }))); }

  // Versi data awal. Naikkan angkanya (atau ganti identitas demo) supaya data lama di browser otomatis di-reset.
  const SEED_VERSION = `6|${DEMO.user.name}|${ME}`;
  if (readRaw("seed-version") !== SEED_VERSION) {
    reset();
    writeRaw("seed-version", SEED_VERSION);
  }

  // ---------- Pemilih sumber data ----------
  const local = { list, get, add, update, remove, reset };
  let backend = local;
  let me = ME;
  const BASE = document.currentScript.src.replace(/store\.js.*$/, "");
  const loadScript = (src) => new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error(`Gagal memuat ${src}`));
    document.body.appendChild(el);
  });

  let ready = null;
  // Isi .env (di root proyek, tidak ikut git) menimpa nilai di config.js. Contoh isi ada di .env.example.
  // Kalau .env tidak ada (mis. di GitHub Pages), nilai config.js yang dipakai.
  async function loadEnv() {
    // Hanya saat dikembangkan lokal (Live Server). Di situs publik konfigurasi ditulis ke config.js oleh workflow deploy.
    if (typeof CONFIG === "undefined" || !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
    try {
      const res = await fetch(BASE + "../.env", { cache: "no-store" });
      if (!res.ok) return;
      for (const line of (await res.text()).split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
        if (m && m[1] in CONFIG) CONFIG[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    } catch { /* tanpa .env: pakai config.js */ }
  }

  async function init() {
    await loadEnv();
    if (typeof CONFIG === "undefined" || CONFIG.DATA_SOURCE !== "supabase") return;
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js");
    await loadScript(BASE + "store-supabase.js");
    backend = await createSupabaseBackend(CONFIG);
    me = backend.me;
  }

  function start(scripts) {
    ready ??= init();
    ready
      .then(async () => {
        if (!guard()) return;
        for (const src of scripts) await loadScript(src);
      })
      .catch((err) => {
        console.error(err);
        document.documentElement.style.visibility = "";
        document.body.innerHTML = `<main class="mx-auto max-w-md px-4 py-16"><h1>Data belum bisa dimuat</h1>
          <p class="text-ink-2">Periksa koneksi internet lalu muat ulang halaman. Detail: ${String(err.message).replace(/</g, "&lt;")}</p></main>`;
      });
  }

  // Mode supabase: halaman aplikasi (body[data-role]) hanya untuk akun aktif dengan role yang sesuai.
  function guard() {
    const want = document.body.dataset.role;
    if (backend === local || !want) return true;
    const p = backend.profile;
    if (!p || p.status !== "active") { location.replace("../login/index.html"); return false; }
    if (want !== "auto" && want !== p.role) { location.replace(`../dashboard-${p.role}/index.html`); return false; }
    return true;
  }

  // Check-in / check-out mahasiswa. Di mode supabase jam diisi server (RPC), di mode local jam perangkat.
  const checkIn = (shift) => (backend.checkIn ? backend.checkIn(shift) : null);
  const checkOut = (row) => (backend.checkOut ? backend.checkOut(row) : null);

  return {
    list: (t) => backend.list(t), get: (t, id) => backend.get(t, id),
    add: (t, row) => backend.add(t, row), update: (t, id, patch) => backend.update(t, id, patch),
    remove: (t, id) => backend.remove(t, id), reset: () => backend.reset(),
    start, checkIn, checkOut, today,
    get ME() { return me; },
    get source() { return backend === local ? "local" : "supabase"; },
    get db() { return backend.db || null; },       // klien Supabase (null di mode local)
    get profile() { return backend.profile || null; }, // baris profiles akun yang login
  };
})();

// ---------- Nama dan NIM dari id mahasiswa ----------
const studentOf = (id) => (id && store.get("students", id)) || null;
const nameOf = (id) => studentOf(id)?.name || "(mahasiswa tidak ditemukan)";
const nimOf = (id) => studentOf(id)?.nim || "";

// ---------- Status absensi (dihitung, tidak disimpan) ----------
// Mengembalikan [teks, tone] untuk badge().
function attendanceStatus(row) {
  if (row.leave) return ["Izin", "info"];
  const [start, end] = row.shift.split("–").map(toMinutes);
  const isToday = row.date === store.today;
  if (!row.in) {
    if (isToday && nowMinutes() < start) return ["Terjadwal", "neutral"];
    return ["Belum hadir", "danger"];
  }
  if (!row.out) return isToday && nowMinutes() < end + 60 ? ["Sedang bekerja", "info"] : ["Belum check-out", "danger"];
  const late = toMinutes(row.in) - start;
  return late > LATE_TOLERANCE ? [`Telat ${late} m`, "warning"] : ["Tepat waktu", "success"];
}

function attendanceMinutes(row) {
  if (!row.in) return null;
  if (!row.out) return row.date === store.today ? Math.max(nowMinutes() - toMinutes(row.in), 0) : null;
  return toMinutes(row.out) - toMinutes(row.in);
}

const REQUEST_STATUS = { pending: ["Menunggu", "warning"], approved: ["Disetujui", "success"], rejected: ["Ditolak", "danger"] };
const REPORT_STATUS = { draft: ["Draf", "neutral"], submitted: ["Menunggu nilai", "info"], late: ["Terlambat", "warning"], graded: ["Dinilai", "success"] };
const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
const shiftMinutes = (s) => toMinutes(s.end) - toMinutes(s.start);

// Absensi satu tanggal. Hari ini, shift mahasiswa demo ikut tampil walau belum check-in.
function attendanceOn(date) {
  const rows = store.list("attendance").filter((r) => r.date === date);
  // Mode supabase: setiap shift hari ini yang belum punya catatan absensi ikut tampil sebagai "Terjadwal"/"Belum hadir"
  if (store.source === "supabase" && date === store.today && DEMO.todayIndex >= 0) {
    for (const s of store.list("shifts")) {
      const shift = `${s.start}–${s.end}`;
      if (s.day !== DEMO.todayIndex || s.flag === "leave" || rows.some((r) => r.student_id === s.student_id && r.shift === shift)) continue;
      rows.push({ id: "", student_id: s.student_id, unit: s.unit, date, shift, in: "", out: "", leave: false });
    }
  } else if (date === store.today && DEMO.todayShift && !rows.some((r) => r.student_id === store.ME)) {
    rows.push({ id: "", student_id: store.ME, unit: DEMO.unit.name, date, shift: `${DEMO.todayShift.start}–${DEMO.todayShift.end}`, in: "", out: "", leave: false });
  }
  return rows.sort((a, b) => a.shift.localeCompare(b.shift));
}
