import { normalizePhone, normalizeCode } from "./helpers.js";
export function required(v,label){if(!String(v||"").trim())throw new Error(`${label} مطلوب.`);return String(v).trim()}
export function validatePhone(v){const p=normalizePhone(v);if(!/^\+20\d{10}$/.test(p))throw new Error("أدخل رقم هاتف مصري صحيح.");return p}
export function validateImage(file,maxBytes,types){
  if(!file) throw new Error("اختر صورة.");
  if(!types.includes(file.type)) throw new Error("نوع الصورة غير مسموح.");
  if(file.size>maxBytes) throw new Error("حجم الصورة أكبر من الحد المسموح.");
}
export function validateCode(v){const c=normalizeCode(v);if(!/^[A-Z0-9-]{6,32}$/.test(c))throw new Error("كود الدخول غير صالح.");return c}
export function validateYouTubeId(id){if(!/^[A-Za-z0-9_-]{6,20}$/.test(id))throw new Error("رابط YouTube غير صالح.");return id}
export function cleanText(v,max=5000){const x=String(v||"").trim();if(x.length>max)throw new Error("النص أطول من المسموح.");return x}
