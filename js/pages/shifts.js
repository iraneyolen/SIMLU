// Jadwal shift (koordinator: unitnya saja, admin: semua unit). CRUD baris tabel `shifts`.
// Aturan: jam selesai > jam mulai, tidak tumpang tindih di hari yang sama, total per minggu <= batas unit.

const isAdmin = getRole() === "admin";
$("weekLabel").textContent = DEMO.weekLabel;
if (isAdmin) { $("unitFilterBox").classList.remove("hidden"); fillUnitFilter($("unitFilter")); }

const unitRule = (name) => store.list("units").find((u) => u.name === name) || { max: 20, target: 16 };
// Shift yang tumpang tindih dengan jadwal kuliah mahasiswanya (tabel `classes`) ditandai bentrok.
const classes = store.list("classes");
const hasClassConflict = (s) => classes.some((c) => c.student_id === s.student_id && c.day === s.day && overlaps(c, s));

function visibleStudents() {
  const unit = isAdmin ? $("unitFilter").value : currentUser().unitName;
  return store.list("students").filter((s) => s.active && (unit === "Semua unit" || s.unit === unit));
}

// "16 j" atau "16 j 30 m" (versi ringkas seperti di Figma)
const shortHours = (min) => (min % 60 ? `${Math.floor(min / 60)} j ${min % 60} m` : `${min / 60} j`);
const FLAG_TEXT = { warning: " · izin", danger: " · bentrok", info: "" };

function render() {
  const shifts = store.list("shifts");
  const students = visibleStudents();
  // Header ringkas: "Sen 9", "Sel 10", ...
  const head = ["Mahasiswa", ...DEMO.week.map((d) => `${d.day.slice(0, 3)} ${d.date.split(" ")[0]}`), "Total"];
  renderTable($("tableBox"), head, students.map((st) => {
    const mine = shifts.filter((s) => s.student_id === st.id);
    const total = mine.reduce((sum, s) => sum + shiftMinutes(s), 0);
    const max = unitRule(st.unit).max;
    const cells = DEMO.week.map((_, day) => {
      const chips = mine.filter((s) => s.day === day).map((s) => {
        const tone = s.flag === "leave" ? "warning" : hasClassConflict(s) ? "danger" : "info";
        // Status juga ditulis sebagai teks, bukan hanya warna
        const t = TONE[tone];
        return `<button class="block w-full cursor-pointer rounded-md bg-${t}-soft px-2.5 py-1.5 text-left text-xs font-semibold whitespace-nowrap text-${t} tabular ring-1 ring-${t}/30 ring-inset hover:ring-${t} [&+&]:mt-1" type="button" data-edit="${s.id}" aria-label="Ubah shift ${esc(st.name)} ${s.start}-${s.end}">${s.start}–${s.end}${FLAG_TEXT[tone]}</button>`;
      }).join("");
      // "+ Tambah" hanya di sel kosong; shift kedua di hari yang sama lewat tombol "Tambah Shift"
      return chips || `<button class="block w-full cursor-pointer rounded-md border border-dashed border-line-strong/60 px-2 py-1.5 text-center text-xs text-ink-2 hover:border-accent hover:text-accent" type="button" data-add="${esc(st.id)}" data-day="${day}" aria-label="Tambah shift ${esc(st.name)}">+ Tambah</button>`;
    });
    const totalCell = total > max * 60 ? badge(`${shortHours(total)} · lewat batas`, "danger")
      : total === max * 60 ? badge(`${shortHours(total)} · maks`, "warning")
      : `<span class="font-semibold tabular">${shortHours(total)}</span>`;
    return [person(st.name, isAdmin ? st.unit : ""), ...cells, totalCell];
  }), "Tidak ada mahasiswa aktif di unit ini.");
}

// Cek aturan, kembalikan pesan error atau "" kalau aman
function validate(data, ignoreId) {
  if (toMinutes(data.end) <= toMinutes(data.start)) return "Jam selesai harus setelah jam mulai.";
  const others = store.list("shifts").filter((s) => s.student_id === data.student_id && s.id !== ignoreId);
  if (others.some((s) => s.day === data.day && overlaps(s, data))) return "Shift ini tumpang tindih dengan shift lain di hari yang sama.";
  const max = unitRule(data.unit).max;
  const total = others.reduce((sum, s) => sum + shiftMinutes(s), 0) + shiftMinutes(data);
  if (total > max * 60) return `Total jadi ${formatDuration(total)}, melebihi batas ${max} j per minggu.`;
  return "";
}

function openShiftModal({ shift, student, day }) {
  const editing = Boolean(shift);
  const names = visibleStudents().map((s) => [s.id, s.name]);
  const body = `
    <div class="rounded-lg bg-bad-soft px-4 py-3 text-sm font-medium text-bad" id="shiftError" role="alert" hidden></div>
    ${select("Mahasiswa", "student", names, editing ? "disabled" : "required", shift?.student_id ?? student ?? "")}
    ${select("Hari", "day", DEMO.week.map((d, i) => [i, `${d.day} ${d.date}`]), "", shift?.day ?? day ?? 0)}
    <div class="grid grid-cols-2 gap-4">${field("Mulai", "start", 'type="time" required', shift?.start ?? "13:00")}${field("Selesai", "end", 'type="time" required', shift?.end ?? "17:00")}</div>
    ${editing ? '<button class="btn btn-link self-start text-bad" type="button" id="deleteShift"><i class="ph ph-trash" aria-hidden="true"></i>Hapus shift ini</button>' : ""}`;

  const node = formModal({
    title: editing ? "Ubah Shift" : "Tambah Shift",
    body,
    submitLabel: editing ? "Simpan" : "Tambah",
    onSubmit: (fd) => {
      const studentId = editing ? shift.student_id : fd.get("student");
      const data = { student_id: studentId, unit: studentOf(studentId).unit, day: Number(fd.get("day")), start: fd.get("start"), end: fd.get("end") };
      const error = validate(data, shift?.id);
      if (error) {
        const box = node.querySelector("#shiftError");
        box.textContent = error;
        box.hidden = false;
        return false;
      }
      if (editing) store.update("shifts", shift.id, data);
      else store.add("shifts", { ...data, flag: "" });
      render();
      toast(editing ? "Shift diubah." : "Shift ditambahkan.");
    },
  });

  node.querySelector("#deleteShift")?.addEventListener("click", () => {
    closeModal(node, () => confirmModal("Hapus shift?", `${nameOf(shift.student_id)} · ${DEMO.week[shift.day].day} ${shift.start}–${shift.end}`, () => {
      store.remove("shifts", shift.id);
      render();
      toast("Shift dihapus.");
    }));
  });
}

$("tableBox").addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit]");
  const add = event.target.closest("[data-add]");
  if (edit) openShiftModal({ shift: store.get("shifts", edit.dataset.edit) });
  if (add) openShiftModal({ student: add.dataset.add, day: Number(add.dataset.day) });
});
$("addBtn").addEventListener("click", () => openShiftModal({}));
$("unitFilter").addEventListener("change", render);
render();
