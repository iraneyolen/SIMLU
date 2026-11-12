// Pendaftar (tabel `applicants`), hanya admin. Data baru datang dari halaman Daftar.
// Setujui = status "approved" + baris baru di `students` (pendaftar bisa login). Tolak wajib beri alasan.

let status = "pending";
let selectedId = null;
fillUnitFilter($("unitFilter"));

const filledOf = (name) => store.list("students").filter((s) => s.active && s.unit === name).length;
const quotaText = (name) => { const u = store.list("units").find((x) => x.name === name); return u ? `${filledOf(name)}/${u.quota} terisi` : "unit tidak ada"; };

function render() {
  const all = store.list("applicants");
  for (const [key, id] of [["pending", "countPending"], ["approved", "countApproved"], ["rejected", "countRejected"]]) {
    $(id).textContent = `(${all.filter((a) => a.status === key).length})`;
  }
  const q = $("searchInput").value.trim().toLowerCase();
  const unit = $("unitFilter").value;
  const rows = all.filter((a) => a.status === status && (unit === "Semua unit" || a.unit === unit) &&
    (!q || a.name.toLowerCase().includes(q) || a.nim.includes(q)));
  if (!rows.some((a) => a.id === selectedId)) selectedId = rows[0]?.id ?? null;

  renderTable($("tableBox"), ["Pendaftar", "Unit pilihan", "Tanggal"],
    rows.map((a) => [person(a.name, `${a.nim} · ${a.program}`), person(a.unit, a.alt && a.alt !== "-" ? `Alternatif: ${a.alt}` : ""), esc(a.date)]),
    "Tidak ada pendaftar di tab ini.");
  // Baris tabel bisa diklik untuk melihat detail
  $("tableBox").querySelectorAll("tbody tr").forEach((tr, i) => {
    tr.classList.add("is-clickable");
    tr.classList.toggle("is-selected", rows[i].id === selectedId);
    tr.tabIndex = 0;
    tr.dataset.id = rows[i].id;
  });
  renderDetail();
}

function renderDetail() {
  const a = selectedId && store.get("applicants", selectedId);
  if (!a) { $("detailCard").innerHTML = '<p class="m-0 py-6 text-center text-ink-2">Pilih pendaftar untuk melihat detail.</p>'; return; }
  const actions = a.status === "pending"
    ? `<button class="btn btn-success flex-1" type="button" id="approveBtn">Setujui</button><button class="btn btn-secondary flex-1" type="button" id="rejectBtn">Tolak</button>`
    : `<button class="btn btn-ghost flex-1 text-bad" type="button" id="deleteBtn">Hapus data pendaftar</button>`;
  $("detailCard").innerHTML = `
    <div class="flex items-start gap-2"><div class="flex-1"><h2>${esc(a.name)}</h2><div class="text-xs text-ink-2">${esc(a.nim)}, ${esc(a.program)}</div></div>
      ${badge(...REQUEST_STATUS[a.status])}</div>
    <dl class="m-0 divide-y divide-line">
      <div class="kv"><dt>Unit pilihan</dt><dd>${esc(a.unit)} <span class="text-xs font-normal text-ink-2">(${quotaText(a.unit)})</span></dd></div>
      <div class="kv"><dt>Alternatif</dt><dd>${esc(a.alt || "-")}</dd></div>
      <div class="kv"><dt>Email</dt><dd>${esc(a.email)}</dd></div>
      <div class="kv"><dt>No. HP</dt><dd>${esc(a.phone)}</dd></div>
      <div class="kv"><dt>Dokumen</dt><dd><a href="${esc(a.driveLink)}" target="_blank" rel="noopener">Buka Google Drive <i class="ph ph-arrow-square-out" aria-hidden="true"></i></a></dd></div>
    </dl>
    <div><div class="text-xs text-ink-2">Motivasi</div><p class="m-0 mt-1">${esc(a.motivation)}</p></div>
    ${a.note ? `<div class="rounded-lg bg-bad-soft px-4 py-3 text-bad">Alasan ditolak: ${esc(a.note)}</div>` : ""}
    <div class="flex gap-2">${actions}</div>`;
}

function approve(a) {
  const choices = [a.unit, a.alt].filter((u) => u && u !== "-" && unitNames().includes(u));
  formModal({
    title: `Setujui ${a.name}?`,
    body: `<p class="m-0">Pendaftar menjadi mahasiswa labor aktif dan bisa login.</p>
      ${select("Tempatkan di unit", "unit", (choices.length ? choices : unitNames()).map((u) => [u, `${u} (${quotaText(u)})`]))}`,
    submitLabel: "Setujui",
    submitClass: "btn-success",
    onSubmit: (fd) => {
      const unit = store.list("units").find((u) => u.name === fd.get("unit"));
      if (filledOf(unit.name) >= unit.quota) { toast(`Kuota ${unit.name} sudah penuh. Pilih unit lain atau tambah kuota.`); return false; }
      store.update("applicants", a.id, { status: "approved", note: "" });
      store.add("students", { name: a.name, nim: a.nim, email: a.email, program: a.program.split(" · ")[0], unit: unit.name,
        coordinator: unit.coordinator, hours: "0 j 00 m", rate: null, active: true });
      render();
      toast(`${a.name} disetujui dan ditempatkan di ${unit.name}.`);
    },
  });
}

function reject(a) {
  formModal({
    title: `Tolak ${a.name}?`,
    body: textarea("Alasan penolakan *", "note", 'required placeholder="Contoh: dokumen KHS belum dilampirkan"'),
    submitLabel: "Tolak",
    submitClass: "btn-danger",
    onSubmit: (fd) => {
      store.update("applicants", a.id, { status: "rejected", note: fd.get("note").trim() });
      render();
      toast("Pendaftaran ditolak.");
    },
  });
}

$("detailCard").addEventListener("click", (event) => {
  const a = store.get("applicants", selectedId);
  if (event.target.closest("#approveBtn")) approve(a);
  if (event.target.closest("#rejectBtn")) reject(a);
  if (event.target.closest("#deleteBtn")) confirmModal(`Hapus data ${a.name}?`, "Data pendaftar dihapus permanen.", () => {
    store.remove("applicants", a.id);
    render();
    toast("Data pendaftar dihapus.");
  });
});

const pick = (tr) => { if (tr?.dataset.id) { selectedId = tr.dataset.id; render(); } };
$("tableBox").addEventListener("click", (event) => pick(event.target.closest("tr")));
$("tableBox").addEventListener("keydown", (event) => { if (event.key === "Enter") pick(event.target.closest("tr")); });

segmented($("statusTabs"), (value) => { status = value; selectedId = null; render(); });
$("searchInput").addEventListener("input", render);
$("unitFilter").addEventListener("change", render);
render();
