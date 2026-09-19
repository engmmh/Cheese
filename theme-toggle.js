// ============================================
// الوضع الليلي المشترك بين كل صفحات الموقع
// ============================================
(function () {
  const saved = localStorage.getItem("site-theme");
  if (saved === "dark") document.documentElement.setAttribute("data-theme", "dark");

  function injectToggle() {
    const btn = document.createElement("button");
    btn.id = "theme-toggle-btn";
    btn.className = "theme-toggle-btn";
    btn.innerHTML = document.documentElement.getAttribute("data-theme") === "dark" ? "☀️" : "🌙";
    btn.setAttribute("aria-label", "تبديل الوضع الليلي / Toggle dark mode");
    btn.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (isDark) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("site-theme", "light");
        btn.innerHTML = "🌙";
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("site-theme", "dark");
        btn.innerHTML = "☀️";
      }
    });
    const headerLinks = document.querySelector(".header-links");
    if (headerLinks) headerLinks.prepend(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectToggle);
  } else {
    injectToggle();
  }
})();
