# Analisis migrasi ke Supabase

Tanggal: 13 Nov 2026. Dasar: kode di folder `Claude` (commit 474c385), rencana OpenCode (13 Nov 08:26-08:39),
dan dokumentasi Supabase terkini (sumber di bagian akhir).

## 1. Kondisi sekarang (dari kode, bukan asumsi)

| Hal | Fakta |
|---|---|
| Lapisan data | `js/store.js`, 8 "tabel" di localStorage: `units`, `students`, `applicants`, `shifts`, `requests`, `reports`, `attendance`, `profiles` |
| Cara halaman memakai data | **Sinkron**, tanpa `await`: 47× `store.list`, 14× `get`, 11× `add`, 15× `update`, 8× `remove`, tersebar di 18 file |
| Penghubung antar-tabel | **Nama orang** sebagai kunci di ±30 tempat (`r.student === store.ME`, `s.name === name`). `store.ME` = nama mahasiswa demo |
| Login | Pura-pura: role dipilih lalu disimpan di `sessionStorage`; password apa pun diterima |
| Data yang belum jadi tabel | Jadwal kuliah (`DEMO.week`), notifikasi, info unit mahasiswa (`DEMO.unit`), shift "hari ini" yang **dibuat-buat** supaya tombol check-in selalu bisa dicoba (`demoShift()`), jam per minggu di grafik Kinerja, nomor minggu laporan |
| Waktu absensi | Diambil dari **jam perangkat** (bisa dimanipulasi pengguna) |

## 2. Keputusan arsitektur dan rekomendasi

### A. Cara halaman membaca data: tetap sinkron dengan cache (setuju dengan OpenCode, dengan 3 tambahan)

Mengubah 95 pemanggilan jadi `await` di 18 file itu mahal dan berisiko. Pendekatan OpenCode benar: `store.*` tetap
sinkron terhadap cache di memori, dan cache diisi dari Supabase sebelum halaman berjalan. Yang belum ada di rencananya:

1. **Gerbang muat halaman.** Script halaman sekarang langsung jalan saat dimuat. Harus ada mekanisme "tunggu data siap
   dulu": `store.ready` (Promise), lalu script halaman dimuat setelahnya. Cukup ubah tag `<script>` halaman di 20 file
   HTML (mekanis), isi JS halaman tidak berubah.
2. **Tulis yang aman.** Penulisan optimistis (langsung tampil, kirim ke server di belakang) harus punya penanganan gagal:
   kalau Supabase menolak (RLS, jaringan), tampilkan toast lalu muat ulang data. Tanpa ini, layar dan database bisa
   berbeda diam-diam. ID tetap dibuat di browser (`crypto.randomUUID()`), jadi tidak perlu menunggu server.
3. **Dua sumber data bisa dipilih.** `js/config.js` berisi `DATA_SOURCE = "local" | "supabase"`. Mode `local` memakai
   localStorage seperti sekarang. Ini menjawab keinginanmu ke OpenCode ("tetap bisa dikoding walau tanpa internet"),
   dan jadi cadangan kalau internet atau Supabase bermasalah saat demo.

### B. Kunci data: pakai ID, bukan nama (tidak setuju dengan OpenCode)

OpenCode mengusulkan nama sebagai kunci demi tenggat. Masalahnya:

- **Keamanan:** RLS "mahasiswa hanya boleh melihat barisnya sendiri" harus dicocokkan dengan akun yang login
  (`auth.uid()`). Kalau penghubungnya nama, aturan itu harus mencocokkan teks nama, yang bisa sama atau berubah.
- **Sudah pernah rusak:** saat nama demo diganti jadi "Raolika, Yolen Irane", data lama tidak ikut, sampai kita
  menambahkan reset versi seed. Di database sungguhan tidak ada "reset seed".

Rekomendasi: setiap baris menyimpan `student_id` (= id akun Supabase). Nama untuk tampilan diambil dari tabel
`profiles` lewat satu helper `nameOf(id)`. Perubahan kode ±30 tempat, sifatnya mekanis (ganti `.student === store.ME`
jadi `.student_id === store.ME`).

### C. Akun dan role

