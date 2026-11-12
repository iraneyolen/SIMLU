---
name: SIMLU
description: Sistem Informasi Mahasiswa Labor Universitas Klabat — biru-kuning institusional yang tenang dan padat data.
colors:
  primary: "#1B76BC"
  primary-deep: "#0F4C81"
  primary-tint: "#E3F0FA"
  primary-wash: "#F2F8FD"
  primary-ink: "#1667A3"
  accent: "#FFC20E"
  ink: "#2D2D2D"
  body-text: "#444444"
  mute: "#6A6D73"
  page: "#FAFBFC"
  line: "#E5E7EB"
  ok: "#15803D"
  bad: "#B91C1C"
  bad-tint: "#FEF2F2"
  warn: "#B45309"
typography:
  display:
    fontFamily: "Zilla Slab, Georgia, serif"
    fontWeight: 600
  body:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
  data:
    fontFamily: "Roboto Mono, ui-monospace, monospace"
    fontWeight: 500
rounded:
  card: "16px"
  ctl: "10px"
spacing:
  sm: "16px"
  md: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.ctl}"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
  button-outline:
    backgroundColor: "#ffffff"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.ctl}"
    height: "44px"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ctl}"
  card-soft:
    backgroundColor: "#ffffff"
    rounded: "{rounded.card}"
  field:
    backgroundColor: "#ffffff"
    textColor: "{colors.body-text}"
    rounded: "{rounded.ctl}"
    height: "44px"
---

# Design System: SIMLU

## Overview

**Creative North Star: "Kantor Kampus yang Rapi"** — antarmuka institusional yang tenang:
data lebih penting dari dekorasi, hierarki jelas, dan warna berasal dari satu sumber nyata
(logo Computer Science · Universitas Klabat: biru + kuning).

**Dial: ENERGY 2 / RHYTHM 1 / MOTION 1** — tenang dan seragam secara sadar (aplikasi
institusional yang dipindai cepat); energi keluar dari presisi data, bukan dekorasi.

Sistem ini desktop-first (dasar 1440px) dan turun bertahap lewat `max-lg`/`max-md`.
Satu font display serif-slab (Zilla Slab) memberi karakter institusi; Roboto membawa
keterbacaan; Roboto Mono hanya untuk angka, jam, dan durasi — data yang perlu rapi kolom
per kolom. **Key Characteristics:** palet biru-kuning dua warna + netral; kartu putih
ber-shadow lembut tinted biru; angka selalu monospace; status selalu badge berwarna.

## Colors

Palet dua warna inti (biru brand + kuning aksen) di atas netral hangat-kemarau.

