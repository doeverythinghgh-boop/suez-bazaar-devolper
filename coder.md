# الدليل الفني لمشروع "بازار السويس"

**آخر تحديث: 6 نوفمبر 2025**

## 1. نظرة عامة على المشروع (Project Overview)
"بازار السويس" هو تطبيق ويب لسوق إلكتروني (E-commerce) يهدف إلى إنشاء منصة تجارية للبائعين والمشترين في السويس.

**الأهداف الرئيسية:**
- السماح للمستخدمين بإنشاء حسابات وتسجيل الدخول.
- تمكين البائعين المعتمدين من إضافة منتجاتهم، بما في ذلك الصور والتفاصيل.
- تمكين المسؤولين (Admins) من إدارة المستخدمين وترقية حساباتهم إلى "بائع".
- عرض المنتجات والفئات للمشترين.
- توفير سلة مشتريات للعملاء لإضافة المنتجات وشرائها.
- تمكين المستخدم من تعديل بياناته الشخصية وتغيير كلمة المرور.
- تمكين المستخدم من عرض سجل مشترياته وتتبع حالة كل طلب.
- توفير واجهة خلفية (Backend) آمنة وفعالة لإدارة البيانات والملفات.

## 2. التقنيات المستخدمة (Technology Stack)

*   **الواجهة الأمامية (Frontend):**
    *   HTML5, CSS3, JavaScript (ES6+ Async/Await).
    *   **SweetAlert2:** لعرض رسائل تنبيه وتأكيد عصرية.
    *   **Font Awesome:** للأيقونات.

*   **الواجهة الخلفية (Backend):**
    *   **Vercel Serverless Functions:** لتشغيل نقاط نهاية الـ API الخاصة بالبيانات (مثل `api/users`, `api/products`).
    *   **Cloudflare Workers:** بيئة تشغيل Serverless على حافة الشبكة (Edge) مخصصة لإدارة الملفات.

*   **قاعدة البيانات (Database):**
    *   **Turso (libSQL):** قاعدة بيانات موزعة مبنية على SQLite، يتم الوصول إليها من Vercel Functions.

*   **تخزين الملفات (File Storage):**
    *   **Cloudflare R2:** خدمة تخزين كائنات (Object Storage) تُستخدم لتخزين صور المنتجات، وتتم إدارتها عبر Cloudflare Worker.

## 3. هيكلية البنية التحتية (Infrastructure Architecture)
المشروع مبني على بنية موزعة (Distributed Architecture) لتحقيق أفضل أداء وأمان.

```
+----------------+      +-------------------------+      +---------------------+
|   المتصفح      |----->|   Vercel (HTML/CSS/JS)  |      |   Turso Database    |
| (Client)       |      +-------------------------+      | (Data)              |
+----------------+      |   Vercel Functions      |      +----------^----------+
 |      ^               |   (api/users, api/products) |                 |
 |      |               +-------------^-----------+                 |
 |      |                             |                             |
 |      +-----------------------------+-----------------------------+
 |
 | (Upload/Download)
 v
+--------------------------+
|   Cloudflare Worker      |
| (file-manager.js)        |
+--------------------------+
           |
           v
+--------------------------+
|   Cloudflare R2          |
| (Image Storage)          |
+--------------------------+
```

1.  **الواجهة الأمامية (Vercel):** يتم استضافة ملفات HTML/CSS/JS على Vercel.
2.  **واجهة برمجة التطبيقات (Vercel):** دوال الـ Serverless في مجلد `api/` تتصل بقاعدة بيانات Turso.
3.  **إدارة الملفات (Cloudflare):** يقوم العميل بطلب توكن من Cloudflare Worker لرفع/تحميل الصور مباشرة إلى Cloudflare R2.

## 4. متغيرات البيئة (Environment Variables)

يجب توفير المتغيرات التالية لكي يعمل المشروع بشكل صحيح.

### لـ Vercel Functions (`api/*.js`):
- `DATABASE_URL`: رابط الاتصال بقاعدة بيانات Turso.
- `TURSO_AUTH_TOKEN`: توكن المصادقة الخاص بقاعدة بيانات Turso.

