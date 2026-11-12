# Apa yang membuat website terlihat "template" atau "AI slop", dan bagaimana posisi web kita

Tanggal: 13 Nov 2026. Cakupan: folder `Claude` (versi Tailwind). Sumber: riset web + skill di GitHub/library
(daftar lengkap di bagian akhir) + skill yang terpasang di sesi ini (antislop, impeccable, design-taste-frontend).

## 1. Kenapa slop terjadi

- **Model mengambil "rata-rata" data latihnya.** Tanpa arahan, hasilnya pilihan paling aman yang paling sering muncul:
  Inter, gradien ungu di atas putih, animasi minimal (artikel Anthropic tentang skill frontend-design).
- **Default library ikut terbawa.** Warna `indigo-500` Tailwind, kartu abu-abu shadcn, radius dan spacing bawaan.
  Yang jadi masalah bukan library-nya, tapi default yang tidak pernah diubah (dev.to, GeekyAnts, Jean Galea).
- **Ini sudah terjadi sebelum AI.** Studi 10.000 situs (CHI 2021) menemukan situs yang memakai Bootstrap/FontAwesome
  jauh lebih mirip satu sama lain, karena library itu mengatur layout dan default yang sama.
- **Konvensi tidak selalu buruk.** Paper yang sama mencatat keseragaman juga membuat web lebih mudah dipakai.
  Untuk aplikasi kerja (dashboard, tabel), pola yang sudah dikenal justru menolong. Slop = default yang dipakai
  **tanpa alasan**, bukan konvensi itu sendiri.

Data pembanding: dari ~1.590 halaman Show HN yang dinilai otomatis (Adrian Krebs, 2026), 22% punya 4+ ciri slop,
32% punya 2-3, dan 46% hanya 0-1.

## 2. Taksonomi ciri slop (gabungan semua sumber)

