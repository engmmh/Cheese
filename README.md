# دفتر الوصفات — دليل الربط والتشغيل

## الخطوة 1: ربط الموقع بـ Supabase

1. روح على مشروعك في supabase.com → **Project Settings → API**
2. انسخ قيمتين:
   - **Project URL**
   - **anon public key**
3. افتح ملف `assets/js/config.js` وحط القيم دي مكان:
   ```
   const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
   const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";
   ```

## الخطوة 2: عمل حساب الأدمن

روح على **Authentication → Users** في Supabase → **Add User** → حط إيميل وباسورد بتاعك. ده الحساب اللي هتدخل بيه لوحة التحكم.

## الخطوة 3: رفع الموقع على GitHub

```bash
git init
git add .
git commit -m "أول نسخة من الموقع"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```

## الخطوة 4: تفعيل GitHub Pages (استضافة مجانية)

1. روح على صفحة الـ repo على GitHub → **Settings → Pages**
2. تحت **Source** اختار branch: `main` وفولدر `/ (root)`
3. احفظ، وهياخد دقيقة أو اتنين، وهيديك رابط زي:
   `https://USERNAME.github.io/REPO_NAME/`

الموقع هيبقى شغال لايف على الرابط ده، ومربوط مباشرة بقاعدة بيانات Supabase بتاعتك.

## أي تعديل بعد كده

- تعدل الوصفات من لوحة التحكم مباشرة (`/admin`) — مش محتاج تلمس الكود.
- لو عايز تغير التصميم أو تضيف صفحة، تعدل الملفات وتعمل:
  ```bash
  git add .
  git commit -m "تعديل"
  git push
  ```
  والموقع هيتحدث تلقائي على GitHub Pages خلال دقيقة.

## هيكل الملفات

```
index.html              → الصفحة الرئيسية (تصنيفات + شبكة وصفات + بحث)
recipe.html              → صفحة تفاصيل الوصفة
print.html                → طباعة الوصفة بشكل ورقة A4
admin/login.html          → دخول لوحة التحكم
admin/index.html          → الداشبورد (كل الوصفات + التصنيفات)
admin/recipe-form.html    → إضافة/تعديل وصفة
admin/ingredients.html    → إدارة المكونات ومسببات الحساسية
assets/css/style.css      → التصميم
assets/js/config.js       → بيانات الاتصال بـ Supabase (المكان الوحيد اللي هتعدل فيه بيانات حساسة)
```
