// Jadwal mingguan sebagai time-grid (motif identitas, lihat DESIGN.md): jam di sumbu vertikal,
// kuliah (seed dari SI Unklab) dan shift (tabel `shifts`) sebagai blok. Bentrok = blok tumpang tindih.
// Di layar < 768px tampil sebagai daftar per hari.

const myShifts = store.list("shifts").filter((s) => s.student_id === store.ME);
const myClasses = store.list("classes").filter((c) => c.student_id === store.ME);
const WEEK = DEMO.week.map((day, i) => ({
  ...day,
  items: [
    ...myClasses.filter((c) => c.day === i).map((c) => ({ type: "class", start: c.start, end: c.end, title: c.course, sub: c.room })),
    ...myShifts.filter((s) => s.day === i).map((s) => ({
      type: "shift", start: s.start, end: s.end, title: `Shift ${s.unit}`, sub: s.flag === "leave" ? "Izin disetujui" : DEMO.unit.location, leave: s.flag === "leave",
    })),
  ].sort((a, b) => toMinutes(a.start) - toMinutes(b.start)),
}));

$("weekLabel").textContent = DEMO.weekLabel;
let view = "all"; // all | shift | class

const isConflict = (item, day) => day.items.some((o) => o !== item && o.type !== item.type && overlaps(item, o));
const tone = (it, day) => (it.leave ? "border-warn bg-warn-soft text-warn"
  : isConflict(it, day) ? "border-bad bg-bad-soft text-bad"
  : it.type === "shift" ? "border-accent bg-accent-soft text-accent" : "border-line-strong/60 bg-sunken text-ink");
const visible = (day) => day.items.filter((it) => view === "all" || it.type === view);

// Rentang jam grid: dari kegiatan paling pagi sampai paling sore, dibulatkan ke jam penuh
const allItems = WEEK.flatMap((d) => d.items);
const startHour = Math.min(7, ...allItems.map((it) => Math.floor(toMinutes(it.start) / 60)));
const endHour = Math.max(18, ...allItems.map((it) => Math.ceil(toMinutes(it.end) / 60)));
const HOUR_PX = 52;

function renderGrid() {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridH = hours.length * HOUR_PX;
  const columns = WEEK.map((day, i) => {
    const items = visible(day);
    const blocks = items.map((it) => {
      const top = ((toMinutes(it.start) - startHour * 60) / 60) * HOUR_PX;
      const height = Math.max(((toMinutes(it.end) - toMinutes(it.start)) / 60) * HOUR_PX - 2, 24);
      // Kegiatan yang bentrok dibagi dua kolom supaya keduanya terlihat
      const clash = view === "all" && isConflict(it, day);
      const side = clash ? (it.type === "class" ? "left-1 right-1/2 mr-0.5" : "left-1/2 right-1 ml-0.5") : "left-1 right-1";
      return `<div class="absolute ${side} overflow-hidden rounded-md border px-2 py-1 text-xs ${tone(it, day)}" style="top:${top}px;height:${height}px">
        <div class="tabular font-semibold">${it.start}–${it.end}</div>
        <div class="truncate font-semibold text-ink">${esc(it.title)}</div>
        <div class="truncate text-ink-2">${esc(clash ? "Bentrok" : it.sub)}</div></div>`;
    }).join("");
    const today = i === DEMO.todayIndex;
    return `<div class="min-w-0">
      <div class="sticky top-0 mb-2 text-center ${today ? "text-accent" : ""}"><div class="text-xs font-semibold text-ink-2">${esc(day.day)}</div>
        <div class="text-sm font-bold tabular ${today ? "mx-auto w-fit rounded-md bg-accent-soft px-2" : ""}">${esc(day.date)}</div></div>
      <div class="relative rounded-lg border border-line ${today ? "bg-accent-soft/30" : "bg-surface"}" style="height:${gridH}px">
        ${hours.map((_, h) => `<div class="absolute inset-x-0 border-t border-line/70" style="top:${h * HOUR_PX}px"></div>`).join("")}
        ${blocks}
      </div></div>`;
  }).join("");
  const axis = `<div class="pt-[42px]">${hours.map((h) => `<div class="tabular -translate-y-2 pr-2 text-right text-2xs text-ink-2" style="height:${HOUR_PX}px">${String(h).padStart(2, "0")}:00</div>`).join("")}</div>`;
  return `<div class="hidden grid-cols-[3.25rem_repeat(5,minmax(0,1fr))] gap-2 md:grid" aria-hidden="true">${axis}${columns}</div>`;
}

// Versi daftar untuk HP (dan untuk pembaca layar)
function renderList() {
  return `<ol class="m-0 flex list-none flex-col gap-4 p-0 md:sr-only">${WEEK.map((day, i) => {
    const items = visible(day);
    return `<li><div class="mb-2 text-sm font-bold ${i === DEMO.todayIndex ? "text-accent" : ""}">${esc(day.day)}, ${esc(day.date)}${i === DEMO.todayIndex ? " (hari ini)" : ""}</div>
      ${items.length ? `<ul class="m-0 flex list-none flex-col gap-2 p-0">${items.map((it) => `
        <li class="rounded-lg border px-3 py-2 ${tone(it, day)}">
          <div class="tabular text-xs font-semibold">${it.start}–${it.end}</div>
          <div class="font-semibold text-ink">${esc(it.title)}</div>
          <div class="text-xs text-ink-2">${esc(isConflict(it, day) ? "Bentrok dengan " + (it.type === "class" ? "shift" : "kuliah") : it.sub)}</div></li>`).join("")}</ul>`
        : '<p class="m-0 text-xs text-ink-2">Tidak ada jadwal</p>'}</li>`;
  }).join("")}</ol>`;
}

function renderWeek() { $("weekGrid").innerHTML = renderGrid() + renderList(); }

segmented($("viewTabs"), (value) => { view = value; renderWeek(); });

// Ringkasan: total jam shift dan daftar bentrok
const weekMinutes = WEEK.flatMap((d) => d.items).filter((it) => it.type === "shift").reduce((sum, it) => sum + toMinutes(it.end) - toMinutes(it.start), 0);
const pct = Math.min(100, Math.round((weekMinutes / (DEMO.unit.maxHoursPerWeek * 60)) * 100));
$("weekTotal").innerHTML = `
  <div class="flex items-baseline gap-2"><span class="tabular text-3xl font-bold tracking-tight">${formatDuration(weekMinutes)}</span>
    <span class="text-ink-2">dari batas ${DEMO.unit.maxHoursPerWeek} j, target ${DEMO.unit.targetHoursPerWeek} j</span></div>
  <div class="h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-label="Jam shift minggu ini" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
    <div class="h-full rounded-full bg-ink" style="width:${pct}%"></div></div>`;

const conflicts = WEEK.flatMap((d) => d.items.filter((it) => it.type === "class" && isConflict(it, d)).map((it) => `${d.day} ${d.date}: ${it.title} (${it.start})`));
$("conflictCard").innerHTML = conflicts.length
  ? `<h2>${conflicts.length} jadwal bentrok</h2>
     <ul class="m-0 flex list-disc flex-col gap-1 pl-5 text-ink-2">${conflicts.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
     <div><a class="btn btn-secondary" href="../request/index.html">Ajukan tukar shift</a></div>`
  : '<h2>Tidak ada jadwal bentrok</h2><p class="m-0 text-ink-2">Semua shift minggu ini aman dari jadwal kuliah.</p>';

renderWeek();
