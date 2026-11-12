// Penyimpanan data lokal untuk demo (localStorage), satu "tabel" per kunci.
// Isi awal diambil dari demo-data.js. Bentuk tabelnya sengaja sama dengan tabel database nanti
// (Supabase): ganti isi file ini saja, halaman tidak perlu diubah.
//
//   store.list("units")                 -> semua baris
//   store.get("units", id)              -> satu baris
//   store.add("units", { name: ... })   -> baris baru (id otomatis)
//   store.update("units", id, { ... })  -> gabungkan perubahan
//   store.remove("units", id)
//   store.reset()                       -> kembalikan semua data ke isi awal
//
// Butuh demo-data.js lebih dulu.

const store = (() => {
  const PREFIX = "labor:";
  const memory = {}; // cadangan kalau localStorage diblokir browser
  let counter = 0;
  const newId = () => Date.now().toString(36) + (counter++).toString(36) + Math.random().toString(36).slice(2, 5);

  const readRaw = (key) => { try { return localStorage.getItem(PREFIX + key); } catch { return memory[key] ?? null; } };
  const writeRaw = (key, value) => { memory[key] = value; try { localStorage.setItem(PREFIX + key, value); } catch { /* pakai memory */ } };

  // ---------- Isi awal ----------
  const ME = DEMO.user.name; // identitas mahasiswa demo, diatur di demo-data.js
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = iso(new Date());
  const unitOf = (name) => (DEMO.students.find((s) => s.name === name) || {}).unit || "Perpustakaan";
  const nimOf = (name) => (DEMO.students.find((s) => s.name === name) || {}).nim || "";

  const HISTORY_DATES = ["2026-11-10", "2026-11-07", "2026-11-06", "2026-11-05", "2026-11-03", "2026-10-31", "2026-10-30"];

  const SEED = {
    units: DEMO.unitsAdmin.map((u) => ({
      name: u.name, coordinator: u.coordinator, quota: u.quota, max: u.max, target: u.target,
      desc: (DEMO.units.find((x) => x.name === u.name) || {}).desc || "",
    })),

    students: DEMO.students.map((s) => ({ ...s, email: `${s.nim}@student.unklab.ac.id` })),

    applicants: DEMO.applicants.map((a) => ({
      ...a, email: `${a.nim}@student.unklab.ac.id`, driveLink: "https://drive.google.com/drive/folders/contoh", status: "pending", note: "",
    })),

    // day: 0 = Senin ... 4 = Jumat
    shifts: DEMO.shiftGrid.flatMap((row) => row.days.map((d, day) => d && {
      student: row.name, unit: row.unit, day, start: d.t.split("–")[0], end: d.t.split("–")[1], flag: d.flag || "",
    })).filter(Boolean),

    requests: [
      ...DEMO.requestHistory.map((r, i) => ({
        student: ME, unit: "Perpustakaan", type: r.type, shift: r.shift, replacement: r.replacement === "-" ? "" : r.replacement,
        reason: ["Ujian praktikum", "Bentrok kuliah tambahan", "Acara keluarga", "Sakit"][i] || "",
        status: { Menunggu: "pending", Disetujui: "approved", Ditolak: "rejected" }[r.status[0]], note: r.note || "",
        date: ["10 Nov", "3 Nov", "25 Okt", "15 Okt"][i],
      })),
      ...DEMO.pendingRequests.filter((r) => r.name !== ME).map((r) => ({
        student: r.name, unit: r.unit, type: r.type, shift: r.detail.split(" → ")[0], replacement: r.detail.split(" → ")[1] || "",
        reason: r.reason, status: "pending", note: "", date: "11 Nov",
      })),
    ],

    // status: draft | submitted | late | graded
    reports: [
      ...DEMO.reportHistory.slice(1).map((r) => ({
        student: ME, nim: nimOf(ME), unit: "Perpustakaan", week: Number(r.week.replace(/\D/g, "")), summary: r.summary, note: "",
        sent: "", status: "graded", score: Number(r.score), comment: "",
      })),
      ...DEMO.reportsAll.filter((r) => r.text).map((r) => ({
        student: r.name, nim: r.nim, unit: r.unit, week: 45, summary: r.text, note: "", sent: r.sent,
        status: { "Menunggu nilai": "submitted", Terlambat: "late", Dinilai: "graded" }[r.status[0]], score: r.score,
        comment: r.name === ME ? "" : "",
      })),
    ],

    // in / out: "HH:MM" atau "" ; leave: true kalau izin disetujui
    attendance: [
      ...DEMO.history.map((h, i) => ({
        student: ME, nim: nimOf(ME), unit: "Perpustakaan", date: HISTORY_DATES[i], shift: h.shift,
        in: h.in === "-" ? "" : h.in, out: h.out === "-" ? "" : h.out, leave: h.status[0] === "Izin",
      })),
      ...DEMO.attendanceToday.filter((a) => a.name !== ME).map((a) => ({
        student: a.name, nim: a.nim, unit: a.unit, date: today, shift: a.shift,
        in: a.in === "-" ? "" : a.in, out: a.out === "-" ? "" : a.out, leave: false,
      })),
    ],

    profiles: [],
  };
  // Nilai minggu ke-45 mahasiswa demo masih menunggu, komentar terakhir ada di minggu ke-44
  SEED.reports.find((r) => r.student === ME && r.week === 44).comment = DEMO.lastComment;

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
  const SEED_VERSION = `4|${ME}|${DEMO.user.nim}`;
  if (readRaw("seed-version") !== SEED_VERSION) {
    reset();
    writeRaw("seed-version", SEED_VERSION);
  }

  return { list, get, add, update, remove, reset, today, ME };
})();

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
  if (date === store.today && DEMO.todayShift && !rows.some((r) => r.student === store.ME)) {
    rows.push({ id: "", student: store.ME, nim: DEMO.user.nim, unit: DEMO.unit.name, date, shift: `${DEMO.todayShift.start}–${DEMO.todayShift.end}`, in: "", out: "", leave: false });
  }
  return rows.sort((a, b) => a.shift.localeCompare(b.shift));
}
