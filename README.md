# منصتك التعليمية

منصة تعليمية عربية RTL مبنية على HTML/CSS/JavaScript ES Modules وFirebase Authentication/Firestore.

## المكونات
- Firebase Authentication
- Firestore + Security Rules
- Firebase Cloud Functions
- YouTube للفيديو
- Google Drive للكتب والملفات الخارجية
- ImgBB للصور فقط عبر Secure Proxy
- GitHub Pages للواجهة

## تشغيل الواجهة
يمكن رفع جذر المشروع إلى GitHub Pages. جميع المسارات نسبية.

## إعداد Firebase
1. افتح مشروع `mr-omar-new`.
2. فعّل Authentication → Email/Password للمشرفين.
3. أنشئ Firestore.
4. انشر Rules: `firebase deploy --only firestore:rules`.
5. من مجلد `functions` نفذ `npm install` ثم `npm run build`.
6. انشر Functions: `firebase deploy --only functions`.

## أول Super Admin
أنشئ مستخدمًا من Firebase Authentication ثم أنشئ:
`users/{AUTH_UID}`
```json
{
  "role": "super_admin",
  "displayName": "Mohamed",
  "status": "active",
  "permissions": {}
}
```
لا تخزن كلمة المرور في Firestore أو GitHub.

## تسجيل الطالب
الطالب يرسل طلبه من الصفحة الرئيسية. الطلب يمر عبر `submitRegistrationRequest` التي تتحقق من الاسم والهاتف والصف وتمنع تكرار الهاتف server-side.

## حساب ينشئه المشرف ببيانات ناقصة
هذا مسموح عمدًا داخل لوحة الإدارة فقط.
- المشرف يحدد كود الدخول ويمكنه ترك الاسم أو الهاتف أو الصف ناقصًا.
- الطالب يسجل بالكود.
- `studentLogin` ينشئ/يربط حساب Firebase Auth.
- قبل عرض المحتوى، `dashboard.html` يجبر الطالب على استكمال كل البيانات الناقصة.
- `completeStudentProfile` يتحقق server-side أن الحقول التي يملؤها كانت ناقصة أصلًا، ثم يزامن `students` و`users`.
- بعد الاكتمال فقط يستطيع الطالب الوصول إلى المحتوى المرتبط بصفه.

## المناقشات
- الطالب ينشئ السؤال من الواجهة مع Security Rules.
- المشرف يرد عبر `createDiscussionReply`.
- تثبيت الإجابة الرسمية يتم عبر `setOfficialReply`.
- الطالب لا يستطيع تزوير `authorRole` أو `isInstructorReply` أو `isPinned`.

## الامتحانات
- بيانات الامتحان العامة في `exams`.
- الأسئلة في `questions`.
- `correctAnswer` ممنوع على الطالب عبر Rules.
- `getExamQuestions` يعيد نسخة بدون الإجابة الصحيحة.
- `submitExam` يحسب الدرجة server-side ويمنع تكرار النتيجة.

## ImgBB
لا تضع مفتاح ImgBB في GitHub.
1. انشر `image-proxy-worker.js` كـ Cloudflare Worker.
2. أضف Secret باسم `IMGBB_API_KEY` داخل Worker.
3. ضع رابط Worker في `js/config.js` في `imageProxyUrl`.

## GitHub Pages
Settings → Pages → Deploy from branch → اختر branch والمجلد الجذر.

## اختبار أمني أساسي
- الطالب لا يدخل Admin.
- الطالب لا يرى بيانات الطلاب الآخرين.
- الطالب لا يغير role/studentId.
- الطالب لا ينشئ رد مشرف.
- الطالب لا يحصل على correctAnswer.
- المساعد لا يستخدم قسمًا غير موجود في permissions.
- Firestore Rules تمنع العمليات المباشرة غير المصرح بها.
- طلب التسجيل العام لا يكتب Firestore مباشرة.
