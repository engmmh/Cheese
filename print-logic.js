// ============================================
// صفحة الطباعة — تنسيق ورقة A4 بشكل القالب المعتمد
// عنوان أحمر غامق مائل تحته خط، المكونات، طريقة التحضير بخطوات مرقمة،
// قسم للوصفة الفرعية لو موجودة، وملاحظة خضراء في الآخر
// ============================================

function getIdParam() {
  return new URLSearchParams(window.location.search).get("id");
}

async function fetchPrintable(recipeId) {
  const { data: recipe } = await supabaseClient.from("recipes").select("*").eq("id", recipeId).single();
  if (!recipe) return null;

  const { data: recipeIngredients } = await supabaseClient
    .from("recipe_ingredients")
    .select("amount, unit, ingredients(name, name_ar)")
    .eq("recipe_id", recipeId);

  const { data: steps } = await supabaseClient
    .from("recipe_steps")
    .select("*")
    .eq("recipe_id", recipeId)
    .order("step_number");

  const { data: components } = await supabaseClient
    .from("recipe_components")
    .select("amount, unit, component_recipe_id, recipes:component_recipe_id(id, title)")
    .eq("parent_recipe_id", recipeId);

  // لكل وصفة فرعية: نجيب مكوناتها وخطواتها كمان
  const subRecipes = [];
  for (const c of components || []) {
    const { data: subIngredients } = await supabaseClient
      .from("recipe_ingredients")
      .select("amount, unit, ingredients(name, name_ar)")
      .eq("recipe_id", c.component_recipe_id);
    const { data: subSteps } = await supabaseClient
      .from("recipe_steps")
      .select("*")
      .eq("recipe_id", c.component_recipe_id)
      .order("step_number");
    subRecipes.push({
      title: c.recipes?.title || "جزء فرعي",
      amount: c.amount,
      unit: c.unit,
      ingredients: subIngredients || [],
      steps: subSteps || [],
    });
  }

  return { recipe, recipeIngredients: recipeIngredients || [], steps: steps || [], subRecipes };
}

function stepLabel(n) {
  return `الخطوة ${n}:`;
}

function renderIngredientsBlock(ingredients) {
  if (!ingredients.length) return `<p class="p-note">لا توجد مكونات مسجلة</p>`;
  return ingredients
    .map((i) => {
      const ar = i.ingredients?.name_ar;
      const en = i.ingredients?.name;
      const label = ar && en ? `${ar} / ${en}` : (ar || en || "—");
      return `<p class="p-ingredient">${label} : <b>${i.amount || ""} ${i.unit || ""}</b></p>`;
    })
    .join("");
}

function renderStepsBlock(steps) {
  if (!steps.length) return `<p class="p-note">لا توجد خطوات مسجلة</p>`;
  return steps
    .map((s) => {
      const extras = [];
      if (s.temperature) extras.push(`الحرارة<span class="label-en">Temp</span>: ${s.temperature}`);
      if (s.duration) extras.push(`المدة<span class="label-en">Duration</span>: ${s.duration}`);
      if (s.mixing_method) extras.push(`التقليب<span class="label-en">Mixing</span>: ${s.mixing_method}`);
      const extrasText = extras.length ? ` (${extras.join(" — ")})` : "";
      return `<p class="p-step"><span class="p-step-label">${stepLabel(s.step_number)}</span> ${s.instructions || s.title || ""}${extrasText}</p>`;
    })
    .join("");
}

function renderPrintPage(data) {
  const { recipe, recipeIngredients, steps, subRecipes } = data;
  document.title = "طباعة — " + recipe.title;

  let html = `<h1 class="p-title">${recipe.title}</h1>`;
  if (recipe.title_en) html += `<p style="font-size:12pt; color:#666; margin:-10px 0 16px; direction:ltr;">${recipe.title_en}</p>`;

  html += renderIngredientsBlock(recipeIngredients);
  html += `<p class="p-method-label">طريقة التحضير <span class="label-en">Method</span>:</p>`;
  html += renderStepsBlock(steps);

  subRecipes.forEach((sub) => {
    html += `<h2 class="p-sub-title">${sub.title}${sub.amount ? ` — ${sub.amount} ${sub.unit || ""}` : ""}</h2>`;
    html += renderIngredientsBlock(sub.ingredients);
    html += `<p class="p-method-label">طريقة التحضير <span class="label-en">Method</span>:</p>`;
    html += renderStepsBlock(sub.steps);
  });

  const noteParts = [];
  if (recipe.general_quality_notes) noteParts.push(recipe.general_quality_notes);
  if (recipe.shelf_life_days) noteParts.push(`مدة الصلاحية<span class="label-en">Shelf life</span>: ${recipe.shelf_life_days} يوم`);
  noteParts.push(`تحفظ في الثلاجة عند ${recipe.fridge_temp || "—"} أو الفريزر عند ${recipe.freezer_temp || "—"} / Store refrigerated at ${recipe.fridge_temp || "—"} or frozen at ${recipe.freezer_temp || "—"}`);

  html += `<p class="p-final-note"><b>ملاحظة<span class="label-en">Note</span>:</b> ${noteParts.join(" — ")}</p>`;

  document.getElementById("print-sheet").innerHTML = html;
}

document.addEventListener("DOMContentLoaded", async () => {
  const id = getIdParam();
  if (!id) {
    document.getElementById("print-sheet").innerHTML = "الوصفة غير موجودة";
    return;
  }
  const data = await fetchPrintable(id);
  if (!data) {
    document.getElementById("print-sheet").innerHTML = "الوصفة غير موجودة";
    return;
  }
  renderPrintPage(data);
});
