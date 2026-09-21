// ============================================
// منطق الصفحة الرئيسية: التصنيفات + شبكة الوصفات + البحث
// ============================================

let allCategories = [];
let allRecipes = [];
let activeCategoryId = null;
let activeType = "all";
let recipeAllergenMap = {}; // recipe_id -> Set(allergen_id)
let excludedAllergens = new Set();

// صور احتياطية بدون حقوق ملكية (Unsplash License — استخدام تجاري حر) تُستخدم لحد ما ترفع صورة حقيقية
const FALLBACK_IMAGES = {
  cheese: "https://images.unsplash.com/photo-1754711596655-04ad921bd050?w=500&q=75&fm=jpg&fit=crop",
  cream: "https://images.unsplash.com/photo-1698688334089-c68105801d02?w=500&q=75&fm=jpg&fit=crop",
  cookie: "https://images.unsplash.com/photo-1697961533207-2c15cffdb4f1?w=500&q=75&fm=jpg&fit=crop",
  default: "https://images.unsplash.com/photo-1517427294546-5aa121f68e8a?w=500&q=75&fm=jpg&fit=crop",
};

function pickFallbackImage(recipe) {
  const text = ((recipe.title_en || "") + " " + (recipe.title || "")).toLowerCase();
  if (text.includes("cheese") || text.includes("جبن")) return FALLBACK_IMAGES.cheese;
  if (text.includes("tiramisu") || text.includes("cream") || text.includes("تيراميسو") || text.includes("كريمة")) return FALLBACK_IMAGES.cream;
  if (text.includes("cookie") || text.includes("كوكيز") || text.includes("بسكويت")) return FALLBACK_IMAGES.cookie;
  return FALLBACK_IMAGES.default;
}

async function loadHomeData() {
  const { data: categories, error: catErr } = await supabaseClient
    .from("categories")
    .select("*")
    .order("name");

  const { data: recipes, error: recErr } = await supabaseClient
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });

  if (catErr || recErr) {
    console.error(catErr || recErr);
    document.getElementById("recipe-grid").innerHTML =
      `<div class="empty-state">حصل خطأ في تحميل البيانات. تأكد إن بيانات الاتصال بـ Supabase مظبوطة في config.js</div>`;
    return;
  }

  allCategories = categories || [];
  allRecipes = recipes || [];

  renderCategoryChips();
  renderRecipes();
  renderFeatured();
  loadAllergenFilter();
}

async function renderFeatured() {
  const featured = allRecipes.filter((r) => r.is_featured);
  if (featured.length === 0) return;
  document.getElementById("featured-section").style.display = "block";
  document.getElementById("featured-grid").innerHTML = featured.map(cardHtmlGlobal).join("");
}

function cardHtmlGlobal(r) {
  const cat = allCategories.find((c) => c.id === r.category_id);
  const thumb = `<img src="${r.cover_image_url || pickFallbackImage(r)}" alt="${r.title}" loading="lazy">`;
  const missingBadge = r.has_missing_data ? `<span class="badge badge-warn">⚠ بيانات ناقصة<span class="label-en">Missing data</span></span>` : "";
  return `
    <a class="recipe-card" href="recipe.html?id=${r.id}">
      <div class="thumb">${thumb}</div>
      <div class="body">
        <div class="cat-label">${cat ? cat.name : ""}</div>
        <h3>${r.title}${r.title_en ? ` <span class="title-en">${r.title_en}</span>` : ""}</h3>
        <p>${r.short_description || ""}</p>
        <div class="meta-row">
          ${r.total_time ? `<span>⏱ ${r.total_time}</span>` : ""}
          ${missingBadge}
        </div>
      </div>
    </a>`;
}

async function loadAllergenFilter() {
  const { data: allergens } = await supabaseClient.from("allergens").select("*").order("name");
  const grid = document.getElementById("allergen-filter-grid");
  grid.innerHTML = (allergens || [])
    .map((a) => `<label><input type="checkbox" value="${a.id}" class="allergen-filter-cb"> ${a.icon || ""} ${a.name_ar || a.name}</label>`)
    .join("");

  // بناء خريطة: كل وصفة -> مجموعة مسببات الحساسية اللي فيها (من المكونات)
  const { data: recIngs } = await supabaseClient.from("recipe_ingredients").select("recipe_id, ingredient_id");
  const { data: ingAllergens } = await supabaseClient.from("ingredient_allergens").select("ingredient_id, allergen_id");
  const ingToAllergens = {};
  (ingAllergens || []).forEach((ia) => {
    if (!ingToAllergens[ia.ingredient_id]) ingToAllergens[ia.ingredient_id] = new Set();
    ingToAllergens[ia.ingredient_id].add(ia.allergen_id);
  });
  (recIngs || []).forEach((ri) => {
    if (!recipeAllergenMap[ri.recipe_id]) recipeAllergenMap[ri.recipe_id] = new Set();
    const set = ingToAllergens[ri.ingredient_id];
    if (set) set.forEach((a) => recipeAllergenMap[ri.recipe_id].add(a));
  });

  grid.querySelectorAll(".allergen-filter-cb").forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) excludedAllergens.add(cb.value);
      else excludedAllergens.delete(cb.value);
      renderRecipes();
    });
  });
}

