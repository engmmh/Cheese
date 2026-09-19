// ============================================
// منطق صفحة تفاصيل الوصفة
// ============================================

function getRecipeIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function fetchFullRecipe(recipeId) {
  const { data: recipe } = await supabaseClient.from("recipes").select("*").eq("id", recipeId).single();
  if (!recipe) return null;

  const { data: category } = recipe.category_id
    ? await supabaseClient.from("categories").select("*").eq("id", recipe.category_id).single()
    : { data: null };

  const { data: recipeIngredients } = await supabaseClient
    .from("recipe_ingredients")
    .select("amount, unit, ingredients(id, name, name_ar, icon)")
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

  const { data: mayContain } = await supabaseClient
    .from("recipe_may_contain")
    .select("allergens(name, name_ar, icon)")
    .eq("recipe_id", recipeId);

  // مسببات الحساسية الفعلية = مشتقة من المكونات المستخدمة
  const ingredientIds = (recipeIngredients || []).map((ri) => ri.ingredients?.id).filter(Boolean);
  let containsAllergens = [];
  if (ingredientIds.length > 0) {
    const { data: ia } = await supabaseClient
      .from("ingredient_allergens")
      .select("allergens(name, name_ar, icon)")
      .in("ingredient_id", ingredientIds);
    containsAllergens = ia || [];
  }

  const { data: usedInParents } = await supabaseClient
    .from("recipe_components")
    .select("parent_recipe_id, recipes:parent_recipe_id(id, title)")
    .eq("component_recipe_id", recipeId);

  return {
    recipe,
    category,
    recipeIngredients: recipeIngredients || [],
    steps: steps || [],
    components: components || [],
    usedInParents: usedInParents || [],
    mayContain: mayContain || [],
    containsAllergens,
  };
}

