// Pendaftaran. Mode local: baris baru di tabel `applicants` (status "pending"), password tidak disimpan.
// Mode supabase: akun dibuat lewat Supabase Auth (signUp; trigger membuat profil berstatus pending),
// lalu satu baris `applications`. Akun baru bisa login setelah admin menyetujui.

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

const submitBtn = form.querySelector('[type="submit"]');

function showSuccess() {
  form.hidden = true;
  const success = document.getElementById("registerSuccess");
  success.hidden = false;
  success.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showNimTaken(message) {
  form.nim.setCustomValidity(message);
  form.nim.parentElement.querySelector(".error-msg").textContent = message;
  form.nim.focus();
  form.nim.addEventListener("input", () => form.nim.setCustomValidity(""), { once: true });
}

async function registerSupabase(v) {
  const auth = store.db.auth;
  const { data, error } = await auth.signUp({
    email: v("email").toLowerCase(), password: form.password.value,
    options: { data: { name: v("name"), nim: v("nim"), phone: v("phone"), program: `${v("program")} · ${v("faculty")}` } },
  });
  if (error) {
    // NIM/email unik di tabel profiles: trigger gagal -> "Database error saving new user"
    const taken = /already registered|database error/i.test(error.message);
    return taken ? showNimTaken("NIM atau email ini sudah pernah mendaftar.") : toast(`Pendaftaran gagal: ${error.message}`);
  }
  if (!data.session) return toast("Akun dibuat, tetapi konfirmasi email masih aktif. Minta admin mematikannya, lalu hubungi admin.");
  const unitId = (name) => store.list("units").find((u) => u.name === name)?.id || null;
  const { error: appError } = await store.db.from("applications").insert({
    profile_id: data.user.id, unit_choice: unitId(v("unit")), unit_alt: unitId(v("unitAlt")),
    motivation: v("motivation"), drive_link: v("driveLink"), status: "pending",
  });
  await auth.signOut(); // belum disetujui, jadi jangan biarkan tetap login
  if (appError) return toast(`Akun dibuat, tetapi formulir gagal disimpan: ${appError.message}. Hubungi admin labor.`);
  showSuccess();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  checkPasswordMatch();
  form.classList.add("was-validated");
  if (!form.checkValidity()) {
    form.querySelector("input:invalid, select:invalid, textarea:invalid").focus();
    return;
  }
  const v = (name) => form[name].value.trim();
  if (store.db) {
    submitBtn.disabled = true;
    await registerSupabase(v);
    submitBtn.disabled = false;
    return;
  }
  if (store.list("applicants").some((a) => a.nim === v("nim") && a.status !== "rejected")) {
    showNimTaken("NIM ini sudah pernah mendaftar.");
    return;
  }
  store.add("applicants", {
    name: v("name"), nim: v("nim"), email: v("email").toLowerCase(), phone: v("phone"),
    program: `${v("program")} · ${v("faculty")}`, unit: v("unit"), alt: v("unitAlt") || "-", motivation: v("motivation"),
    driveLink: v("driveLink"), date: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" }), status: "pending", note: "",
  });
  showSuccess();
});

bindThemeButton($("themeBtn"));
