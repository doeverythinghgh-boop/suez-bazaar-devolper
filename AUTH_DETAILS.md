# توثيق نظام المصادقة وإدارة الجلسات (Centralized Auth & Session System)

يغطي هذا المستند البنية التحتية الجديدة لنظام المصادقة في المشروع، والتي تعتمد على المركزية، الموديولية (Modularity)، وفصل المهام (Separation of Concerns).

---

## 1. البنية التحتية والوحدات المركزية (`js/auth/`)

تم نقل المنطق المشتت سابقاً إلى ثلاث وحدات أساسية تعمل معاً:

### أ. مدير الجلسة (`sessionManager.js`)
هو "مصدر الحقيقة" الوحيد والمتحكم في حالة المستخدم.
*   **الحالة (State)**: يدير `window.userSession` تلقائياً ويضمن مزامنتها مع `localStorage`.
*   **الوظائف الرئيسية**:
    *   `init()`: تُستدعى عند بدء التطبيق (`index.js`) قراءة الجلسة، تحديث الواجهة، وتهيئة الإشعارات.
    *   `login(user, redirect)`: معالجة الدخول الناجح، حفظ البيانات، تفعيل FCM، والتوجيه التلقائي.
    *   `logout()`: عملية خروج آمنة شاملة (مسح localStorage، IndexedDB، إعلام تطبيق Android، وتفريغ الحاويات).
    *   `updateUser(updates)`: تحديث بيانات الجلسة الحالية ومزامنة الاسم في الهيدر فوراً.
    *   **انتحال الشخصية (Impersonation)**:
        *   `impersonate(targetUser)`: تبديل الهوية مع حفظ جلسة المسؤول الأصلية.
        *   `isImpersonating()`: التحقق من وضع التصفح بصلاحيات مستخدم آخر.

### ب. المدقق الموحد (`validators.js` - `AuthValidators`)
يحتوي على كافة قواعد التحقق من المدخلات لضمان اتساق البيانات.
*   `validatePhone(phone)`: التحقق من طول وصيغة رقم الهاتف وتطبيعه (Normalization).
*   `validatePassword(pass)`: حد أدنى 4 أحرف.
*   `validateUsername(name)`: اسم حقيقي (8-30 حرف).
*   `normalizePhone(phone)`: تحويل الأرقام (٠-٩) وحذف الرموز غير الرقمية.

### ج. مساعد الواجهة (`uiHelpers.js` - `AuthUI`)
يوفر طبقة تجريد (Abstraction) لمكتبة `SweetAlert2` لتسهيل الاستخدام وتوحيد المظهر.
*   `showLoading(msg)` / `close()`: إدارة شاشات التحميل.
*   `showError`, `showSuccess`: عرض التنبيهات.
*   `confirmPassword()`: نافذة منبثقة تطلب كلمة المرور للتحقق قبل الإجراءات الحساسة.
*   `showFieldValidationMsg()`: إظهار رسائل الخطأ أسفل حقول الإدخال مباشرة.

---

## 2. تدفق العمليات (Workflows)

### أ. تسجيل الدخول (`pages/login/login.js`)
1.  التحقق من المدخلات عبر `AuthValidators`.
2.  استدعاء API `verifyUserPassword`.
3.  عند النجاح، استدعاء `SessionManager.login(userData)` الذي يتولى كل شيء (الحفظ، الإشعارات، التوجيه).
4.  الدخول كضيف يستخدم نفس مسار `login` مع كائن "Guest".

### ب. إنشاء حساب (`pages/register/register.js`)
1.  تدقيق البيانات عبر `AuthValidators`.
2.  تأكيد كلمة المرور عبر نافذة من `AuthUI`.
3.  استدعاء API `addUser`.
4.  عند النجاح، استدعاء `SessionManager.login` لإتمام الدخول للمستخدم الجديد.

### ج. الملف الشخصي (`pages/profile-modal/profile-modal.js`)
1.  تدقيق التعديلات عبر `AuthValidators`.
2.  إذا تم تغيير كلمة المرور أو حقول حساسة، يُطلب التأكيد عبر `AuthUI.confirmPassword`.
3.  استدعاء API `updateUser`.
4.  تحديث الجلسة والواجهة فوراً عبر `SessionManager.updateUser`.
5.  الحذف يتطلب تأكيداً نهائياً بكلمة المرور ثم استدعاء `SessionManager.logout`.

### د. لوحة التحكم (`js/user-dashboard.js`)
*   تعتمد كلياً على `SessionManager` للتحقق من الأدوار (Guest vs. Real User).
*   تستخدم `SessionManager.isImpersonating()` لعرض علامة "وضع المسؤول" المائية (Watermark).

---

## 3. التوافقية والأمان
*   **التوافقية (Backward Compatibility)**: يظل `window.userSession` متاحاً عالمياً لضمان عدم تعطل الأجزاء القديمة من الكود، ولكن يمنع تعديله يدوياً؛ يجب استخدام `SessionManager`.
*   **الأمان**: يتم التحقق من كلمة المرور (Re-authentication) قبل:
    *   حفظ تغييرات الملف الشخصي (إذا وجدت كلمة مرور).
    *   حذف الحساب.
    *   بدء عملية انتحال الشخصية.
*   **تعدد المنصات**: منطق الخروج (`logout`) مدمج فيه استدعاءات `window.Android` لضمان مزامنة حالة الخروج مع تطبيق الأندرويد.