- **Supabase Auth, email + password** (setuju dengan OpenCode).
- **Role disimpan di tabel `profiles`, bukan `students`** (tidak setuju dengan OpenCode): admin dan koordinator bukan
  mahasiswa. `profiles.id` = id akun Auth.
- **Alur daftar jadi nyata:** Daftar = `signUp` + baris `applications` status `pending`. Login dengan status pending atau
  ditolak langsung ditolak dengan pesan yang sudah ada di UI. Admin menyetujui = status `active` + role `student` + unit.
- **Konfirmasi email:** bawaan Supabase mengirim email konfirmasi. Email `nim@student.unklab.ac.id` adalah alamat asli
  mahasiswa, jadi untuk demo sebaiknya **matikan "Confirm email"** di pengaturan Auth.
- **Ubah password** di halaman Profil jadi sungguhan (`auth.updateUser`).
- **Tombol "masuk cepat" demo** (Mahasiswa/Koordinator/Admin) tidak boleh menyimpan password akun asli di kode, karena
  repo dan situsnya publik: siapa pun bisa masuk sebagai admin lalu menghapus data. Pilihan: hanya tampil di mode
  `local`, atau akun demo terpisah yang memang boleh dipakai siapa saja.

### D. Skema yang disarankan

| Tabel | Kolom inti | Catatan |
|---|---|---|
| `profiles` | `id uuid` (= auth), `name`, `nim`, `email`, `phone`, `program`, `role` (student/coordinator/admin), `unit_id`, `status` (pending/active/rejected/inactive) | Menggantikan `students` + `profiles` sekarang |
| `applications` | `id`, `profile_id`, `unit_choice`, `unit_alt`, `motivation`, `drive_link`, `status`, `note`, `created_at` | Menggantikan `applicants` |
| `units` | `id`, `name`, `description`, `coordinator_id`, `quota`, `max_hours`, `target_hours` | Koordinator sebagai id, bukan teks |
| `shifts` | `id`, `student_id`, `unit_id`, `day` (0-4), `start_time`, `end_time`, `flag` | Pola mingguan seperti sekarang |
| `attendance` | `id`, `student_id`, `unit_id`, `date`, `shift_start`, `shift_end`, `check_in timestamptz`, `check_out timestamptz`, `leave` | Waktu diisi **server** (`now()`), bukan jam HP |
| `requests` | `id`, `student_id`, `unit_id`, `type`, `shift_id`, `replacement_id`, `reason`, `status`, `note`, `created_at` | |
| `reports` | `id`, `student_id`, `unit_id`, `week`, `summary`, `note`, `status`, `score`, `comment`, `sent_at` | |
| `class_schedules` | `id`, `student_id`, `day`, `start_time`, `end_time`, `course`, `room` | Sekarang masih hardcoded; nanti dari SI Unklab |
| `notifications` | `id`, `profile_id`, `title`, `body`, `read_at`, `created_at` | Opsional; bisa juga dihapus dari scope |

### E. Aturan akses (RLS)

Semua tabel **wajib RLS aktif**; tanpa itu publishable key di situs publik membuka seluruh data.

- Fungsi bantu `security definer`: `is_admin()`, `my_unit()` (unit koordinator).
- **Mahasiswa:** baca dan tulis barisnya sendiri (`student_id = auth.uid()`). Laporan bisa diubah selama belum dinilai;
  pengajuan bisa dibatalkan selama masih menunggu.
- **Koordinator:** baca semua baris unitnya; ubah shift, nilai laporan, putuskan pengajuan, koreksi absensi di unitnya.
- **Admin:** semua.
- Publik (belum login): hanya baca `units` untuk halaman Home dan Daftar.
- Pakai pola `(select auth.uid())` di policy supaya cepat.

### F. Data yang harus dipindah atau diganti

| Sekarang | Nanti |
|---|---|
| `demoShift()`: shift palsu yang selalu dimulai beberapa menit dari sekarang | Shift hari ini dicari dari tabel `shifts` sesuai hari. Akibatnya check-in hanya bisa dicoba pada jam shift asli; untuk demo, buat shift yang jamnya cocok dengan waktu presentasi |
| `DEMO.week` (jadwal kuliah) | Tabel `class_schedules` |
| `DEMO.unit` | Dari `profiles.unit_id` + `units` |
| `DEMO.performance.weeklyHours` | Dihitung dari `attendance` |
| `DEMO.notifications` | Tabel `notifications`, atau dikeluarkan dari scope |
| Nomor minggu laporan (45, 46) ditulis tetap | Dihitung dari tanggal |

