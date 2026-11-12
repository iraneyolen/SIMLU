// Laporan mingguan mahasiswa: buat, simpan draf, ubah (selama belum dinilai), dan hapus.
// Data di tabel `reports`; koordinator menilainya di halaman Laporan Mingguan miliknya.

const WEEKS = [
  { week: 46, range: "10–16 November", from: "2026-11-10", to: "2026-11-16", deadline: "Minggu, 16 Nov 23:59" },
  { week: 45, range: "3–9 November", from: "2026-11-03", to: "2026-11-09", deadline: "Minggu, 9 Nov 23:59" },
];
const form = $("reportForm");
const myReports = () => store.list("reports").filter((r) => r.student === store.ME).sort((a, b) => b.week - a.week);
const selectedWeek = () => WEEKS.find((w) => w.week === Number($("weekSelect").value));
const reportOf = (week) => myReports().find((r) => r.week === week);

$("weekSelect").innerHTML = optionTags(WEEKS.map((w) => [w.week, `Minggu ke-${w.week} · ${w.range}`]));

// Isi form dari laporan minggu yang dipilih
function loadWeek() {
  const w = selectedWeek();
  const report = reportOf(w.week);
  const locked = report && report.status === "graded";
  $("deadlineText").textContent = `Batas pengisian ${w.deadline}`;

  const rows = store.list("attendance").filter((r) => r.student === store.ME && r.date >= w.from && r.date <= w.to);
  const minutes = rows.reduce((sum, r) => sum + (attendanceMinutes(r) || 0), 0);
  $("autoInfo").innerHTML = `${icon("info", "mt-0.5 text-base text-ink-2")}
    <div class="text-xs text-ink-2">Terisi otomatis dari absensi: <strong class="tabular text-ink">${rows.filter((r) => r.in).length} shift, ${formatDuration(minutes)}</strong> minggu ini.</div>`;

  $("workText").value = report ? report.summary : "";
  $("noteText").value = report ? report.note : "";
  for (const input of form.querySelectorAll("textarea, button")) input.disabled = locked;
  form.classList.remove("was-validated");
}

function saveReport(status) {
  const w = selectedWeek();
  const data = { summary: $("workText").value.trim(), note: $("noteText").value.trim(), status };
  if (status !== "draft") data.sent = new Date().toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const existing = reportOf(w.week);
  if (existing) store.update("reports", existing.id, data);
  else store.add("reports", { student: store.ME, nim: DEMO.user.nim, unit: DEMO.unit.name, week: w.week, score: null, comment: "", sent: "", ...data });
  renderHistory();
  loadWeek();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  form.classList.add("was-validated");
  if (!form.checkValidity()) return;
  saveReport("submitted");
  toast("Laporan terkirim ke koordinator.");
});

$("draftBtn").addEventListener("click", () => {
  if (!$("workText").value.trim()) { toast("Tulis isi laporan dulu sebelum menyimpan draf."); return; }
  saveReport("draft");
  toast("Draf disimpan.");
});

$("weekSelect").addEventListener("change", loadWeek);

function renderHistory() {
  const rows = myReports();
  renderTable($("tableBox"), ["Minggu", "Ringkasan", "Status", "Nilai", ""],
    rows.map((r) => [
      `<span class="font-semibold tabular">Mg ${r.week}</span>`,
      esc(r.summary),
      badge(...REPORT_STATUS[r.status]),
      r.score ?? "-",
      r.status === "graded" ? "" : `<div class="flex justify-end gap-2">
        <button class="btn btn-secondary btn-sm" type="button" data-edit="${r.week}">Ubah</button>
        <button class="btn btn-ghost btn-sm text-bad" type="button" data-delete="${r.id}">Hapus</button></div>`,
    ]),
    "Belum ada laporan.");

  const commented = rows.find((r) => r.comment);
  $("commentBox").hidden = !commented;
  if (commented) $("commentBox").innerHTML = `<div class="font-semibold">Komentar koordinator, minggu ke-${commented.week}</div><p class="m-0 mt-1">${esc(commented.comment)}</p>`;
}

$("tableBox").addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit]");
  const del = event.target.closest("[data-delete]");
  if (edit) {
    if (!WEEKS.some((w) => w.week === Number(edit.dataset.edit))) { toast("Minggu itu sudah lewat, tidak bisa diubah."); return; }
    $("weekSelect").value = edit.dataset.edit;
    loadWeek();
    $("workText").focus();
  }
  if (del) confirmModal("Hapus laporan?", "Laporan yang dihapus tidak bisa dikembalikan.", () => {
    store.remove("reports", del.dataset.delete);
    renderHistory();
    loadWeek();
    toast("Laporan dihapus.");
  });
});

renderHistory();
loadWeek();
