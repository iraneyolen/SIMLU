// Data mahasiswa labor (tabel `students`). Admin: tambah, ubah, hapus. Koordinator: lihat unitnya saja.

const isAdmin = getRole() === "admin";
if (isAdmin) {
  $("unitFilterBox").classList.remove("hidden");
  fillUnitFilter($("unitFilter"));
  $("exportBtn").insertAdjacentHTML("afterend", '<button class="btn btn-primary" type="button" id="addBtn"><i class="ph ph-plus" aria-hidden="true"></i>Tambah mahasiswa</button>');
}

function currentRows() {
  const q = $("searchInput").value.trim().toLowerCase();
  const unit = isAdmin ? $("unitFilter").value : currentUser().unitName;
  const status = $("statusFilter").value;
  return store.list("students").filter((s) =>
    (unit === "Semua unit" || s.unit === unit) &&
    (status === "Semua status" || (status === "Aktif") === s.active) &&
    (!q || s.name.toLowerCase().includes(q) || s.nim.includes(q)));
}

function render() {
  const rows = currentRows();
  // Kolom mengikuti Figma: program studi jadi keterangan di bawah nama, koordinator diambil dari tabel units.
  const cols = ["Mahasiswa", "Unit", "Koordinator", "Jam bulan ini", "Kehadiran", "Status"];
  if (isAdmin) cols.push("");
  const coordinatorOf = Object.fromEntries(store.list("units").map((u) => [u.name, u.coordinator]));
  renderTable($("tableBox"), cols, rows.map((s) => {
    const cells = [
      person(s.name, `${s.nim} · ${s.program}`), esc(s.unit), esc(coordinatorOf[s.unit] || "Belum ada"), esc(s.hours || "0 j 00 m"),
      s.rate == null ? "-" : `<span class="font-semibold tabular ${s.rate < 90 ? "text-warn" : "text-ok"}">${s.rate}%</span>`,
      // Kondisi normal (aktif) tidak diberi penanda; hanya pengecualian yang ditandai
      s.active ? '<span class="text-xs text-ink-2">Aktif</span>' : badge("Nonaktif", "neutral"),
    ];
    // Satu aksi per baris; hapus ada di dalam modal Ubah (aksi berbahaya tidak dipajang di setiap baris)
    if (isAdmin) cells.push(`<button class="btn btn-link" type="button" data-edit="${s.id}" aria-label="Ubah data ${esc(s.name)}">Ubah</button>`);
    return cells;
  }), "Tidak ada mahasiswa untuk filter ini.");
}

function openForm(student) {
  const s = student || { name: "", nim: "", program: "", unit: unitNames()[0], email: "", active: true };
  const node = formModal({
    title: student ? "Ubah Mahasiswa" : "Tambah Mahasiswa",
    body: `${field("Nama lengkap *", "name", "required", s.name)}
      <div class="grid grid-cols-2 gap-4">${field("NIM *", "nim", 'required inputmode="numeric" pattern="[0-9]{8,12}"', s.nim)}${field("Program studi *", "program", "required", s.program)}</div>
      ${select("Unit kerja", "unit", unitNames(), "", s.unit)}
      ${select("Status", "active", [["1", "Aktif"], ["0", "Nonaktif"]], "", s.active ? "1" : "0")}
      ${student ? '<button class="btn btn-link self-start text-bad" type="button" id="deleteStudent"><i class="ph ph-trash" aria-hidden="true"></i>Hapus mahasiswa ini</button>' : ""}`,
    onSubmit: (fd) => {
      const nim = fd.get("nim").trim();
      const data = { name: fd.get("name").trim(), nim, program: fd.get("program").trim(), unit: fd.get("unit"), active: fd.get("active") === "1", email: `${nim}@student.unklab.ac.id` };
      if (store.list("students").some((x) => x.nim === nim && x.id !== student?.id)) { toast("NIM sudah dipakai mahasiswa lain."); return false; }
      const coordinator = store.list("units").find((u) => u.name === data.unit)?.coordinator || "";
      if (student) store.update("students", student.id, { ...data, coordinator });
      else store.add("students", { ...data, coordinator, hours: "0 j 00 m", rate: null });
      render();
      toast(student ? "Data mahasiswa diubah." : "Mahasiswa ditambahkan.");
    },
  });

  node.querySelector("#deleteStudent")?.addEventListener("click", () => {
    closeModal(node, () => confirmModal(`Hapus ${student.name}?`, "Data mahasiswa dihapus permanen. Untuk berhenti kerja biasa, ubah status jadi Nonaktif saja.", () => {
      store.remove("students", student.id);
      render();
      toast("Mahasiswa dihapus.");
    }));
  });
}

$("tableBox").addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit]");
  if (edit) openForm(store.get("students", edit.dataset.edit));
});
$("addBtn")?.addEventListener("click", () => openForm(null));
for (const id of ["unitFilter", "statusFilter"]) $(id).addEventListener("change", render);
$("searchInput").addEventListener("input", render);
$("exportBtn").addEventListener("click", () => downloadCSV("mahasiswa-labor.csv", ["Nama", "NIM", "Program studi", "Unit", "Jam bulan ini", "Kehadiran (%)", "Status"],
  currentRows().map((s) => [s.name, s.nim, s.program, s.unit, s.hours, s.rate ?? "", s.active ? "Aktif" : "Nonaktif"])));
render();
