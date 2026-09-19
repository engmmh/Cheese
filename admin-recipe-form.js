// ============================================
// فورم إضافة / تعديل وصفة — مكونات ديناميكية، خطوات، وصفات فرعية، حساسية
// ============================================

let editingRecipeId = null;
let masterIngredients = [];
let allAllergensList = [];
let allRecipesForComponents = [];
let finalProductRecipes = [];
let session_email_cache = "";

// ---------- رفع صورة المنتج ----------
async function uploadCoverImage(file) {
  const statusEl = document.getElementById("cover-preview");
  statusEl.innerHTML = `<span style="color:var(--ink-soft); font-size:0.85rem;">جاري رفع الصورة...</span>`;

  const ext = file.name.split(".").pop();
  const path = `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabaseClient.storage.from("recipe-images").upload(path, file);
  if (uploadError) {
    statusEl.innerHTML = `<span style="color:#B3261E; font-size:0.85rem;">فشل رفع الصورة: ${uploadError.message}</span>`;
    return;
  }

  const { data } = supabaseClient.storage.from("recipe-images").getPublicUrl(path);
  document.getElementById("cover_image_url").value = data.publicUrl;
  statusEl.innerHTML = `<img src="${data.publicUrl}" style="width:160px; height:120px; object-fit:cover; border-radius:8px; border:1px solid var(--line);">`;
}

function showExistingCoverPreview(url) {
  if (!url) return;
  document.getElementById("cover-preview").innerHTML =
    `<img src="${url}" style="width:160px; height:120px; object-fit:cover; border-radius:8px; border:1px solid var(--line);">`;
}

function getIdParam() {
  return new URLSearchParams(window.location.search).get("id");
}

async function loadFormPrereqs() {
  const { data: categories } = await supabaseClient.from("categories").select("*").order("name");
  const catSelect = document.getElementById("category_id");
  catSelect.innerHTML =
    `<option value="">— بدون تصنيف / No category —</option>` +
    (categories || []).map((c) => `<option value="${c.id}">${c.name}</option>`).join("");

  const { data: ingredients } = await supabaseClient.from("ingredients").select("*").order("name");
  masterIngredients = ingredients || [];
  document.getElementById("ingredients-datalist").innerHTML = masterIngredients
    .map((i) => `<option value="${i.name}">`)
    .join("");

  const { data: allergens } = await supabaseClient.from("allergens").select("*").order("name");
  allAllergensList = allergens || [];
  document.getElementById("may-contain-grid").innerHTML = allAllergensList
    .map((a) => `<label><input type="checkbox" value="${a.id}" class="may-contain-cb"> ${a.icon || ""} ${a.name_ar || a.name}</label>`)
    .join("");

  const { data: recipes } = await supabaseClient.from("recipes").select("id, title, is_sub_recipe");
  allRecipesForComponents = recipes || [];
  finalProductRecipes = (recipes || []).filter((r) => !r.is_sub_recipe);
}

// ---------- صفوف المكونات ----------
function addIngredientRow(values = {}) {
  const container = document.getElementById("ingredients-rows");
  const row = document.createElement("div");
  row.className = "repeat-row ingredient-row";
  row.innerHTML = `
    <div><input type="text" class="ing-name" list="ingredients-datalist" placeholder="اسم المكون / Ingredient name" value="${values.name || ""}"></div>
    <div><input type="number" step="any" class="ing-amount" placeholder="الكمية / Amount" value="${values.amount || ""}"></div>
    <div><input type="text" class="ing-unit" placeholder="الوحدة / Unit (g, kg, pcs...)" value="${values.unit || ""}"></div>
    <button type="button" class="remove-btn" onclick="this.closest('.ingredient-row').remove()">✕</button>
  `;
  container.appendChild(row);
}

// ---------- صفوف الخطوات ----------
function addStepBlock(values = {}) {
  const container = document.getElementById("steps-blocks");
  const block = document.createElement("div");
  block.className = "step-form-block step-block";
  block.innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
      <strong>خطوة <span class="label-en">Step</span></strong>
      <button type="button" class="remove-btn" onclick="this.closest('.step-block').remove()">✕</button>
    </div>
    <div class="field-group">
      <label>عنوان الخطوة<span class="label-en">Step title</span></label>
      <input type="text" class="step-title" value="${values.title || ""}">
    </div>
    <div class="field-group">
      <label>تفاصيل الخطوة<span class="label-en">Step details</span></label>
      <textarea class="step-instructions">${values.instructions || ""}</textarea>
    </div>
    <div class="field-row">
      <div class="field-group">
        <label>درجة الحرارة<span class="label-en">Temperature</span></label>
        <input type="text" class="step-temp" placeholder="مثال: 180°C" value="${values.temperature || ""}">
      </div>
      <div class="field-group">
        <label>المدة<span class="label-en">Duration</span></label>
        <input type="text" class="step-duration" placeholder="مثال: 25 دقيقة" value="${values.duration || ""}">
      </div>
    </div>
    <div class="field-group">
      <label>طريقة التقليب/الخلط<span class="label-en">Mixing method</span></label>
      <input type="text" class="step-mixing" value="${values.mixing_method || ""}">
    </div>
    <div class="field-group">
      <label>ملاحظة جودة لهذه الخطوة<span class="label-en">Quality note</span></label>
      <input type="text" class="step-quality" value="${values.quality_note || ""}">
    </div>
  `;
  container.appendChild(block);
}

