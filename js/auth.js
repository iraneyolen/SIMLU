/* ============================================================
   SIMLU — js/auth.js
   Sesi tersimulasi untuk demo statis (migrasi: ganti ke Supabase Auth).
   Login demo: email harus ada di data/users.json; password apa pun diterima.
   Sesi disimpan di sessionStorage (hilang saat tab ditutup).
   ============================================================ */
(function (global) {
  'use strict';

  const KEY = 'simlu:session';

  async function login(email, password) {
    if (!email) throw new Error('Email wajib diisi');
    const users = await db.list('users');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error('Email tidak terdaftar. Gunakan email @unklab.ac.id');
    sessionStorage.setItem(KEY, JSON.stringify(user));
    return user;
  }

  function currentUser() {
    try { return JSON.parse(sessionStorage.getItem(KEY)); }
    catch { return null; }
  }

  function logout() { sessionStorage.removeItem(KEY); }

  // Guard: paksa login + role. redirect = lokasi halaman login relatif.
  function requireRole(role) {
    const user = currentUser();
    const loginUrl = location.pathname.startsWith('/pages/') ? '/pages/login/' : '/pages/login/';
    if (!user) { location.replace(loginUrl); return null; }
    if (role && user.role !== role) {
      location.replace(user.role === 'admin' ? '/pages/admin/' : '/pages/dashboard/');
      return null;
    }
    return user;
  }

  global.auth = { login, currentUser, logout, requireRole };
})(window);
