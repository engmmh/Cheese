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
    .select("amount, unit, ingredients(id, name, name_ar, icon, unit_cost, cost_unit)")
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

let currentRecipeIngredients = [];
let currentRecipeSteps = [];

function renderRecipeDetail(data) {
  const { recipe, category, recipeIngredients, steps, components, usedInParents, mayContain, containsAllergens } = data;
  currentRecipeIngredients = recipeIngredients;
  currentRecipeSteps = steps;

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
    ? `<span class="badge badge-sub">🧩 وصفة فرعية<span class="label-en">Sub-recipe</span></span>`
    : `<span class="badge" style="background:var(--success-bg); color:var(--success-ink);">✅ منتج نهائي<span class="label-en">Final Product</span></span>`;

  const infoStrip = document.getElementById("info-strip");
  const infoItems = [];
  if (recipe.servings) infoItems.push(["الكمية الناتجة<span class="label-en">Yield</span>", recipe.servings]);
  if (recipe.total_time) infoItems.push(["وقت التحضير<span class="label-en">Time</span>", recipe.total_time]);
  if (recipe.shelf_life_days) infoItems.push(["مدة الصلاحية<span class="label-en">Shelf life</span>", `${recipe.shelf_life_days} يوم / days`]);
  infoItems.push(["حرارة الثلاجة<span class="label-en">Fridge</span>", recipe.fridge_temp || "—"]);
  infoItems.push(["حرارة الفريزر<span class="label-en">Freezer</span>", recipe.freezer_temp || "—"]);
  if (recipe.cutting_size) infoItems.push(["مقاس التقطيع<span class="label-en">Cut size</span>", recipe.cutting_size]);
  infoStrip.innerHTML = infoItems
    .map(([label, value]) => `<div class="info-item"><span class="label">${label}</span><span class="value">${value}</span></div>`)
    .join("");

  if (recipe.has_missing_data) {
    document.getElementById("missing-data-banner").style.display = "block";
  }

  // المكونات
  const ingList = document.getElementById("ingredients-list");
  if (recipeIngredients.length === 0) {
    ingList.innerHTML = `<li>لا توجد مكونات مسجلة بعد <span class="label-en">No ingredients yet</span></li>`;
  } else {
    ingList.innerHTML = recipeIngredients
      .map((ri) => {
        const ing = ri.ingredients;
        const label = ing?.name_ar ? `${ing.name_ar} <span class="title-en">${ing.name}</span>` : (ing?.name || "—"); // already bilingual
        return `<li><span>${ing?.icon ? `<span class="ing-icon">${ing.icon}</span>` : ""}${label}</span><span class="amt" data-amount="${ri.amount || ""}" data-unit="${ri.unit || ""}">${ri.amount || ""} ${ri.unit || ""}</span></li>`;
      })
      .join("");
  }

  // الوصفات الفرعية (Sub-recipes) التي تستخدمها هذه الوصفة + المنتجات التي تستخدمها
  const subPanel = document.getElementById("sub-recipe-panel");
  const usedInPanel = document.getElementById("used-in-panel");

  if (components.length > 0) {
    document.getElementById("relations-panel").style.display = "block";
    subPanel.style.display = "block";
    document.getElementById("sub-recipe-list").innerHTML = components
      .map(
        (c) =>
          `<div class="sub-recipe-note">تستخدم <a href="recipe.html?id=${c.component_recipe_id}">${c.recipes?.title || "وصفة فرعية"}</a> — ${c.amount || ""} ${c.unit || ""}</div>`
      )
      .join("");
  }

  if (usedInParents.length > 0) {
    document.getElementById("relations-panel").style.display = "block";
    usedInPanel.style.display = "block";
    document.getElementById("used-in-list").innerHTML = usedInParents
      .map(
        (u) => `<div class="sub-recipe-note">تُستخدم داخل <a href="recipe.html?id=${u.parent_recipe_id}">${u.recipes?.title || "منتج نهائي"}</a></div>`
      )
      .join("");
  }

  if (components.length > 0 && usedInParents.length > 0) {
    document.getElementById("relations-divider").style.display = "block";
  }


  // مسببات الحساسية
  const allergenPanel = document.getElementById("allergen-panel");
  const uniqueContains = Array.from(new Map(containsAllergens.map((a) => [a.allergens?.name, a.allergens])).values()).filter(Boolean);
  const uniqueMayContain = Array.from(new Map(mayContain.map((a) => [a.allergens?.name, a.allergens])).values()).filter(Boolean);

  if (uniqueContains.length === 0 && uniqueMayContain.length === 0) {
    allergenPanel.innerHTML = `<h2>مسببات الحساسية<span class="label-en">Allergens</span></h2><p style="color:var(--ink-soft);font-size:0.9rem;">لا توجد مسببات حساسية مسجلة <span class="label-en">None recorded</span></p>`;
  } else {
    let html = `<h2>مسببات الحساسية</h2>`;
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
    stepsList.innerHTML = `<p style="color:var(--ink-soft);">لا توجد خطوات مسجلة بعد <span class="label-en">No steps yet</span></p>`;
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

  renderCost(recipeIngredients);
  renderQRCode();
}

function renderCost(recipeIngredients) {
  const panel = document.getElementById("cost-panel");
  let total = 0;
  let hasAnyCost = false;
  recipeIngredients.forEach((ri) => {
    const ing = ri.ingredients;
    if (!ing || ing.unit_cost == null || !ri.amount) return;
    let amountInCostUnit = parseFloat(ri.amount);
    const unit = (ri.unit || "").toLowerCase().trim();
    const costUnit = (ing.cost_unit || "g").toLowerCase().trim();
    // تحويل بسيط بين g/kg و ml/l لو الوحدتين متوافقتين
    if (unit === costUnit) {
      // نفس الوحدة، لا تحويل
    } else if (unit === "kg" && costUnit === "g") amountInCostUnit *= 1000;
    else if (unit === "g" && costUnit === "kg") amountInCostUnit /= 1000;
    else if (unit === "l" && costUnit === "ml") amountInCostUnit *= 1000;
    else if (unit === "ml" && costUnit === "l") amountInCostUnit /= 1000;
    else if (unit !== "" && costUnit !== "") return; // وحدات غير متوافقة، تجاهل هذا المكون من الحساب
    total += amountInCostUnit * parseFloat(ing.unit_cost);
    hasAnyCost = true;
  });
  if (!hasAnyCost) return;
  panel.style.display = "block";
  document.getElementById("cost-qr-divider").style.display = "block";
  document.getElementById("cost-value").innerHTML = `
    <div style="font-family:var(--font-display); font-size:1.6rem; font-weight:700; color:var(--accent);">${total.toFixed(2)} <span style="font-size:0.9rem; color:var(--ink-soft);">جنيه تقريبًا</span></div>
    <p style="font-size:0.78rem; color:var(--ink-soft); margin-top:8px;">تقدير تقريبي بناءً على أسعار المكونات المسجلة في لوحة التحكم، وقد لا يشمل كل المكونات.</p>
  `;
}

function renderQRCode() {
  const wrap = document.getElementById("qr-code-wrap");
  if (!wrap || typeof QRCode === "undefined") return;
  const canvas = document.createElement("canvas");
  wrap.innerHTML = "";
  wrap.appendChild(canvas);
  QRCode.toCanvas(canvas, window.location.href, { width: 160, margin: 1 }, (err) => {
    if (err) wrap.innerHTML = "";
  });
  const p = document.createElement("p");
  p.style.cssText = "font-size:0.78rem; color:var(--ink-soft); margin-top:8px;";
  p.innerHTML = "امسح الكود عشان توصل للوصفة فورًا<br><span class=\"label-en\">Scan for instant access</span>";
  wrap.appendChild(p);
}

function setupScaling() {
  const input = document.getElementById("scale-input");
  if (!input) return;
  input.addEventListener("input", () => {
    const factor = parseFloat(input.value) || 1;
    document.querySelectorAll("#ingredients-list .amt").forEach((el) => {
      const original = parseFloat(el.dataset.amount);
      const unit = el.dataset.unit || "";
      if (isNaN(original)) return;
      const scaled = (original * factor);
      const displayVal = Number.isInteger(scaled) ? scaled : scaled.toFixed(2);
      el.textContent = `${displayVal} ${unit}`;
    });
  });
}

function setupKitchenMode() {
  const btn = document.getElementById("kitchen-mode-btn");
  const overlay = document.getElementById("kitchen-mode-overlay");
  const closeBtn = document.getElementById("kitchen-close-btn");
  if (!btn || !overlay) return;

  btn.addEventListener("click", () => {
    document.getElementById("kitchen-title").textContent = document.getElementById("recipe-title").textContent;
    document.getElementById("kitchen-steps").innerHTML = currentRecipeSteps
      .map((s) => {
        const specs = [];
        if (s.temperature) specs.push(`🌡 ${s.temperature}`);
        if (s.duration) specs.push(`⏱ ${s.duration}`);
        if (s.mixing_method) specs.push(`🥄 ${s.mixing_method}`);
        return `
          <div class="kitchen-step">
            <div class="k-num">${s.step_number}. ${s.title || ""}</div>
            <div>${s.instructions || ""}</div>
            ${specs.length ? `<div class="k-specs">${specs.join(" &nbsp;•&nbsp; ")}</div>` : ""}
            ${s.quality_note ? `<div class="k-specs" style="color:var(--success-ink);">✓ ${s.quality_note}</div>` : ""}
          </div>`;
      })
      .join("");
    overlay.style.display = "block";
    document.body.style.overflow = "hidden";
  });

  closeBtn.addEventListener("click", () => {
    overlay.style.display = "none";
    document.body.style.overflow = "";
  });
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
  setupScaling();
  setupKitchenMode();
});
