# دليل التعامل مع المنتجات والخدمات

## نظرة عامة

يستخدم المشروع نظاماً مرناً للتفريق بين **المنتجات** و**الخدمات** بناءً على الفئات (Categories). يتم تحديد نوع العنصر ديناميكياً من خلال ملف تكوين مركزي، مما يسمح بإضافة فئات جديدة كخدمات دون تعديل الكود.

---

## آلية التفريق بين المنتجات والخدمات

### ملف التكوين

**الموقع:** [`js/PRODUCT_SERVICE/serviceCategories.config.json`](/bazaar/js/PRODUCT_SERVICE/serviceCategories.config.json)

```json
{
  "serviceMainCategories": [6, 20],
  "serviceSubCategories": [
    { "mainId": 3, "subId": 5, "description": "خدمات تطوير المواقع" },
    { "mainId": 44, "subId": 4, "description": "عضوية أوريفليم" },
    { "mainId": 7, "subId": 3, "description": "خدمات الشحن والتوصيل" }
  ],
  "settings": {
    "hidePrice": true,
    "serviceType": "2",
    "productType": "0"
  }
}
```

**المكونات:**
- **`serviceMainCategories`**: فئات رئيسية تُعتبر خدمات بالكامل (مثل: 6 = الخدمات العامة، 20 = الخدمات الطبية)
- **`serviceSubCategories`**: فئات فرعية محددة تُعتبر خدمات
- **`settings`**: إعدادات عامة للخدمات

---

## الوحدات والدوال الأساسية

### 1. وحدة المساعدة: `serviceCategoryHelper.js`

**الموقع:** [`js/PRODUCT_SERVICE/serviceCategoryHelper.js`](/bazaar/js/PRODUCT_SERVICE/serviceCategoryHelper.js)

#### الدوال الرئيسية:

##### `loadServiceConfig()`
```javascript
async function loadServiceConfig()
```
- **الوظيفة:** تحميل ملف التكوين من `serviceCategories.config.json`
- **الإرجاع:** `Promise<object>` - كائن التكوين
- **التخزين المؤقت:** يتم تخزين التكوين في `_serviceConfig` لتجنب التحميل المتكرر

##### `isServiceCategory(mainId, subId)`
```javascript
function isServiceCategory(mainId, subId = null)
```
- **الوظيفة:** التحقق من كون الفئة خدمة أم منتج
- **المعاملات:**
  - `mainId`: معرّف الفئة الرئيسية
  - `subId`: معرّف الفئة الفرعية (اختياري)
- **الإرجاع:** `boolean` - `true` إذا كانت خدمة، `false` إذا كانت منتج

**مثال:**
```javascript
isServiceCategory(6, null);     // true (فئة رئيسية كخدمة)
isServiceCategory(3, 5);         // true (فئة فرعية كخدمة)
isServiceCategory(1, 1);         // false (منتج عادي)
```

##### `getServiceType(mainId, subId)`
```javascript
function getServiceType(mainId, subId = null)
```
- **الوظيفة:** الحصول على نوع العنصر كنص
- **الإرجاع:** `'2'` للخدمات، `'0'` للمنتجات (أو حسب القيم المعرفة في `settings`)

##### `getServiceSettings()`
```javascript
function getServiceSettings()
```
- **الوظيفة:** الحصول على جميع إعدادات الخدمات العامة
- **الإرجاع:** كائن يحتوي على `hidePrice`, `serviceType`, `productType`

---

### 2. وحدة إدارة الحالة: `productStateManager.js`

**الموقع:** [`js/PRODUCT_SERVICE/productStateManager.js`](/bazaar/js/PRODUCT_SERVICE/productStateManager.js)

#### الدوال الرئيسية:

##### `setProductForView(productData, options)`
```javascript
ProductStateManager.setProductForView(productData, options = {})
```
- **الوظيفة:** تخزين بيانات المنتج/الخدمة للعرض
- **المعاملات:**
  - `productData`: كائن بيانات المنتج/الخدمة
  - `options`: خيارات العرض (مثل `showAddToCart`)