function renderCategoryChips() {
  const row = document.getElementById("categories-row");
  const allChip = `<button class="chip ${activeCategoryId === null ? "active" : ""}" data-id="">كل الوصفات</button>`;
  const chips = allCategories
    .map(
      (c) =>
        `<button class="chip ${activeCategoryId === c.id ? "active" : ""}" data-id="${c.id}">${c.name}</button>`
    )
    .join("");
  row.innerHTML = allChip + chips;

  row.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCategoryId = chip.dataset.id || null;
      renderCategoryChips();
      renderRecipes();
    });
  });
}

function renderRecipes() {
  const grid = document.getElementById("recipe-grid");
  const searchTerm = (document.getElementById("search-input").value || "").trim().toLowerCase();

  let list = allRecipes;
  if (activeType === "final") list = list.filter((r) => !r.is_sub_recipe);
  if (activeType === "sub") list = list.filter((r) => r.is_sub_recipe);
  if (activeCategoryId) list = list.filter((r) => r.category_id === activeCategoryId);
  if (searchTerm) list = list.filter((r) => (r.title || "").toLowerCase().includes(searchTerm) || (r.title_en || "").toLowerCase().includes(searchTerm));
  if (excludedAllergens.size > 0) {
    list = list.filter((r) => {
      const set = recipeAllergenMap[r.id];
      if (!set) return true;
      for (const a of excludedAllergens) if (set.has(a)) return false;
      return true;
    });
  }

  const titleEl = document.getElementById("grid-title");
  const cat = allCategories.find((c) => c.id === activeCategoryId);
  const typeLabel = activeType === "final" ? "المنتجات النهائية" : activeType === "sub" ? "الوصفات الفرعية" : "كل الوصفات";
  titleEl.textContent = cat ? `${typeLabel} — ${cat.name}` : typeLabel;

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state">لا توجد وصفات في هذا القسم حتى الآن.</div>`;
    return;
  }

  function cardHtml(r) {
    const cat = allCategories.find((c) => c.id === r.category_id);
    const thumb = `<img src="${r.cover_image_url || pickFallbackImage(r)}" alt="${r.title}" loading="lazy">`;
    const missingBadge = r.has_missing_data ? `<span class="badge badge-warn">⚠ بيانات ناقصة<span class="label-en">Missing data</span></span>` : "";
    return `
      <a class="recipe-card" href="recipe.html?id=${r.id}">
        <div class="thumb">${thumb}</div>
        <div class="body">
          <div class="cat-label">${cat ? cat.name : ""}</div>
          <h3>${r.title}${r.title_en ? ` <span class="title-en">${r.title_en}</span>` : ""}</h3>
          <p>${r.short_description || ""}</p>
          <div class="meta-row">
            ${r.total_time ? `<span>⏱ ${r.total_time}</span>` : ""}
            ${missingBadge}
          </div>
        </div>
      </a>`;
  }

  // في وضع "الوصفات الفرعية" نقسّم حسب النوع (صوص / كريمة / عجينة...)
  if (activeType === "sub") {
    const groups = {};
    const order = ["صوص", "كريمة", "عجينة / قاعدة", "حشوة", "شراب"];
    list.forEach((r) => {
      const t = r.sub_recipe_type || "أخرى";
      if (!groups[t]) groups[t] = [];
      groups[t].push(r);
    });
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    grid.innerHTML = sortedKeys
      .map(
        (t) =>
          `<div class="subtype-heading">${t}</div>
           <div class="recipe-grid">${groups[t].map(cardHtml).join("")}</div>`
      )
      .join("");
    grid.className = "";
  } else {
    grid.className = "recipe-grid";
    grid.innerHTML = list.map(cardHtml).join("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadHomeData();
  document.getElementById("search-input").addEventListener("input", renderRecipes);
  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeType = btn.dataset.type;
      document.querySelectorAll(".type-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderRecipes();
    });
  });
});
