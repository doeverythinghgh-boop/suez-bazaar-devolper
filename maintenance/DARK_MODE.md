# دليل نظام الوضع الليلي (Dark Mode Architecture)

## نظرة عامة
يعتمد نظام الوضع الليلي في هذا المشروع على استراتيجية **CSS Variables** (متغيرات CSS) المربوطة بفئة (Class) `dark-theme` التي يتم إضافتها إلى عنصر `<body>`.

هذا النظام يضمن الأداء العالي، سهولة الصيانة، والتطبيق الفوري للتغييرات دون الحاجة لإعادة تحميل الصفحة.

---

## 1. البنية الأساسية (Core Architecture)

### 1.1 ملف المتغيرات (`style/variables.css`)
هذا هو "العقل المدبر" للألوان. يتم تعريف كل الألوان كمتغيرات في `:root` (للوضع الفاتح) وإعادة تعريفها داخل `body.dark-theme` (للوضع الليلي).

```css
:root {
    /* الوضع الفاتح */
    --bg-color-white: #ffffff;
    --text-color-dark: #333333;
    --primary-color: #667eea;
}

body.dark-theme {
    /* الوضع الليلي */
    --bg-color-white: #1e1e1e;
    --text-color-dark: #ffffff;
    --primary-color: #7688eb; /* تفتيح بسيط لراحة العين */
}
```

### 1.2 الاستخدام في الملفات
يمنع منعاً باتاً استخدام أكواد الألوان Hex (مثل `#ffffff`) أو الأسماء (مثل `white`) مباشرة في ملفات CSS. بدلاً من ذلك، نستخدم:
```css
.card {
    background-color: var(--bg-color-white); /* يتغير تلقائياً */
    color: var(--text-color-dark);
}
```

---

## 2. التنفيذ البرمجي (JavaScript Implementation)

### 2.1 حفظ التفضيلات (`localStorage`)
يتم تخزين تفضيل المستخدم في `localStorage` تحت مفتاح `theme`. القيم المحتملة: `dark` أو `light`.

### 2.2 التهيئة عند البدء (`js/user-dashboard.js` & `index.html`)
عند تحميل التطبيق، يتم فحص `localStorage` وتطبيق الفئة فوراً لمنع الوميض (FOUC).

```javascript
/* مثال مبسط */
const isDark = localStorage.getItem('theme') === 'dark';
if (isDark) {
    document.body.classList.add('dark-theme');
}
```

### 2.3 تبديل الوضع (Toggle)
الزر المسؤول عن التبديل يقوم بـ:
1. عكس الحالة الحالية.
2. تحديث `document.body.classList`.
3. حفظ القيمة الجديدة في `localStorage`.

---

## 3. التعامل مع المكونات الخاصة

### 3.1 النوافذ المنبثقة (SweetAlert2)
مكتبة SweetAlert2 تقوم بإنشاء عناصر DOM خارج نطاق التطبيق العادي. ولحل مشكلة الألوان الثابتة فيها، قمنا بالتالي:

1. **إلغاء الأنماط الافتراضية:** تم تعديل ملف `style/index.css` و `style/modals-and-dialogs.css` لإجبار النوافذ على استخدام متغيراتنا.
2. **فئات مخصصة:** تم إنشاء فئة `.modern-swal-popup` لفرض الخلفية `var(--bg-color-white)` والنصوص `var(--text-color-medium)`.

### 3.2 نظام الخطوات (Stepper)
الـ Stepper يعمل أحياناً داخل `iframe` (ملف `stepper-only.html`).
* **التحدي:** الـ iframe صفحة منفصلة لا ترث كلاسات الصفحة الأب.
* **الحل:**
    1. تم إنشاء `steper/css/variables.css` خاص به يحتوي على تعريفات `body.dark-theme`.
    2. تم تحديث `steper/css/components.css` لاستخدام هذه المتغيرات.
    3. ملف `stepper-only.html` يحتوي على سكربت يستمع لتغيرات `localStorage` ويطبق الـ theme تلقائياً عند التحميل أو عند تغيره في الصفحة الرئيسية.

### 3.3 العناصر المولدة ديناميكياً (Inline Styles)
واجهنا مشكلة في الجافا سكربت التي تولد HTML يحتوي على `style="background: white;"`.
* **الحل:** تم استبدال `style="..."` بفئات CSS ذات دلالة (Semantic Classes).
    * _مثال:_ بدلاً من `style="background: #d4edda; color: #155724;"`
    * _أصبح:_ `class="stepper-list-item-success"`
    * وتم تعريف هذه الفئة في CSS لتدعم الوضعين.

---

## 4. قائمة التحقق للمطورين (Checklist)

عند إضافة ميزة جديدة أو صفحة جديدة، التزم بالتالي:

1. **لا تستخدم ألوان ثابتة:** استخدم دائماً `var(--variable-name)`.
2. **لا تستعمل Inline Styles للألوان:** تجنب `div.style.background = 'red'`. استخدم `classList.add`.
3. **تحقق من التباين:** تأكد أن النص مقروء في كلا الوضعين.
4. **SweetAlert2:** لا تضع ألواناً في خاصية `html` داخل `Swal.fire`. استخدم `customClass`.

---

## 5. ملفات هامة للمراجعة
* `style/variables.css`: القاموس الرئيسي للألوان.
* `style/modals-and-dialogs.css`: تنسيقات النوافذ المنبثقة.
* `steper/css/variables.css`: متغيرات خاصة بنظام الخطوات.
* `js/user-dashboard.js`: منطق زر التحويل.
