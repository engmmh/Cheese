// ============================================
// منطق الصفحة الرئيسية: التصنيفات + شبكة الوصفات + البحث
// ============================================

let allCategories = [];
let allRecipes = [];
let activeCategoryId = null;

async function loadHomeData() {
  const { data: categories, error: catErr } = await supabaseClient
    .from("categories")
    .select("*")
    .order("name");

  const { data: recipes, error: recErr } = await supabaseClient
    .from("recipes")
    .select("*")
    .eq("is_sub_recipe", false)
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
  if (activeCategoryId) list = list.filter((r) => r.category_id === activeCategoryId);
  if (searchTerm) list = list.filter((r) => (r.title || "").toLowerCase().includes(searchTerm));

  const titleEl = document.getElementById("grid-title");
  const cat = allCategories.find((c) => c.id === activeCategoryId);
  titleEl.textContent = cat ? `وصفات ${cat.name}` : "كل الوصفات";

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state">لا توجد وصفات في هذا التصنيف حتى الآن.</div>`;
    return;
  }

  grid.innerHTML = list
    .map((r) => {
      const cat = allCategories.find((c) => c.id === r.category_id);
      const fallbackIcon = cat && cat.name && cat.name.includes("جبن") ? "🧀" : "🍰";
      const thumb = r.cover_image_url
        ? `<img src="${r.cover_image_url}" alt="${r.title}">`
        : `<span style="font-size:2.4rem; opacity:0.5;">${fallbackIcon}</span>`;
      const missingBadge = r.has_missing_data
        ? `<span class="badge badge-warn">⚠ بيانات ناقصة</span>`
        : "";
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
    })
    .join("");
}

document.addEventListener("DOMContentLoaded", () => {
  loadHomeData();
  document.getElementById("search-input").addEventListener("input", renderRecipes);
});
