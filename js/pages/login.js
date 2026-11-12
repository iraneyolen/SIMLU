// Login mode demo: belum ada database. Role ditentukan dari akun demo, password apa pun diterima.
// Nanti: NIM diubah jadi email kampus, lalu login lewat Supabase Auth.

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

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  form.classList.add("was-validated");
  if (!form.checkValidity()) return;

  const result = findRole(toEmail(form.identity.value));
  if (result.error) {
    errorBox.textContent = result.error;
    errorBox.hidden = false;
    return;
  }
  setRole(result.role);
  location.href = `../${HOME[result.role]}/index.html`;
});

bindThemeButton($("themeBtn"));

for (const btn of document.querySelectorAll("[data-demo]")) {
  btn.addEventListener("click", () => {
    form.identity.value = btn.dataset.demo;
    form.password.value = "demo1234";
    form.requestSubmit();
  });
}
