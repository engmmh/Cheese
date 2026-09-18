// ============================================
// حارس الصفحات: يمنع الدخول للوحة التحكم من غير تسجيل دخول
// ============================================
async function requireAdmin() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = "login.html";
    return null;
  }
  return data.session;
}

async function adminLogout() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}
