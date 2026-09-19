// ============================================
// منطق لوحة التحكم الرئيسية
// ============================================

let allDashRecipes = [];
let activeDashFilter = "all";

async function loadDashboard() {
  const { data: recipes } = await supabaseClient
    .from("recipes")
    .select("*, categories(name)")
    .order("created_at", { ascending: false });

  allDashRecipes = recipes || [];
  renderStats();
  renderDashTable();
  await loadCategories();
}

function renderStats() {
  const total = allDashRecipes.length;
  const finalCount = allDashRecipes.filter((r) => !r.is_sub_recipe).length;
  const subCount = allDashRecipes.filter((r) => r.is_sub_recipe).length;
  const missingCount = allDashRecipes.filter((r) => r.has_missing_data).length;

  document.getElementById("stats-row").innerHTML = `
    <div class="stat-card"><div class="num">${total}</div><div class="label">إجمالي الوصفات</div></div>
    <div class="stat-card"><div class="num">${finalCount}</div><div class="label">✅ منتجات نهائية</div></div>
    <div class="stat-card"><div class="num">${subCount}</div><div class="label">🧩 وصفات فرعية</div></div>
    <div class="stat-card"><div class="num">${missingCount}</div><div class="label">⚠ بيانات ناقصة</div></div>
  `;
}

function renderDashTable() {
  const tbody = document.getElementById("recipes-tbody");
  let list = allDashRecipes;
  if (activeDashFilter === "final") list = list.filter((r) => !r.is_sub_recipe);
  if (activeDashFilter === "sub") list = list.filter((r) => r.is_sub_recipe);
  if (activeDashFilter === "missing") list = list.filter((r) => r.has_missing_data);

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">لا توجد وصفات في هذا القسم</td></tr>`;
    return;
  }

  function rowHtml(r) {
    return `
      <tr>
        <td>${r.title}${r.title_en ? ` <span style="color:var(--ink-soft); font-size:0.82rem;">${r.title_en}</span>` : ""}</td>
        <td>${r.categories?.name || "—"}</td>
        <td>${r.is_sub_recipe ? "🧩 وصفة فرعية" : "✅ منتج نهائي"}</td>
        <td>${r.has_missing_data ? '<span class="badge badge-warn">⚠ ناقصة</span>' : "—"}</td>
        <td class="actions">
          <a class="btn btn-secondary btn-sm" href="admin-recipe-form.html?id=${r.id}">تعديل كامل</a>
          <button class="btn btn-secondary btn-sm" onclick="quickRenameRecipe('${r.id}','${(r.title || "").replace(/'/g, "\\'")}')">✏ الاسم</button>
          <button class="btn btn-danger btn-sm" onclick="deleteRecipe('${r.id}')">حذف</button>
        </td>
      </tr>`;
  }

  // تجميع الوصفات الفرعية حسب النوع (صوص / كريمة / عجينة...) عند فلتر "فرعية" أو "الكل"
  if (activeDashFilter === "sub") {
    const order = ["صوص", "كريمة", "عجينة / قاعدة", "حشوة", "شراب"];
    const groups = {};
    list.forEach((r) => {
      const t = r.sub_recipe_type || "غير مصنّف";
      if (!groups[t]) groups[t] = [];
      groups[t].push(r);
    });
    const keys = Object.keys(groups).sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    tbody.innerHTML = keys
      .map(
        (t) =>
          `<tr><td colspan="5" style="background:var(--bg); font-weight:700; color:var(--accent-dark);">${t}</td></tr>` +
          groups[t].map(rowHtml).join("")
      )
      .join("");
  } else {
    tbody.innerHTML = list.map(rowHtml).join("");
  }
}

async function deleteRecipe(id) {
  if (!confirm("متأكد إنك عايز تحذف الوصفة دي؟")) return;
  await supabaseClient.from("recipes").delete().eq("id", id);
  loadDashboard();
}

async function quickRenameRecipe(id, currentTitle) {
  const newTitle = prompt("الاسم الجديد للوصفة:", currentTitle);
  if (!newTitle || !newTitle.trim()) return;
  await supabaseClient.from("recipes").update({ title: newTitle.trim() }).eq("id", id);
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
        <span>${c.name} ${c.name_en ? `<span style="color:var(--ink-soft); font-size:0.85rem;">(${c.name_en})</span>` : ""}</span>
        <span style="display:flex; gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="editCategory('${c.id}','${(c.name || "").replace(/'/g, "\\'")}')">تعديل</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCategory('${c.id}')">حذف</button>
        </span>
      </div>`
    )
    .join("");
}

async function deleteCategory(id) {
  if (!confirm("حذف التصنيف؟ الوصفات المرتبطة به لن تُحذف لكنها هتفقد تصنيفها.")) return;
  await supabaseClient.from("categories").delete().eq("id", id);
  loadCategories();
}

async function editCategory(id, currentName) {
  const newName = prompt("الاسم الجديد للتصنيف:", currentName);
  if (!newName || !newName.trim()) return;
  await supabaseClient.from("categories").update({ name: newName.trim() }).eq("id", id);
  loadCategories();
}

document.getElementById("add-category-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("new-category-name");
  const nameEnInput = document.getElementById("new-category-name-en");
  const name = nameInput.value.trim();
  if (!name) return;
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s]/g, "")
    .trim()
    .replace(/\s+/g, "-") + "-" + Math.random().toString(36).slice(2, 6);
  await supabaseClient.from("categories").insert({ name, name_en: nameEnInput.value.trim(), slug });
  nameInput.value = "";
  nameEnInput.value = "";
  loadCategories();
});

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAdmin();
  if (!session) return;
  document.getElementById("user-email").textContent = session.user.email;
  loadDashboard();
  document.querySelectorAll(".dash-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeDashFilter = tab.dataset.filter;
      document.querySelectorAll(".dash-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      renderDashTable();
    });
  });
});
