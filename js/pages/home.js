// Home: daftar unit kerja dan total kuota diisi dari data (tabel `units`, bisa diubah admin).

const units = store.list("units");
const total = units.reduce((sum, u) => sum + u.quota, 0);
$("quotaTotal").textContent = `${total} posisi di ${units.length} unit`;

$("unitList").innerHTML = units.map((u) => `
  <li class="flex items-center gap-4 py-3.5">
    <div class="min-w-0 flex-1"><div class="font-semibold">${esc(u.name)}</div><div class="text-xs text-ink-2">${esc(u.desc)}</div></div>
    <span class="text-sm text-ink-2 tabular whitespace-nowrap">${u.quota} posisi</span>
  </li>`).join("");

bindThemeButton($("themeBtn"));