// ---------- صفوف "تُستخدم داخل منتج نهائي" (ربط عكسي) ----------
function addUsedInRow(values = {}) {
  const container = document.getElementById("used-in-rows");
  const row = document.createElement("div");
  row.className = "repeat-row used-in-row";
  const options = finalProductRecipes
    .filter((r) => r.id !== editingRecipeId)
    .map((r) => `<option value="${r.id}" ${values.parent_recipe_id === r.id ? "selected" : ""}>${r.title}</option>`)
    .join("");
  row.innerHTML = `
    <div><select class="used-in-parent"><option value="">اختر المنتج النهائي / Select product</option>${options}</select></div>
    <div><input type="number" step="any" class="used-in-amount" placeholder="الكمية / Amount" value="${values.amount || ""}"></div>
    <div><input type="text" class="used-in-unit" placeholder="الوحدة / Unit" value="${values.unit || ""}"></div>
    <button type="button" class="remove-btn" onclick="this.closest('.used-in-row').remove()">✕</button>
  `;
  container.appendChild(row);
}

// ---------- صفوف الوصفات الفرعية ----------
function addComponentRow(values = {}) {
  const container = document.getElementById("components-rows");
  const row = document.createElement("div");
  row.className = "repeat-row component-row";
  const options = allRecipesForComponents
    .filter((r) => r.id !== editingRecipeId)
    .map((r) => `<option value="${r.id}" ${values.component_recipe_id === r.id ? "selected" : ""}>${r.title}</option>`)
    .join("");
  row.innerHTML = `
    <div><select class="comp-recipe"><option value="">اختر الوصفة الفرعية / Select sub-recipe</option>${options}</select></div>
    <div><input type="number" step="any" class="comp-amount" placeholder="الكمية / Amount" value="${values.amount || ""}"></div>
    <div><input type="text" class="comp-unit" placeholder="الوحدة / Unit" value="${values.unit || ""}"></div>
    <button type="button" class="remove-btn" onclick="this.closest('.component-row').remove()">✕</button>
  `;
  container.appendChild(row);
}

// ---------- تحميل بيانات وصفة موجودة للتعديل ----------
async function loadExistingRecipe(id) {
  const { data: recipe } = await supabaseClient.from("recipes").select("*").eq("id", id).single();
  if (!recipe) return;

  document.getElementById("title").value = recipe.title || "";
  document.getElementById("title_en").value = recipe.title_en || "";
  document.getElementById("short_description").value = recipe.short_description || "";
  document.getElementById("category_id").value = recipe.category_id || "";
  document.getElementById("servings").value = recipe.servings || "";
  document.getElementById("total_time").value = recipe.total_time || "";
  document.getElementById("general_quality_notes").value = recipe.general_quality_notes || "";
  document.getElementById("shelf_life_days").value = recipe.shelf_life_days || "";
  document.getElementById("fridge_temp").value = recipe.fridge_temp || "1°C إلى 4°C";
  document.getElementById("freezer_temp").value = recipe.freezer_temp || "-18°C";
  document.getElementById("cutting_size").value = recipe.cutting_size || "";
  document.getElementById("cover_image_url").value = recipe.cover_image_url || "";
  showExistingCoverPreview(recipe.cover_image_url);
  document.getElementById("is_sub_recipe").checked = !!recipe.is_sub_recipe;
  document.getElementById("has_missing_data").checked = !!recipe.has_missing_data;
  document.getElementById("is_featured").checked = !!recipe.is_featured;
  document.getElementById("sub_recipe_type").value = recipe.sub_recipe_type || "";
  document.getElementById("sub-type-wrap").style.display = recipe.is_sub_recipe ? "block" : "none";

  const { data: ri } = await supabaseClient
    .from("recipe_ingredients")
    .select("amount, unit, ingredients(name)")
    .eq("recipe_id", id);
  (ri || []).forEach((r) => addIngredientRow({ name: r.ingredients?.name, amount: r.amount, unit: r.unit }));

  const { data: steps } = await supabaseClient.from("recipe_steps").select("*").eq("recipe_id", id).order("step_number");
  (steps || []).forEach((s) => addStepBlock(s));

  const { data: comps } = await supabaseClient.from("recipe_components").select("*").eq("parent_recipe_id", id);
  (comps || []).forEach((c) => addComponentRow(c));

  const { data: usedIn } = await supabaseClient.from("recipe_components").select("*").eq("component_recipe_id", id);
  (usedIn || []).forEach((u) => addUsedInRow({ parent_recipe_id: u.parent_recipe_id, amount: u.amount, unit: u.unit }));

  const { data: mc } = await supabaseClient.from("recipe_may_contain").select("allergen_id").eq("recipe_id", id);
  const mcIds = new Set((mc || []).map((m) => m.allergen_id));
  document.querySelectorAll(".may-contain-cb").forEach((cb) => {
    if (mcIds.has(cb.value)) cb.checked = true;
  });
}

