// Absensi: jam berjalan + 6 keadaan tombol (lihat frame "State Tombol Absensi" di Figma).
// Mode local: jam dari perangkat (localStorage). Mode supabase: jam dari server lewat RPC. Data di tabel `attendance`.
// Nanti: checkIn/checkOut memakai serverTimestamp() dan dokumen di koleksi `attendance`.

const shift = DEMO.todayShift;
const el = (id) => document.getElementById(id);

el("todayDate").textContent = todayLabel();

if (shift) {
  const hours = formatDuration(toMinutes(shift.end) - toMinutes(shift.start));
  el("shiftInfo").innerHTML = `
    <div class="kv"><dt>Unit</dt><dd>${esc(DEMO.unit.name)} · ${esc(DEMO.unit.location)}</dd></div>
    <div class="kv"><dt>Shift</dt><dd>${shift.start} – ${shift.end} (${hours})</dd></div>
    <div class="kv"><dt>Koordinator</dt><dd>${esc(DEMO.unit.coordinatorName)}</dd></div>`;
} else {
  el("shiftInfo").innerHTML = '<div class="py-2 text-center text-ink-2">Tidak ada shift untuk hari ini.</div>';
}

// Menentukan keadaan dari shift, catatan absensi, dan jam sekarang.
function getState(now, record) {
  if (!shift) return "no-shift";
  if (record.checkOut != null) return "done";
  if (record.checkIn != null) return "working";
  const start = toMinutes(shift.start), end = toMinutes(shift.end);
  if (now < start - CHECKIN_OPENS) return "too-early";
  if (now >= end) return "missed";
  return "ready";
}

function lateText(record) {
  const late = record.checkIn - toMinutes(shift.start);
  return late > LATE_TOLERANCE ? `telat ${late} m` : "tepat waktu";
}

function render() {
  const now = nowMinutes();
  const record = getAttendance();
  const state = getState(now, record);
  const button = el("actionButton");
  const badge = el("stateBadge");
  const set = (badgeText, badgeClass, label, btnClass, enabled, hint) => {
    const tone = badgeClass.replace("badge-", ""); badge.className = "status status-" + TONE[tone]; badge.innerHTML = statusInner(badgeText, tone);
    button.textContent = label; button.className = "btn btn-lg w-full max-w-md " + btnClass.replace("btn-light", "btn-secondary"); button.disabled = !enabled;
    el("actionHint").textContent = hint;
  };
  // Mode local memakai jam perangkat; mode supabase mencatat jam server (RPC check_in_attendance).
  const serverNote = store.source === "supabase" ? "Jam check-in dan check-out dicatat oleh server." : "Mode demo: jam diambil dari perangkat ini.";

  if (state === "no-shift") set("Tidak ada shift hari ini", "badge-neutral", "Belum bisa check-in", "btn-light", false, "Lihat menu Jadwal untuk shift berikutnya.");
  if (state === "too-early") set(`Check-in dibuka ${toHHMM(toMinutes(shift.start) - CHECKIN_OPENS)}`, "badge-neutral", "Belum bisa check-in", "btn-light", false, serverNote);
  if (state === "missed") set("Shift sudah lewat tanpa check-in", "badge-danger", "Belum bisa check-in", "btn-light", false, "Hubungi koordinator kalau kamu sebenarnya hadir.");
  if (state === "ready") {
    const diff = toMinutes(shift.start) - now;
    const text = diff > 0 ? `Shift dimulai ${diff} menit lagi` : diff >= -LATE_TOLERANCE ? "Shift sudah dimulai" : `Terlambat ${-diff} menit`;
    set(text, diff >= -LATE_TOLERANCE ? "badge-info" : "badge-warning", "Check-In", "btn-success", true, serverNote);
  }
  if (state === "working") set(`Masuk ${toHHMM(record.checkIn)} · ${lateText(record)}`, "badge-success", "Check-Out", "btn-primary", true, "Tekan Check-Out saat pekerjaan selesai.");
  if (state === "done") set(`Selesai · ${formatDuration(record.checkOut - record.checkIn)}`, "badge-success", "Sudah check-out", "btn-light", false, "Terima kasih. Catatan hari ini sudah tersimpan.");

  el("checkInValue").textContent = record.checkIn != null ? toHHMM(record.checkIn) : "-";
  el("checkOutValue").textContent = record.checkOut != null ? toHHMM(record.checkOut) : "-";
  const worked = record.checkIn == null ? 0 : (record.checkOut ?? now) - record.checkIn;
  el("durationValue").textContent = formatDuration(Math.max(worked, 0));
  button.dataset.state = state;
}

el("actionButton").addEventListener("click", () => {
  const record = getAttendance();
  const state = el("actionButton").dataset.state;
  if (state === "ready") {
    record.checkIn = nowMinutes();
    el("liveStatus").textContent = `Check-in berhasil pukul ${toHHMM(record.checkIn)}.`;
  } else if (state === "working") {
    record.checkOut = nowMinutes();
    el("liveStatus").textContent = `Check-out berhasil pukul ${toHHMM(record.checkOut)}.`;
  } else return;
  saveAttendance(record);
  render();
});

el("resetDemo").addEventListener("click", () => { saveAttendance({}); render(); });
if (store.source === "supabase") el("resetDemo").hidden = true; // absensi asli tidak bisa diulang dari sini

function tick() {
  el("liveClock").textContent = new Date().toLocaleTimeString("id-ID", { hour12: false }).replace(/\./g, ":");
}
tick();
render();
setInterval(tick, 1000);
setInterval(render, 15000);
