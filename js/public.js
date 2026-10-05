import { $, modal, toast, setBusy, whatsapp } from "./utils/helpers.js";
import { createRegistrationRequest } from "./services/studentService.js";
import { listCollection } from "./services/courseService.js";

document.addEventListener("DOMContentLoaded",()=>{
  $("#request-btn")?.addEventListener("click",()=>{
    const m=modal("إنشاء حساب وطلب اعتماد",`
      <form id="request-form" class="form-grid">
        <label>الاسم الكامل<input name="name" required maxlength="120"></label>
        <label>رقم الهاتف<input name="phone" inputmode="tel" required></label>
        <label>الصف<select name="classId" id="request-class" required><option value="">جارٍ التحميل...</option></select></label>
        <button class="btn primary" type="submit">إرسال الطلب</button>
      </form>`);
    listCollection("classes",{field:"status",value:"active"}).then(xs=>{
      $("#request-class",m).innerHTML=`<option value="">اختر الصف</option>`+xs.map(x=>`<option value="${x.id}">${x.name}</option>`).join("");
    }).catch(()=>toast("تعذر تحميل الصفوف","error"));
    $("#request-form",m).addEventListener("submit",async e=>{
      e.preventDefault(); const b=e.submitter;setBusy(b,true);
      try{const f=new FormData(e.target), cls=$("#request-class",m).selectedOptions[0];await createRegistrationRequest({name:f.get("name"),phone:f.get("phone"),classId:f.get("classId"),className:cls.textContent});m.remove();toast("تم إرسال طلبك إلى المشرف. انتظر اعتماد الحساب للحصول على كود الدخول.","success")}catch(err){toast(err.message,"error")}finally{setBusy(b,false)}
    });
  });
  $("#student-login")?.addEventListener("click",()=>location.href="student/index.html");
  $("#admin-login")?.addEventListener("click",()=>location.href="admin/index.html");
  $("#whatsapp")?.addEventListener("click",()=>whatsapp("مرحبًا، لدي سؤال بخصوص المنصة التعليمية."));
});