##### `getCurrentProduct()`
```javascript
ProductStateManager.getCurrentProduct()
```
- **الوظيفة:** الحصول على بيانات المنتج/الخدمة الحالي المخزن
- **الإرجاع:** `object|null`

##### `getViewOptions()`
```javascript
ProductStateManager.getViewOptions()
```
- **الوظيفة:** الحصول على خيارات العرض المخزنة (مثل `showAddToCart`)
- **الإرجاع:** `object` (يكون فارغاً `{}` كقيمة افتراضية)

##### `setSelectedCategories(mainId, subId)`
```javascript
ProductStateManager.setSelectedCategories(mainId, subId)
```
- **الوظيفة:** تخزين الفئات المختارة عند الإضافة/التعديل
- **المعاملات:**
  - `mainId`: معرّف الفئة الرئيسية
  - `subId`: معرّف الفئة الفرعية

##### `getSelectedCategories()`
```javascript
ProductStateManager.getSelectedCategories()
```
- **الوظيفة:** الحصول على الفئات المختارة حالياً
- **الإرجاع:** `{mainId, subId}|null`

##### `clear()`
```javascript
ProductStateManager.clear()
```
- **الوظيفة:** مسح كافة البيانات المخزنة في الـ State (المنتج الحالي، الخيارات، الفئات)

##### `getState()`
```javascript
ProductStateManager.getState()
```
- **الوظيفة:** الحصول على نسخة كاملة من الحالة الداخلية (أغراض التطوير وتصحيح الأخطاء)

---

### 3. الدوال الرئيسية: `globalVariable.js`

**الموقع:** [`js/globalVariable.js`](/bazaar/js/globalVariable.js)

#### `loadProductView(productData, options)`
```javascript
function loadProductView(productData, options = {})
```
- **الوظيفة:** تحميل صفحة عرض المنتج/الخدمة المناسبة
- **المعاملات:**
  - `productData`: كائن بيانات المنتج (يجب أن يحتوي على `MainCategory` و `SubCategory`)
  - `options`: خيارات العرض (يمكن أن يكون `boolean` أو `object`)
- **السلوك:**
  - يحدد نوع العنصر باستخدام `isServiceCategory()`
  - يحمل `productView2.html` للخدمات
  - يحمل `productView.html` للمنتجات

**مثال:**
```javascript
const productData = {
    product_key: "123",
    productName: "خدمة تطوير موقع",
    MainCategory: 3,
    SubCategory: 5,
    // ... بقية البيانات
};

loadProductView(productData, { showAddToCart: true });
```

---

#### `loadProductForm(options)`
```javascript
function loadProductForm(options = {})
```
- **الوظيفة:** تحميل صفحة إضافة/تعديل المنتج/الخدمة المناسبة
- **المعاملات:**
  - `options.editMode`: `boolean` - وضع التعديل (`true`) أو الإضافة (`false`)
  - `options.productData`: `object` - بيانات المنتج (مطلوب في وضع التعديل)
- **السلوك:**
  - يحصل على الفئات المختارة من `ProductStateManager`
  - يحدد نوع العنصر باستخدام `isServiceCategory()`
  - يحمل الصفحة المناسبة:
    - `productAdd2/productAdd2.html` / `productEdit2/productEdit2.html` للخدمات
    - `productAdd/productAdd.html` / `productEdit/productEdit.html` للمنتجات

**مثال:**
```javascript
// إضافة خدمة جديدة
ProductStateManager.setSelectedCategories(6, 9);
loadProductForm({ editMode: false });

// تعديل منتج موجود
ProductStateManager.setSelectedCategories(1, 1);
loadProductForm({ 
    editMode: true, 
    productData: existingProduct 
});
```

---

#### `showAddProductModal()`
```javascript
async function showAddProductModal()
```
- **الوظيفة:** عرض نافذة اختيار الفئة ثم تحميل صفحة الإضافة المناسبة
- **السلوك:**
  1. يعرض نافذة `CategoryModal` لاختيار الفئة
  2. يخزن الفئات المختارة في `ProductStateManager`
  3. يستدعي `loadProductForm()` لتحميل الصفحة المناسبة

