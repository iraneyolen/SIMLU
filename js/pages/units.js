// Unit kerja (tabel `units`), hanya admin. Tambah, ubah, hapus. Jumlah terisi dihitung dari mahasiswa aktif.

const filledOf = (name) => store.list("students").filter((s) => s.active && s.unit === name).length;

function render() {
  const q = $("searchInput").value.trim().toLowerCase();
  const units = store.list("units").filter((u) => !q || u.name.toLowerCase().includes(q));
  $("unitGrid").innerHTML = units.length ? units.map((u) => {
    const filled = filledOf(u.name);
    const pct = Math.min(100, Math.round((filled / Math.max(u.quota, 1)) * 100));
    return `<section class="panel flex flex-col gap-4 p-5">
      <div class="flex items-start gap-2">
        <div class="flex-1"><h2>${esc(u.name)}</h2><div class="text-xs text-ink-2">${esc(u.desc || "-")}</div></div>
        ${filled >= u.quota ? badge("Penuh", "success") : `<span class="text-xs whitespace-nowrap text-ink-2 tabular">${u.quota - filled} kosong</span>`}
      </div>
      <div><div class="mb-1.5 flex justify-between text-xs"><span class="text-ink-2">Terisi</span><span class="font-semibold tabular">${filled} / ${u.quota}</span></div>
        <div class="h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-label="Kuota ${esc(u.name)} terisi" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="h-full rounded-full ${pct >= 100 ? "bg-ok" : "bg-ink-2"}" style="width:${pct}%"></div></div></div>
      <dl class="m-0 divide-y divide-line">
        <div class="kv"><dt>Koordinator</dt><dd>${u.coordinator ? esc(u.coordinator) : '<span class="text-bad">Belum ada</span>'}</dd></div>
        <div class="kv"><dt>Batas / target jam</dt><dd class="tabular">${u.max} j, target ${u.target} j</dd></div>
      </dl>
      <div class="mt-auto flex gap-2">
        <button class="btn btn-secondary flex-1" type="button" data-edit="${u.id}">Ubah</button>
        <button class="btn btn-ghost px-3 text-bad" type="button" data-delete="${u.id}" aria-label="Hapus unit ${esc(u.name)}"><i class="ph ph-trash text-base" aria-hidden="true"></i></button>
      </div>
    </section>`;
  }).join("") : `<div class="md:col-span-2 xl:col-span-3">${emptyState("Unit tidak ditemukan")}</div>`;
}

function openForm(unit) {
  const u = unit || { name: "", desc: "", coordinator: "", quota: 4, max: 20, target: 16 };
  formModal({
    title: unit ? "Ubah Unit" : "Tambah Unit",
    body: `${field("Nama unit *", "name", "required", u.name)}
      ${field("Deskripsi pekerjaan", "desc", "", u.desc)}
      ${field("Koordinator", "coordinator", 'placeholder="Kosongkan kalau belum ada"', u.coordinator)}
      <div class="grid grid-cols-3 gap-4">
        ${field("Kuota *", "quota", 'type="number" min="1" max="50" required', u.quota)}
        ${field("Batas jam *", "max", 'type="number" min="1" max="40" required', u.max)}
        ${field("Target jam *", "target", 'type="number" min="1" max="40" required', u.target)}
      </div>`,
    onSubmit: (fd) => {
      const data = { name: fd.get("name").trim(), desc: fd.get("desc").trim(), coordinator: fd.get("coordinator").trim(),
        quota: Number(fd.get("quota")), max: Number(fd.get("max")), target: Number(fd.get("target")) };
      if (data.target > data.max) { toast("Target jam tidak boleh lebih dari batas jam."); return false; }
      if (store.list("units").some((x) => x.name.toLowerCase() === data.name.toLowerCase() && x.id !== unit?.id)) { toast("Nama unit sudah ada."); return false; }
      if (unit) store.update("units", unit.id, data);
      else store.add("units", data);
      render();
      toast(unit ? "Unit diubah." : "Unit ditambahkan.");
    },
  });
}

$("unitGrid").addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit]");
  const del = event.target.closest("[data-delete]");
  if (edit) openForm(store.get("units", edit.dataset.edit));
  if (del) {
    const u = store.get("units", del.dataset.delete);
    if (filledOf(u.name)) { toast(`Masih ada ${filledOf(u.name)} mahasiswa aktif di ${u.name}. Pindahkan dulu.`); return; }
    confirmModal(`Hapus unit ${u.name}?`, "Unit yang dihapus tidak bisa dikembalikan.", () => {
      store.remove("units", u.id);
      render();
      toast("Unit dihapus.");
    });
  }
});
$("addBtn").addEventListener("click", () => openForm(null));
$("searchInput").addEventListener("input", render);
render();