### لـ Cloudflare Worker (`wrangler.toml`):
- `SECRET_KEY`: مفتاح سري يستخدم لتوقيع التوكن المؤقت (JWT).
- `MY_BUCKET`: اسم الحاوية (Bucket) في Cloudflare R2.

## 5. مخطط قاعدة البيانات (Database Schema)

### جدول `users`
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  Password TEXT,
  Address TEXT,
  user_key TEXT NOT NULL UNIQUE,
  is_seller INTEGER DEFAULT 0
);

-- فهرس فريد على user_key (مطلوب لتفعيل العلاقات الخارجية)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_key ON users(user_key);
```

### جدول `products`
```sql
CREATE TABLE IF NOT EXISTS marketplace_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  productName TEXT NOT NULL,
  product_key TEXT NOT NULL UNIQUE,
  user_key TEXT NOT NULL,
  product_description TEXT,
  product_price REAL NOT NULL,
  product_quantity INTEGER NOT NULL,
  user_message TEXT,
  user_note TEXT,
  ImageName TEXT,
  MainCategory INTEGER,
  SubCategory INTEGER,
  ImageIndex INTEGER,
  FOREIGN KEY (user_key) REFERENCES users(user_key)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- فهرس فريد على product_key (مطلوب للعلاقات الخارجية)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_product_key ON marketplace_products(product_key);
```

### جدول `orders`
```sql
CREATE TABLE IF NOT EXISTS orders (
  order_key TEXT NOT NULL UNIQUE,
  user_key TEXT NOT NULL,
  total_amount REAL NOT NULL,
  order_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_key) REFERENCES users(user_key)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