---

## الصفحات المستخدمة

### صفحات العرض

| الصفحة | الاستخدام | الوصف |
|--------|-----------|-------|
| [`productView/productView.html`](/bazaar/pages/productView/productView.html) | عرض المنتجات | تعرض تفاصيل المنتج مع السعر والكمية وزر الإضافة للسلة |
| [`productView2/productView2.html`](/bazaar/pages/productView2/productView2.html) | عرض الخدمات | تعرض تفاصيل الخدمة مع سلايدر ثلاثي الأبعاد ونموذج طلب صور |

**كيفية قراءة البيانات:**
```javascript
// في productView.html و productView2.html
const productData = ProductStateManager.getCurrentProduct();
const viewOptions = ProductStateManager.getViewOptions();

if (productData) {
    productView_viewDetails(productData, viewOptions);
}
```

---

### صفحات الإضافة

| الصفحة | الاستخدام | الوصف |
|--------|-----------|-------|
| [`productAdd/productAdd.html`](/bazaar/pages/productAdd/productAdd.html) | إضافة منتج | نموذج إضافة منتج مع حقول السعر والكمية |
| [`productAdd2/productAdd2.html`](/bazaar/pages/productAdd2/productAdd2.html) | إضافة خدمة | نموذج إضافة خدمة بدون حقول السعر والكمية |

**كيفية قراءة الفئات:**
```javascript
// في صفحات الإضافة
const categories = ProductStateManager.getSelectedCategories();
// استخدام categories.mainId و categories.subId
```

---

### صفحات التعديل

| الصفحة | الاستخدام | الوصف |
|--------|-----------|-------|
| [`productEdit/productEdit.html`](/bazaar/pages/productEdit/productEdit.html) | تعديل منتج | نموذج تعديل منتج موجود |
| [`productEdit2/productEdit2.html`](/bazaar/pages/productEdit2/productEdit2.html) | تعديل خدمة | نموذج تعديل خدمة موجودة |

**كيفية قراءة البيانات:**
```javascript
// في صفحات التعديل
const productData = ProductStateManager.getCurrentProduct();
const categories = ProductStateManager.getSelectedCategories();
```

---

## سيناريوهات الاستخدام

### 1. إضافة منتج/خدمة جديدة

```javascript
// 1. المستخدم ينقر على زر "إضافة منتج"
document.getElementById("dash-add-product-btn").addEventListener("click", () => {
    showAddProductModal();
});

// 2. يختار الفئة من النافذة المنبثقة
// 3. يتم تخزين الفئات تلقائياً
// 4. يتم تحميل الصفحة المناسبة تلقائياً
```

---

### 2. عرض تفاصيل منتج/خدمة

```javascript
// في search.html أو product2Me/product2Me.html
const productData = {
    product_key: "123",
    productName: "اسم المنتج",
    MainCategory: 6,
    SubCategory: 9,
    // ... بقية البيانات
};

// استخدام الدالة الجديدة
loadProductView(productData, true);
```

---

### 3. تعديل منتج/خدمة موجودة

```javascript
// في product2Me.html
async function editProduct(productId) {
    const product = myProducts.find(p => p.id === productId);
    
    // عرض نافذة اختيار الفئة
    const result = await CategoryModal.show(
        product.MainCategory, 
        product.SubCategory
    );
    
    if (result.status === 'success') {
        // تحديث الفئات
        product.MainCategory = result.mainId;
        product.SubCategory = result.subId;
        
        // تخزين في State Manager
        ProductStateManager.setSelectedCategories(result.mainId, result.subId);
        
        // تحميل صفحة التعديل المناسبة
        loadProductForm({ editMode: true, productData: product });
    }
}
```

---

### 4. التحقق من نوع العنصر في البحث

```javascript
// في search.html - دالة generateSearchResultHTML
function generateSearchResultHTML(product) {
    // التحقق من نوع العنصر
    const isService = isServiceCategory(
        product.MainCategory, 
        product.SubCategory
    );
    
    // إخفاء السعر للخدمات
    const priceHTML = !isService 
        ? `<p class="price">${price} جنيه</p>` 
        : "";
    
    return `<div class="product-card">${priceHTML}</div>`;
}
```