// ---------- حفظ ----------
async function resolveIngredientId(name) {
  const existing = masterIngredients.find((i) => i.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (existing) return existing.id;
  const { data, error } = await supabaseClient.from("ingredients").insert({ name: name.trim() }).select().single();
  if (error) throw error;
  masterIngredients.push(data);
  return data.id;
}

async function saveRecipe(e) {
  e.preventDefault();
  const errBox = document.getElementById("form-error");
  errBox.style.display = "none";

  try {
    const recipePayload = {
      title: document.getElementById("title").value.trim(),
      title_en: document.getElementById("title_en").value.trim(),
      short_description: document.getElementById("short_description").value.trim(),
      category_id: document.getElementById("category_id").value || null,
      servings: document.getElementById("servings").value.trim(),
      total_time: document.getElementById("total_time").value.trim(),
      general_quality_notes: document.getElementById("general_quality_notes").value.trim(),
      shelf_life_days: document.getElementById("shelf_life_days").value || null,
      fridge_temp: document.getElementById("fridge_temp").value.trim(),
      freezer_temp: document.getElementById("freezer_temp").value.trim(),
      cutting_size: document.getElementById("cutting_size").value.trim(),
      cover_image_url: document.getElementById("cover_image_url").value.trim(),
      is_sub_recipe: document.getElementById("is_sub_recipe").checked,
      has_missing_data: document.getElementById("has_missing_data").checked,
      is_featured: document.getElementById("is_featured").checked,
      sub_recipe_type: document.getElementById("is_sub_recipe").checked ? (document.getElementById("sub_recipe_type").value || null) : null,
    };

    let recipeId = editingRecipeId;
    if (recipeId) {
      // حفظ نسخة من الوصفة الحالية قبل التعديل (سجل التغييرات)
      const { data: oldRecipe } = await supabaseClient.from("recipes").select("*").eq("id", recipeId).single();
      const { data: oldIngredients } = await supabaseClient.from("recipe_ingredients").select("*").eq("recipe_id", recipeId);
      const { data: oldSteps } = await supabaseClient.from("recipe_steps").select("*").eq("recipe_id", recipeId);
      await supabaseClient.from("recipe_versions").insert({
        recipe_id: recipeId,
        snapshot: { recipe: oldRecipe, ingredients: oldIngredients, steps: oldSteps },
        edited_by: session_email_cache,
      });

      const { error } = await supabaseClient.from("recipes").update(recipePayload).eq("id", recipeId);
      if (error) throw error;
      // امسح البيانات المرتبطة القديمة عشان نعيد كتابتها من الفورم
      await supabaseClient.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
      await supabaseClient.from("recipe_steps").delete().eq("recipe_id", recipeId);
      await supabaseClient.from("recipe_components").delete().eq("parent_recipe_id", recipeId);
      await supabaseClient.from("recipe_components").delete().eq("component_recipe_id", recipeId);
      await supabaseClient.from("recipe_may_contain").delete().eq("recipe_id", recipeId);
    } else {
      const { data, error } = await supabaseClient.from("recipes").insert(recipePayload).select().single();
      if (error) throw error;
      recipeId = data.id;
    }

    // المكونات
    const ingredientRows = Array.from(document.querySelectorAll(".ingredient-row"));
    for (const row of ingredientRows) {
      const name = row.querySelector(".ing-name").value.trim();
      if (!name) continue;
      const ingredientId = await resolveIngredientId(name);
      await supabaseClient.from("recipe_ingredients").insert({
        recipe_id: recipeId,
        ingredient_id: ingredientId,
        amount: row.querySelector(".ing-amount").value || null,
        unit: row.querySelector(".ing-unit").value.trim(),
      });
    }

    // الخطوات
    const stepBlocks = Array.from(document.querySelectorAll(".step-block"));
    let stepNum = 1;
    for (const block of stepBlocks) {
      await supabaseClient.from("recipe_steps").insert({
        recipe_id: recipeId,
        step_number: stepNum++,
        title: block.querySelector(".step-title").value.trim(),
        instructions: block.querySelector(".step-instructions").value.trim(),
        temperature: block.querySelector(".step-temp").value.trim(),
        duration: block.querySelector(".step-duration").value.trim(),
        mixing_method: block.querySelector(".step-mixing").value.trim(),
        quality_note: block.querySelector(".step-quality").value.trim(),
      });
    }

    // الوصفات الفرعية
    const compRows = Array.from(document.querySelectorAll(".component-row"));
    for (const row of compRows) {
      const compId = row.querySelector(".comp-recipe").value;
      if (!compId) continue;
      await supabaseClient.from("recipe_components").insert({
        parent_recipe_id: recipeId,
        component_recipe_id: compId,
        amount: row.querySelector(".comp-amount").value || null,
        unit: row.querySelector(".comp-unit").value.trim(),
      });
    }

    // قد يحتوي على آثار من
    const checkedAllergens = Array.from(document.querySelectorAll(".may-contain-cb:checked")).map((cb) => cb.value);
    for (const allergenId of checkedAllergens) {
      await supabaseClient.from("recipe_may_contain").insert({ recipe_id: recipeId, allergen_id: allergenId });
    }

    // استخدام هذه الوصفة داخل منتج نهائي آخر (ربط عكسي)
    const usedInRows = Array.from(document.querySelectorAll(".used-in-row"));
    for (const row of usedInRows) {
      const parentId = row.querySelector(".used-in-parent").value;
      if (!parentId) continue;
      await supabaseClient.from("recipe_components").insert({
        parent_recipe_id: parentId,
        component_recipe_id: recipeId,
        amount: row.querySelector(".used-in-amount").value || null,
        unit: row.querySelector(".used-in-unit").value.trim(),
      });
    }

    window.location.href = "admin-dashboard.html";
  } catch (err) {
    console.error(err);
    errBox.textContent = "حصل خطأ أثناء الحفظ: " + (err.message || "");
    errBox.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAdmin();
  if (!session) return;
  session_email_cache = session.user.email;

  editingRecipeId = getIdParam();
  document.getElementById("form-title").textContent = editingRecipeId ? "تعديل الوصفة" : "إضافة وصفة جديدة";
  if (editingRecipeId) {
    document.getElementById("form-title").innerHTML += ` <a href="admin-history.html?id=${editingRecipeId}" class="btn btn-secondary btn-sm" style="font-size:0.8rem; vertical-align:middle;">🕒 سجل التغييرات</a>`;
  }

  await loadFormPrereqs();

  if (editingRecipeId) {
    await loadExistingRecipe(editingRecipeId);
  } else {
    addIngredientRow();
    addStepBlock();
    document.getElementById("fridge_temp").value = "1°C إلى 4°C";
    document.getElementById("freezer_temp").value = "-18°C";
  }

  document.getElementById("add-ingredient-btn").addEventListener("click", () => addIngredientRow());
  document.getElementById("add-step-btn").addEventListener("click", () => addStepBlock());
  document.getElementById("add-component-btn").addEventListener("click", () => addComponentRow());
  document.getElementById("add-used-in-btn").addEventListener("click", () => addUsedInRow());
  document.getElementById("is_sub_recipe").addEventListener("change", (e) => {
    document.getElementById("sub-type-wrap").style.display = e.target.checked ? "block" : "none";
  });
  document.getElementById("cover_image_file").addEventListener("change", (e) => {
    if (e.target.files[0]) uploadCoverImage(e.target.files[0]);
  });
  document.getElementById("recipe-form").addEventListener("submit", saveRecipe);
});
