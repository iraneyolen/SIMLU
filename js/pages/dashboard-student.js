// Dashboard mahasiswa: semua isi dirender dari data (store.js; nanti database).
// Fokus layar: panel shift hari ini (satu-satunya panel beraksen).

const shift = DEMO.todayShift;
const attendance = getAttendance();

// ---------- Shift hari ini ----------
function shiftStatus() {
  if (attendance.checkOut != null) return ["Selesai", "success"];
  if (attendance.checkIn != null) return ["Sedang bekerja", "info"];
  return ["Belum check-in", "warning"];
}

const shiftCard = $("shiftCard");
if (shift) {
  const [label, tone] = shiftStatus();
  const done = attendance.checkOut != null;
  const action = done
    ? '<span class="btn btn-secondary pointer-events-none opacity-60" aria-disabled="true">Sudah check-out</span>'
    : `<a class="btn btn-primary" href="../attendance/index.html">${attendance.checkIn != null ? "Check-out" : "Check-in sekarang"}</a>`;
  shiftCard.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div><h2 id="shiftTitle">Shift hari ini</h2><p class="m-0 text-xs text-ink-2">${esc(DEMO.unit.name)}, ${esc(DEMO.unit.location)}</p></div>
      ${badge(label, tone)}
    </div>
    <div class="tabular text-4xl font-bold tracking-tight">${shift.start}<span class="text-ink-2"> – </span>${shift.end}</div>
    <dl class="m-0 divide-y divide-line">
      <div class="kv"><dt>Koordinator</dt><dd>${esc(DEMO.unit.coordinatorName)}</dd></div>
      <div class="kv"><dt>Tugas</dt><dd>${esc(shift.task)}</dd></div>
    </dl>
    <div class="mt-auto flex flex-col gap-2 sm:flex-row">${action}<a class="btn btn-secondary" href="../request/index.html">Ajukan izin</a></div>`;
} else {
  shiftCard.innerHTML = `<h2 id="shiftTitle">Shift hari ini</h2>
    ${emptyState("Tidak ada shift hari ini", "Lihat jadwal untuk shift berikutnya.")}
    <a class="btn btn-secondary self-start" href="../schedule/index.html">Lihat jadwal</a>`;
}

// ---------- Jadwal kuliah (ditandai kalau bentrok dengan shift) ----------
$("classList").innerHTML = DEMO.classesToday.length
  ? `<ul class="rows">${DEMO.classesToday.map((c) => `
      <li>
        <span class="tabular w-28 shrink-0 font-semibold">${c.start}–${c.end}</span>
        <div class="min-w-0 flex-1">${person(c.course, c.room)}</div>
        ${shift && overlaps(c, shift) ? badge("Bentrok", "danger") : ""}
      </li>`).join("")}</ul>`
  : emptyState("Tidak ada kuliah hari ini");

// ---------- Ringkasan (dihitung dari tabel `shifts` dan `attendance`, sama dengan Riwayat/Kinerja) ----------
const weekShifts = store.list("shifts").filter((x) => x.student === store.ME);
const doneShifts = weekShifts.filter((x) => DEMO.todayIndex === -1 || x.day < DEMO.todayIndex).length;
const monthRows = store.list("attendance").filter((r) => r.student === store.ME && r.date.startsWith(store.today.slice(0, 7)) && !r.leave);
const attended = monthRows.filter((r) => r.in).length;
const lateCount = monthRows.filter((r) => attendanceStatus(r)[0].startsWith("Telat")).length;
const monthMinutes = monthRows.reduce((sum, r) => sum + (attendanceMinutes(r) || 0), 0);
statCards($("statList"), [
  ["", "Shift minggu ini", String(weekShifts.length), `${doneShifts} selesai, ${weekShifts.length - doneShifts} akan datang`],
  ["", "Jam kerja bulan ini", formatDuration(monthMinutes), `Target ${DEMO.unit.targetHoursPerWeek * 4} j per bulan`],
  ["", "Kehadiran", monthRows.length ? `${Math.round((attended / monthRows.length) * 100)}%` : "-", `${attended} dari ${monthRows.length} shift`],
  ["", "Terlambat", `${lateCount} kali`, "Bulan ini"],
]);

// ---------- Pengajuan terakhir ----------
const myRequests = store.list("requests").filter((r) => r.student === store.ME).reverse().slice(0, 3);
$("requestList").innerHTML = myRequests.length
  ? `<ul class="rows">${myRequests.map((r) => {
      const [label, tone] = REQUEST_STATUS[r.status];
      return `<li><div class="min-w-0 flex-1">${person(`${r.type}, ${r.shift}`, "Diajukan " + r.date)}</div>${badge(label, tone)}</li>`;
    }).join("")}</ul>`
  : emptyState("Belum ada pengajuan");

// ---------- Laporan mingguan ----------
const report = DEMO.weeklyReport;
const myReports = store.list("reports").filter((r) => r.student === store.ME);
const thisWeek = myReports.find((r) => r.week === report.week);
const lastGraded = myReports.filter((r) => r.status === "graded").sort((a, b) => b.week - a.week)[0];
const [reportLabel, reportTone] = thisWeek ? REPORT_STATUS[thisWeek.status] : ["Belum diisi", "warning"];
$("reportCard").innerHTML = `
  <div class="flex items-start justify-between gap-3">
    <div><h2 id="reportTitle">Laporan minggu ke-${report.week}</h2><p class="m-0 text-xs text-ink-2">${esc(report.range)}, batas ${esc(report.deadline)}</p></div>
    ${badge(reportLabel, reportTone)}
  </div>
  ${lastGraded ? `<p class="m-0 text-ink-2">Minggu ke-${lastGraded.week}: "${esc(lastGraded.summary)}" <span class="font-semibold text-ink">Nilai ${lastGraded.score}</span></p>` : ""}
  <div class="mt-auto"><a class="btn btn-primary" href="../report/index.html">${thisWeek && thisWeek.status !== "draft" ? "Lihat laporan" : "Isi laporan"}</a></div>`;
