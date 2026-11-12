// Pendaftaran: data masuk ke tabel `applicants` (status "pending") dan muncul di halaman Pendaftar milik admin.
// Password tidak disimpan di mode demo. Nanti: Supabase Auth signUp + baris applicants.

const form = document.getElementById("registerForm");

for (const id of ["unit", "unitAlt"]) {
  const select = document.getElementById(id);
  for (const u of store.list("units")) select.add(new Option(`${u.name} (${u.quota} posisi)`, u.name));
}

// Pesan khusus untuk "Ulangi password" memakai validasi bawaan browser.
function checkPasswordMatch() {
  const same = form.password.value === form.password2.value;
  form.password2.setCustomValidity(same ? "" : "Password tidak sama");
}
form.password.addEventListener("input", checkPasswordMatch);
form.password2.addEventListener("input", checkPasswordMatch);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  checkPasswordMatch();
  form.classList.add("was-validated");
  if (!form.checkValidity()) {
    form.querySelector("input:invalid, select:invalid, textarea:invalid").focus();
    return;
  }
  const v = (name) => form[name].value.trim();
  if (store.list("applicants").some((a) => a.nim === v("nim") && a.status !== "rejected")) {
    form.nim.setCustomValidity("NIM ini sudah terdaftar");
    form.nim.parentElement.querySelector(".error-msg").textContent = "NIM ini sudah pernah mendaftar.";
    form.nim.focus();
    form.nim.addEventListener("input", () => form.nim.setCustomValidity(""), { once: true });
    return;
  }
  store.add("applicants", {
    name: v("name"), nim: v("nim"), email: v("email").toLowerCase(), phone: v("phone"),
    program: `${v("program")} · ${v("faculty")}`, unit: v("unit"), alt: v("unitAlt") || "-", motivation: v("motivation"),
    driveLink: v("driveLink"), date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" }), status: "pending", note: "",
  });
  form.hidden = true;
  const success = document.getElementById("registerSuccess");
  success.hidden = false;
  success.scrollIntoView({ behavior: "smooth", block: "center" });
});

bindThemeButton($("themeBtn"));
