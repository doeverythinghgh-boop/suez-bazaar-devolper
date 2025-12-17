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
    { "mainId": 6, "subId": 9, "description": "خدمات تعليمية" }
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
- **الإرجاع:** `'2'` للخدمات، `'0'` للمنتجات

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
- **الوظيفة:** الحصول على بيانات المنتج/الخدمة الحالي
- **الإرجاع:** `object|null`

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
- **الوظيفة:** الحصول على الفئات المختارة
- **الإرجاع:** `{mainId, subId}|null`

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
    - `productAdd2.html` / `productEdit2.html` للخدمات
    - `productAdd.html` / `productEdit.html` للمنتجات

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
| [`productView.html`](/bazaar/pages/productView.html) | عرض المنتجات | تعرض تفاصيل المنتج مع السعر والكمية وزر الإضافة للسلة |
| [`productView2.html`](/bazaar/pages/productView2.html) | عرض الخدمات | تعرض تفاصيل الخدمة مع سلايدر ثلاثي الأبعاد ونموذج طلب صور |

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
| [`productAdd.html`](/bazaar/pages/productAdd.html) | إضافة منتج | نموذج إضافة منتج مع حقول السعر والكمية |
| [`productAdd2.html`](/bazaar/pages/productAdd2.html) | إضافة خدمة | نموذج إضافة خدمة بدون حقول السعر والكمية |

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
| [`productEdit.html`](/bazaar/pages/productEdit.html) | تعديل منتج | نموذج تعديل منتج موجود |
| [`productEdit2.html`](/bazaar/pages/productEdit2.html) | تعديل خدمة | نموذج تعديل خدمة موجودة |

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
// في search.html أو product2Me.html
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

---

## الدوال القديمة (للتوافق فقط)

> [!WARNING]
> **الدوال التالية محفوظة للتوافق مع الكود القديم فقط. استخدم الدوال الجديدة في الكود الجديد.**

- `productViewLayout(View)` → استخدم `loadProductView(productData, options)`
- `productAddSetType(editMode)` → استخدم `loadProductForm(options)`

---

## المتغيرات العامة (للتوافق فقط)

> [!WARNING]
> **المتغيرات التالية محفوظة للتوافق فقط. استخدم `ProductStateManager` في الكود الجديد.**

- `window.productSession` → استخدم `ProductStateManager.getCurrentProduct()`
- `window.mainCategorySelectToAdd` → استخدم `ProductStateManager.getSelectedCategories()`
- `window.subCategorySelectToAdd` → استخدم `ProductStateManager.getSelectedCategories()`
- `window.productTypeToAdd` → استخدم `isServiceCategory()`

---

## الخلاصة

| العملية | الدالة المستخدمة | الصفحة المحملة |
|---------|-------------------|-----------------|
| **عرض منتج** | `loadProductView(data, options)` | `productView.html` |
| **عرض خدمة** | `loadProductView(data, options)` | `productView2.html` |
| **إضافة منتج** | `loadProductForm({editMode: false})` | `productAdd.html` |
| **إضافة خدمة** | `loadProductForm({editMode: false})` | `productAdd2.html` |
| **تعديل منتج** | `loadProductForm({editMode: true, productData})` | `productEdit.html` |
| **تعديل خدمة** | `loadProductForm({editMode: true, productData})` | `productEdit2.html` |
| **التحقق من النوع** | `isServiceCategory(mainId, subId)` | - |
