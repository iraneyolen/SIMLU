// Profil: dipakai ketiga role. Mode local: email dan No. HP disimpan di tabel `profiles` (id = role),
// password hanya divalidasi. Mode supabase: hanya No. HP yang bisa diubah (nama, NIM, email dikunci
// database), password diubah lewat Supabase Auth setelah password lama dicek.

const role = getRole();

function renderIdentity() {
  const user = currentUser();
  $("identityCard").innerHTML = `
    <span class="grid size-20 place-items-center rounded-full bg-sunken text-2xl font-bold text-ink" aria-hidden="true">${esc(user.initials)}</span>
    <div class="text-lg font-bold">${esc(user.name)}</div>
    <div class="tabular text-ink-2">${esc(user.nim || user.email)}</div>
    <div class="text-sm font-medium text-ink-2">${ROLE_LABEL[role]}</div>`;

  if (role === "student") {
    $("workInfo").innerHTML = `
      <div class="kv"><dt>Unit</dt><dd>${esc(DEMO.unit.name)}</dd></div>
      <div class="kv"><dt>Koordinator</dt><dd>${esc(DEMO.unit.coordinatorName)}</dd></div>
      <div class="kv"><dt>Program studi</dt><dd>${esc(user.program)}</dd></div>
      <div class="kv"><dt>Batas jam</dt><dd>${DEMO.unit.maxHoursPerWeek} j / minggu</dd></div>`;
  } else {
    $("workInfo").innerHTML = `<div class="kv"><dt>Unit</dt><dd>${esc(user.unitName)}</dd></div>`;
  }

  $("pName").value = user.name;
  $("pId").value = user.nim || "-";
  $("pEmail").value = user.email;
  $("pPhone").value = user.phone;
}

$("profileForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  form.classList.add("was-validated");
  if (!form.checkValidity()) return;
  const data = { email: $("pEmail").value.trim(), phone: $("pPhone").value.trim() };
  if (store.get("profiles", role)) store.update("profiles", role, data);
  else store.add("profiles", { id: role, ...data });
  renderIdentity();
  toast("Data diri disimpan.");
});

$("passwordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  $("pwNew2").setCustomValidity($("pwNew").value === $("pwNew2").value ? "" : "Password tidak sama");
  form.classList.add("was-validated");
  if (!form.checkValidity()) return;
  if (store.db) {
    const auth = store.db.auth;
    const { error: wrong } = await auth.signInWithPassword({ email: store.profile.email, password: $("pwOld").value });
    if (wrong) { toast("Password lama salah."); $("pwOld").focus(); return; }
    const { error } = await auth.updateUser({ password: $("pwNew").value });
    if (error) { toast(`Password gagal diubah: ${error.message}`); return; }
  }
  form.reset();
  form.classList.remove("was-validated");
  toast(store.db ? "Password diubah." : "Password diubah (mode demo: tidak disimpan).");
});
$("pwNew2").addEventListener("input", () => $("pwNew2").setCustomValidity(""));

$("resetData").addEventListener("click", () =>
  confirmModal("Reset data demo?", "Semua perubahan (tambah, ubah, hapus, absensi) dikembalikan ke data awal.", () => {
    store.reset();
    location.reload();
  }, "Reset"));

// Mode supabase: email kampus dikunci, reset data demo tidak berlaku
if (store.db) {
  $("pEmail").readOnly = true;
  $("demoSection").hidden = true;
}
renderIdentity();
