// Pengajuan izin / tukar shift. Baris baru masuk tabel `requests` dengan status "pending",
// lalu koordinator menyetujui atau menolak di halaman Pengajuan miliknya.

const form = $("requestForm");
let type = "swap"; // swap | leave
const shiftLabelOf = (s) => `${DEMO.week[s.day].day} ${DEMO.week[s.day].date} · ${s.start}–${s.end}`;

function fillOptions() {
  const myShifts = store.list("shifts").filter((s) => s.student_id === store.ME && s.flag !== "leave").sort((a, b) => a.day - b.day);
  $("shiftSelect").innerHTML = '<option value="">Pilih shift</option>' + optionTags(myShifts.map((s) => [s.id, shiftLabelOf(s)]));
  const mates = store.list("students").filter((s) => s.unit === DEMO.unit.name && s.active && s.id !== store.ME);
  $("replacementSelect").innerHTML = '<option value="">Pilih dari unit yang sama</option>' + optionTags(mates.map((s) => [s.id, s.name]));
}

function setType(next) {
  type = next;
  const swap = type === "swap";
  $("shiftLabel").textContent = swap ? "Shift yang ditukar *" : "Shift yang tidak bisa dihadiri *";
  $("replacementGroup").hidden = !swap;
  $("replacementSelect").required = swap;
  form.classList.remove("was-validated");
}

segmented($("typeTabs"), setType);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  form.classList.add("was-validated");
  if (!form.checkValidity()) return;
  const shift = store.get("shifts", $("shiftSelect").value);
  store.add("requests", {
    student_id: store.ME, unit: DEMO.unit.name, type: type === "swap" ? "Tukar shift" : "Izin",
    shift: shiftLabelOf(shift), shiftId: shift.id, replacement_id: type === "swap" ? $("replacementSelect").value : "",
    reason: $("reasonText").value.trim(), status: "pending", note: "",
    date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
  });
  form.reset();
  form.classList.remove("was-validated");
  renderHistory();
  toast("Pengajuan terkirim ke koordinator.");
});

function renderHistory() {
  const rows = store.list("requests").filter((r) => r.student_id === store.ME).reverse();
  renderTable($("tableBox"), ["Jenis", "Shift", "Pengganti", "Status", ""],
    rows.map((r) => [
      person(r.type, "Diajukan " + r.date),
      esc(r.shift),
      esc(r.replacement_id ? nameOf(r.replacement_id) : "-"),
      badge(...REQUEST_STATUS[r.status]) + (r.note ? `<div class="mt-1 text-xs text-ink-2">${esc(r.note)}</div>` : ""),
      r.status === "pending" ? `<button class="btn btn-ghost btn-sm text-bad" type="button" data-cancel="${r.id}">Batalkan</button>` : "",
    ]),
    "Belum ada pengajuan.");
}

$("tableBox").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-cancel]");
  if (!btn) return;
  confirmModal("Batalkan pengajuan?", "Pengajuan ini akan dihapus dan tidak dikirim ke koordinator.", () => {
    store.remove("requests", btn.dataset.cancel);
    renderHistory();
    toast("Pengajuan dibatalkan.");
  }, "Batalkan Pengajuan");
});

fillOptions();
setType("swap");
renderHistory();
