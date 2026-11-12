// Data contoh untuk tahap UI. Data yang bisa diubah (CRUD) disalin ke localStorage
// oleh store.js. Nanti sumbernya diganti database (Supabase), tampilannya tetap.
// Semua nama dan angka di sini adalah dummy.

// ---------- Pembantu waktu (dipakai dashboard dan absensi) ----------
const toMinutes = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
// 245 -> "4 j 05 m"
const formatDuration = (min) => `${Math.floor(min / 60)} j ${String(min % 60).padStart(2, "0")} m`;
const overlaps = (a, b) => toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);

function demoShift() {
  const key = "demoShift-" + new Date().toDateString();
  const saved = sessionStorage.getItem(key);
  if (saved) return JSON.parse(saved);
  const start = Math.min(Math.ceil((nowMinutes() + 6) / 5) * 5, 23 * 60);
  const shift = { id: "s-demo", start: toHHMM(start), end: toHHMM(Math.min(start + 240, 23 * 60 + 55)), task: "Shelving buku & layanan sirkulasi" };
  sessionStorage.setItem(key, JSON.stringify(shift));
  return shift;
}

// Catatan absensi hari ini milik mahasiswa demo: { checkIn: menit, checkOut: menit }.
// Disimpan sebagai baris di tabel `attendance` (lihat store.js), jadi ikut muncul di Riwayat dan Absensi Tim.
const todayRow = () => store.list("attendance").find((r) => r.student === store.ME && r.date === store.today);
function getAttendance() {
  const row = todayRow();
  if (!row) return {};
  return { checkIn: row.in ? toMinutes(row.in) : null, checkOut: row.out ? toMinutes(row.out) : null };
}
function saveAttendance(record) {
  const row = todayRow();
  if (record.checkIn == null) { if (row) store.remove("attendance", row.id); return; }
  const data = { in: toHHMM(record.checkIn), out: record.checkOut != null ? toHHMM(record.checkOut) : "" };
  if (row) store.update("attendance", row.id, data);
  else store.add("attendance", { student: store.ME, nim: DEMO.user.nim, unit: DEMO.unit.name, date: store.today,
    shift: `${DEMO.todayShift.start}–${DEMO.todayShift.end}`, leave: false, ...data });
}

const LATE_TOLERANCE = 10;   // menit setelah shift mulai
const CHECKIN_OPENS = 15;    // menit sebelum shift mulai

const DEMO = {
  user: {
    uid: "demo-student", name: "Raolika, Yolen Irane", nim: "12510207", initials: "RY",
    role: "student", unitId: "perpustakaan", unitName: "Perpustakaan",
    program: "Informatika",
  },

  unit: { id: "perpustakaan", name: "Perpustakaan", location: "Lantai 2", coordinatorName: "Ibu M. Sumampouw", maxHoursPerWeek: 20, targetHoursPerWeek: 16 },

  // Shift hari ini (null = tidak ada shift). Untuk demo, jamnya dibuat mulai ±10 menit
  // dari sekarang supaya tombol Check-In bisa langsung dicoba kapan pun halaman dibuka.
  todayShift: demoShift(),

  classesToday: [
    { start: "08:00", end: "09:40", course: "Perancangan Web", room: "GK2 · Lab 3" },
    { start: "10:00", end: "11:40", course: "Basis Data", room: "GK1 · R. 204" },
    { start: "15:00", end: "16:40", course: "Statistika", room: "GK2 · R. 105" },
  ],

  stats: { shiftsThisWeek: 4, shiftsDone: 2, hoursThisMonth: "32 j", attendanceRate: "95%", attended: 19, totalShifts: 20, lateCount: 1 },

  requests: [
    { title: "Izin · Shift Kamis 13 Nov", date: "Diajukan 10 Nov", status: "pending" },
    { title: "Tukar shift dengan Kevin L.", date: "Diajukan 3 Nov", status: "approved" },
    { title: "Izin · Shift Senin 27 Okt", date: "Diajukan 25 Okt", status: "rejected" },
  ],

  weeklyReport: { week: 46, range: "10–16 November", status: "empty", deadline: "Minggu, 16 Nov 23:59", last: "Membantu inventaris koleksi baru dan layanan peminjaman.", lastScore: 88 },

  notifications: [
    { icon: "bi-clock", title: "Shift hari ini 13:00–17:00", sub: "Perpustakaan", unread: true },
    { icon: "bi-send", title: "Tukar shift disetujui", sub: "Kamis 13 Nov → Kevin L.", unread: true },
    { icon: "bi-file-text", title: "Laporan minggu ke-46 belum diisi", sub: "Batas Minggu 16 Nov 23:59", unread: true },
    { icon: "bi-calendar3", title: "Jadwal minggu depan sudah dibuat", sub: "Kemarin", unread: false },
  ],

  units: [
    { name: "Perpustakaan", quota: 6, desc: "Sirkulasi, shelving, layanan ruang baca" },
    { name: "Kafetaria", quota: 5, desc: "Penyajian, kasir, kebersihan dapur" },
    { name: "IT Support", quota: 4, desc: "Helpdesk, perawatan lab komputer" },
    { name: "Asrama", quota: 4, desc: "Administrasi dan kebersihan asrama" },
    { name: "Kebersihan Kampus", quota: 3, desc: "Area gedung kuliah dan taman" },
    { name: "Administrasi", quota: 2, desc: "Arsip dan layanan front office" },
  ],
};

