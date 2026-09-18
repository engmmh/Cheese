// ============================================
// إدارة المكونات ومسببات الحساسية الخاصة بكل مكون
// ============================================

let allergensCache = [];

async function loadIngredientsPage() {
  const { data: allergens } = await supabaseClient.from("allergens").select("*").order("name");
  allergensCache = allergens || [];

  const { data: ingredients } = await supabaseClient
    .from("ingredients")
    .select("*, ingredient_allergens(allergen_id)")
    .order("ingredient_category")
    .order("name");

  const tbody = document.getElementById("ingredients-tbody");
  if (!ingredients || ingredients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">لا توجد مكونات بعد</td></tr>`;
    return;
  }

  let html = "";
  let lastCategory = null;
  ingredients.forEach((ing) => {
    const cat = ing.ingredient_category || "غير مصنّف";
    if (cat !== lastCategory) {
      html += `<tr><td colspan="4" style="background:var(--bg); font-weight:700; color:var(--accent-dark);">${cat}</td></tr>`;
      lastCategory = cat;
    }
    const assigned = new Set((ing.ingredient_allergens || []).map((a) => a.allergen_id));
    const checkboxes = allergensCache
      .map(
        (a) =>
          `<label style="display:inline-flex; align-items:center; gap:4px; margin-inline-end:10px; font-size:0.82rem; font-weight:400;">
            <input type="checkbox" data-ing="${ing.id}" data-allergen="${a.id}" ${assigned.has(a.id) ? "checked" : ""} onchange="toggleAllergen(this)">
            ${a.icon || ""} ${a.name_ar || a.name}
          </label>`
      )
      .join("");
    html += `
      <tr>
        <td>${ing.icon || ""} ${ing.name_ar || ""} <span style="color:var(--ink-soft); font-size:0.82rem;">${ing.name}</span></td>
        <td>${checkboxes}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="editIngredient('${ing.id}')">تعديل</button>
        <button class="btn btn-danger btn-sm" onclick="deleteIngredient('${ing.id}')">حذف</button></td>
      </tr>`;
  });
  tbody.innerHTML = html;
}

async function toggleAllergen(checkbox) {
  const ingredientId = checkbox.dataset.ing;
  const allergenId = checkbox.dataset.allergen;
  if (checkbox.checked) {
    await supabaseClient.from("ingredient_allergens").insert({ ingredient_id: ingredientId, allergen_id: allergenId });
  } else {
    await supabaseClient.from("ingredient_allergens").delete().eq("ingredient_id", ingredientId).eq("allergen_id", allergenId);
  }
}

async function deleteIngredient(id) {
  if (!confirm("حذف المكون؟ لو مستخدم في وصفات هيتشال منها كمان.")) return;
  await supabaseClient.from("ingredients").delete().eq("id", id);
  loadIngredientsPage();
}

async function editIngredient(id) {
  const nameAr = prompt("الاسم بالعربي:");
  if (nameAr === null) return;
  const icon = prompt("إيموجي:");
  const category = prompt("التصنيف (مثال: ألبان، دقيق ومخبوزات، سكريات ومحليات...):");
  await supabaseClient.from("ingredients").update({ name_ar: nameAr, icon, ingredient_category: category }).eq("id", id);
  loadIngredientsPage();
}

document.getElementById("add-ingredient-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("new-ingredient-name");
  const name = input.value.trim();
  if (!name) return;
  const nameAr = document.getElementById("new-ingredient-name-ar").value.trim();
  const icon = document.getElementById("new-ingredient-icon").value.trim();
  const category = document.getElementById("new-ingredient-category").value;
  await supabaseClient.from("ingredients").insert({ name, name_ar: nameAr, icon, ingredient_category: category });
  input.value = "";
  document.getElementById("new-ingredient-name-ar").value = "";
  document.getElementById("new-ingredient-icon").value = "";
  loadIngredientsPage();
});

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAdmin();
  if (!session) return;
  loadIngredientsPage();
});
