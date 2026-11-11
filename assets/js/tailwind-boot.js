/* Boot loader Tailwind: menyuntikkan assets/css/theme.css sebagai
   <style type="text/tailwindcss"> — satu-satunya cara @tailwindcss/browser
   membaca CSS kustom (elemen <link> dan @import file eksternal tidak didukung).
   Taruh SETELAH tailwindcss-browser.js di setiap halaman:
   <script src="/assets/vendor/tailwindcss-browser.js"></script>
   <script src="/assets/js/tailwind-boot.js"></script> */
(async () => {
  const css = await fetch('/assets/css/theme.css').then(r => r.text());
  const st = document.createElement('style');
  st.type = 'text/tailwindcss';
  st.textContent = css;
  document.head.appendChild(st);
})();
