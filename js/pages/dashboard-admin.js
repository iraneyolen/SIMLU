// Dashboard admin: ringkasan semua unit dari tabel `students`, `applicants`, `units`, `attendance`.

const students = store.list("students").filter((s) => s.active);
const pending = store.list("applicants").filter((a) => a.status === "pending");
const units = store.list("units");
const today = attendanceOn(store.today);

statCards($("statList"), [
  ["bi-people", "Mahasiswa aktif", String(students.length), `Di ${units.length} unit`],
  ["bi-check-circle", "Pendaftar menunggu", String(pending.length), "Perlu diperiksa"],
  ["bi-clock", "Hadir hari ini", `${today.filter((r) => r.in).length} / ${today.length}`, "Sudah check-in"],
  ["bi-building", "Unit tanpa koordinator", String(units.filter((u) => !u.coordinator).length), "Atur di Unit Kerja"],
]);

renderTable($("tableBox"), ["Pendaftar", "Unit pilihan", "Tanggal"],
  pending.slice(0, 5).map((a) => [person(a.name, `${a.nim} · ${a.program}`), esc(a.unit), esc(a.date)]),
  "Tidak ada pendaftar yang menunggu.");

$("unitProgress").innerHTML = units.map((u) => {
  const rows = today.filter((r) => r.unit === u.name);
  const came = rows.filter((r) => r.in).length;
  const pct = rows.length ? Math.round((came / rows.length) * 100) : 0;
  return `<div class="py-2 first:pt-0 last:pb-0"><div class="mb-1.5 flex justify-between gap-3 text-xs"><span class="font-semibold text-ink">${esc(u.name)}</span><span class="tabular text-ink-2">${rows.length ? `${came} / ${rows.length}` : "Tidak ada shift"}</span></div>
    <div class="h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-label="Kehadiran ${esc(u.name)}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="h-full rounded-full ${pct === 100 ? "bg-ok" : "bg-ink-2"}" style="width:${pct}%"></div></div></div>`;
}).join("");
