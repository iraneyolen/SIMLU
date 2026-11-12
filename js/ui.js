// Pembantu tampilan yang dipakai banyak halaman: tag status, ringkasan angka, tabel, modal <dialog>, toast, form.
// Markup memakai utility Tailwind + komponen di assets/css/app.css.

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function todayLabel() {
  return new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const $ = (id) => document.getElementById(id);

// Ikon Phosphor (font). Dipakai hemat: menu, aksi utama, state kosong.
const icon = (name, extra = "") => `<i class="ph ph-${name} ${extra}" aria-hidden="true"></i>`;

// Status: ikon + teks (bukan pil berwarna). tone: success | warning | danger | info | neutral
const TONE = { success: "ok", warning: "warn", danger: "bad", info: "info", neutral: "neutral" };
const STATUS_ICON = { ok: "check-circle", warn: "warning-circle", bad: "x-circle", info: "info", neutral: "circle-dashed" };
const statusInner = (text, tone) => { const t = TONE[tone] || tone; return `${icon(STATUS_ICON[t])}${esc(text)}`; };
const badge = (text, tone) => `<span class="status status-${TONE[tone] || tone}">${statusInner(text, tone)}</span>`;

// Nama + keterangan kecil di bawahnya (kolom pertama tabel, baris daftar)
const person = (name, sub) => `<div class="font-semibold">${esc(name)}</div>${sub ? `<div class="text-xs text-ink-2">${esc(sub)}</div>` : ""}`;

// Ringkasan angka sebagai satu strip bergaris (bukan deretan kartu identik).
// cards: [ikon (diabaikan), label, nilai, keterangan]
function statCards(el, cards) {
  el.className = "summary";
  el.innerHTML = cards.map(([, label, value, hint]) => `
    <div><dt>${esc(label)}</dt><dd>${esc(value)}</dd><span class="note">${esc(hint)}</span></div>`).join("");
}

// State kosong yang menjelaskan apa yang terjadi
const emptyState = (text, sub = "") => `
  <div class="rounded-xl border border-dashed border-line-strong/60 px-6 py-10 text-center">
    ${icon("tray", "text-2xl text-ink-2")}
    <div class="mt-2 font-semibold">${esc(text)}</div>
    ${sub ? `<div class="mt-1 text-xs text-ink-2">${esc(sub)}</div>` : ""}
  </div>`;

// Tabel yang berubah jadi daftar kartu di HP. cols: ["Label", ...]; rows: [[html, ...], ...]
function renderTable(el, cols, rows, emptyText = "Belum ada data.") {
  if (!rows.length) { el.innerHTML = emptyState(emptyText); return; }
  // role eksplisit: di HP baris diubah jadi kartu (display: block), sebagian pembaca layar
  // kehilangan semantik tabel kalau role tidak ditulis.
  el.innerHTML = `<div class="overflow-x-auto rounded-xl border border-line bg-surface max-md:overflow-visible max-md:rounded-none max-md:border-0 max-md:bg-transparent">
    <table class="data-table" role="table">
      <thead role="rowgroup"><tr role="row">${cols.map((c) => `<th scope="col" role="columnheader">${esc(c)}</th>`).join("")}</tr></thead>
      <tbody role="rowgroup">${rows.map((r) => `<tr role="row">${r.map((cell, i) => `<td role="cell" data-label="${esc(cols[i])}">${cell}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
}

function toast(message) {
  let box = $("toastBox");
  if (!box) {
    document.body.insertAdjacentHTML("beforeend", '<div id="toastBox" class="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6" role="status" aria-live="polite"></div>');
    box = $("toastBox");
  }
  const node = document.createElement("div");
  node.className = "pointer-events-auto max-w-sm rounded-lg bg-ink px-4 py-3 text-sm font-medium text-canvas shadow-lg";
  node.textContent = message;
  box.appendChild(node);
  setTimeout(() => node.remove(), 3200);
}

// ---------- Modal (<dialog>) ----------
// onSubmit menerima FormData; dialog tertutup kalau form valid dan onSubmit tidak mengembalikan false.
let modalCount = 0;
function formModal({ title, body, submitLabel = "Simpan", submitClass = "btn-primary", onSubmit }) {
  const titleId = `modalTitle-${++modalCount}`;
  const opener = document.activeElement;
  const dlg = document.createElement("dialog");
  dlg.className = "dialog";
  dlg.setAttribute("aria-labelledby", titleId);
  dlg.innerHTML = `
    <form novalidate>
      <div class="dialog-head"><h2 id="${titleId}">${esc(title)}</h2>
        <button type="button" class="btn btn-ghost btn-sm -mt-1 -mr-2" data-close aria-label="Tutup">${icon("x", "text-base")}</button></div>
      <div class="dialog-body">${body}</div>
      <div class="dialog-foot"><button type="button" class="btn btn-secondary" data-close>Batal</button>
        <button type="submit" class="btn ${submitClass}">${esc(submitLabel)}</button></div>
    </form>`;
  document.body.appendChild(dlg);
  const form = dlg.querySelector("form");
  linkFeedback(form);

  // Pembersihan dijalankan langsung (sinkron) di setiap jalur tutup. Event "close" dari <dialog>
  // dikirim asinkron, jadi hanya dipakai sebagai cadangan (mis. tombol Escape).
  let done = false;
  const teardown = (restore = true) => {
    if (done) return;
    done = true;
    if (dlg.open) dlg.close();
    dlg.remove();
    if (restore) restoreFocus(opener);
  };
  dlg.__close = teardown;
  dlg.addEventListener("close", () => teardown());

  for (const btn of dlg.querySelectorAll("[data-close]")) btn.addEventListener("click", () => teardown());
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    form.classList.add("was-validated");
    if (!form.checkValidity()) { form.querySelector(":invalid")?.focus(); return; }
    if (onSubmit(new FormData(form)) === false) return; // false = tetap terbuka (mis. bentrok jadwal)
    teardown();
  });
  dlg.showModal();
  return dlg;
}

// Tutup modal, lalu jalankan next() (misalnya membuka modal konfirmasi).
function closeModal(node, next) {
  node.__close(); // fokus kembali ke pembuka dulu, supaya modal berikutnya mengembalikannya ke sana juga
  if (next) next();
}

// Kembalikan fokus keyboard ke tombol pembuka. Kalau tombol itu sudah di-render ulang,
// cari tombol pengganti dengan atribut data-* yang sama; terakhir, fokus ke judul halaman.
function restoreFocus(opener) {
  if (document.querySelector("dialog[open]")) return;
  if (opener && opener.isConnected && opener !== document.body) { opener.focus(); return; }
  const attr = opener && opener.attributes && [...opener.attributes].find((a) => a.name.startsWith("data-") && a.value);
  const twin = attr && document.querySelector(`[${attr.name}="${CSS.escape(attr.value)}"]`);
  if (twin) { twin.focus(); return; }
  const target = [...document.querySelectorAll("h1")].find((h) => h.offsetParent) || document.querySelector("main");
  if (target) { target.tabIndex = -1; target.focus(); }
}

// Konfirmasi sebelum aksi yang tidak bisa dibatalkan (hapus, tolak).
function confirmModal(title, message, onConfirm, label = "Hapus") {
  formModal({ title, body: `<p class="m-0 text-ink-2">${esc(message)}</p>`, submitLabel: label, submitClass: "btn-danger", onSubmit: onConfirm });
}

// ---------- Form ----------
// Hubungkan pesan .error-msg ke input lewat aria-describedby, supaya pembaca layar membacakannya.
let feedbackCount = 0;
function linkFeedback(root = document) {
  for (const msg of root.querySelectorAll(".error-msg")) {
    const control = msg.parentElement.querySelector("input, select, textarea");
    if (!control) continue;
    if (!msg.id) msg.id = `feedback-${++feedbackCount}`;
    const ids = (control.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
    if (!ids.includes(msg.id)) control.setAttribute("aria-describedby", [...ids, msg.id].join(" "));
  }
}

const feedback = (attrs) => (/\brequired\b/.test(attrs) ? '<p class="error-msg">Isi kolom ini dengan benar.</p>' : "");
const field = (label, name, attrs = "", value = "") =>
  `<div><label class="label" for="f-${name}">${esc(label)}</label><input class="input" id="f-${name}" name="${name}" value="${esc(value)}" ${attrs}>${feedback(attrs)}</div>`;
const textarea = (label, name, attrs = "", value = "") =>
  `<div><label class="label" for="f-${name}">${esc(label)}</label><textarea class="input" id="f-${name}" name="${name}" rows="3" ${attrs}>${esc(value)}</textarea>${feedback(attrs)}</div>`;
// options: ["Teks", ...] atau [["nilai", "Teks"], ...]; value = pilihan yang terpilih
const optionTags = (options, value = "") => options
  .map((o) => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(t)}</option>`; })
  .join("");
const select = (label, name, options, attrs = "", value = "") =>
  `<div><label class="label" for="f-${name}">${esc(label)}</label><select class="input" id="f-${name}" name="${name}" ${attrs}>${optionTags(options, value)}</select>${feedback(attrs)}</div>`;

// Unduh tabel sebagai CSV (dibuka di Excel). rows: array of array teks biasa.
function downloadCSV(filename, cols, rows) {
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const text = [cols, ...rows].map((r) => r.map(cell).join(";")).join(String.fromCharCode(13, 10));
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([String.fromCharCode(0xfeff) + text], { type: "text/csv;charset=utf-8" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Pilihan unit dari tabel units
const unitNames = () => store.list("units").map((u) => u.name);
function fillUnitFilter(selectEl) {
  if (!selectEl) return;
  const current = selectEl.value;
  selectEl.innerHTML = optionTags(["Semua unit", ...unitNames()], current);
}

// Kontrol segmen: tombol dengan aria-pressed. onChange menerima data-value tombol terpilih.
function segmented(el, onChange) {
  el.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-value]");
    if (!btn) return;
    for (const b of el.querySelectorAll("button[data-value]")) b.setAttribute("aria-pressed", String(b === btn));
    onChange(btn.dataset.value);
  });
}

// Tombol ganti tema terang/gelap (ikon bulan/matahari). Tema sendiri diatur js/boot.js.
function bindThemeButton(btn) {
  if (!btn) return;
  const paint = () => {
    const dark = window.theme.current() === "dark";
    btn.innerHTML = icon(dark ? "sun" : "moon", "text-xl");
    btn.setAttribute("aria-pressed", String(dark));
    btn.title = dark ? "Pakai tema terang" : "Pakai tema gelap";
  };
  btn.addEventListener("click", () => window.theme.toggle());
  window.addEventListener("themechange", paint);
  paint();
}

// Form di halaman (bukan modal) dihubungkan saat halaman dimuat.
linkFeedback();
