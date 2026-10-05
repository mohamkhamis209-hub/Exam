export const $ = (s, root=document) => root.querySelector(s);
export const $$ = (s, root=document) => [...root.querySelectorAll(s)];
export const esc = (value="") => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
export const uid = () => crypto.randomUUID();
export const nowMs = () => Date.now();
export const formatDate = (ts) => {
  const d = ts?.toDate ? ts.toDate() : new Date(ts || Date.now());
  return new Intl.DateTimeFormat("ar-EG",{dateStyle:"medium",timeStyle:"short"}).format(d);
};
export const debounce = (fn, wait=300) => {
  let t; return (...args)=>{clearTimeout(t); t=setTimeout(()=>fn(...args),wait)};
};
export function toast(message,type="info"){
  const host=$(".toast-host") || (()=>{const x=document.createElement("div");x.className="toast-host";document.body.append(x);return x})();
  const el=document.createElement("div"); el.className=`toast ${type}`; el.textContent=message; host.append(el);
  setTimeout(()=>el.remove(),3500);
}
export function setBusy(button,busy,label="جارٍ التنفيذ..."){
  if(!button)return; button.disabled=busy; button.dataset.original=button.dataset.original||button.textContent; button.textContent=busy?label:button.dataset.original;
}
export function modal(title, bodyHtml, actionsHtml=""){
  const wrap=document.createElement("div"); wrap.className="modal-backdrop";
  wrap.innerHTML=`<div class="modal" role="dialog" aria-modal="true"><button class="modal-close" aria-label="إغلاق">×</button><h2>${esc(title)}</h2><div class="modal-body">${bodyHtml}</div><div class="modal-actions">${actionsHtml}</div></div>`;
  document.body.append(wrap); wrap.querySelector(".modal-close").onclick=()=>wrap.remove();
  wrap.addEventListener("click",e=>{if(e.target===wrap)wrap.remove()}); return wrap;
}
export function confirmDialog(message){
  return new Promise(resolve=>{
    const m=modal("تأكيد",`<p>${esc(message)}</p>`,`<button class="btn danger" data-ok>تأكيد</button><button class="btn ghost" data-cancel>إلغاء</button>`);
    m.querySelector("[data-ok]").onclick=()=>{m.remove();resolve(true)};m.querySelector("[data-cancel]").onclick=()=>{m.remove();resolve(false)};
  });
}
export function getYouTubeId(input=""){
  try{
    const u=new URL(input.trim());
    if(u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0];
    if(u.searchParams.get("v")) return u.searchParams.get("v");
    const m=u.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/); return m?.[1]||"";
  }catch{return ""}
}
export function youtubeEmbed(id){ return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1` : ""; }
export function whatsapp(message){ location.href=`https://wa.me/${"201033459821"}?text=${encodeURIComponent(message)}`; }
export function normalizePhone(phone=""){
  let x=String(phone).replace(/[^\d+]/g,"");
  if(x.startsWith("00")) x="+"+x.slice(2);
  if(x.startsWith("01") && x.length===11) x="+20"+x.slice(1);
  if(x.startsWith("20") && !x.startsWith("+")) x="+"+x;
  return x;
}
export function normalizeCode(c=""){return c.trim().toUpperCase().replace(/\s+/g,"");}
export function friendlyError(e){
  const map={
    "permission-denied":"ليس لديك صلاحية لتنفيذ هذه العملية.",
    "unauthenticated":"يجب تسجيل الدخول أولًا.",
    "not-found":"العنصر المطلوب غير موجود.",
    "already-exists":"هذا العنصر موجود بالفعل.",
    "unavailable":"الخدمة غير متاحة مؤقتًا. حاول مرة أخرى.",
    "auth/invalid-credential":"بيانات الدخول غير صحيحة.",
    "auth/too-many-requests":"محاولات كثيرة. انتظر قليلًا ثم حاول.",
    "auth/user-disabled":"هذا الحساب معطل.",
    "auth/email-already-in-use":"هذا البريد مستخدم بالفعل.",
    "auth/weak-password":"كلمة المرور ضعيفة."
  };
  return map[e?.code] || e?.message || "حدث خطأ غير متوقع.";
}
