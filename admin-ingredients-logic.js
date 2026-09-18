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
    .order("name");

  const tbody = document.getElementById("ingredients-tbody");
  if (!ingredients || ingredients.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3">لا توجد مكونات بعد</td></tr>`;
    return;
  }

  tbody.innerHTML = ingredients
    .map((ing) => {
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
      return `
        <tr>
          <td>${ing.name}</td>
          <td>${checkboxes}</td>
          <td><button class="btn btn-danger btn-sm" onclick="deleteIngredient('${ing.id}')">حذف</button></td>
        </tr>`;
    })
    .join("");
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

document.getElementById("add-ingredient-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("new-ingredient-name");
  const name = input.value.trim();
  if (!name) return;
  await supabaseClient.from("ingredients").insert({ name });
  input.value = "";
  loadIngredientsPage();
});

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAdmin();
  if (!session) return;
  loadIngredientsPage();
});
