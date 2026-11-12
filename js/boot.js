// Dimuat di <head> SETELAH assets/vendor/tailwindcss-browser.js, di setiap halaman.
// 1. Pasang tema (terang/gelap) sebelum halaman tergambar, supaya tidak berkedip.
// 2. Suntikkan assets/css/app.css sebagai <style type="text/tailwindcss">: @tailwindcss/browser
//    hanya membaca CSS kustom lewat elemen ini (<link> dan @import file eksternal tidak didukung).
// 3. Sembunyikan halaman sampai style siap (maks 1,5 detik), lalu tampilkan.
// Catatan: fetch() butuh server lokal (VS Code Live Server). Dibuka lewat file:// tampilan tidak bergaya.

(function () {
  const root = document.documentElement;

  // ---------- Tema ----------
  const THEME_KEY = "labor:theme"; // "light" | "dark" | tidak ada = ikut sistem
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const saved = () => { try { return localStorage.getItem(THEME_KEY); } catch { return null; } };
  const apply = () => {
    const mode = saved() || (media.matches ? "dark" : "light");
    root.classList.toggle("dark", mode === "dark");
    return mode;
  };
  apply();
  media.addEventListener("change", () => { if (!saved()) { apply(); window.dispatchEvent(new Event("themechange")); } });

  // Dipakai tombol tema di topbar
  window.theme = {
    current: () => (root.classList.contains("dark") ? "dark" : "light"),
    toggle() {
      const next = this.current() === "dark" ? "light" : "dark";
      try { localStorage.setItem(THEME_KEY, next); } catch { /* tetap berlaku untuk halaman ini */ }
      apply();
      root.classList.toggle("dark", next === "dark");
      window.dispatchEvent(new Event("themechange"));
    },
  };

  // ---------- Style ----------
  root.style.visibility = "hidden";
  const reveal = () => { root.style.visibility = ""; };
  setTimeout(reveal, 1500);

  const base = new URL("..", document.currentScript.src); // folder akar situs (js/ ada satu tingkat di bawahnya)
  fetch(new URL("assets/css/app.css", base))
    .then((r) => r.text())
    .then((css) => {
      const style = document.createElement("style");
      style.type = "text/tailwindcss";
      style.textContent = css;
      document.head.appendChild(style);
      // Beri Tailwind dua frame untuk menghasilkan CSS sebelum halaman ditampilkan
      requestAnimationFrame(() => requestAnimationFrame(reveal));
    })
    .catch(reveal);
})();