| Kategori | Ciri | Disebut oleh |
|---|---|---|
| **Warna** | Gradien ungu-biru/ungu-pink, teks bergradien, latar aurora/blob/orb, glow berwarna | Semua sumber |
| | Lima-enam warna jenuh sekaligus; warna brand muncul di lebih dari 3 jenis permukaan | Fountain Institute, ux-skill |
| | Hitam/putih murni (#000/#FFF) alih-alih netral bertint | Hallmark, taste-skill |
| | Mode gelap permanen tanpa alasan; mode gelap hanya kebalikan mode terang | Krebs, ux-skill, antislop |
| **Tipografi** | Inter/Geist/Space Grotesk/**Plus Jakarta Sans** sebagai font "default AI" | ux-skill, Anthropic, Krebs |
| | Satu font untuk judul dan isi; skala ukuran bawaan (12/14/16/18/24...) | Hallmark, ux-skill |
| | Label huruf kapital berjarak lebar (eyebrow) di setiap section; kata miring di judul | Hallmark, Krebs, taste-skill |
| | Angka tabel tanpa `tabular-nums` | Hallmark |
| **Layout** | Hero di tengah + 2 tombol + 3 kartu fitur ikon-di-atas | Semua sumber |
| | Badge/pil di atas H1; baris statistik; langkah bernomor "1, 2, 3" | Krebs, antislop |
| | Navbar "AI": logo kiri, link kanan, CTA kanan, sticky; footer 4 kolom | Hallmark, antislop |
| | Kartu di dalam kartu; garis berwarna di sisi kartu; semua serba di tengah; padding section seragam | Hallmark, Fountain, ux-skill |
| **Komponen** | Semua elemen radius besar/pil; ikon dalam lingkaran berwarna di pojok kartu | ux-skill, antislop |
| | Badge/pil status di mana-mana; titik status tanpa makna | Fountain, antislop |
| | Panah di setiap tombol; efek hover sama untuk semua elemen | ux-skill, antislop |
| | Ikon dari satu library default (Lucide) dengan ukuran/ketebalan bawaan; emoji sebagai ikon | ux-skill, antislop |
| **Gerak** | Semua section fade-in saat di-scroll; bounce/elastis; animasi yang tidak memberi informasi | Hallmark, ux-skill |
| **Konten** | Nama "John Doe/Acme", statistik karangan (10K+, 99.9%), testimoni palsu, kata "seamless/unlock" | Semua sumber |
| **Interaksi & a11y** | Tanpa state kosong/loading/error; aksi hanya muncul saat hover; `outline: none` | ux-skill, antislop |
| | Informasi grafik hanya lewat warna; target sentuh < 44px; kontras < WCAG AA | ux-skill |
| **Teknis** | Nilai warna/font langsung di markup yang melewati token; `z-index: 9999`; `100vw` | Hallmark |

## 3. Audit web kita

Legenda: **Lolos** = tidak ada ciri itu; **Temuan** = ada, perlu diputuskan atau diperbaiki.

### Sudah lolos (dari migrasi dan perbaikan sebelumnya)

| Ciri | Bukti |
|---|---|
| Gradien ungu, glow, aurora, glassmorphism berlebihan | Tidak ada. Satu aksen navy. Blur hanya di header sticky (1 elemen) |
| Hero tengah + 3 kartu fitur | Hero split dengan foto kampus asli; tidak ada grid kartu fitur |
| Eyebrow huruf kapital, header tabel kapital | Sudah dihapus; header tabel huruf biasa |
| Badge/pil status, titik tanpa makna | Diganti ikon + teks; satu-satunya titik = notifikasi belum dibaca (bermakna) |
| Garis berwarna di sisi kartu | Dihapus dari time-grid |
| Kartu di dalam kartu | Tidak ada |
| `tabular-nums` | Dipakai di jam, durasi, NIM, angka ringkasan |
| Konten palsu (statistik, testimoni, John Doe) | Tidak ada; nama lokal; angka dihitung dari data |
| State kosong/error, fokus, reduced-motion | Ada (audit impeccable sebelumnya) |
| Identitas spesifik produk | Time-grid jadwal dan heatmap kehadiran: pola yang hanya masuk akal untuk produk ini |

### Temuan

| # | Prioritas | Ciri slop | Bukti di kode | Saran |
|---|---|---|---|---|
| 1 | Tinggi | **Teks 12px dipakai berlebihan** (skala bawaan, kesan dashboard template, sulit dibaca) | `text-xs` 74 kali vs `text-sm` 23 kali | Teks sekunder default ke 13-14px; 12px hanya untuk label kecil (sumbu jam, legenda) |
| 2 | Tinggi | **Heatmap hanya bicara lewat warna**; hijau "tepat waktu" vs merah "alpa" sulit dibedakan untuk buta warna merah-hijau | `history.js`: sel hanya berisi tanggal + warna | Tambah penanda bentuk di sel (ikon kecil/garis miring untuk izin, tanda silang untuk alpa) |
| 3 | Sedang | **Plus Jakarta Sans masuk daftar "font default AI"** (ux-skill) dan dipakai untuk judul sekaligus isi | `app.css --font-sans` | Keputusan tim: pertahankan (alasan lokal sudah tertulis) atau pasangkan font judul berkarakter |
| 4 | Sedang | **Aksen navy dipakai di terlalu banyak jenis permukaan** (tombol, menu aktif, link, nomor langkah, sorotan hari ini, blok shift, progress bar, avatar) | `text-accent` 14×, `bg-accent-soft` 7×, di 10 file | Batasi navy untuk aksi + menu aktif + hari ini; link dan nomor langkah pakai warna teks; progress bar netral |
| 5 | Sedang | **Home masih memakai pola landing template**: navbar "AI" sticky (logo kiri, link + CTA kanan) dan langkah bernomor 01-04 | `index.html` baris 16-28, 66-69 | Langkah: ganti nomor dengan tanggal/periode nyata (formulir s.d. 30 Nov, pengumuman 5 Des, mulai 12 Jan) supaya urutannya bermakna. Navbar boleh tetap (konvensi), tapi tanpa sticky blur |
| 6 | Rendah | **Permukaan putih murni** #FFFFFF | `app.css --c-surface` | Tint tipis ke arah navy (mis. #FEFEFF/#FCFDFE) |
| 7 | Rendah | **Warna mentah melewati token** di panel Login | `login/index.html`: `[#0A2F5B]` ×4, `[#C9D6EA]` ×2 | Jadikan token `--c-brand-panel` dan `--c-on-brand` |
| 8 | Rendah | **Efek hover seragam** (`hover:bg-sunken` di menu, tombol ghost, baris tabel) | `app.css` | Bedakan: menu = garis/teks, baris tabel = latar, tombol = gelap 1 tingkat |
| 9 | Rendah | **Target sentuh menu 40px** (di bawah 44px) di drawer HP | `.nav-link min-h-10` | `max-lg:min-h-11` |
| 10 | Catatan | **Ringkasan angka di dashboard** mirip "baris statistik" landing page | `statCards()` di 7 halaman | Untuk aplikasi kerja ini wajar (konvensi). Pastikan setiap angka bisa diklik ke detailnya, kalau tidak, kurangi jumlahnya |

## 4. Urutan perbaikan yang disarankan

1. Temuan 2 (heatmap ramah buta warna) dan 1 (ukuran teks): menyentuh keterbacaan dan aksesibilitas.
2. Temuan 4 dan 5: paling terasa untuk kesan "template".
3. Temuan 3: butuh keputusan tim (font adalah identitas).
4. Temuan 6-9: polish kecil, bisa sekaligus.

## Sumber

- Adrian Krebs, *Scoring 500 Show HN pages for AI design patterns*: https://adriankrebs.ch/blog/design-slop/
- Hallmark (Nutlope), katalog anti-pattern: https://instagit.com/Nutlope/hallmark/hallmark-anti-patterns-detected/
- Anthropic, *Improving frontend design through Skills*: https://claude.com/resources/articles/improving-frontend-design-through-skills
- The Fountain Institute, *7 Signs a UI Has Been Vibe Coded*: https://www.thefountaininstitute.com/blog/signs-vibe-coded-ui
- ux-skill (Laith0003), *How to detect AI slop in your design*: https://github.com/Laith0003/ux-skill/wiki/How-to-detect-AI-slop-in-your-design
- dev.to, *Why every AI-built website looks the same: blame Tailwind's indigo-500*: https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p
- GeekyAnts, *Why Everything Your AI Builds Looks the Same*: https://geekyants.com/blog/why-everything-your-ai-builds-looks-the-same
- Goree dkk., *Investigating the Homogenization of Web Design* (CHI 2021): https://vision.soic.indiana.edu/papers/websimilarity2021chi.pdf
- Skill terpasang: antislop (Part 1 & 2), impeccable (`reference/craft-floor.md`, `audit.md`), design-taste-frontend (Section 9)

## Status perbaikan (13 Nov 2026)

| # | Status | Yang dilakukan |
|---|---|---|
| 1 | Selesai | Skala teks proyek: isi 15px, sekunder 13px; 12px hanya `text-2xs` untuk sumbu jam, nama hari, tanggal heatmap |
| 2 | Selesai | Setiap sel heatmap berstatus punya ikon (centang, peringatan, silang, info); legenda ikut memakai ikon |
| 3 | Selesai | Font diganti ke Atkinson Hyperlegible Next (keputusan tim) |
| 4 | Selesai | Navy hanya untuk aksi, menu aktif, fokus, hari ini, dan shift sendiri; link/avatar/progress/notifikasi/baris terpilih jadi netral |
| 5 | Selesai | Home: navbar tidak sticky; strip periode + langkah 01-04 digabung jadi "Jadwal pendaftaran" bertanggal nyata |
| 6 | Selesai | Permukaan `#FCFDFE` (putih bertint), semua teks tetap lolos AA (min. 5,89:1) |
| 7 | Selesai | Panel Login memakai token `brand-panel` dan `on-brand-2`, tidak ada hex mentah lagi |
| 8 | Selesai | Hover dibedakan: tombol sekunder = latar + garis menguat, menu = teks dan ikon menguat, baris tabel = latar |
| 9 | Selesai | Menu di bawah 1024px setinggi 44px (terukur 44px di 375px) |

Verifikasi: 24 halaman di 1280 dan 375 px tanpa error dan tanpa scroll horizontal, font Atkinson terpasang di semua halaman.