### Primary
- **Labor Blue** (#1B76BC): tombol utama, ikon aktif, warna grafik. Teks kecil di atas putih
  memakai turunannya, bukan warna ini (kontras).
- **Deep Klabat Navy** (#0F4C81): sidebar, band gelap, footer — permukaan gelap resmi.
- **Sky Tint** (#E3F0FA): latar badge lembut dan tint ikon.
- **Morning Wash** (#F2F8FD): latar form halus dan hover.
- **Link Ink** (#1667A3): teks link kecil di atas putih (lolos AA).

### Secondary
- **Logo Yellow** (#FFC20E): aksen CTA dan tanda aktif sidebar. **The No-Yellow-Text Rule.**
  Kuning tidak pernah menjadi warna teks di atas terang; ia permukaan, bukan tinta.

### Neutral
- **Ink** (#2D2D2D): judul. **Body** (#444444): isi. **Mute** (#6A6D73): caption/metadata.
- **Page** (#FAFBFC): latar halaman. **Line** (#E5E7EB): border kartu.

### Status
- **Ok** (#15803D) / **Bad** (#B91C1C, tint #FEF2F2) / **Warn** (#B45309) — selalu sebagai
  badge isi teks putih (semuanya ≥ 5:1 di atas putih).

## Typography

**Display:** Zilla Slab 600 (fallback Georgia, serif) — hanya hero/judul halaman.
**Body:** Roboto 400/500/700. **Data:** Roboto Mono 500 — jam, tanggal, durasi, NIM.

### Hierarchy
- **Display** (24px, h1): satu per halaman.
- **Section heading** (18px, h2): judul kartu/section; langkah ≥ 1.25× dari body 14px.
- **Body** (14px): isi dan kontrol.
- **Label** (13px semibold) & **Caption** (12px): label form dan bantuan.
- **Data** (mono): semua nilai yang dibandingkan antar baris.

## Layout

Kontainer `max-w-6xl` (1152px) terpusat; grid 4px. Sidebar tetap 240px di desktop dan
menjadi slide-over dengan backdrop di bawah 1024px. Grid KPI dan panel dua kolom
(3:2 atau 2:3) runtuh menjadi satu kolom di `max-md`. Tabel lebar hidup di dalam
wrapper `overflow-x-auto` dengan lebar minimum 600px — data tidak pernah terpotong.

## Elevation & Depth

Sistem ini **lifted but quiet**: satu shadow untuk semua kartu, dua lapis, tinted biru
(`0 1px 2px + 0 4px 12px` pada `rgb(15 76 129 / .06)`), bukan hitam keras. Shadow adalah
penanda elevasi kartu, bukan dekorasi tiap komponen. **The One-Shadow Rule.** Tidak ada
shadow lain di luar `--shadow-soft`.

## Shapes

Dua radius saja: kartu 16px, kontrol 10px, badge pill. Radius bertingkat = hierarki
permukaan. Border 1px `line` di kartu; tanpa border berwarna di kiri kartu.

## Components

### Buttons
- **Shape:** 10px radius, tinggi 44px, gap ikon .5rem.
- **Primary:** Labor Blue, teks putih; hover menyatu ke Deep Navy.
- **Outline:** putih, teks Link Ink, border 1.5px primary; hover Morning Wash.
- **Accent:** Logo Yellow, teks Ink, semibold — hanya untuk CTA utama publik.
- **Danger outline:** putih, teks Bad, border 1.5px Bad.

### Cards
- **Card-soft:** putih, border 1px Line, radius 16px, One-Shadow. Padding dalam 24px.
- Tabel di dalam kartu dibungkus `overflow-x-auto`.

### Inputs
- **Field:** putih, border Line, radius 10px, tinggi 44px; fokus = border primary +
  ring 3px `rgb(27 118 188 / .15)`. Label di atas field (13px semibold), bantuan/error
  di bawahnya.

### Badges
- Pill 11px semibold; status ok/bad/warn dengan teks putih; `soft` untuk status netral
  (Sky Tint + Deep Navy).

### Sidebar
- Deep Navy; item 14px `#CFE3F5`; aktif = putih semibold + lapis putih 14%.
  Tanda aktif mengikuti halaman/hash, disinkronkan JS.

## Do's and Don'ts

### Do:
- **Do** ambil warna dari token `theme.css`; JS pun membaca CSS var (bukan hex).
- **Do** set angka, jam, durasi dengan Roboto Mono.
- **Do** beri tiga state (kosong, memuat, error) pada setiap tampilan data; error pakai
  banner `db.fail` dengan tombol muat ulang.

### Don't:
- **Don't** memakai warna di luar token (termasuk `bg-red-50` bawaan Tailwind — pakai `bg-bad-50`).
- **Don't** memakai kuning sebagai warna teks, atau `primary` untuk teks kecil di putih.
- **Don't** menaruh tabel langsung di kartu tanpa wrapper scroll; data tidak boleh terpotong.
- **Don't** menambah radius/shadow/font baru di luar sistem.

---
Catatan: `.impeccable/design.json` (sidecar untuk live panel) tidak dibuat karena proyek
ini tidak memakai panel Impeccable; regenerasi lewat `$impeccable document` bila diperlukan.
