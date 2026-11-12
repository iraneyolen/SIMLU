/* ============================================================
   SIMLU — js/db.js
   Lapisan data tunggal. Bentuk panggilan meniru Supabase agar
   migrasi ke Supabase asli nanti cukup mengganti isi file ini,
   tanpa menyentuh halaman mana pun.

   Baca : data/*.json (seed) + overlay localStorage (tulis user)
   Tulis: localStorage (demo statis). Migrasi = INSERT/UPDATE nyata.
   ============================================================ */
(function (global) {
  'use strict';

  // Root situs dideteksi dari URL script ini sendiri:
  // localhost      → /js/db.js       → BASE '/'
  // GitHub Pages   → /SIMLU/js/db.js → BASE '/SIMLU/'
  const BASE = new URL(document.currentScript.src, location.origin).pathname
    .replace(/js\/db\.js.*$/, '');

  const PREFIX = 'simlu:';
  const read = (k, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(PREFIX + k)); return v === null || v === undefined ? fallback : v; }
    catch { return fallback; }
  };
  const write = (k, v) => localStorage.setItem(PREFIX + k, JSON.stringify(v));

  async function list(table) {
    const overlay = read(table, null);
    if (overlay !== null) return overlay;
    const res = await fetch(BASE + 'data/' + table + '.json');
    if (!res.ok) throw new Error('Gagal memuat data: ' + table);
    return res.json();
  }

  async function insert(table, row) {
    const rows = await list(table);
    const next = rows.concat(Object.assign({ id: table[0] + Date.now().toString(36) }, row));
    write(table, next);
    return next[next.length - 1];
  }

  async function update(table, id, patch) {
    const rows = await list(table);
    const next = rows.map(r => (r.id === id ? Object.assign({}, r, patch) : r));
    write(table, next);
    return next.find(r => r.id === id);
  }

  async function remove(table, id) {
    const rows = await list(table);
    write(table, rows.filter(r => r.id !== id));
  }

  // Tanggal hari ini dalam waktu lokal (bukan UTC — WITA bisa berbeda hari
  // untuk kejadian sebelum jam 08:00 pagi).
  function todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // Banner error global. Halaman memakainya lewat .catch(db.fail) sehingga
  // kegagalan fetch tidak lagi membuat UI macet di "Memuat…" tanpa pesan.
  function fail(err) {
    if (err) console.error(err);
    let bar = document.getElementById('simlu-error');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'simlu-error';
      bar.setAttribute('role', 'alert');
      bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:60;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:1rem;padding:.75rem 1rem;font:500 14px/1.4 var(--font-sans);background:var(--color-bad,#B91C1C);color:#fff';
      bar.innerHTML = '<span>Gagal memuat data. Periksa koneksi, lalu muat ulang halaman.</span>' +
        '<button onclick="location.reload()" style="border:0;border-radius:8px;padding:.375rem .875rem;font-weight:600;cursor:pointer;background:#fff;color:var(--color-bad,#B91C1C)">Muat ulang</button>';
      document.body.appendChild(bar);
    }
  }

  global.db = { list, insert, update, remove, todayISO, fail, BASE };
})(window);
