/* Boot loader Tailwind: menyuntikkan assets/css/theme.css sebagai
   <style type="text/tailwindcss"> — satu-satunya cara @tailwindcss/browser
   membaca CSS kustom (elemen <link> dan @import file eksternal tidak didukung).

   Root situs dideteksi dari URL script ini sendiri, agar bekerja di:
   localhost          → /assets/js/tailwind-boot.js        → BASE '/'
   GitHub Pages       → /SIMLU/assets/js/tailwind-boot.js  → BASE '/SIMLU/'

   Taruh SETELAH tailwindcss-browser.js di setiap halaman:
   <script src="assets/vendor/tailwindcss-browser.js"></script>
   <script src="assets/js/tailwind-boot.js"></script> */
(async () => {
  const BASE = new URL(document.currentScript.src, location.origin).pathname
    .replace(/assets\/js\/tailwind-boot\.js.*$/, '');
  const css = await fetch(BASE + 'assets/css/theme.css').then(r => r.text());
  const st = document.createElement('style');
  st.type = 'text/tailwindcss';
  st.textContent = css;
  document.head.appendChild(st);
})();
