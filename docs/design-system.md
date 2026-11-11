# Design System — SIMLU Universitas Klabat (v3)

> Sumber: logo **Computer Science · Universitas Klabat** (biru + kuning).
> Desktop-first · Tailwind CSS v4 (vendored, offline) · Gaya: clean modern dengan shadow lembut.

## Setup per halaman
```html
<script src="/assets/vendor/tailwindcss-browser.js"></script>
<script src="/assets/js/tailwind-boot.js"></script>
```

## 1. Warna

| Token | Hex | Pemakaian |
|---|---|---|
| `primary` | `#1B76BC` | Tombol utama, navbar, aksen besar |
| `primary-900` | `#0F4C81` | Sidebar, band gelap, footer |
| `primary-100` | `#E3F0FA` | Tint ikon/badge |
| `primary-50` | `#F2F8FD` | Hover halus, latar form |
| `primary-ink` | `#1667A3` | **Teks link kecil di atas putih (AA)** |
| `accent` | `#FFC20E` | Kuning logo — CTA highlight. BUKAN teks di atas putih |
| `ink` / `body` / `mute` | `#2D2D2D` / `#444444` / `#6A6D73` | Judul / isi / caption |
| `page` / `line` | `#FAFBFC` / `#E5E7EB` | Latar halaman / border |
| `ok` / `bad` / `warn` | `#15803D` / `#B91C1C` / `#B45309` | Status (kontras-aman) |

Aturan kontras: teks putih di atas `primary-900` aman; di atas `primary` hanya teks ≥ 18px
atau bold (≈3.9:1) — untuk teks kecil gunakan `primary-ink`; kuning tidak pernah jadi warna teks.

## 2. Tipografi

| Peran | Font |
|---|---|
| Display (hero) | Zilla Slab 600 |
| Heading & body | Roboto 400/500/700 |
| Angka, jam, durasi | Roboto Mono 500 |

## 3. Bentuk & Spacing
- Radius: card `16px` (`rounded-card`), control `10px` (`rounded-ctl`), badge pill.
- Shadow: `--shadow-soft` (2-layer tinted biru). Tanpa shadow hitam keras.
- Motion 200-300ms ease-out, hormati `prefers-reduced-motion`. Fokus keyboard: outline biru 2px.
- Spacing grid 4px (`p-4`, `gap-6`, dst). Breakpoints: 1440 (dasar) → `max-lg` 1024 → `max-md` 768 → `max-sm` 640.

## 4. Komponen inti (`theme.css`)
`.btn` + `.btn-primary/.btn-outline/.btn-accent/.btn-danger-outline` · `.card-soft`
· `.field/.label/.help/.err` · `.badge-ok/.badge-bad/.badge-warn/.badge-soft` · `.sidebar-item`

## 5. Ikon (Bootstrap Icons)
Jadwal `bi-calendar-week` · Absen `bi-play-circle`/`bi-stop-circle` · Riwayat `bi-clock-history`
· Grafik `bi-graph-up` · Pengajuan `bi-arrow-left-right` · Keluar `bi-box-arrow-left` · Menu `bi-list`
