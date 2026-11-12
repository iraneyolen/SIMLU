# DESIGN.md: SI Mahasiswa Labor Unklab

Arah visual untuk migrasi ke Tailwind CSS. Ditetapkan oleh tim (Raolika), 12 November 2026.
File ini adalah sumber arah desain; `antislop` dipakai sebagai filter di atasnya.

## Identitas

- **Arah:** B. Operasional kampus.
- **Produk:** alat kerja harian untuk mahasiswa labor, koordinator unit, dan admin Universitas Klabat (absensi, jadwal shift, laporan, pengajuan).
- **Kepribadian:** tenang, rapi, bisa dipercaya; terasa seperti alat kantor kampus yang terawat, bukan produk teknologi.
- **Sumber karakter:** isi produknya sendiri, bukan dekorasi. Motif identitas:
  1. **Time-grid mingguan** di Jadwal dan Kelola Shift: jam di sumbu vertikal, kuliah dan shift sebagai blok, sehingga bentrok terlihat sebagai blok yang tumpang tindih.
  2. **Heatmap bulanan** di Riwayat Absensi dan Kinerja: satu kotak per hari, warna menurut status (hadir, telat, izin, alpa).

## Dial

`Dial: ENERGY 2 / RHYTHM 2 / MOTION 2`

- ENERGY 2: sedikit lebih hidup dari "tenang"; tetap tanpa efek dekoratif.
- RHYTHM 2: struktur konsisten antar-halaman, dengan beberapa jeda yang disengaja (time-grid, heatmap).
- MOTION 2: transisi antar-state dan sedikit animasi saat data berubah (misalnya baris baru, status berganti). Semua gerak wajib menghormati `prefers-reduced-motion`.

## Palet

- **Latar:** netral terang.
- **Aksen tunggal:** Navy Unklab `#0A2F5B`. Hanya untuk: tombol utama/aksi, menu aktif, cincin fokus, penanda "hari ini", dan blok shift milik sendiri.
  Link teks, avatar, progress bar, notifikasi belum dibaca, dan baris terpilih memakai warna netral (audit AI slop, 13 Nov 2026).
- **Warna status (fungsional, bukan aksen):** sukses/hadir, peringatan/telat, bahaya/alpa-ditolak, info/izin.
  Terang: `ok #16723A`, `warn #A14A06`, `bad #B42318`, `info #2E5596` (disesuaikan dari token lama supaya lolos AA di atas latar soft-nya).
- **Netral dan mode gelap** (ditetapkan saat implementasi 12 Nov 2026, semua lolos WCAG AA; nilai lengkap di `assets/css/app.css`):
  - Terang: kanvas `#F4F5F7`, permukaan `#FCFDFE` (putih bertint, bukan #FFF murni), teks `#141A24`, teks sekunder `#566070`, garis input `#7D8796`.
  - Gelap: kanvas `#0D1117`, permukaan `#151B23`, teks `#E6EAF0`, teks sekunder `#9AA4B3`; aksen navy dipakai versi terang `#8EB3EA` untuk teks/aktif dan `#2F5FA3` untuk tombol.
- **Ikon:** Phosphor (regular), satu keluarga, dipakai hanya di menu, aksi utama, dan penanda status.
- **Status tanpa badge/pil** (masukan tim, 13 Nov 2026): status ditulis sebagai ikon kecil + teks, tanpa kotak berwarna.
  Status normal diredam (teks abu, hanya ikon berwarna); status yang butuh tindakan (telat, alpa, ditolak, bentrok, lewat batas)
  diberi warna teks. Kondisi normal yang berulang di setiap baris (mis. "Aktif") cukup teks biasa. Label kategori
  (jenis pengajuan, jumlah posisi, role) bukan status, jadi teks biasa.

## Tema

- **Terang + tombol dark mode.** Kedua mode harus berfungsi penuh: kontras, komponen, grafik, time-grid, dan heatmap dicek di masing-masing mode.
- Default mengikuti `prefers-color-scheme`; pilihan pengguna disimpan per browser.

## Tipografi

- **Atkinson Hyperlegible Next** untuk seluruh UI (judul, label, isi, angka). Diganti dari Plus Jakarta Sans pada 13 Nov 2026
  karena Plus Jakarta Sans masuk daftar "font default AI" (ux-skill).
  Alasan: dirancang Braille Institute agar huruf mirip (I/l/1, 0/O) mudah dibedakan; cocok untuk alat kerja yang penuh NIM, jam, dan angka.
- **Skala teks proyek** (bukan skala bawaan Tailwind): isi 15px, teks sekunder 13px, 12px (`text-2xs`) hanya untuk label sangat kecil
  (sumbu jam, nama hari, tanggal di heatmap).
- Angka jam dan durasi memakai `tabular-nums` supaya kolom waktu sejajar.

## Tata letak

- Sidebar senada dengan halaman (bukan blok navy pekat); menu aktif ditandai latar tipis + aksen navy.
- Konten dipisah dengan garis dan ruang kosong; kartu hanya untuk hal yang memang perlu terangkat (misalnya modal, panel aksi absensi).
- Heatmap kehadiran: setiap status punya ikon berbeda di selnya, jadi tidak hanya bergantung pada warna (ramah buta warna merah-hijau).
- Home: urutan langkah pendaftaran dibawa oleh tanggal nyata periode (30 Nov, 5 Des, 12 Jan), bukan nomor 01-04; navbar tidak sticky.

## Stack

- Tailwind CSS v4 (versi browser, disimpan lokal di `assets/vendor/`), tanpa npm atau build step; tetap jalan di VS Code Live Server.
- Bootstrap dilepas: modal pakai `<dialog>`, menu pakai Popover API, toast tetap di `js/ui.js`.
- Logika data (`js/store.js`, `js/demo-data.js`) tidak diubah.