const STATUS_BADGE = {
  pending: ["Menunggu", "badge-warning"],
  approved: ["Disetujui", "badge-success"],
  rejected: ["Ditolak", "badge-danger"],
};

// ---------- Role demo ----------
// Tanpa Firebase Auth, role disimpan di sessionStorage oleh halaman login.
const DEMO_USERS = {
  // Identitas mahasiswa demo cukup diubah di DEMO.user; semua data seed ikut menyesuaikan.
  student: { name: DEMO.user.name, initials: DEMO.user.initials, role: "student", unitName: DEMO.user.unitName, nim: DEMO.user.nim, program: DEMO.user.program, email: `${DEMO.user.nim}@student.unklab.ac.id`, phone: "0812 3456 7890" },
  coordinator: { name: "M. Sumampouw", initials: "MS", role: "coordinator", unitName: "Perpustakaan", email: "m.sumampouw@unklab.ac.id", phone: "0813 2222 1100" },
  admin: { name: "Admin Labor", initials: "AD", role: "admin", unitName: "Semua unit", email: "labor@unklab.ac.id", phone: "0431 000 000" },
};
const getRole = () => sessionStorage.getItem("demoRole") || "student";
const setRole = (role) => sessionStorage.setItem("demoRole", role);
// Perubahan dari halaman Profil (email, HP) disimpan di tabel `profiles` dengan id = role.
const currentUser = () => ({ ...DEMO_USERS[getRole()], ...(store.get("profiles", getRole()) || {}) });

