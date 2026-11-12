// Rekap laporan mingguan. Koordinator memberi nilai + komentar (update baris `reports`); admin hanya melihat.
// Mahasiswa aktif tanpa laporan (atau masih draf) ditampilkan "Belum dikirim".

const isAdmin = getRole() === "admin";
if (isAdmin) { $("unitFilterBox").classList.remove("hidden"); fillUnitFilter($("unitFilter")); }
$("roleNote").textContent = isAdmin
  ? "Admin melihat semua unit. Nilai diberikan oleh koordinator masing-masing unit."
  : "Klik Nilai untuk membaca laporan dan memberi nilai 0–100.";

const NOT_SENT = ["Belum dikirim", "danger"];

function currentRows() {
  const week = Number($("weekFilter").value.replace(/\D/g, ""));
  const unit = isAdmin ? $("unitFilter").value : currentUser().unitName;
  const reports = store.list("reports").filter((r) => r.week === week && r.status !== "draft");
  const all = store.list("students")
    .filter((s) => s.active && (unit === "Semua unit" || s.unit === unit))
    .map((s) => ({ student: s, report: reports.find((r) => r.student === s.name) || null }));
  const status = $("statusFilter").value;
  const statusOf = (x) => (x.report ? REPORT_STATUS[x.report.status] : NOT_SENT);
  return { all, rows: all.filter((x) => status === "Semua status" || statusOf(x)[0] === status), statusOf, week };
}

function render() {
  const { all, rows, statusOf, week } = currentRows();
  const graded = all.filter((x) => x.report?.status === "graded");
  const avg = graded.length ? Math.round(graded.reduce((s, x) => s + x.report.score, 0) / graded.length) : "-";
  statCards($("statList"), [
    ["bi-file-text", "Terkirim", `${all.filter((x) => x.report).length} / ${all.length}`, `Minggu ke-${week}`],
    ["bi-hourglass-split", "Perlu dinilai", String(all.filter((x) => x.report && x.report.status !== "graded").length), "Menunggu koordinator"],
    ["bi-bar-chart", "Rata-rata nilai", String(avg), `${graded.length} laporan dinilai`],
  ]);
  renderTable($("tableBox"), ["Mahasiswa", "Unit", "Dikirim", "Status", "Nilai", ""],
    rows.map((x) => [
      person(x.student.name, x.student.nim), esc(x.student.unit), esc(x.report?.sent || "-"), badge(...statusOf(x)), x.report?.score ?? "-",
      x.report ? `<button class="btn btn-secondary btn-sm" type="button" data-open="${x.report.id}">${isAdmin ? "Lihat" : x.report.status === "graded" ? "Ubah nilai" : "Nilai"}</button>` : "",
    ]), "Tidak ada data untuk filter ini.");
  return rows;
}

function openReport(id) {
  const r = store.get("reports", id);
  const detail = `<dl class="m-0 flex flex-col gap-3">
      <div><dt class="text-xs text-ink-2">Pekerjaan</dt><dd class="m-0">${esc(r.summary)}</dd></div>
      ${r.note ? `<div><dt class="text-xs text-ink-2">Kendala</dt><dd class="m-0">${esc(r.note)}</dd></div>` : ""}</dl>`;
  if (isAdmin) {
    formModal({ title: `Laporan ${r.student} · Mg ${r.week}`, body: detail + (r.comment ? `<div class="rounded-lg bg-sunken px-4 py-3 text-xs text-ink-2">${esc(r.comment)}</div>` : ""), submitLabel: "Tutup", onSubmit: () => {} });
    return;
  }
  formModal({
    title: `Nilai Laporan · ${r.student}`,
    body: `${detail}${field("Nilai (0–100)", "score", 'type="number" min="0" max="100" required', r.score ?? "")}${textarea("Komentar untuk mahasiswa", "comment", "", r.comment)}`,
    submitLabel: "Simpan Nilai",
    onSubmit: (fd) => {
      store.update("reports", id, { score: Number(fd.get("score")), comment: fd.get("comment").trim(), status: "graded" });
      render();
      toast(`Nilai ${r.student} disimpan.`);
    },
  });
}

$("tableBox").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-open]");
  if (btn) openReport(btn.dataset.open);
});
for (const id of ["weekFilter", "unitFilter", "statusFilter"]) $(id).addEventListener("change", render);
$("exportBtn").addEventListener("click", () => {
  const { rows, statusOf, week } = currentRows();
  downloadCSV(`laporan-minggu-${week}.csv`, ["Mahasiswa", "NIM", "Unit", "Dikirim", "Status", "Nilai", "Ringkasan"],
    rows.map((x) => [x.student.name, x.student.nim, x.student.unit, x.report?.sent || "", statusOf(x)[0], x.report?.score ?? "", x.report?.summary || ""]));
});
render();
