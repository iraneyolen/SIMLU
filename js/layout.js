// Kerangka halaman setelah login: sidebar (drawer <dialog> di HP), topbar dengan tombol tema dan notifikasi.
// Butuh demo-data.js, store.js, dan ui.js lebih dulu.
// Atribut di <body>: data-role ("student" | "coordinator" | "admin" | "auto"), data-page, data-title, data-subtitle.
// "auto" dipakai halaman yang dibagi beberapa role (Kelola Shift, Absensi, Laporan, Mahasiswa, Profil).
// Halaman cukup berisi <main id="main">...</main>; sidebar dan topbar disisipkan di sini.

const NAV = {
  student: [
    ["dashboard-student", "Dashboard", "squares-four"],
    ["schedule", "Jadwal", "calendar-blank"],
    ["attendance", "Absensi", "clock"],
    ["history", "Riwayat Absensi", "clock-counter-clockwise"],
    ["performance", "Kinerja", "chart-line-up"],
    ["report", "Laporan Mingguan", "note-pencil"],
    ["request", "Pengajuan", "paper-plane-tilt"],
    ["profile", "Profil", "user"],
  ],
  coordinator: [
    ["dashboard-coordinator", "Dashboard", "squares-four"],
    ["shifts", "Jadwal Shift", "calendar-dots"],
    ["team-attendance", "Absensi Tim", "clock"],
    ["reports", "Laporan Mingguan", "note-pencil"],
    ["requests-review", "Pengajuan", "paper-plane-tilt"],
    ["students", "Mahasiswa", "users"],
    ["profile", "Profil", "user"],
  ],
  admin: [
    ["dashboard-admin", "Dashboard", "squares-four"],
    ["applicants", "Pendaftar", "identification-card"],
    ["students", "Mahasiswa", "users"],
    ["units", "Unit Kerja", "buildings"],
    ["shifts", "Jadwal Shift", "calendar-dots"],
    ["team-attendance", "Absensi", "clock"],
    ["reports", "Laporan", "note-pencil"],
    ["profile", "Profil", "user"],
  ],
};
const ROLE_LABEL = { student: "Mahasiswa", coordinator: "Koordinator", admin: "Admin" };

function navMarkup(role, page) {
  const links = NAV[role].map(([slug, label, ic]) =>
    `<a class="nav-link" href="../${slug}/index.html"${slug === page ? ' aria-current="page"' : ""}>${icon(ic, "text-lg")}${esc(label)}</a>`).join("");
  return `
    <div class="flex h-full flex-col gap-1 px-3 py-5">
      <a href="../../index.html" class="mb-5 block px-3 text-ink no-underline hover:no-underline">
        <span class="block text-base font-bold tracking-tight">SI Labor Unklab</span>
        <span class="text-xs font-medium text-ink-2">Panel ${ROLE_LABEL[role]}</span>
      </a>
      <nav class="flex flex-col gap-0.5" aria-label="Menu utama">${links}</nav>
      <div class="mt-auto border-t border-line pt-3">
        <a class="nav-link" href="../login/index.html" data-logout>${icon("sign-out", "text-lg")}Keluar</a>
      </div>
    </div>`;
}

function renderShell() {
  const data = document.body.dataset;
  if (data.role !== "auto") setRole(data.role);
  const role = getRole();
  const user = currentUser();
  const sub = data.subtitle === "today" ? todayLabel() : data.subtitle || "";
  const main = $("main");
  main.className = "mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-4 pb-12 sm:px-6 lg:px-8 lg:pt-6";

  // Sidebar desktop
  document.body.insertAdjacentHTML("afterbegin", `
    <aside class="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-canvas lg:block">${navMarkup(role, data.page)}</aside>
    <dialog id="navDrawer" class="m-0 h-dvh max-h-none w-72 max-w-[85vw] border-r border-line bg-canvas p-0 text-ink backdrop:bg-black/40" aria-label="Menu">
      ${navMarkup(role, data.page)}
    </dialog>`);

  // Topbar + notifikasi
  const unread = DEMO.notifications.filter((n) => n.unread).length;
  const notifItems = DEMO.notifications.map((n) => `
    <li class="flex gap-3 border-b border-line px-4 py-3 last:border-b-0 ${n.unread ? "bg-sunken" : ""}">
      <div class="min-w-0"><div class="${n.unread ? "font-semibold" : "font-medium"}">${esc(n.title)}</div><div class="text-xs text-ink-2">${esc(n.sub)}</div></div>
    </li>`).join("");

  const wrap = document.createElement("div");
  wrap.className = "min-h-dvh lg:pl-64";
  main.before(wrap);
  wrap.innerHTML = `
    <header class="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur-sm">
      <div class="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <button class="btn btn-ghost -ml-2 px-2 lg:hidden" type="button" id="openNav" aria-label="Buka menu">${icon("list", "text-xl")}</button>
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-lg font-bold sm:text-xl">${esc(data.title)}</h1>
          ${sub ? `<p class="truncate text-xs text-ink-2 sm:text-sm">${esc(sub)}</p>` : ""}
        </div>
        <button class="btn btn-ghost px-2.5" type="button" id="themeBtn" aria-label="Ganti tema terang/gelap"></button>
        <button class="btn btn-ghost relative px-2.5" type="button" popovertarget="notifPanel" aria-label="Notifikasi, ${unread} belum dibaca">
          ${icon("bell", "text-xl")}${unread ? '<span class="absolute top-2 right-2 size-2 rounded-full bg-bad" aria-hidden="true"></span>' : ""}
        </button>
        <div class="ml-1 hidden items-center gap-2.5 sm:flex">
          <span class="grid size-9 place-items-center rounded-full bg-sunken text-xs font-bold text-ink" aria-hidden="true">${esc(user.initials)}</span>
          <div class="leading-tight"><div class="font-semibold">${esc(user.name)}</div><div class="text-xs text-ink-2">${ROLE_LABEL[role]} · ${esc(user.unitName)}</div></div>
        </div>
      </div>
    </header>
    <div id="notifPanel" popover class="fixed inset-auto top-16 right-4 m-0 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-ink shadow-xl">
      <div class="flex items-center justify-between border-b border-line px-4 py-3"><span class="font-semibold">Notifikasi</span><span class="text-xs text-ink-2">${unread} belum dibaca</span></div>
      <ul class="m-0 list-none p-0">${notifItems}</ul>
    </div>`;
  wrap.appendChild(main);

  bindThemeButton($("themeBtn"));

  // Drawer menu di HP
  const drawer = $("navDrawer");
  $("openNav").addEventListener("click", () => drawer.showModal());
  drawer.addEventListener("click", (event) => { if (event.target === drawer) drawer.close(); }); // klik di luar menu

  for (const a of document.querySelectorAll("[data-logout]")) a.addEventListener("click", () => sessionStorage.removeItem("demoRole"));
}

renderShell();