// ---------- Data dummy tambahan untuk semua halaman ----------
Object.assign(DEMO, {
  weekLabel: "10 – 14 November 2026",
  todayIndex: 1,
  week: [
    { day: "Senin", date: "10 Nov", items: [
      { type: "class", start: "08:00", end: "09:40", title: "Perancangan Web", sub: "GK2 · Lab 3" },
      { type: "shift", start: "13:00", end: "17:00", title: "Shift Perpustakaan", sub: "Lantai 2" } ] },
    { day: "Selasa", date: "11 Nov", items: [
      { type: "class", start: "08:00", end: "09:40", title: "Perancangan Web", sub: "GK2 · Lab 3" },
      { type: "class", start: "10:00", end: "11:40", title: "Basis Data", sub: "GK1 · R. 204" },
      { type: "shift", start: "13:00", end: "17:00", title: "Shift Perpustakaan", sub: "Lantai 2" },
      { type: "class", start: "15:00", end: "16:40", title: "Statistika", sub: "GK2 · R. 105" } ] },
    { day: "Rabu", date: "12 Nov", items: [
      { type: "class", start: "10:00", end: "11:40", title: "Basis Data", sub: "GK1 · R. 204" } ] },
    { day: "Kamis", date: "13 Nov", items: [
      { type: "class", start: "08:00", end: "09:40", title: "Statistika", sub: "GK2 · R. 105" },
      { type: "shift", start: "13:00", end: "17:00", title: "Shift Perpustakaan", sub: "Izin diajukan" } ] },
    { day: "Jumat", date: "14 Nov", items: [
      { type: "shift", start: "08:00", end: "12:00", title: "Shift Perpustakaan", sub: "Lantai 2" } ] },
  ],

  history: [
    { date: "Senin, 10 Nov", shift: "13:00–17:00", in: "12:57", out: "17:02", minutes: 245, status: ["Tepat waktu", "success"] },
    { date: "Jumat, 7 Nov", shift: "08:00–12:00", in: "08:14", out: "12:00", minutes: 226, status: ["Telat 14 m", "warning"] },
    { date: "Kamis, 6 Nov", shift: "13:00–17:00", in: "12:55", out: "-", minutes: null, status: ["Belum check-out", "danger"] },
    { date: "Rabu, 5 Nov", shift: "13:00–17:00", in: "-", out: "-", minutes: null, status: ["Izin", "info"] },
    { date: "Senin, 3 Nov", shift: "13:00–17:00", in: "12:58", out: "17:00", minutes: 242, status: ["Tepat waktu", "success"] },
    { date: "Jumat, 31 Okt", shift: "08:00–12:00", in: "07:59", out: "12:01", minutes: 242, status: ["Tepat waktu", "success"] },
    { date: "Kamis, 30 Okt", shift: "13:00–17:00", in: "12:52", out: "17:05", minutes: 253, status: ["Tepat waktu", "success"] },
  ],

  performance: {
    weeklyHours: [["Mg 43", 14], ["Mg 44", 16.5], ["Mg 45", 12], ["Mg 46", 8]],
    punctuality: { "Tepat waktu": 18, "Terlambat": 1, "Izin / tidak hadir": 1 },
    scores: [["Mg 39", 80], ["Mg 40", 84], ["Mg 41", 82], ["Mg 42", 90], ["Mg 43", 85], ["Mg 44", 88]],
  },

  reportHistory: [
    { week: "Mg 45", summary: "Membantu inventaris koleksi baru dan layanan peminjaman.", status: ["Dinilai", "success"], score: "88" },
    { week: "Mg 44", summary: "Shelving rak 500-an, merapikan ruang baca.", status: ["Dinilai", "success"], score: "85" },
    { week: "Mg 43", summary: "Layanan sirkulasi dan input data anggota baru.", status: ["Dinilai", "success"], score: "90" },
    { week: "Mg 42", summary: "Membantu persiapan pameran buku.", status: ["Terlambat", "warning"], score: "82" },
  ],
  lastComment: "Kerja rapi. Lain kali catat jumlah buku yang diproses supaya laporannya lebih terukur.",

  requestHistory: [
    { type: "Izin", shift: "Kamis 13 Nov · 13:00–17:00", replacement: "-", status: ["Menunggu", "warning"] },
    { type: "Tukar shift", shift: "Rabu 5 Nov · 13:00–17:00", replacement: "Kevin L.", status: ["Disetujui", "success"] },
    { type: "Izin", shift: "Senin 27 Okt · 13:00–17:00", replacement: "-", status: ["Ditolak", "danger"], note: "Pengajuan kurang dari 24 jam sebelum shift." },
    { type: "Izin", shift: "Jumat 17 Okt · 08:00–12:00", replacement: "-", status: ["Disetujui", "success"] },
  ],

  // Dipakai Koordinator (disaring per unit) dan Admin (semua unit)
  students: [
    { name: DEMO.user.name, nim: DEMO.user.nim, program: DEMO.user.program, unit: "Perpustakaan", coordinator: "M. Sumampouw", hours: "32 j 40 m", rate: 95, active: true },
    { name: "Grace Pangemanan", nim: "12410077", program: "Akuntansi", unit: "Perpustakaan", coordinator: "M. Sumampouw", hours: "28 j 05 m", rate: 88, active: true },
    { name: "Sarah Kawengian", nim: "12410088", program: "Pendidikan", unit: "Perpustakaan", coordinator: "M. Sumampouw", hours: "30 j 10 m", rate: 93, active: true },
    { name: "Kevin Lumowa", nim: "12410051", program: "Informatika", unit: "Kafetaria", coordinator: "R. Tambunan", hours: "48 j 10 m", rate: 100, active: true },
    { name: "Daniel Rumondor", nim: "12310112", program: "Sistem Informasi", unit: "IT Support", coordinator: "A. Lengkong", hours: "61 j 00 m", rate: 79, active: true },
    { name: "Maria Tumbel", nim: "12410009", program: "Keperawatan", unit: "Asrama", coordinator: "S. Runtuwene", hours: "36 j 20 m", rate: 96, active: true },
    { name: "Yohanes Pinontoan", nim: "12310045", program: "Teologi", unit: "Kebersihan Kampus", coordinator: "J. Mandagi", hours: "0 j 00 m", rate: null, active: false },
  ],

  // Jadwal shift satu minggu per mahasiswa. flag: "conflict" | "leave" | undefined
  shiftGrid: [
    { name: DEMO.user.name, unit: "Perpustakaan", days: [{ t: "13:00–17:00" }, { t: "13:00–17:00", flag: "conflict" }, null, { t: "13:00–17:00", flag: "leave" }, { t: "08:00–12:00" }] },
    { name: "Grace Pangemanan", unit: "Perpustakaan", days: [null, { t: "08:00–12:00" }, { t: "13:00–17:00" }, { t: "08:00–12:00" }, { t: "13:00–17:00" }] },
    { name: "Sarah Kawengian", unit: "Perpustakaan", days: [{ t: "09:00–13:00" }, { t: "09:00–13:00" }, { t: "09:00–13:00" }, { t: "09:00–13:00" }, { t: "09:00–13:00" }] },
    { name: "Kevin Lumowa", unit: "Kafetaria", days: [{ t: "08:00–12:00" }, null, { t: "08:00–12:00" }, null, { t: "08:00–12:00" }] },
    { name: "Daniel Rumondor", unit: "IT Support", days: [{ t: "09:00–13:00" }, { t: "09:00–13:00" }, null, { t: "09:00–13:00" }, { t: "09:00–13:00" }] },
    { name: "Maria Tumbel", unit: "Asrama", days: [{ t: "10:00–14:00" }, null, { t: "10:00–14:00" }, null, { t: "10:00–14:00" }] },
  ],

  attendanceToday: [
    { name: "Kevin Lumowa", nim: "12410051", unit: "Kafetaria", shift: "08:00–12:00", in: "07:58", out: "12:01", dur: "4 j 03 m", status: ["Tepat waktu", "success"] },
    { name: "Grace Pangemanan", nim: "12410077", unit: "Perpustakaan", shift: "08:00–12:00", in: "08:16", out: "12:00", dur: "3 j 44 m", status: ["Telat 16 m", "warning"] },
    { name: "Sarah Kawengian", nim: "12410088", unit: "Perpustakaan", shift: "09:00–13:00", in: "08:55", out: "-", dur: "2 j 10 m", status: ["Sedang bekerja", "info"] },
    { name: "Daniel Rumondor", nim: "12310112", unit: "IT Support", shift: "09:00–13:00", in: "-", out: "-", dur: "-", status: ["Belum hadir", "danger"] },
    { name: "Maria Tumbel", nim: "12410009", unit: "Asrama", shift: "10:00–14:00", in: "09:57", out: "-", dur: "2 j 23 m", status: ["Sedang bekerja", "info"] },
    { name: DEMO.user.name, nim: DEMO.user.nim, unit: "Perpustakaan", shift: "13:00–17:00", in: "-", out: "-", dur: "-", status: ["Terjadwal", "neutral"] },
  ],

  reportsAll: [
    { name: DEMO.user.name, nim: DEMO.user.nim, unit: "Perpustakaan", sent: "9 Nov 20:14", status: ["Menunggu nilai", "info"], score: null, coordinator: "M. Sumampouw", text: "Membantu inventaris koleksi baru dan layanan peminjaman. Kendala: scanner barcode sering error." },
    { name: "Grace Pangemanan", nim: "12410077", unit: "Perpustakaan", sent: "10 Nov 08:30", status: ["Terlambat", "warning"], score: null, coordinator: "M. Sumampouw", text: "Menata ulang rak referensi dan membantu pengunjung mencari buku." },
    { name: "Sarah Kawengian", nim: "12410088", unit: "Perpustakaan", sent: "9 Nov 17:45", status: ["Dinilai", "success"], score: 90, coordinator: "M. Sumampouw", text: "Input data anggota baru dan layanan sirkulasi." },
    { name: "Kevin Lumowa", nim: "12410051", unit: "Kafetaria", sent: "9 Nov 18:02", status: ["Dinilai", "success"], score: 91, coordinator: "R. Tambunan", text: "Penyajian makan siang dan kebersihan area makan." },
    { name: "Daniel Rumondor", nim: "12310112", unit: "IT Support", sent: "9 Nov 21:40", status: ["Menunggu nilai", "info"], score: null, coordinator: "A. Lengkong", text: "Instal ulang 6 PC di Lab 2 dan menangani 9 tiket helpdesk." },
    { name: "Maria Tumbel", nim: "12410009", unit: "Asrama", sent: "-", status: ["Belum dikirim", "danger"], score: null, coordinator: "S. Runtuwene", text: "" },
  ],

  pendingRequests: [
    { name: DEMO.user.name, unit: "Perpustakaan", type: "Izin", detail: "Kamis 13 Nov · 13:00–17:00", reason: "Ujian praktikum" },
    { name: "Grace Pangemanan", unit: "Perpustakaan", type: "Tukar shift", detail: "Jumat 14 Nov → Sarah K.", reason: "Acara keluarga" },
    { name: "Kevin Lumowa", unit: "Kafetaria", type: "Izin", detail: "Rabu 12 Nov · 08:00–12:00", reason: "Sakit" },
  ],

  applicants: [
    { name: "Jonathan Wenas", nim: "12410120", program: "Manajemen · Semester 3", unit: "Administrasi", alt: "Perpustakaan", date: "10 Nov", phone: "0812 xxxx 1120", motivation: "Ingin belajar administrasi kantor sambil membantu biaya kuliah." },
    { name: "Priska Mamahit", nim: "12410143", program: "Akuntansi · Semester 3", unit: "Perpustakaan", alt: "Administrasi", date: "8 Nov", phone: "0812 xxxx 4410", motivation: "Saya suka suasana perpustakaan. Jadwal kuliah saya kosong setiap sore." },
    { name: "Rivaldo Sondakh", nim: "12310156", program: "Sistem Informasi · Semester 5", unit: "IT Support", alt: "-", date: "9 Nov", phone: "0813 xxxx 0156", motivation: "Sudah terbiasa merakit dan memperbaiki komputer." },
    { name: "Angel Kalalo", nim: "12410162", program: "Keperawatan · Semester 3", unit: "Asrama", alt: "Kafetaria", date: "9 Nov", phone: "0852 xxxx 0162", motivation: "Tinggal di asrama, jadi mudah mengatur waktu kerja." },
  ],

  unitsAdmin: [
    { name: "Perpustakaan", coordinator: "M. Sumampouw", filled: 6, quota: 6, max: 20, target: 16 },
    { name: "Kafetaria", coordinator: "R. Tambunan", filled: 5, quota: 5, max: 20, target: 16 },
    { name: "IT Support", coordinator: "A. Lengkong", filled: 3, quota: 4, max: 20, target: 16 },
    { name: "Asrama", coordinator: "S. Runtuwene", filled: 4, quota: 4, max: 16, target: 12 },
    { name: "Kebersihan Kampus", coordinator: "J. Mandagi", filled: 2, quota: 3, max: 20, target: 16 },
    { name: "Administrasi", coordinator: "", filled: 1, quota: 2, max: 12, target: 8 },
  ],
});

// Koordinator hanya melihat data unitnya; admin melihat semua.
const forMyUnit = (rows) => (getRole() === "coordinator" ? rows.filter((r) => r.unit === currentUser().unitName) : rows);

// ---------- Minggu berjalan dihitung dari tanggal hari ini ----------
// Isi jadwal di atas tetap contoh, tapi tanggal, label minggu, dan "hari ini" mengikuti kalender asli
// (Senin–Jumat minggu ini). Sabtu/Minggu: todayIndex = -1, tidak ada kolom yang disorot.
(function setCurrentWeek() {
  const now = new Date();
  const offset = (now.getDay() + 6) % 7; // Senin = 0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
  const fmt = (d, opts) => d.toLocaleDateString("id-ID", opts);
  DEMO.week.forEach((day, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    day.day = fmt(d, { weekday: "long" });
    day.date = fmt(d, { day: "numeric", month: "short" });
  });
  const friday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4);
  DEMO.weekLabel = `${fmt(monday, { day: "numeric", month: "short" })} – ${fmt(friday, { day: "numeric", month: "long", year: "numeric" })}`;
  DEMO.todayIndex = offset <= 4 ? offset : -1;
})();
