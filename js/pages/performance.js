// Kinerja mahasiswa: tiga grafik Chart.js, semuanya dihitung dari tabel `attendance` dan `reports`.

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// Warna dibaca dari token tema setiap kali grafik digambar, supaya ikut mode terang/gelap.
let COLOR = {};
const readColors = () => {
  COLOR = { primary: css("--c-accent"), success: css("--c-ok"), warning: css("--c-warn"), muted: css("--c-ink-2"), border: css("--c-line") };
  Chart.defaults.color = COLOR.muted;
};
Chart.defaults.font.family = '"Atkinson Hyperlegible Next", system-ui, sans-serif';

const MONTHS = { "November 2026": "2026-11", "Oktober 2026": "2026-10" };
const target = DEMO.unit.targetHoursPerWeek;
const charts = [];

function render() {
  readColors();
  charts.splice(0).forEach((c) => c.destroy());
  const month = MONTHS[$("periodFilter").value];
  const rows = store.list("attendance").filter((r) => r.student_id === store.ME && r.date.startsWith(month));

  // ---------- Ketepatan check-in ----------
  const counts = { "Tepat waktu": 0, "Terlambat": 0, "Izin / tidak hadir": 0 };
  for (const r of rows) {
    const [label] = attendanceStatus(r);
    if (label === "Tepat waktu") counts["Tepat waktu"]++;
    else if (label.startsWith("Telat")) counts["Terlambat"]++;
    else if (label === "Izin" || label === "Belum hadir") counts["Izin / tidak hadir"]++;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const rate = total ? Math.round((counts["Tepat waktu"] / total) * 100) : 0;

  // ---------- Nilai laporan ----------
  const graded = store.list("reports").filter((r) => r.student_id === store.ME && r.status === "graded").sort((a, b) => a.week - b.week);
  const scores = graded.map((g) => [`Mg ${g.week}`, g.score]);
  const avgScore = scores.length ? Math.round(scores.reduce((s, [, v]) => s + v, 0) / scores.length) : 0;

  // Jam kerja 4 minggu terakhir (termasuk minggu ini)
  const mine = store.list("attendance").filter((r) => r.student_id === store.ME);
  const hours = [-3, -2, -1, 0].map((offset) => {
    const w = weekInfo(offset);
    const min = mine.filter((r) => r.date >= w.from && r.date <= w.to).reduce((s, r) => s + (attendanceMinutes(r) || 0), 0);
    return [`Mg ${w.week}`, Math.round((min / 60) * 10) / 10];
  });
  const totalMinutes = rows.reduce((s, r) => s + (attendanceMinutes(r) || 0), 0);

  statCards($("statList"), [
    ["bi-clock", "Jam kerja", formatDuration(totalMinutes), $("periodFilter").value],
    ["bi-check-circle", "Tepat waktu", `${rate}%`, `${counts["Tepat waktu"]} dari ${total} shift`],
    ["bi-file-text", "Rata-rata nilai", String(avgScore), `${scores.length} laporan dinilai`],
  ]);

  charts.push(new Chart($("hoursChart"), {
    type: "bar",
    data: {
      labels: hours.map(([w]) => w),
      datasets: [
        { label: "Jam kerja", data: hours.map(([, h]) => h), backgroundColor: COLOR.primary, borderRadius: 6, maxBarThickness: 48 },
        { label: "Target", type: "line", data: hours.map(() => target), borderColor: COLOR.warning, borderDash: [6, 4], pointRadius: 0, borderWidth: 2 },
      ],
    },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, suggestedMax: DEMO.unit.maxHoursPerWeek, grid: { color: COLOR.border } }, x: { grid: { display: false } } } },
  }));
  const under = hours.filter(([, h]) => h < target).length;
  $("hoursSummary").textContent = `Target ${target} j per minggu. ${under} dari ${hours.length} minggu masih di bawah target.`;

  charts.push(new Chart($("punctualChart"), {
    type: "doughnut",
    data: { labels: Object.keys(counts), datasets: [{ data: Object.values(counts), backgroundColor: [COLOR.success, COLOR.warning, COLOR.muted], borderWidth: 0 }] },
    options: { maintainAspectRatio: false, cutout: "68%", plugins: { legend: { display: false } } },
  }));
  $("punctualLegend").innerHTML = Object.entries(counts).map(([label, n], i) => `
    <div class="kv"><dt class="flex items-center gap-2"><span class="size-3 rounded-sm" style="background:${[COLOR.success, COLOR.warning, COLOR.muted][i]}"></span>${esc(label)}</dt><dd class="tabular">${n} shift</dd></div>`).join("");

  charts.push(new Chart($("scoreChart"), {
    type: "line",
    data: { labels: scores.map(([w]) => w), datasets: [{ label: "Nilai", data: scores.map(([, v]) => v), borderColor: COLOR.primary, backgroundColor: COLOR.primary, tension: 0.3 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 50, max: 100, grid: { color: COLOR.border } }, x: { grid: { display: false } } } },
  }));
  $("scoreSummary").textContent = `Rata-rata ${avgScore}. Nilai terakhir ${scores.at(-1)?.[1] ?? "-"}.`;
}

$("periodFilter").addEventListener("change", render);
window.addEventListener("themechange", render);
render();