## 3. Penilaian rencana OpenCode

| Bagian | Penilaian |
|---|---|
| `store.js` sinkron + cache + preload | **Setuju**, tambah gerbang muat, penanganan gagal tulis, dan mode `local` |
| Supabase Auth | **Setuju**, tambah: matikan konfirmasi email untuk demo, jangan simpan password demo di kode publik |
| Skema 1:1 dengan nama sebagai kunci | **Tidak setuju**: pakai `student_id`; risiko keamanan RLS dan sudah terbukti rapuh |
| Role di tabel `students` | **Tidak setuju**: role di `profiles` |
| RLS per role | **Setuju** |
| Yang belum dibahas | Data hardcoded (bagian F), jam absensi dari server, seed akun Auth (dibuat via dashboard, bukan SQL ke `auth.users`), pengaturan Site URL untuk GitHub Pages, risiko project ter-pause menjelang demo |

## 4. Tahapan yang disarankan

| Tahap | Isi | Bisa dicek dengan |
|---|---|---|
| 0. Persiapan (kamu) | Resume project Supabase; matikan "Confirm email"; isi Site URL `https://iraneyolen.github.io/SIMLU/`; buat 3 akun demo (mahasiswa, koordinator, admin) | Dashboard Supabase |
| 1. Skema + RLS + seed | Migrasi SQL untuk 9 tabel, fungsi bantu, policy, seed dari `demo-data.js` dengan id akun demo | Query uji per role di SQL editor |
| 2. Adaptor data | `config.js` (URL + publishable key + `DATA_SOURCE`), supabase-js via CDN, `store.js` dengan dua adaptor (local / supabase), `store.ready`, tulis optimistis + rollback | Mode `local` tetap jalan persis seperti sekarang |
| 3. Kunci id | Ganti ±30 perbandingan nama jadi id; helper `nameOf()` | Semua halaman tampil sama di mode `local` |
| 4. Auth | Login, Daftar, guard per halaman, logout, ubah password | Login 3 akun demo, daftar akun baru, ditolak saat pending |
| 5. Data hardcoded | Shift hari ini dari tabel, jadwal kuliah, jam mingguan, nomor minggu | Absensi dan Jadwal memakai data database |
| 6. Uji + rilis | Uji alur CRUD per role di dua mode, uji RLS (mahasiswa tidak bisa membaca data orang lain), push ke Pages | Checklist alur + uji akses silang |

Tahap 2-3 bisa dikerjakan dan diuji **tanpa Supabase** (mode `local`), jadi tidak terhambat project yang ter-pause.

## 5. Keputusan yang dibutuhkan dari tim

1. **Kunci data:** `student_id` (disarankan) atau nama seperti usulan OpenCode?
2. **Tombol masuk cepat demo:** hanya di mode `local`, atau akun demo publik yang boleh dipakai siapa saja?
3. **Notifikasi:** dijadikan tabel, atau dikeluarkan dari scope?
4. **Siapa yang mengerjakan:** Claude atau OpenCode. Sebaiknya satu agen saja untuk satu tahap, karena keduanya kini bekerja di repo yang sama.

## Sumber

- Supabase, *Understanding API keys*: https://supabase.com/docs/guides/api/api-keys
- Supabase, *Upcoming changes to Supabase API Keys*: https://supabase.com/changelog/29260-upcoming-changes-to-supabase-api-keys
- Supabase, *Project Pausing*: https://supabase.com/docs/guides/platform/free-project-pausing
- Supabase, *Paused Free Plan projects are restorable*: https://supabase.com/changelog/27497-paused-free-plan-projects-are-restorable-for-90-days
- supabase-js lewat CDN (contoh pemakaian): https://content.noroff.dev/development-platforms/building-the-frontend.html
- Rencana OpenCode: sesi `ses_e386ebccbffeRX4w3XcN8F0IP9`, pesan 13 Nov 08:26-08:39
