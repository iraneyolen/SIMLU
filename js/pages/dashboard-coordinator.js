// Dashboard koordinator: ringkasan unit sendiri dari tabel `attendance`, `requests`, `reports`, `students`.

const unit = currentUser().unitName;
const team = attendanceOn(store.today).filter((r) => r.unit === unit);
const pending = store.list("requests").filter((r) => r.unit === unit && r.status === "pending");
const toGrade = store.list("reports").filter((r) => r.unit === unit && r.week === 45 && (r.status === "submitted" || r.status === "late"));
const members = store.list("students").filter((s) => s.unit === unit && s.active);
const present = team.filter((r) => r.in).length;

statCards($("statList"), [
  ["bi-people", "Mahasiswa aktif", String(members.length), unit],
  ["bi-check-circle", "Hadir hari ini", `${present} / ${team.length}`, "Sudah check-in"],
  ["bi-send", "Pengajuan menunggu", String(pending.length), "Perlu keputusan"],
  ["bi-file-text", "Laporan perlu dinilai", String(toGrade.length), "Minggu ke-45"],
]);

$("teamList").innerHTML = team.length
  ? `<ul class="rows">${team.map((r) => `<li><div class="min-w-0 flex-1">${person(r.student, `${r.shift}${r.in ? ", masuk " + r.in : ""}`)}</div>${badge(...attendanceStatus(r))}</li>`).join("")}</ul>`
  : emptyState("Tidak ada shift hari ini");

$("requestList").innerHTML = pending.length
  ? `<ul class="rows">${pending.map((r) => `<li><div class="min-w-0 flex-1">${person(`${r.student}, ${r.type}`, r.shift)}</div>${badge("Menunggu", "warning")}</li>`).join("")}</ul>`
  : emptyState("Tidak ada pengajuan yang menunggu");

$("reportList").innerHTML = toGrade.length
  ? `<ul class="rows">${toGrade.map((r) => `<li><div class="min-w-0 flex-1">${person(r.student, "Dikirim " + r.sent)}</div>${badge(...REPORT_STATUS[r.status])}</li>`).join("")}</ul>`
  : emptyState("Semua laporan sudah dinilai");
