// Pengaturan sumber data. Dimuat sebelum store.js di setiap halaman.
//   "local"    -> data contoh di localStorage, tanpa internet (dipakai untuk demo offline)
//   "supabase" -> database Supabase (skema dan aturan akses di folder supabase/)
// Publishable key aman ada di kode publik HANYA karena semua tabel memakai RLS. Jangan pernah menaruh
// secret key / service_role key atau password di file ini.
const CONFIG = {
  DATA_SOURCE: "local",
  SUPABASE_URL: "https://yijytnwmwsqtdllkiuxa.supabase.co",
  SUPABASE_KEY: "", // diisi lewat file .env (lihat .env.example), jangan ditulis di sini
};
