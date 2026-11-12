// Riwayat absensi mahasiswa: ringkasan, heatmap kehadiran sebulan (motif identitas, lihat DESIGN.md), dan tabel catatan.
// Data dari tabel `attendance`; check-in di halaman Absensi langsung muncul di sini.

const MONTHS = { "November 2026": "2026-11", "Oktober 2026": "2026-10" };
const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const HEAT = { success: "bg-ok-soft text-ok", warning: "bg-warn-soft text-warn", danger: "bg-bad-soft text-bad", info: "bg-info-soft text-info", neutral: "bg-sunken text-ink-2" };
const fmtDate = (isoDate) => new Date(isoDate + "T00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" });

const mine = store.list("attendance").filter((r) => r.student === store.ME).sort((a, b) => b.date.localeCompare(a.date));

// Satu kotak per tanggal. Hari tanpa shift tetap tampil (kosong) supaya pola minggu terbaca.
function renderHeatmap(month, rows) {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Senin = 0
  const byDate = Object.fromEntries(rows.map((r) => [r.date, r]));
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push('<li aria-hidden="true"></li>');
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${month}-${String(d).padStart(2, "0")}`;
    const row = byDate[iso];
    const isToday = iso === store.today;
    const future = iso > store.today;
    let cls = "border border-dashed border-line text-ink-2";
    let label = future ? "belum terjadi" : "tidak ada shift";
    let mark = "";
    if (row) {
      const [text, tone] = attendanceStatus(row);
      cls = HEAT[tone];
      label = `${text}, shift ${row.shift}`;
      // Ikon berbeda per status: terbaca juga oleh pengguna buta warna merah-hijau
      mark = icon(STATUS_ICON[TONE[tone]], "text-base leading-none");
    }
    cells.push(`<li class="flex aspect-square flex-col justify-between rounded-md p-1 text-2xs font-semibold tabular ${cls} ${future && !row ? "opacity-50" : ""} ${isToday ? "ring-2 ring-accent ring-offset-1 ring-offset-canvas" : ""}"
      title="${d} ${esc($("monthFilter").value)}: ${esc(label)}" aria-label="${d}: ${esc(label)}"><span class="self-end">${d}</span>${mark}</li>`);
  }
  const legend = [["Tepat waktu", "success"], ["Telat", "warning"], ["Izin", "info"], ["Tidak hadir / belum check-out", "danger"]]
    .map(([t, tone]) => `<span class="inline-flex items-center gap-1.5"><span class="grid size-5 place-items-center rounded-sm ${HEAT[tone]}">${icon(STATUS_ICON[TONE[tone]], "text-xs")}</span>${t}</span>`).join("");
  $("heatmap").innerHTML = `
    <div class="w-full max-w-lg">
      <div class="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-2xs font-semibold text-ink-2" aria-hidden="true">${DAYS.map((d) => `<span>${d}</span>`).join("")}</div>
      <ol class="m-0 grid list-none grid-cols-7 gap-1.5 p-0" aria-label="Kalender kehadiran ${esc($("monthFilter").value)}">${cells.join("")}</ol>
      <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-2">${legend}</div>
    </div>`;
  $("heatMonth").textContent = $("monthFilter").value;
}

function renderHistory() {
  const month = MONTHS[$("monthFilter").value];
  const status = $("statusFilter").value;
  const inMonth = mine.filter((r) => r.date.startsWith(month));
  const rows = inMonth.filter((r) => status === "Semua status" || attendanceStatus(r)[0].startsWith(status));

  const totalMinutes = inMonth.reduce((sum, r) => sum + (attendanceMinutes(r) || 0), 0);
  statCards($("statList"), [
    ["", "Hadir", `${inMonth.filter((r) => r.in).length} shift`, $("monthFilter").value],
    ["", "Total jam kerja", formatDuration(totalMinutes), "Dari catatan di bawah"],
    ["", "Terlambat", `${inMonth.filter((r) => attendanceStatus(r)[0].startsWith("Telat")).length} kali`, "Lebih dari 10 menit"],
  ]);
  renderHeatmap(month, inMonth);

  renderTable($("tableBox"), ["Tanggal", "Shift", "Check-in", "Check-out", "Durasi", "Status"],
    rows.map((r) => {
      const min = attendanceMinutes(r);
      return [person(fmtDate(r.date), r.unit), `<span class="tabular">${r.shift}</span>`, `<span class="tabular">${r.in || "-"}</span>`, `<span class="tabular">${r.out || "-"}</span>`,
        `<span class="tabular">${min != null ? formatDuration(min) : "-"}</span>`, badge(...attendanceStatus(r))];
    }),
    "Tidak ada catatan untuk filter ini.");
  $("countLabel").textContent = `${rows.length} dari ${inMonth.length} catatan`;
  return rows;
}

$("statusFilter").addEventListener("change", renderHistory);
$("monthFilter").addEventListener("change", renderHistory);
$("exportBtn").addEventListener("click", () => {
  const rows = renderHistory();
  downloadCSV("riwayat-absensi.csv", ["Tanggal", "Unit", "Shift", "Check-in", "Check-out", "Durasi (menit)", "Status"],
    rows.map((r) => [r.date, r.unit, r.shift, r.in, r.out, attendanceMinutes(r) ?? "", attendanceStatus(r)[0]]));
});
renderHistory();
