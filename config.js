// ============================================
// إعدادات الاتصال بـ Supabase
// هتلاقي القيم دي في Supabase Dashboard > Project Settings > API
// ============================================
const SUPABASE_URL = "https://guorxzejmtvypiwxrogf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1b3J4emVqbXR2eXBpd3hyb2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3MzI2NjksImV4cCI6MjEwNTMwODY2OX0.o95p3N83NLU8ZKZG5LtwS95iR1W3eN03qixqjsnWk_8";

// اسم الموقع (تقدر تغيره)
const SITE_NAME = "دفتر الوصفات";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