function renderRecipeDetail(data) {
  const { recipe, category, recipeIngredients, steps, components, usedInParents, mayContain, containsAllergens } = data;

  document.title = recipe.title + " — دفتر الوصفات";
  document.getElementById("breadcrumb").innerHTML = `
    <a href="index.html">الرئيسية</a> ›
    ${category ? `<a href="index.html?cat=${category.id}">${category.name}</a> › ` : ""}
    ${recipe.title}`;
  document.getElementById("cover-image-wrap").innerHTML = recipe.cover_image_url
    ? `<img class="cover-image" src="${recipe.cover_image_url}" alt="${recipe.title}">`
    : "";
  document.getElementById("recipe-title").innerHTML = recipe.title + (recipe.title_en ? `<span class="title-en-hero">${recipe.title_en}</span>` : "");
  document.getElementById("recipe-desc").textContent = recipe.short_description || "";
  document.getElementById("type-badge").innerHTML = recipe.is_sub_recipe
    ? `<span class="badge badge-sub">🧩 وصفة فرعية</span>`
    : `<span class="badge" style="background:var(--success-bg); color:var(--success-ink);">✅ منتج نهائي</span>`;

  const infoStrip = document.getElementById("info-strip");
  const infoItems = [];
  if (recipe.servings) infoItems.push(["الكمية الناتجة", recipe.servings]);
  if (recipe.total_time) infoItems.push(["وقت التحضير", recipe.total_time]);
  if (recipe.shelf_life_days) infoItems.push(["مدة الصلاحية", `${recipe.shelf_life_days} يوم`]);
  infoItems.push(["حرارة الثلاجة", recipe.fridge_temp || "—"]);
  infoItems.push(["حرارة الفريزر", recipe.freezer_temp || "—"]);
  if (recipe.cutting_size) infoItems.push(["مقاس التقطيع", recipe.cutting_size]);
  infoStrip.innerHTML = infoItems
    .map(([label, value]) => `<div class="info-item"><span class="label">${label}</span><span class="value">${value}</span></div>`)
    .join("");

  if (recipe.has_missing_data) {
    document.getElementById("missing-data-banner").style.display = "block";
  }

  // المكونات
  const ingList = document.getElementById("ingredients-list");
  if (recipeIngredients.length === 0) {
    ingList.innerHTML = `<li>لا توجد مكونات مسجلة بعد</li>`;
  } else {
    ingList.innerHTML = recipeIngredients
      .map((ri) => {
        const ing = ri.ingredients;
        const label = ing?.name_ar ? `${ing.name_ar} <span class="title-en">${ing.name}</span>` : (ing?.name || "—");
        return `<li><span>${ing?.icon ? `<span class="ing-icon">${ing.icon}</span>` : ""}${label}</span><span class="amt">${ri.amount || ""} ${ri.unit || ""}</span></li>`;
      })
      .join("");
  }

  // الوصفات الفرعية (Sub-recipes) التي تستخدمها هذه الوصفة
  const subPanel = document.getElementById("sub-recipe-panel");
  if (components.length > 0) {
    subPanel.style.display = "block";
    document.getElementById("sub-recipe-list").innerHTML = components
      .map(
        (c) =>
          `<div class="sub-recipe-note">تستخدم <a href="recipe.html?id=${c.component_recipe_id}">${c.recipes?.title || "وصفة فرعية"}</a> — ${c.amount || ""} ${c.unit || ""}</div>`
      )
      .join("");
  }

  // المنتجات النهائية التي تستخدم هذه الوصفة (ربط عكسي)
  const usedInPanel = document.getElementById("used-in-panel");
  if (usedInParents.length > 0) {
    usedInPanel.style.display = "block";
    document.getElementById("used-in-list").innerHTML = usedInParents
      .map(
        (u) => `<div class="sub-recipe-note">تُستخدم داخل <a href="recipe.html?id=${u.parent_recipe_id}">${u.recipes?.title || "منتج نهائي"}</a></div>`
      )
      .join("");
  }

  // مسببات الحساسية
  const allergenPanel = document.getElementById("allergen-panel");
  const uniqueContains = Array.from(new Map(containsAllergens.map((a) => [a.allergens?.name, a.allergens])).values()).filter(Boolean);
  const uniqueMayContain = Array.from(new Map(mayContain.map((a) => [a.allergens?.name, a.allergens])).values()).filter(Boolean);

  if (uniqueContains.length === 0 && uniqueMayContain.length === 0) {
    allergenPanel.innerHTML = `<h2>⚠️ مسببات الحساسية</h2><p style="color:var(--ink-soft);font-size:0.9rem;">لا توجد مسببات حساسية مسجلة</p>`;
  } else {
    let html = `<h2>⚠️ مسببات الحساسية</h2>`;
    if (uniqueContains.length > 0) {
      html += `<div style="font-size:0.85rem;color:var(--ink-soft);margin-bottom:8px;">يحتوي على:</div>
        <div class="allergen-tags">${uniqueContains.map((a) => `<span class="allergen-tag">${a.icon || ""} ${a.name_ar || a.name}</span>`).join("")}</div>`;
    }
    if (uniqueMayContain.length > 0) {
      html += `<div style="font-size:0.85rem;color:var(--ink-soft);margin:14px 0 8px;">قد يحتوي على آثار من:</div>
        <div class="allergen-tags">${uniqueMayContain.map((a) => `<span class="allergen-tag may-contain">${a.icon || ""} ${a.name_ar || a.name}</span>`).join("")}</div>`;
    }
    allergenPanel.innerHTML = html;
  }

  // الخطوات
  const stepsList = document.getElementById("steps-list");
  if (steps.length === 0) {
    stepsList.innerHTML = `<p style="color:var(--ink-soft);">لا توجد خطوات مسجلة بعد</p>`;
  } else {
    stepsList.innerHTML = steps
      .map((s) => {
        const specs = [];
        if (s.temperature) specs.push(`<span class="spec-pill">🌡 <b>${s.temperature}</b></span>`);
        if (s.duration) specs.push(`<span class="spec-pill">⏱ <b>${s.duration}</b></span>`);
        if (s.mixing_method) specs.push(`<span class="spec-pill">🥄 <b>${s.mixing_method}</b></span>`);
        return `
          <div class="step">
            <div class="step-header">
              <span class="step-num">${s.step_number}</span>
              <span class="step-title">${s.title || ""}</span>
            </div>
            <div class="step-body">
              <p>${s.instructions || ""}</p>
              ${specs.length ? `<div class="step-specs">${specs.join("")}</div>` : ""}
              ${s.quality_note ? `<div class="quality-note">✓ ${s.quality_note}</div>` : ""}
            </div>
          </div>`;
      })
      .join("");
  }

  // ملاحظات عامة
  const generalPanel = document.getElementById("general-notes-panel");
  if (recipe.general_quality_notes) {
    generalPanel.style.display = "block";
    document.getElementById("general-notes-text").textContent = recipe.general_quality_notes;
  }

  document.getElementById("print-link").href = `print.html?id=${recipe.id}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  const id = getRecipeIdFromUrl();
  if (!id) {
    document.getElementById("detail-content").innerHTML = `<div class="empty-state">الوصفة غير موجودة</div>`;
    return;
  }
  const data = await fetchFullRecipe(id);
  if (!data) {
    document.getElementById("detail-content").innerHTML = `<div class="empty-state">الوصفة غير موجودة</div>`;
    return;
  }
  renderRecipeDetail(data);
});