```

### جدول `order_items`
```sql
CREATE TABLE order_items (
  order_key TEXT NOT NULL,                 -- لربط هذا العنصر بالطلب الرئيسي في جدول `orders`
  product_key TEXT NOT NULL,               -- لربط العنصر بالمنتج في جدول `marketplace_products`
  quantity INTEGER NOT NULL,               -- الكمية التي طلبها العميل من هذا المنتج

  FOREIGN KEY (order_key) REFERENCES orders(order_key) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (product_key) REFERENCES marketplace_products(product_key) ON DELETE CASCADE ON UPDATE CASCADE
);
```

## 6. هيكل الملفات وشرحها (File Structure & Breakdown)

### 6.1. الواجهة الأمامية (HTML & Client-Side JS)

- **`index.html`**: الصفحة الرئيسية ونقطة الدخول.
- **`login.html`**: صفحة تسجيل الدخول ولوحة تحكم المستخدم (بائع/مسؤول).
- **`register.html`**: صفحة إنشاء حساب جديد.
- **`js/auth.js`**: يحتوي على الدوال الأساسية لإدارة حالة المصادقة (مثل `checkLoginStatus` و `logout`).
- **`js/seller.js`**: يحتوي على المنطق الخاص بوظائف البائع التي يتم استدعاؤها من `login-page.js` (مثل `showMyProducts`, `showAddProductModal`, `showEditProductModal`).
- **`js/cart.js`**: وحدة لإدارة سلة المشتريات باستخدام `LocalStorage`.
- **`js/main.js`**: يحتوي على المنطق الخاص بالصفحة الرئيسية (`index.html`) مثل تحريك العنوان وتحميل المحتوى الديناميكي.
- **`js/config.js`**: يحتوي على الإعدادات العامة مثل `baseURL` للـ API.
- **`js/login-page.js`**: الملف الرئيسي الذي يحتوي على المنطق البرمجي لصفحة `login.html`، بما في ذلك لوحة تحكم المسؤول (إدارة المستخدمين)، ولوحة تحكم البائع، وإدارة الملف الشخصي، وعرض السلة والمشتريات.
- **`css/login-page.css`**: يحتوي على الأنماط الخاصة بصفحة `login.html`.
- **`js/turo.js`**: طبقة الاتصال بالـ API (API Service Layer) للتفاعل مع الواجهة الخلفية.
- **`pages/addProduct.html`**: جزء HTML يحتوي على نموذج إضافة منتج جديد، يتم تحميله ديناميكيًا.
- **`pages/show.html`**: صفحة مستقلة لعرض الفئات والأسواق.
- **`pages/showProduct.html`**: جزء HTML لعرض تفاصيل المنتج في نافذة منبثقة.

### 6.2. الواجهة الخلفية (Serverless & Cloudflare)

#### Vercel Serverless Functions

- **`api/users.js`**: لإدارة بيانات المستخدمين (إنشاء، جلب، تحديث).
  - `POST /api/users`: إنشاء مستخدم جديد.
  - `POST /api/users` (مع `action: 'verify'`): للتحقق من صحة كلمة مرور المستخدم.
  - `GET /api/users`: جلب كل المستخدمين.
  - `GET /api/users?phone={phone}`: جلب مستخدم معين.
  - `PUT /api/users`: تحديث بيانات مستخدم واحد (تعديل الملف الشخصي) أو مجموعة مستخدمين (مثل ترقيتهم لبائعين).

- **`api/products.js`**: لإدارة بيانات المنتجات.
  - `POST /api/products`: إنشاء منتج جديد.
  - `PUT /api/products`: تحديث منتج موجود.
  - `GET /api/products?user_key={userKey}`: جلب منتجات بائع معين.
  - `GET /api/products?MainCategory={mainId}&SubCategory={subId}`: جلب المنتجات حسب الفئة.

- **`api/orders.js`**: لإدارة الطلبات الجديدة (Checkout).
  - `POST /api/orders`: إنشاء طلب جديد مع بنوده.

- **`api/purchases.js`**: لجلب سجل مشتريات المستخدم.
  - `GET /api/purchases?user_key={userKey}`: جلب جميع الطلبات السابقة لمستخدم معين مع تفاصيل المنتجات.

#### Cloudflare

- **`cloudflare-workers/file-manager.js`**: عامل Cloudflare لإدارة الملفات بشكل آمن مع R2.
  - `/login`: لإصدار توكن مؤقت.
  - `/upload`: لرفع الملفات.
  - `/download`: لتحميل الملفات.
  - `/delete`: لحذف الملفات.

- **`cloudflare-workers/cloudFileManager.js`**: مكتبة من جهة العميل للتفاعل مع `file-manager.js`.

## 7. تدفقات البيانات والمنطق (Data Flows & Logic)

### تسجيل حساب جديد

1.  **الواجهة الأمامية**: المستخدم يملأ نموذج التسجيل في `register.html` (الاسم ورقم الهاتف).
2.  **التحقق من المدخلات**: يتم التحقق من صحة البيانات في المتصفح (مثل طول الاسم ورقم الهاتف). إذا أدخل المستخدم كلمة مرور، يتم طلب تأكيدها.
3.  **إنشاء مفتاح فريد**: يتم استدعاء دالة `generateSerialNumber()` لإنشاء `user_key` فريد للمستخدم.
4.  **إرسال البيانات**:
    - يتم استدعاء دالة `addUser()` في `js/turo.js`.
    - `turo.js` يرسل طلب `POST` إلى `api/users.js` مع بيانات المستخدم الجديد (`username`, `phone`, `user_key`, `password`, `address`).
5.  **قاعدة البيانات**: `api/users.js` يقوم بحفظ المستخدم الجديد في جدول `users`. إذا كان رقم الهاتف موجودًا بالفعل، يتم إرجاع خطأ.
6.  **تسجيل الدخول التلقائي**: بعد النجاح، يتم حفظ بيانات المستخدم في `LocalStorage` وتوجيهه إلى الصفحة الرئيسية كـ "مسجل دخوله".
 
### تسجيل الدخول

1.  **الواجهة الأمامية**: المستخدم يدخل رقم هاتفه في `login.html`.
2.  **طلب بيانات المستخدم**:
    - يتم استدعاء دالة `getUserByPhone()` في `js/turo.js`.
    - `turo.js` يرسل طلب `GET` إلى `api/users.js?phone={phone}`.
3.  **التحقق من المستخدم**: `api/users.js` يبحث في قاعدة البيانات عن المستخدم. إذا لم يتم العثور عليه، يرجع استجابة `404`.
4.  **التحقق من كلمة المرور (إذا كانت مطلوبة)**:
    - إذا كان الحساب يحتوي على كلمة مرور، تظهر نافذة منبثقة تطلب من المستخدم إدخالها.
    - يتم استدعاء `verifyUserPassword()` التي ترسل طلب `POST` إلى `api/users.js` مع `action: 'verify'`.
    - الواجهة الخلفية تتحقق من صحة كلمة المرور. إذا كانت غير صحيحة، تتوقف العملية.
5.  **حفظ الجلسة**: بعد التحقق، يتم إرجاع بيانات المستخدم الكاملة (`user_key`, `username`, `is_seller`, `Address`).
6.  **الواجهة الأمامية**: يتم حفظ كائن المستخدم في `LocalStorage` تحت مفتاح `loggedInUser`.
7.  **تحديث الواجهة**:
    - يتم تحديث الواجهة في `login.html` لإظهار رسالة ترحيب وأزرار التحكم (مثل "إضافة منتج").
    - يتم استدعاء `updateCartBadge()` لتحميل شارة السلة الخاصة بالمستخدم.

### تعديل بيانات المستخدم

1.  **الواجهة الأمامية**: بعد تسجيل الدخول، يضغط المستخدم على زر "تعديل البيانات" في `login.html`.
2.  **عرض النموذج**: تظهر نافذة منبثقة (`SweetAlert2`) تعرض بيانات المستخدم الحالية (الاسم، رقم الهاتف، العنوان) وتوفر حقولاً لتغيير كلمة المرور.
3.  **التحقق من كلمة المرور القديمة (إذا لزم الأمر)**:
    - إذا قام المستخدم بإدخال كلمة مرور جديدة، تظهر نافذة منبثقة أخرى تطلب منه إدخال كلمة المرور القديمة.
    - يتم استدعاء `verifyUserPassword()` من `js/turo.js`، والتي ترسل طلب `POST` إلى `api/users.js` مع `action: 'verify'` للتحقق من كلمة المرور القديمة.
    - إذا كانت كلمة المرور القديمة غير صحيحة، تتوقف العملية.
4.  **إرسال التحديثات**:
    - بعد التحقق (أو إذا لم يتم تغيير كلمة المرور)، يتم تجميع البيانات التي تغيرت فقط.
    - يتم استدعاء دالة `updateUser()` في `js/turo.js`.
    - `turo.js` يرسل طلب `PUT` إلى `api/users.js` مع البيانات المحدثة و`user_key` لتحديد المستخدم.
5.  **الواجهة الخلفية**:
    - `api/users.js` يستقبل الطلب ويمنع تعديل `user_key`.
    - إذا تم تغيير رقم الهاتف، يتم التحقق من عدم تكراره.
    - يتم تنفيذ جملة `UPDATE` ديناميكية لتحديث الحقول المطلوبة فقط.
6.  **تحديث الواجهة**: عند استلام استجابة النجاح، يتم تحديث بيانات المستخدم في `LocalStorage` فورًا وعرض رسالة نجاح.

### عرض المنتجات حسب الفئة (في الصفحة الرئيسية)

1.  **الواجهة الأمامية (`index.html`)**: يتم تحميل جدول الفئات الرئيسية ديناميكيًا من `shared/list.json`.
2.  **اختيار فئة رئيسية**: عند النقر على خلية فئة رئيسية، يظهر صف جديد أسفلها يعرض الفئات الفرعية المرتبطة بها.
3.  **اختيار فئة فرعية**: عند النقر على فئة فرعية:
    - يتم استدعاء دالة `getProductsByCategory(mainCatId, subCatId)` من `js/turo.js`.
    - `turo.js` يرسل طلب `GET` إلى `api/products.js?MainCategory={mainId}&SubCategory={subId}`.
4.  **الواجهة الخلفية (`api/products.js`)**:
    - يستقبل الطلب ويقوم بتنفيذ استعلام `SELECT` مع `JOIN` على جدول `users` لجلب المنتجات التي تطابق الفئات المحددة، بالإضافة إلى اسم ورقم هاتف البائع.
    - **ملاحظة**: الواجهة الخلفية الحالية (`api/products.js`) لا تقوم بعمل `JOIN` مع جدول `users`. يتم جلب المنتجات فقط من جدول `marketplace_products`.
5.  **عرض المنتجات**:
    - يتم إرجاع قائمة المنتجات إلى الواجهة الأمامية.
    - يتم إنشاء معرض صور (`gallery-container`) أسفل صف الفئات الفرعية، ويتم عرض صور المنتجات.
    - عند النقر على صورة منتج، تُستدعى `window.showProductDetails()` لعرض تفاصيل المنتج في نافذة منبثقة.


### إضافة منتج جديد (للبائع)

1.  **الواجهة الأمامية**: البائع يملأ النموذج في `pages/addProduct.html` ويختار الصور.
2.  **ضغط الصور**: يتم ضغط الصور في المتصفح باستخدام Canvas API.
3.  **رفع الصور**:
    - السكريبت يستدعي `uploadFile2cf()` لكل صورة.
    - `cloudFileManager.js` يطلب توكن من Cloudflare Worker (`/login`).
    - يتم رفع كل صورة مضغوطة إلى R2 عبر Cloudflare Worker (`/upload`).
4.  **حفظ بيانات المنتج**:
    - بعد نجاح رفع كل الصور، يتم تجميع بيانات المنتج وأسماء الصور.
    - يتم استدعاء `addProduct()` في `js/turo.js`.
    - `turo.js` يرسل طلب `POST` إلى `api/products.js` مع بيانات المنتج الكاملة (بما في ذلك `product_key` الذي تم إنشاؤه في الواجهة الأمامية).
5.  **قاعدة البيانات**: `api/products.js` يقوم بحفظ بيانات المنتج في جدول `products` بقاعدة بيانات Turso.

### تعديل منتج موجود (للبائع)

1.  **الواجهة الأمامية**: البائع يفتح نموذج التعديل الذي يتم ملؤه ببيانات المنتج الحالية وصوره.
2.  **إدارة الصور**:
    - يمكن للبائع حذف الصور القديمة أو إضافة صور جديدة.
    - عند الحفظ، يتم تحديد الصور التي حُذفت والصور الجديدة التي أُضيفت.
3.  **حذف الصور القديمة**:
    - السكريبت يستدعي `deleteFile2cf()` لكل صورة تم حذفها.
    - `cloudFileManager.js` يرسل طلب `DELETE` إلى Cloudflare Worker (`/delete`).
4.  **رفع الصور الجديدة**:
    - يتم ضغط ورفع الصور الجديدة بنفس طريقة "إضافة منتج جديد".
5.  **تحديث بيانات المنتج**:
    - بعد إدارة الصور، يتم تجميع بيانات المنتج المحدثة والقائمة النهائية لأسماء الصور.
    - يتم استدعاء `updateProduct()` في `js/turo.js`.
    - `turo.js` يرسل طلب `PUT` إلى `api/products.js` مع البيانات الجديدة.
6.  **قاعدة البيانات**: `api/products.js` يقوم بتحديث سجل المنتج في قاعدة بيانات Turso.

### إضافة منتج إلى سلة المشتريات (للمشتري)

1.  **الواجهة الأمامية**: المشتري يتصفح المنتجات في `index.html`.
2.  **عرض التفاصيل**: عند النقر على صورة منتج، تُستدعى `window.showProductDetails()` التي تحمّل `pages/showProduct.html` وتعرض تفاصيل المنتج في نافذة منبثقة.
3.  **تحديد الكمية**: المشتري يحدد الكمية المطلوبة.
4.  **الإضافة للسلة**: عند النقر على زر "إضافة للسلة":
    - يتم التحقق أولاً من أن المستخدم مسجل دخوله. إذا لم يكن، تظهر رسالة تطلب منه تسجيل الدخول.
    - تُستدعى دالة `addToCart()` من `js/cart.js`.
    - `addToCart()` تقوم بجلب السلة الحالية من `LocalStorage` باستخدام مفتاح مربوط بـ `user_key` الخاص بالمستخدم.
    - إذا كان المنتج موجودًا، يتم تحديث كميته. إذا لم يكن، يتم إضافته كعنصر جديد.
    - يتم حفظ السلة المحدثة مرة أخرى في `LocalStorage` بنفس المفتاح المربوط بالمستخدم.
5.  **تحديث الواجهة**:
    - يتم إرسال حدث `cartUpdated` لتحديث شارة عدد المنتجات في السلة (`cart-badge`).

## 8. كيفية البدء (Getting Started)
### عرض سجل المشتريات (للمستخدم المسجل)
1.  **الواجهة الأمامية**: المستخدم يضغط على زر "المشتريات" في لوحة التحكم (`login.html`).
2.  **طلب البيانات**:
    - تُستدعى دالة `showPurchasesModal()` التي بدورها تستدعي `getUserPurchases(user_key)` من `js/turo.js`.
    - `turo.js` يرسل طلب `GET` إلى `api/purchases.js?user_key={userKey}`.
3.  **الواجهة الخلفية**:
    - `api/purchases.js` يستقبل الطلب ويتحقق من `user_key`.
    - يقوم بتنفيذ استعلام `JOIN` بين جداول `orders`, `order_items`, و `marketplace_products` لجلب تفاصيل كل منتج تم شراؤه (الاسم، الصورة، السعر، الكمية، تاريخ الطلب، حالة الطلب).
4.  **عرض البيانات**:
    - يتم إرجاع قائمة بالمنتجات المشتراة إلى الواجهة الأمامية.
    - تُعرض البيانات في نافذة منبثقة منسقة، مع إظهار حالة كل طلب (قيد المعالجة، جارٍ الشحن، تم التسليم).

### إتمام عملية الشراء (Checkout)

1.  **الواجهة الأمامية**: المستخدم يضغط على زر "إتمام الشراء" في نافذة السلة المنبثقة (`cart-modal`).
2.  **تجميع البيانات**:
    - يتم جلب بيانات المستخدم المسجل من `LocalStorage`.
    - يتم جلب محتويات السلة من `LocalStorage`.
    - يتم حساب المبلغ الإجمالي للطلب.
    - يتم إنشاء مفتاح فريد للطلب (`order_key`).
3.  **إرسال الطلب**:
    - تُستدعى دالة `createOrder()` من `js/turo.js`.
    - `turo.js` يرسل طلب `POST` إلى `api/orders.js` يحتوي على `order_key`, `user_key`, `total_amount`, ومصفوفة بالمنتجات المطلوبة (`items`).
4.  **الواجهة الخلفية (`api/orders.js`)**:
    - يستقبل الطلب ويقوم بتنفيذ معاملة (Transaction) في قاعدة البيانات.
    - **أولاً**: يُدرج سجل الطلب الرئيسي في جدول `orders`.
    - **ثانياً**: يمر على كل عنصر في مصفوفة `items` ويُدرجه في جدول `order_items`.
    - إذا نجحت جميع العمليات، يتم تأكيد المعاملة. إذا فشلت أي عملية، يتم التراجع عن كل شيء.
5.  **تحديث الواجهة**:
    - عند استلام استجابة النجاح، يتم إفراغ سلة المشتريات من `LocalStorage`.
    - يتم تحديث شارة السلة.
    - تُعرض رسالة نجاح للمستخدم مع رقم الطلب.


## 9. كيفية البدء (Getting Started)

1.  **استنساخ المشروع**:
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```
2.  **إعداد متغيرات البيئة**:
    - أنشئ ملف `.env` في جذر المشروع وأضف متغيرات Vercel.
    - قم بتحديث ملف `wrangler.toml` بمعلومات Cloudflare الخاصة بك.
3.  **نشر الواجهة الخلفية**:
    - انشر دوال Vercel باستخدام `vercel deploy`.
    - انشر عامل Cloudflare باستخدام `npx wrangler deploy`.
4.  **تشغيل الواجهة الأمامية**:
    - يمكنك فتح ملفات الـ HTML مباشرة في المتصفح أو استخدام خادم محلي بسيط.
