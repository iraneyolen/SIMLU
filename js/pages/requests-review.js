// Koordinator memutuskan pengajuan di unitnya (update status di tabel `requests`).
// Disetujui: tukar shift memindahkan shift ke mahasiswa pengganti, izin menandai shift sebagai izin.

const unit = currentUser().unitName;
const inUnit = () => store.list("requests").filter((r) => r.unit === unit);

function render() {
  const pending = inUnit().filter((r) => r.status === "pending");
  $("pendingBox").innerHTML = pending.length
    ? `<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">${pending.map((r) => `
        <article class="panel flex flex-col gap-3 p-5">
          <div class="flex items-center gap-2"><span class="flex-1 font-semibold">${esc(r.student)}</span><span class="text-xs font-medium text-ink-2">${esc(r.type)}</span></div>
          <dl class="m-0 divide-y divide-line">
            <div class="kv"><dt>Shift</dt><dd>${esc(r.shift)}</dd></div>
            ${r.replacement ? `<div class="kv"><dt>Pengganti</dt><dd>${esc(r.replacement)}</dd></div>` : ""}
            <div class="kv"><dt>Alasan</dt><dd>${esc(r.reason)}</dd></div>
            <div class="kv"><dt>Diajukan</dt><dd>${esc(r.date)}</dd></div>
          </dl>
          <div class="mt-auto flex gap-2 pt-1">
            <button class="btn btn-success flex-1" type="button" data-approve="${r.id}">Setujui</button>
            <button class="btn btn-secondary flex-1" type="button" data-reject="${r.id}">Tolak</button>
          </div>
        </article>`).join("")}</div>`
    : emptyState("Tidak ada pengajuan yang menunggu");

  const decided = inUnit().filter((r) => r.status !== "pending").reverse();
  renderTable($("decidedBox"), ["Mahasiswa", "Jenis", "Shift", "Status", "Catatan"],
    decided.map((r) => [person(r.student, "Diajukan " + r.date), esc(r.type), esc(r.shift), badge(...REQUEST_STATUS[r.status]), esc(r.note || "-")]),
    "Belum ada pengajuan yang diputuskan.");
}

function approve(id) {
  const r = store.get("requests", id);
  const shift = r.shiftId && store.get("shifts", r.shiftId);
  if (shift && r.type === "Tukar shift" && r.replacement) store.update("shifts", shift.id, { student: r.replacement, flag: "" });
  if (shift && r.type === "Izin") store.update("shifts", shift.id, { flag: "leave" });
  store.update("requests", id, { status: "approved", note: "" });
  render();
  toast(`Pengajuan ${r.student} disetujui.`);
}

function reject(id) {
  const r = store.get("requests", id);
  formModal({
    title: `Tolak pengajuan ${r.student}?`,
    body: textarea("Alasan penolakan *", "note", 'required placeholder="Contoh: pengajuan kurang dari 24 jam sebelum shift"'),
    submitLabel: "Tolak Pengajuan",
    submitClass: "btn-danger",
    onSubmit: (fd) => {
      store.update("requests", id, { status: "rejected", note: fd.get("note").trim() });
      render();
      toast("Pengajuan ditolak.");
    },
  });
}

$("pendingBox").addEventListener("click", (event) => {
  const a = event.target.closest("[data-approve]");
  const b = event.target.closest("[data-reject]");
  if (a) approve(a.dataset.approve);
  if (b) reject(b.dataset.reject);
});
render();
