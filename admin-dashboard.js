// ============================================
// منطق لوحة التحكم الرئيسية
// ============================================

async function loadDashboard() {
  const { data: recipes } = await supabaseClient
    .from("recipes")
    .select("*, categories(name)")
    .order("created_at", { ascending: false });

  const tbody = document.getElementById("recipes-tbody");
  if (!recipes || recipes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">لا توجد وصفات بعد</td></tr>`;
    return;
  }

  tbody.innerHTML = recipes
    .map(
      (r) => `
      <tr>
        <td>${r.title}</td>
        <td>${r.categories?.name || "—"}</td>
        <td>${r.is_sub_recipe ? "وصفة فرعية" : "منتج نهائي"}</td>
        <td>${r.has_missing_data ? '<span class="badge badge-warn">⚠ ناقصة</span>' : "—"}</td>
        <td class="actions">
          <a class="btn btn-secondary btn-sm" href="admin-recipe-form.html?id=${r.id}">تعديل</a>
          <button class="btn btn-danger btn-sm" onclick="deleteRecipe('${r.id}')">حذف</button>
        </td>
      </tr>`
    )
    .join("");

  await loadCategories();
}

async function deleteRecipe(id) {
  if (!confirm("متأكد إنك عايز تحذف الوصفة دي؟")) return;
  await supabaseClient.from("recipes").delete().eq("id", id);
  loadDashboard();
}

// -------- إدارة التصنيفات --------
async function loadCategories() {
  const { data: categories } = await supabaseClient.from("categories").select("*").order("name");
  const list = document.getElementById("categories-manage-list");
  list.innerHTML = (categories || [])
    .map(
      (c) => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--line);">
        <span>${c.name}</span>
        <button class="btn btn-danger btn-sm" onclick="deleteCategory('${c.id}')">حذف</button>
      </div>`
    )
    .join("");
}

async function deleteCategory(id) {
  if (!confirm("حذف التصنيف؟ الوصفات المرتبطة به لن تُحذف لكنها هتفقد تصنيفها.")) return;
  await supabaseClient.from("categories").delete().eq("id", id);
  loadCategories();
}

document.getElementById("add-category-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("new-category-name");
  const name = nameInput.value.trim();
  if (!name) return;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s]/g, "")
    .trim()
    .replace(/\s+/g, "-") + "-" + Math.random().toString(36).slice(2, 6);
  await supabaseClient.from("categories").insert({ name, slug });
  nameInput.value = "";
  loadCategories();
});

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAdmin();
  if (!session) return;
  document.getElementById("user-email").textContent = session.user.email;
  loadDashboard();
});
