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

  global.db = { list, insert, update, remove, BASE };
})(window);
