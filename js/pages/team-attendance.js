// Absensi tim per tanggal (koordinator: unitnya, admin: semua). Koordinator/admin bisa mengoreksi jam
// check-in/out (mis. mahasiswa lupa check-out) atau menandai izin. Data di tabel `attendance`.

const isAdmin = getRole() === "admin";
if (isAdmin) { $("unitFilterBox").classList.remove("hidden"); fillUnitFilter($("unitFilter")); }
$("dateFilter").value = store.today;

function currentRows() {
  const unit = isAdmin ? $("unitFilter").value : currentUser().unitName;
  const status = $("statusFilter").value;
  const all = attendanceOn($("dateFilter").value).filter((r) => unit === "Semua unit" || r.unit === unit);
  return { all, rows: all.filter((r) => status === "Semua status" || attendanceStatus(r)[0].startsWith(status)) };
}

function render() {
  const { all, rows } = currentRows();
  const count = (prefix) => all.filter((r) => attendanceStatus(r)[0].startsWith(prefix)).length;
  statCards($("statList"), [
    ["bi-check-circle", "Tepat waktu", String(count("Tepat waktu")), `dari ${all.length} terjadwal`],
    ["bi-clock-history", "Telat", String(count("Telat")), "Lebih dari 10 menit"],
    ["bi-clock", "Sedang bekerja", String(count("Sedang bekerja")), "Belum check-out"],
    ["bi-x-circle", "Belum hadir", String(count("Belum hadir") + count("Belum check-out")), "Perlu dicek"],
  ]);
  renderTable($("tableBox"), ["Mahasiswa", "Unit", "Shift", "Check-in", "Check-out", "Durasi", "Status", ""],
    rows.map((r) => {
      const min = attendanceMinutes(r);
      return [person(r.student, r.nim), esc(r.unit), r.shift, r.in || "-", r.out || "-", min != null ? formatDuration(min) : "-",
        badge(...attendanceStatus(r)), `<button class="btn btn-secondary btn-sm" type="button" data-fix="${r.student}">Koreksi</button>`];
    }), "Tidak ada jadwal untuk tanggal dan filter ini.");
  $("countLabel").textContent = `Menampilkan ${rows.length} dari ${all.length} jadwal`;
}

function openFix(studentName) {
  const row = attendanceOn($("dateFilter").value).find((r) => r.student === studentName);
  formModal({
    title: `Koreksi Absensi · ${row.student}`,
    body: `<p class="m-0 text-xs text-ink-2">Shift ${row.shift}, ${esc(row.unit)}. Kosongkan jam kalau tidak hadir.</p>
      <div class="grid grid-cols-2 gap-4">${field("Check-in", "in", 'type="time"', row.in)}${field("Check-out", "out", 'type="time"', row.out)}</div>
      <label class="flex items-center gap-2.5 text-sm"><input class="size-4 accent-accent-btn" type="checkbox" id="f-leave" name="leave"${row.leave ? " checked" : ""}>Izin (tidak dihitung tidak hadir)</label>`,
    onSubmit: (fd) => {
      const data = { in: fd.get("in") || "", out: fd.get("in") ? fd.get("out") || "" : "", leave: fd.get("leave") === "on" };
      if (row.id) store.update("attendance", row.id, data);
      else { const { id, ...rest } = row; store.add("attendance", { ...rest, ...data }); }
      render();
      toast("Absensi dikoreksi.");
    },
  });
}

$("tableBox").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-fix]");
  if (btn) openFix(btn.dataset.fix);
});
for (const id of ["dateFilter", "unitFilter", "statusFilter"]) $(id).addEventListener("change", render);
$("exportBtn").addEventListener("click", () => {
  downloadCSV(`absensi-${$("dateFilter").value}.csv`, ["Tanggal", "Mahasiswa", "NIM", "Unit", "Shift", "Check-in", "Check-out", "Status"],
    currentRows().rows.map((r) => [r.date, r.student, r.nim, r.unit, r.shift, r.in, r.out, attendanceStatus(r)[0]]));
});
render();
