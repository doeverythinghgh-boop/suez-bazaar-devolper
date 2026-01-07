# دليل تنسيقات وتطوير قسم الفئات (Categories Maintenance Guide) 📖🏗️⚖️

> **⚠️ تحذير هام للمطورين:**  
> **يجب إنشاء أي عنصر أو وسم جديد ليتناسب مع مختلف أنواع الشاشات باستخدام Media Queries المناسبة.**  
> **عدم الالتزام بهذا المبدأ سيؤدي إلى كسر التصميم المتجاوب وتجربة مستخدم سيئة.**

---

هذا الدليل يشرح البناء الهندسي والجمالي المنطقي لقسم الفئات بعد "الهجرة الكبرى للشبكة" والتحديثات الأخيرة.

---

## 📑 جدول المحتويات

1. [الهيكل الهيكلي (DOM Structure)](#1-الهيكل-الهيكلي-dom-structure)
2. [ميكانيكا الالتحام (Frame Fusion)](#2-ميكانيكا-الالتحام-frame-fusion-)
3. [ميكانيكا التموضع (Insertion Logic)](#3-ميكانيكا-التموضع-insertion-logic)
4. [التصميم المتجاوب (Responsive Design)](#4-التصميم-المتجاوب-responsive-design-)
5. [ثوابت التصميم (Design Tokens)](#5-ثوابت-التصميم-design-tokens)
6. [الفئات الفرعية (Subcategories)](#6-الفئات-الفرعية-subcategories)
7. [معرض المنتجات (Products Gallery)](#7-معرض-المنتجات-products-gallery)
8. [التفاعلات والرسوم المتحركة](#8-التفاعلات-والرسوم-المتحركة)
9. [قواعد الصيانة الحرجة](#9-قواعد-الصيانة-الحرجة-)
10. [الملفات ذات الصلة](#10-الملفات-ذات-الصلة)

---

## 1. الهيكل الهيكلي (DOM Structure)

### 1.1 الحاوية الرئيسية (Main Container)

```css
.categories_section_container {
    padding: 20px 0 40px 0;
    background-color: var(--bg-color-light);
    text-align: center;
}
```

**الوظيفة:** حاوية القسم الكامل مع padding علوي وسفلي للتباعد.

---

### 1.2 شبكة الفئات (Categories Grid)

```css
.categories_grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
    padding: 0 15px;
    max-width: 1200px;
    margin: 0 auto;
}
```

**التفاصيل:**
- **النظام:** CSS Grid
- **الأعمدة:** 4 أعمدة متساوية (يتغير حسب حجم الشاشة)
- **المسافات:** 15px بين العناصر
- **العرض الأقصى:** 1200px مع توسيط تلقائي
- **Padding الجانبي:** 15px لمنع الالتصاق بالحواف

**⚠️ ملاحظة هامة:** عند تغيير عدد الأعمدة، يجب تحديث:
1. قيمة `grid-template-columns` في CSS
2. متغير `columns` في `categories.js`
3. جميع Media Queries المتعلقة

---

### 1.3 عنصر الفئة (Category Item)

```css
.categories_grid_item {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: transform 0.2s ease;
    -webkit-tap-highlight-color: transparent;
    padding-bottom: 20px;        /* مهم للالتحام */
    position: relative;
    z-index: 1;
}
```

**الوظائف:**
- **Display:** Flexbox عمودي لترتيب الصورة فوق النص
- **Cursor:** يد للإشارة إلى قابلية النقر
- **Transition:** تأثير سلس عند التفاعل
- **Tap Highlight:** إزالة التظليل الافتراضي على الموبايل
- **Padding Bottom:** 20px **حرج جداً** - يوفر مساحة لجسر الالتحام
- **Z-index:** 1 للطبقات الأساسية

**تأثير النقر:**
```css
.categories_grid_item:active {
    transform: scale(0.95);
}
```
تصغير بنسبة 5% عند الضغط لردة فعل بصرية.

---

### 1.4 حاوية الوسائط (Media Container)

```css
.categories_cell_media {
    width: 120px;
    height: 120px;
    background-color: var(--bg-color-medium);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: all 0.3s ease;
    box-shadow: var(--shadow-soft);
}
```

**المواصفات:**
- **الحجم الافتراضي:** 120px × 120px (يتغير في Media Queries)
- **الخلفية:** رمادي فاتح كخلفية احتياطية
- **الحدود:** 1px صلبة
- **Border Radius:** 12px للزوايا الدائرية
- **Flexbox:** لتوسيط المحتوى (صورة أو أيقونة)
- **Overflow:** hidden لقص أي محتوى زائد
- **Shadow:** ظل ناعم للعمق البصري

**⚠️ تنبيه:** هذا الحجم يجب تحديثه في **جميع** Media Queries عند التغيير.

---

### 1.5 الصورة والأيقونة

#### الصورة:
```css
.categories_cell_content__image {
    width: 100%;
    height: 100%;
    object-fit: fill;
    display: block;
}
```

**الخصائص:**
- **الحجم:** 100% لملء الحاوية
- **Object Fit:** `fill` لملء المساحة كاملة (قد يحدث تشويه طفيف)
- **Display:** block لإزالة المسافة السفلية

#### الأيقونة:
```css
.categories_cell_content__icon {
    font-size: 2rem;        /* 32px */
    color: var(--primary-color);
}
```

**الاستخدام:** عند عدم وجود صورة، تظهر أيقونة FontAwesome.

---

### 1.6 حاوية المحتوى

```css
.categories_cell_content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}
```

**الوظيفة:** تجميع الوسائط والنص في حاوية واحدة.

---

### 1.7 نص الفئة

```css
.categories_cell_content__text {
    margin-top: 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--primary-color);
    text-align: center;
    word-wrap: break-word;
}
```

**المواصفات:**
- **المسافة العلوية:** 8px من الصورة/الأيقونة
- **الحجم:** 12px (مخفض من 14px للتوازن البصري)
- **الوزن:** 500 (متوسط)
- **اللون:** اللون الأساسي للتطبيق (أزرق)
- **Word Wrap:** كسر الكلمات الطويلة

**⚠️ ملاحظة:** حجم الخط يتغير في Media Queries للشاشات الصغيرة.

---

## 2. ميكانيكا الالتحام (Frame Fusion) 🧪

### 2.1 الحالة النشطة (Active State)

```css
.categories_grid_item--active {
    z-index: 50;
    position: relative;
    background-color: var(--bg-color-medium);
    border-radius: 12px 12px 0 0;
}
```

**التغييرات عند التفعيل:**
- **Z-index:** يرتفع إلى 50 ليكون فوق العناصر الأخرى
- **الخلفية:** رمادي فاتح للتمييز البصري
- **Border Radius:** الزوايا السفلية تصبح 0 للالتحام

---

### 2.2 تعديل الوسائط في الحالة النشطة

```css
.categories_grid_item--active .categories_cell_media {
    box-shadow: var(--shadow-focus);
    border-color: var(--border-color-active);
    border-bottom: none;                    /* حرج */
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    z-index: 60;
    background-color: var(--bg-color-medium);
}
```

**التفاصيل الحرجة:**
- **Border Bottom:** `none` - **حرج جداً** لإزالة الحد السفلي
- **Border Radius السفلي:** 0 لإنشاء حافة مستقيمة
- **Z-index:** 60 ليكون فوق الجسر (55)
- **Shadow:** ظل أقوى للتركيز

---

### 2.3 جسر الالتحام (Fusion Bridge)

```css
.categories_grid_item--active::after {
    content: "";
    position: absolute;
    bottom: -17px;
    left: 50%;
    transform: translateX(-50%);
    width: 82px;
    height: 37px;
    background-color: var(--bg-color-medium);
    border: none;
    z-index: 55;
    pointer-events: none;
}
```

**شرح مفصل للقيم:**

#### `bottom: -17px`
**الحساب:**
```
padding-bottom = 20px
grid-gap = 15px
المسافة الفعلية = 20 - 15 = 5px

للتداخل مع الحاوية السفلية:
5px (المسافة) + 15px (gap) - 2px (تداخل) = -17px
```

#### `height: 37px`
**الحساب:**
```
المسافة المطلوب تغطيتها = 35px
التداخل الإضافي = 2px
الإجمالي = 37px
```

#### `width: 82px`
**السبب:** عرض مناسب لإنشاء "عنق" الالتحام دون أن يكون واسعاً جداً.

#### `z-index: 55`
**الترتيب:**
- حاوية التفاصيل: 40
- العنصر النشط: 50
- الجسر: 55
- الوسائط: 60

#### `pointer-events: none`
**السبب:** منع الجسر من اعتراض أحداث الماوس/اللمس.

---

### 2.4 حاوية التفاصيل (Details Container)

```css
.categories_details_container {
    grid-column: 1 / -1;                    /* تشغل كل الأعمدة */
    background-color: var(--bg-color-light);
    border: 1px solid var(--border-color-active);
    border-radius: 12px;
    box-shadow: var(--shadow-focus);
    overflow: hidden;
    margin-top: -35px;                      /* حرج للالتحام */
    z-index: 40;
    display: flex;
    flex-direction: column;
}
```

**التفاصيل الحرجة:**

#### `grid-column: 1 / -1`
**الوظيفة:** تشغل جميع الأعمدة من البداية للنهاية (صف كامل).

#### `margin-top: -35px`
**الحساب:**
```
padding-bottom للعنصر = 20px
grid-gap = 15px
الإجمالي = 35px

السالب يسحب الحاوية للأعلى لإنشاء التحام صفري
```

**⚠️ تحذير:** هذه القيمة **يجب** أن تتطابق مع مجموع `padding-bottom` و `gap`.

---

## 3. ميكانيكا التموضع (Insertion Logic)

### 3.1 الدالة الرئيسية: `categories_toggleSubcategoriesGrid`

**الموقع:** `pages/categories/categories.js`

#### الخطوة 1: جمع جميع العناصر
```javascript
const allItems = Array.from(document.querySelectorAll('.categories_grid_item'));
```

#### الخطوة 2: تحديد موقع العنصر المنقور
```javascript
const clickedIndex = allItems.indexOf(clickedItem);
```

#### الخطوة 3: حساب نهاية الصف
```javascript
const columns = 4;  // يجب مطابقة CSS
const rowEndIndex = Math.floor(clickedIndex / columns) * columns + (columns - 1);
```

**مثال:**
- إذا نقرت على العنصر رقم 5 (الفهرس 4):
  ```
  Math.floor(4 / 4) = 1
  1 * 4 = 4
  4 + (4 - 1) = 7
  ```
  النتيجة: سيتم الإدراج بعد العنصر رقم 8 (الفهرس 7).

#### الخطوة 4: الإدراج
```javascript
const insertAfterElement = allItems[Math.min(rowEndIndex, allItems.length - 1)];
insertAfterElement.after(detailsContainer);
```

**الفائدة:** هذا يضمن أن الحاوية تظهر دائماً في نهاية الصف، مما يمنع تزحزح العناصر الأخرى.

---

## 4. التصميم المتجاوب (Responsive Design) 📱💻

> **⚠️ قاعدة ذهبية:**  
> **أي عنصر جديد يجب أن يحتوي على تعديلات في جميع Media Queries المناسبة.**

### 4.1 الشاشات الصغيرة جداً (< 480px)

```css
@media (max-width: 479px) {
    .categories_grid {
        grid-template-columns: repeat(3, 1fr);  /* 3 أعمدة */
        gap: 8px;
        padding: 0 10px;
    }

    .categories_cell_media {
        width: 85px;
        height: 85px;
    }

    .categories_cell_content__text {
        font-size: 11px;
    }

    .categories_cell_content__icon {
        font-size: 1.5rem;  /* 24px */
    }

    .categories_grid_item--active::after {
        width: 70px;
        height: 32px;
    }

    .categories_product_item__image {
        height: 100px;
    }

    .categories_product_item__name {
        font-size: 0.75rem;
    }
}
```

**الأجهزة المستهدفة:** هواتف صغيرة جداً (iPhone SE، هواتف قديمة)

**التغييرات الرئيسية:**
- تقليل عدد الأعمدة إلى 3
- تصغير الصور والنصوص
- تقليل المسافات لتوفير المساحة

---

### 4.2 الهواتف (480px - 767px)

```css
@media (min-width: 480px) and (max-width: 767px) {
    .categories_grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        padding: 0 12px;
    }

    .categories_cell_media {
        width: 95px;
        height: 95px;
    }

    .categories_cell_content__text {
        font-size: 11px;
    }

    .categories_grid_item--active::after {
        width: 75px;
        height: 35px;
    }

    .categories_product_item__image {
        height: 110px;
    }
}
```

**الأجهزة المستهدفة:** معظم الهواتف الذكية الحديثة

**التغييرات:**
- 4 أعمدة (العودة للتخطيط الأساسي)
- أحجام متوسطة للصور

---

### 4.3 التابلت (768px - 991px)

```css
@media (min-width: 768px) and (max-width: 991px) {
    .categories_grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
    }

    .categories_cell_media {
        width: 110px;
        height: 110px;
    }

    .categories_cell_content__text {
        font-size: 12px;
    }

    .categories_grid_item--active::after {
        width: 80px;
        height: 36px;
    }
}
```

**الأجهزة المستهدفة:** iPad، تابلت Android

**التغييرات:**
- زيادة تدريجية في الأحجام
- العودة لحجم النص الأساسي (12px)

---

### 4.4 الديسكتوب (992px - 1199px)

```css
@media (min-width: 992px) and (max-width: 1199px) {
    .categories_grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
    }

    .categories_cell_media {
        width: 115px;
        height: 115px;
    }
}
```

**الأجهزة المستهدفة:** شاشات لابتوب صغيرة ومتوسطة

---

### 4.5 الشاشات الكبيرة (≥ 1200px)

```css
@media (min-width: 1200px) {
    .categories_grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
    }

    .categories_cell_media {
        width: 120px;
        height: 120px;
    }
}
```

**الأجهزة المستهدفة:** شاشات ديسكتوب كبيرة، شاشات 4K

**ملاحظة:** هذه هي القيم الافتراضية (الأساسية).

---

## 5. ثوابت التصميم (Design Tokens)

### 5.1 الألوان (Colors)

```css
--bg-color-light      /* أبيض (#fff أو قريب منه) */
--bg-color-medium     /* رمادي فاتح (#f8f9fa أو مشابه) */
--primary-color       /* اللون الأساسي (أزرق) */
--text-color          /* لون النص الأساسي */
--border-color        /* لون الحدود العادية */
--border-color-active /* لون الحدود للعناصر النشطة */
```

**الاستخدامات:**
- `--bg-color-light`: خلفية الحاوية الرئيسية، المنتجات
- `--bg-color-medium`: خلفية العنصر النشط، الفئات الفرعية
- `--primary-color`: النصوص، الأيقونات
- `--border-color-active`: حدود العناصر النشطة

---

### 5.2 الظلال (Shadows)

```css
--shadow-soft         /* ظل ناعم للعناصر العادية */
--shadow-focus        /* ظل أقوى للعناصر النشطة */
```

**الاستخدامات:**
- `--shadow-soft`: الصور، الفئات الفرعية، المنتجات
- `--shadow-focus`: العنصر النشط، حاوية التفاصيل

---

### 5.3 الأحجام (Sizes)

#### الصور الرئيسية:
- **الافتراضي:** 120px × 120px
- **الشاشات الصغيرة جداً:** 85px
- **الهواتف:** 95px
- **التابلت:** 110px
- **الديسكتوب:** 115px
- **الشاشات الكبيرة:** 120px

#### النصوص:
- **الافتراضي:** 12px
- **الشاشات الصغيرة:** 11px
- **التابلت وأكبر:** 12px

#### الأيقونات:
- **الافتراضي:** 2rem (32px)
- **الشاشات الصغيرة:** 1.5rem (24px)

---

### 5.4 المسافات (Spacing)

```css
gap: 15px              /* المسافة بين العناصر (افتراضي) */
padding: 0 15px        /* Padding جانبي للشبكة */
padding-bottom: 20px   /* Padding سفلي للعنصر (حرج) */
margin-top: -35px      /* Margin سالب للحاوية (حرج) */
```

---

## 6. الفئات الفرعية (Subcategories)

### 6.1 الحاوية

```css
.categories_subcategories_container {
    display: grid;
    grid-auto-flow: column;
    overflow-x: auto;
    overflow-y: hidden;
    max-height: 250px;
    justify-content: flex-start;
    padding: 15px;
    gap: 12px;
    scrollbar-width: thin;
}
```

**الوظائف:**
- **Grid Auto Flow:** column - العناصر تصطف أفقياً
- **Overflow X:** auto - تمرير أفقي عند الحاجة
- **Max Height:** 250px لمنع الارتفاع الزائد

---

### 6.2 شريط التمرير المخصص

```css
.categories_subcategories_container::-webkit-scrollbar {
    height: 3px;
}

.categories_subcategories_container::-webkit-scrollbar-thumb {
    background-color: var(--primary-color);
    border-radius: 3px;
    opacity: 0.3;
}
```

**التصميم:** شريط تمرير رفيع وناعم.

---

### 6.3 عنصر الفئة الفرعية

```css
.categories_subcategory_item {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    background-color: var(--bg-color-medium);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 8px 16px;
    text-decoration: none;
    color: var(--primary-color);
    font-weight: 600;
    font-size: 0.85rem;
    white-space: nowrap;
    transition: all 0.3s ease;
    box-shadow: var(--shadow-soft);
}
```

**الشكل:** "Chip" أفقي مع أيقونة ونص.

---

### 6.4 الفئة الفرعية النشطة

```css
.categories_subcategory_item--active {
    border-color: var(--border-color-active);
    box-shadow: var(--shadow-focus);
    position: relative;
}

.categories_subcategory_item--active::after {
    content: "";
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid var(--border-color-active);
}
```

**التأثير:** سهم صغير يشير للأسفل تحت الفئة النشطة.

---

## 7. معرض المنتجات (Products Gallery)

### 7.1 الحاوية

```css
.categories_products_gallery_container {
    padding: 15px;
    max-height: 55vh;
    overflow-y: auto;
}

.categories_products_gallery_container.grid-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 12px;
}
```

**الوظائف:**
- **Max Height:** 55% من ارتفاع الشاشة
- **Overflow Y:** تمرير عمودي
- **Grid:** أعمدة تلقائية بحد أدنى 110px

---

### 7.2 عنصر المنتج

```css
.categories_product_item {
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: var(--bg-color-light);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 8px;
    cursor: pointer;
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: var(--shadow-soft);
    position: relative;
    overflow: hidden;
}

.categories_product_item:active {
    transform: scale(0.95);
}
```

---

### 7.3 صورة المنتج

```css
.categories_product_item__image {
    width: 100%;
    height: 120px;
    object-fit: contain;
    display: block;
    margin-bottom: 8px;
    background-color: #fff;
}
```

**الخصائص:**
- **Height:** 120px ثابت
- **Object Fit:** contain - الحفاظ على النسب دون قص
- **Background:** أبيض للتباين

---

### 7.4 اسم المنتج

```css
.categories_product_item__name {
    font-size: 0.85rem;
    color: var(--text-color);
    font-weight: 600;
    text-align: center;
    margin: 0;
    width: 100%;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.3;
}
```

**التقنية:** Line Clamp لعرض سطرين فقط مع نقاط (...) للنص الطويل.

---

## 8. التفاعلات والرسوم المتحركة

### 8.1 تأثير النقر (Active State)

```css
.categories_grid_item:active {
    transform: scale(0.95);
}

.categories_product_item:active {
    transform: scale(0.95);
}
```

**التأثير:** تصغير 5% عند الضغط.

---

### 8.2 الانتقالات (Transitions)

```css
transition: transform 0.2s ease;
transition: all 0.3s ease;
transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

**الأنواع:**
- **0.2s ease:** سريع وبسيط
- **0.3s ease:** متوسط
- **cubic-bezier:** تأثير "bounce" خفيف

---

### 8.3 رسوم متحركة مخصصة

```css
@keyframes categories_slide_fade_in {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

**الاستخدام:** ظهور تدريجي للعناصر من الأعلى.

---

## 9. قواعد الصيانة الحرجة ⚠️

### 9.1 عند تغيير عدد الأعمدة

**الخطوات الإلزامية:**

1. **تحديث CSS:**
   ```css
   .categories_grid {
       grid-template-columns: repeat(X, 1fr);
   }
   ```

2. **تحديث JavaScript:**
   ```javascript
   const columns = X;  // في categories.js
   ```

3. **تحديث جميع Media Queries:**
   - تحقق من كل `@media` وحدث `grid-template-columns`

4. **اختبار:**
   - اختبر على جميع أحجام الشاشات
   - تأكد من أن الحاوية تظهر في المكان الصحيح

---

### 9.2 عند تغيير أحجام الصور

**الخطوات:**

1. **تحديث الحجم الأساسي:**
   ```css
   .categories_cell_media {
       width: Xpx;
       height: Xpx;
   }
   ```

2. **تحديث جميع Media Queries:**
   - حافظ على النسب المئوية (مثلاً: الموبايل = 70% من الحجم الأساسي)

3. **تحديث الجسر (إذا لزم الأمر):**
   ```css
   .categories_grid_item--active::after {
       width: Ypx;  /* حسب الحاجة */
   }
   ```

4. **اختبار التوازن البصري:**
   - تأكد من أن النصوص والصور متوازنة

---

### 9.3 عند تعديل الالتحام

**القيم الحرجة المترابطة:**

```css
/* يجب أن تتطابق هذه القيم */
padding-bottom: 20px;           /* في .categories_grid_item */
gap: 15px;                      /* في .categories_grid */
margin-top: -35px;              /* في .categories_details_container */
                                /* الحساب: -(20 + 15) = -35 */

bottom: -17px;                  /* في ::after */
height: 37px;                   /* في ::after */
                                /* الحساب: 20 - 15 + 15 - 2 = -17 */
                                /* الحساب: 35 + 2 = 37 */
```

**⚠️ تحذير:** تغيير أي قيمة يتطلب إعادة حساب القيم الأخرى.

---

### 9.4 عند إضافة عنصر جديد

**القاعدة الذهبية:**

> **يجب إنشاء أي عنصر أو وسم جديد ليتناسب مع مختلف أنواع الشاشات.**

**الخطوات:**

1. **إنشاء الأنماط الأساسية:**
   ```css
   .new-element {
       /* الأنماط الافتراضية */
   }
   ```

2. **إضافة تعديلات في Media Queries:**
   ```css
   @media (max-width: 479px) {
       .new-element {
           /* تعديلات للشاشات الصغيرة */
       }
   }
   
   @media (min-width: 480px) and (max-width: 767px) {
       .new-element {
           /* تعديلات للهواتف */
       }
   }
   
   /* ... وهكذا لجميع النطاقات */
   ```

3. **الاختبار:**
   - اختبر على جميع أحجام الشاشات (5 نطاقات على الأقل)
   - استخدم أدوات المطور للتحقق

---

### 9.5 Z-Index Hierarchy

**الترتيب الحالي (من الأسفل للأعلى):**

```
1  - العناصر العادية
40 - حاوية التفاصيل
50 - العنصر النشط
55 - جسر الالتحام
60 - وسائط العنصر النشط
```

**⚠️ تحذير:** لا تستخدم z-index أعلى من 60 إلا للضرورة القصوى.

---

## 10. الملفات ذات الصلة

### 10.1 ملفات CSS
- **الرئيسي:** `pages/categories/categories.css` (398 سطر)

### 10.2 ملفات JavaScript
- **المنطق الرئيسي:** `pages/categories/categories.js`
- **الدوال الرئيسية:**
  - `categories_loadCategoriesAsTable()`
  - `categories_toggleSubcategoriesGrid()`
  - `categories_createDetailsContainer()`

### 10.3 ملفات HTML
- **القالب:** `pages/categories/categories.html`

### 10.4 ملفات البيانات
- **قائمة الفئات:** `shared/list.json`

### 10.5 ملفات التوثيق
- **هذا الملف:** `maintenance/CATEGORIES_STYLES.md`

---

## 11. معلومات الإصدار

- **آخر تحديث:** 2026-01-07
- **الإصدار:** 1.2.14
- **الحالة:** مستقر ✅
- **التغييرات الأخيرة:**
  - حذف المنحنيات المقعرة (Inverted Radius Curves)
  - تكبير الصور من 100px إلى 120px
  - تصغير النصوص من 14px إلى 12px
  - إضافة نظام Responsive Design شامل (5 نطاقات)

---

## 12. نصائح الصيانة

### ✅ افعل:
- اختبر على جميع أحجام الشاشات قبل الدفع
- حافظ على النسب المئوية بين الأحجام
- استخدم متغيرات CSS للألوان والظلال
- وثق أي تغييرات في هذا الملف

### ❌ لا تفعل:
- لا تغير عدد الأعمدة دون تحديث JavaScript
- لا تضف عناصر بدون Media Queries
- لا تستخدم أحجام ثابتة بدون اختبار
- لا تغير قيم الالتحام دون إعادة الحساب

---

**نهاية الدليل**

*لأي استفسارات أو تحديثات، يرجى تحديث هذا الملف والإشارة إلى رقم الإصدار.*
