// Login. Mode local: role ditentukan dari akun demo, password apa pun diterima.
// Mode supabase: Supabase Auth (email + password); NIM diubah jadi email kampus. Akun yang belum
// disetujui, ditolak, atau nonaktif tidak bisa masuk. Tombol masuk cepat hanya tampil di mode local.

const CAMPUS_DOMAIN = "@student.unklab.ac.id";
const HOME = { student: "dashboard-student", coordinator: "dashboard-coordinator", admin: "dashboard-admin" };

// "12510207" -> "12510207@student.unklab.ac.id"; email dibiarkan apa adanya.
function toEmail(identity) {
  const value = identity.trim().toLowerCase();
  return value.includes("@") ? value : value + CAMPUS_DOMAIN;
}

function findRole(email) {
  for (const [role, user] of Object.entries(DEMO_USERS)) if (user.email === email) return { role };
  // Pendaftar baru: hanya boleh masuk kalau sudah disetujui admin
  const applicant = store.list("applicants").find((a) => a.email.toLowerCase() === email);
  if (applicant?.status === "pending") return { error: "Pendaftaran kamu masih menunggu persetujuan admin." };
  if (applicant?.status === "rejected") return { error: "Pendaftaran kamu ditolak. " + (applicant.note || "") };
  if (store.list("students").some((s) => s.email === email)) return { role: "student" };
  return { error: "Akun tidak ditemukan. Coba akun demo di bawah." };
}

async function signInSupabase(email, password) {
  const auth = store.db.auth;
  const { data, error } = await auth.signInWithPassword({ email, password });
  if (error) return { error: error.message === "Invalid login credentials" ? "Email/NIM atau password salah." : error.message };
  const uid = data.user.id;
  const { data: profile } = await store.db.from("profiles").select("role, status").eq("id", uid).maybeSingle();
  let message = "";
  if (!profile) message = "Profil akun tidak ditemukan. Hubungi admin labor.";
  else if (profile.status === "pending") message = "Pendaftaran kamu masih menunggu persetujuan admin.";
  else if (profile.status === "inactive") message = "Akun kamu sedang nonaktif. Hubungi koordinator atau admin labor.";
  else if (profile.status === "rejected") {
    const { data: app } = await store.db.from("applications").select("note").eq("profile_id", uid)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    message = "Pendaftaran kamu ditolak. " + (app?.note || "");
  }
  if (message) { await auth.signOut(); return { error: message }; }
  return { role: profile.role };
}

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");
const submitBtn = form.querySelector('[type="submit"]');

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  form.classList.add("was-validated");
  if (!form.checkValidity()) return;
  errorBox.hidden = true;

  const email = toEmail(form.identity.value);
  submitBtn.disabled = true;
  const result = store.db ? await signInSupabase(email, form.password.value) : findRole(email);
  submitBtn.disabled = false;
  if (result.error) {
    errorBox.textContent = result.error;
    errorBox.hidden = false;
    return;
  }
  setRole(result.role);
  location.href = `../${HOME[result.role]}/index.html`;
});

bindThemeButton($("themeBtn"));

// Masuk cepat (hanya mode local, karena tidak ada password sungguhan di kode publik)
if (store.db) $("demoBox").hidden = true;
for (const btn of document.querySelectorAll("[data-demo]")) {
  btn.addEventListener("click", () => {
    form.identity.value = btn.dataset.demo;
    form.password.value = "demo1234";
    form.requestSubmit();
  });
}