---

## إضافة فئة جديدة كخدمة

### الخطوات:

1. **افتح ملف التكوين:** [`js/PRODUCT_SERVICE/serviceCategories.config.json`](/bazaar/js/PRODUCT_SERVICE/serviceCategories.config.json)

2. **أضف الفئة المناسبة:**

```json
{
  "serviceMainCategories": [6, 20, 21],  // إضافة فئة رئيسية جديدة
  "serviceSubCategories": [
    { "mainId": 3, "subId": 5, "description": "..." },
    { "mainId": 7, "subId": 8, "description": "خدمة جديدة" }  // إضافة فئة فرعية
  ]
}
```

3. **احفظ الملف** - لا حاجة لتعديل أي كود!

4. **أعد تحميل الصفحة** - سيتم تحميل التكوين الجديد تلقائياً
## 🔄 تكامل حالة البيانات (State Integration)

يعتمد المشروع الآن كلياً على **نظام إدارة الحالة المركزي** لضمان ثبات البيانات وسهولة الصيانة:

1. **الاعتماد الأساسي**: يتم استخدام `ProductStateManager.getCurrentProduct()` و `ProductStateManager.getSelectedCategories()` في كافة مراحل (العرض، التعديل، الإضافة).
2. **التوجيه الذكي**: يتم استخدام `loadProductView()` و `loadProductForm()` للتحكم في التنقل بين الصفحات بناءً على نوع العنصر المكتشف تلقائياً.

---

## الدوال والمتغيرات المهجورة (Deprecated)

> [!CAUTION]
> **يُمنع استخدام العناصر التالية في أي تطوير جديد.** تم الإبقاء على تعريفاتها في `globalVariable.js` فقط لمنع تعطل الأجزاء القديمة من المشروع التي لم يتم تحديثها بعد، وسيتم إزالتها نهائياً في التحديثات القادمة.

### الدوال المهجورة:
- `productViewLayout(View)` → **البديل**: `loadProductView(productData, options)`
- `productAddSetType(editMode)` → **البديل**: `loadProductForm(options)`

### المتغيرات العامة المهجورة:
- `window.productSession` → **البديل**: `ProductStateManager.getCurrentProduct()`
- `window.mainCategorySelectToAdd` → **البديل**: `ProductStateManager.getSelectedCategories()`
- `window.subCategorySelectToAdd` → **البديل**: `ProductStateManager.getSelectedCategories()`
- `window.productTypeToAdd` → **البديل**: `isServiceCategory()` أو `getServiceType()`

---

## نظام تمييز الطلبات (Order Identification System)

يستخدم المشروع حقل `orderType` في جدول `orders` للفصل التقني بين أنواع الطلبات، مما يضمن ظهور الواجهة الصحيحة في شريط التقدم (Stepper).

### قيم حقل `orderType`:
| القيمة | النوع | المصدر | السلوك في الـ Stepper |
| :--- | :--- | :--- | :--- |
| **`0`** | **منتج (Product)** | `cartPackage-checkout.js` | عرض تقليدي للكميات والأسعار |
| **`1`** | **خدمة (Service)** | `view2_submit.js` | إظهار أدوات التسعير وصور الطلب المرفقة |

---

## الخلاصة النهائية

| العملية | الدالة المقترحة | النظام المستخدم | القيمة الرقمية (`orderType`) |
| :--- | :--- | :--- | :--- |
| **عرض منتج/خدمة** | `loadProductView()` | `ProductStateManager` | - |
| **إضافة/تعديل** | `loadProductForm()` | `ProductStateManager` | - |
| **إرسال طلب منتج** | `fetch('/api/orders')` | سلة المشتريات | `0` |
| **إرسال طلب خدمة** | `fetch('/api/orders')` | واجهة الخدمات | `1` |

---
*آخر تحديث للوثيقة: ديسمبر 2025 - توحيد نظام إدارة الحالة*
