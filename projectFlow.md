الدليل الفني لمشروع "بازار السويس"

آخر تحديث: 7 نوفمبر 2025 (تمت إضافة جدول user_tokens)

1. نظرة عامة على المشروع (Project Overview)

"بازار السويس" هو تطبيق ويب لسوق إلكتروني (E-commerce) يهدف إلى إنشاء منصة تجارية للبائعين والمشترين في السويس.

الأهداف الرئيسية:

السماح للمستخدمين بإنشاء حسابات وتسجيل الدخول.

تمكين البائعين المعتمدين من إضافة منتجاتهم، بما في ذلك الصور والتفاصيل.

تمكين المسؤولين (Admins) من إدارة المستخدمين وترقية حساباتهم إلى "بائع".

عرض المنتجات والفئات للمشترين.

توفير سلة مشتريات للعملاء لإضافة المنتجات وشرائها.

تمكين المستخدم من تعديل بياناته الشخصية وتغيير كلمة المرور.

تمكين المستخدم من عرض سجل مشترياته وتتبع حالة كل طلب.

توفير واجهة خلفية (Backend) آمنة وفعالة لإدارة البيانات والملفات.

2. التقنيات المستخدمة (Technology Stack)

الواجهة الأمامية (Frontend):

HTML5, CSS3, JavaScript (ES6+ Async/Await).

SweetAlert2: لعرض رسائل تنبيه وتأكيد عصرية.

Font Awesome: للأيقونات.

الواجهة الخلفية (Backend):

Vercel Serverless Functions: لتشغيل نقاط نهاية الـ API الخاصة بالبيانات (مثل api/users, api/products).

Cloudflare Workers: بيئة تشغيل Serverless على حافة الشبكة (Edge) مخصصة لإدارة الملفات.

قاعدة البيانات (Database):

Turso (libSQL): قاعدة بيانات موزعة مبنية على SQLite، يتم الوصول إليها من Vercel Functions.

تخزين الملفات (File Storage):

Cloudflare R2: خدمة تخزين كائنات (Object Storage) تُستخدم لتخزين صور المنتجات، وتتم إدارتها عبر Cloudflare Worker.

3. هيكلية البنية التحتية (Infrastructure Architecture)

المشروع مبني على بنية موزعة (Distributed Architecture) لتحقيق أفضل أداء وأمان.

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


الواجهة الأمامية (Vercel): يتم استضافة ملفات HTML/CSS/JS على Vercel.

واجهة برمجة التطبيقات (Vercel): دوال الـ Serverless في مجلد api/ تتصل بقاعدة بيانات Turso.

إدارة الملفات (Cloudflare): يقوم العميل بطلب توكن من Cloudflare Worker لرفع/تحميل الصور مباشرة إلى Cloudflare R2.

4. متغيرات البيئة (Environment Variables)

يجب توفير المتغيرات التالية لكي يعمل المشروع بشكل صحيح.

لـ Vercel Functions (api/*.js):

DATABASE_URL: رابط الاتصال بقاعدة بيانات Turso.

TURSO_AUTH_TOKEN: توكن المصادقة الخاص بقاعدة بيانات Turso.

لـ Cloudflare Worker (wrangler.toml):

SECRET_KEY: مفتاح سري يستخدم لتوقيع التوكن المؤقت (JWT).

MY_BUCKET: اسم الحاوية (Bucket) في Cloudflare R2.

5. مخطط قاعدة البيانات (Database Schema)

جدول users

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


جدول user_tokens (جديد)

CREATE TABLE IF NOT EXISTS user_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_key TEXT NOT NULL,
  fcm_token TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


ملاحظة: يُستخدم هذا الجدول لحفظ توكنات Firebase Cloud Messaging (FCM) الخاصة بإشعارات المستخدمين، ويتم ربطه بالمستخدم عبر عمود user_key.

جدول products

CREATE TABLE IF NOT EXISTS marketplace_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  productName TEXT NOT NULL,
  product_key TEXT NOT NULL UNIQUE,
  user_key TEXT NOT NULL,
  product_description TEXT,
  product_price REAL NOT NULL,
  original_price REAL, --السعر قبل الخصم
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


جدول orders

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


جدول order_items

CREATE TABLE order_items (
  order_key TEXT NOT NULL,
  product_key TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  seller_key TEXT,  -- البائع (نفس user_key من جدول المنتجات)

  FOREIGN KEY (order_key) REFERENCES orders(order_key) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (product_key) REFERENCES marketplace_products(product_key) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (seller_key) REFERENCES users(user_key) ON DELETE CASCADE ON UPDATE CASCADE
);


6. هيكل الملفات وشرحها (File Structure & Breakdown)

6.1. الواجهة الأمامية (HTML & Client-Side JS)

index.html: الصفحة الرئيسية ونقطة الدخول.

login.html: صفحة تسجيل الدخول ولوحة تحكم المستخدم (بائع/مسؤول).

register.html: صفحة إنشاء حساب جديد.

js/auth.js: يحتوي على الدوال الأساسية لإدارة حالة المصادقة (مثل checkLoginStatus و logout).

js/seller.js: يحتوي على المنطق الخاص بوظائف البائع التي يتم استدعاؤها من login-page.js (مثل showMyProducts, showAddProductModal, showEditProductModal).

js/cart.js: وحدة لإدارة سلة المشتريات باستخدام LocalStorage.

js/main.js: يحتوي على المنطق الخاص بالصفحة الرئيسية (index.html) مثل تحريك العنوان وتحميل المحتوى الديناميكي.

js/config.js: يحتوي على الإعدادات العامة مثل baseURL للـ API.

js/login-page.js: الملف الرئيسي الذي يحتوي على المنطق البرمجي لصفحة login.html، بما في ذلك لوحة تحكم المسؤول (إدارة المستخدمين)، ولوحة تحكم البائع، وإدارة الملف الشخصي، وعرض السلة والمشتريات.

css/login-page.css: يحتوي على الأنماط الخاصة بصفحة login.html.

js/turo.js: طبقة الاتصال بالـ API (API Service Layer) للتفاعل مع الواجهة الخلفية.

pages/addProduct.html: جزء HTML يحتوي على نموذج إضافة منتج جديد، يتم تحميله ديناميكيًا.

pages/show.html: صفحة مستقلة لعرض الفئات والأسواق.

pages/showProduct.html: جزء HTML لعرض تفاصيل المنتج في نافذة منبثقة.

6.2. الواجهة الخلفية (Serverless & Cloudflare)

### Vercel Serverless Functions (مجلد `api`)

مجلد `api` هو **العقل المدبر وقاعدة العمليات الخلفية** لتطبيق "بازار السويس". يتم تشغيل كل ملف JavaScript داخل هذا المجلد كـ "دالة عديمة الخادم" (Serverless Function) على منصة Vercel، وتحديدًا على بيئة الحافة (Edge Runtime) لتحقيق أقصى سرعة وأداء.

**المبدأ الأساسي:** اسم كل ملف داخل مجلد `api` يصبح هو الرابط (URL) الخاص بنقطة النهاية. على سبيل المثال، `api/users.js` يتحول إلى `https://your-domain.com/api/users`.

**الاتصال بقاعدة البيانات:** جميع الدوال تتصل بقاعدة بيانات **Turso** بشكل آمن عبر متغيرات البيئة.

**معالجة CORS:** جميع نقاط النهاية تتعامل بشكل صحيح مع طلبات **CORS** للسماح للواجهة الأمامية بالتواصل معها.

---

#### `api/users.js`
*   **الوظيفة**: إدارة كل ما يتعلق ببيانات المستخدمين.
*   **العمليات**:
    *   `POST`: إنشاء حساب جديد مع التحقق من عدم تكرار رقم الهاتف.
    *   `POST` (مع `action: 'verify'`): التحقق من كلمة المرور عند تسجيل الدخول.
    *   `GET`: جلب بيانات المستخدمين (إما الكل أو مستخدم معين).
    *   `PUT`: تحديث بيانات المستخدم (الملف الشخصي) أو ترقية المستخدمين إلى بائعين.

#### `api/products.js`
*   **الوظيفة**: إدارة بيانات المنتجات في السوق.
*   **العمليات**:
    *   `POST`: إضافة منتج جديد.
    *   `PUT`: تحديث منتج موجود.
    *   `GET`: جلب المنتجات سواء لبائع معين أو حسب الفئة.

#### `api/orders.js`
*   **الوظيفة**: إنشاء الطلبات الجديدة عند إتمام عملية الشراء.
*   **العمليات**:
    *   `POST`: يستقبل تفاصيل الطلب (المستخدم، المبلغ، قائمة المنتجات).
    *   **الموثوقية**: يستخدم `db.batch()` لتنفيذ عمليتي إدخال في معاملة واحدة (transaction)، مما يضمن سلامة البيانات.

#### `api/purchases.js`
*   **الوظيفة**: جلب سجل مشتريات المستخدم.
*   **العمليات**:
    *   `GET`: جلب جميع الطلبات السابقة لمستخدم معين مع تفاصيل المنتجات عبر ربط جداول `orders`, `order_items`, و `marketplace_products`.

#### `api/tokens.js`
*   **الوظيفة**: إدارة توكنات الإشعارات (FCM Tokens) الخاصة بالمستخدمين.
*   **العمليات**:
    *   `POST`: حفظ أو تحديث توكن جهاز المستخدم باستخدام معاملة (transaction) ذكية لضمان أن كل مستخدم يمتلك أحدث توكن فقط.
    *   `DELETE`: حذف التوكن عند تسجيل خروج المستخدم.
*   **الأهمية**: هذا الملف هو حجر الزاوية في نظام الإشعارات الفوري.

#### `api/send-notification.js`
*   **الوظيفة**: إرسال إشعارات Push باستخدام Firebase Admin SDK.
*   **العمليات**:
    *   `POST`: يستقبل `token`, `title`, `body` ويرسل إشعارًا إلى جهاز المستخدم المستهدف.
*   **بيئة التشغيل**: يعمل في بيئة Node.js التقليدية (وليس Edge) بسبب اعتماده على مكتبة `firebase-admin`.

---

### Cloudflare

*   **cloudflare-workers/file-manager.js**: عامل Cloudflare لإدارة الملفات بشكل آمن مع R2.

/login: لإصدار توكن مؤقت.

/upload: لرفع الملفات.

/download: لتحميل الملفات.

/delete: لحذف الملفات.

cloudflare-workers/cloudFileManager.js: مكتبة من جهة العميل للتفاعل مع file-manager.js.

7. تدفقات البيانات والمنطق (Data Flows & Logic)

تسجيل حساب جديد

الواجهة الأمامية: المستخدم يملأ نموذج التسجيل في register.html (الاسم ورقم الهاتف).

التحقق من المدخلات: يتم التحقق من صحة البيانات في المتصفح (مثل طول الاسم ورقم الهاتف). إذا أدخل المستخدم كلمة مرور، يتم طلب تأكيدها.

إنشاء مفتاح فريد: يتم استدعاء دالة generateSerialNumber() لإنشاء user_key فريد للمستخدم.

إرسال البيانات:

يتم استدعاء دالة addUser() في js/turo.js.

turo.js يرسل طلب POST إلى api/users.js مع بيانات المستخدم الجديد (username, phone, user_key, password, address).

قاعدة البيانات: api/users.js يقوم بحفظ المستخدم الجديد في جدول users. إذا كان رقم الهاتف موجودًا بالفعل، يتم إرجاع خطأ.

تسجيل الدخول التلقائي: بعد النجاح، يتم حفظ بيانات المستخدم في LocalStorage وتوجيهه إلى الصفحة الرئيسية كـ "مسجل دخوله".

تسجيل الدخول

الواجهة الأمامية: المستخدم يدخل رقم هاتفه في login.html.

طلب بيانات المستخدم:

يتم استدعاء دالة getUserByPhone() في js/turo.js.

turo.js يرسل طلب GET إلى api/users.js?phone={phone}.

التحقق من المستخدم: api/users.js يبحث في قاعدة البيانات عن المستخدم. إذا لم يتم العثور عليه، يرجع استجابة 404.

التحقق من كلمة المرور (إذا كانت مطلوبة):

إذا كان الحساب يحتوي على كلمة مرور، تظهر نافذة منبثقة تطلب من المستخدم إدخالها.

يتم استدعاء verifyUserPassword() التي ترسل طلب POST إلى api/users.js مع action: 'verify'.

الواجهة الخلفية تتحقق من صحة كلمة المرور. إذا كانت غير صحيحة، تتوقف العملية.

حفظ الجلسة: بعد التحقق، يتم إرجاع بيانات المستخدم الكاملة (user_key, username, is_seller, Address).

الواجهة الأمامية: يتم حفظ كائن المستخدم في LocalStorage تحت مفتاح loggedInUser.

تسجيل توكن FCM (إذا كان متاحًا): إذا كان التطبيق يستخدم إشعارات (Firebase)، يتم جلب التوكن الخاص بالجهاز وإرساله إلى api/tokens.js لحفظه في جدول user_tokens.

تحديث الواجهة:

يتم تحديث الواجهة في login.html لإظهار رسالة ترحيب وأزرار التحكم (مثل "إضافة منتج").

يتم استدعاء updateCartBadge() لتحميل شارة السلة الخاصة بالمستخدم.

تعديل بيانات المستخدم

الواجهة الأمامية: بعد تسجيل الدخول، يضغط المستخدم على زر "تعديل البيانات" في login.html.

عرض النموذج: تظهر نافذة منبثقة (SweetAlert2) تعرض بيانات المستخدم الحالية (الاسم، رقم الهاتف، العنوان) وتوفر حقولاً لتغيير كلمة المرور.

التحقق من كلمة المرور القديمة (إذا لزم الأمر):

إذا قام المستخدم بإدخال كلمة مرور جديدة، تظهر نافذة منبثقة أخرى تطلب منه إدخال كلمة المرور القديمة.

يتم استدعاء verifyUserPassword() من js/turo.js، والتي ترسل طلب POST إلى api/users.js مع action: 'verify' للتحقق من كلمة المرور القديمة.

إذا كانت كلمة المرور القديمة غير صحيحة، تتوقف العملية.

إرسال التحديثات:

بعد التحقق (أو إذا لم يتم تغيير كلمة المرور)، يتم تجميع البيانات التي تغيرت فقط.

يتم استدعاء دالة updateUser() في js/turo.js.

turo.js يرسل طلب PUT إلى api/users.js مع البيانات المحدثة وuser_key لتحديد المستخدم.

الواجهة الخلفية:

api/users.js يستقبل الطلب ويمنع تعديل user_key.

إذا تم تغيير رقم الهاتف، يتم التحقق من عدم تكراره.

يتم تنفيذ جملة UPDATE ديناميكية لتحديث الحقول المطلوبة فقط.

تحديث الواجهة: عند استلام استجابة النجاح، يتم تحديث بيانات المستخدم في LocalStorage فورًا وعرض رسالة نجاح.

عرض المنتجات حسب الفئة (في الصفحة الرئيسية)

الواجهة الأمامية (index.html): يتم تحميل جدول الفئات الرئيسية ديناميكيًا من shared/list.json.

اختيار فئة رئيسية: عند النقر على خلية فئة رئيسية، يظهر صف جديد أسفلها يعرض الفئات الفرعية المرتبطة بها.

اختيار فئة فرعية: عند النقر على فئة فرعية:

يتم استدعاء دالة getProductsByCategory(mainCatId, subCatId) من js/turo.js.

turo.js يرسل طلب GET إلى api/products.js?MainCategory={mainId}&SubCategory={subId}.

الواجهة الخلفية (api/products.js):

يستقبل الطلب ويقوم بتنفيذ استعلام SELECT مع JOIN على جدول users لجلب المنتجات التي تطابق الفئات المحددة، بالإضافة إلى اسم ورقم هاتف البائع.

توضيح: الواجهة الخلفية (api/products.js) تقوم بعمل JOIN مع جدول users لجلب بيانات البائع مع المنتج. يتم إرجاع user_key الخاص بالبائع مع كل منتج.

عرض المنتجات:

يتم إرجاع قائمة المنتجات إلى الواجهة الأمامية.

يتم إنشاء معرض صور (gallery-container) أسفل صف الفئات الفرعية، ويتم عرض صور المنتجات.

عند النقر على صورة منتج، تُستدعى window.showProductDetails() لعرض تفاصيل المنتج في نافذة منبثقة.

إضافة منتج جديد (للبائع)

الواجهة الأمامية: البائع يملأ النموذج في pages/addProduct.html ويختار الصور.

ضغط الصور: يتم ضغط الصور في المتصفح باستخدام Canvas API.

رفع الصور:

السكريبت يستدعي uploadFile2cf() لكل صورة.

cloudFileManager.js يطلب توكن من Cloudflare Worker (/login).

يتم رفع كل صورة مضغوطة إلى R2 عبر Cloudflare Worker (/upload).

حفظ بيانات المنتج:

بعد نجاح رفع كل الصور، يتم تجميع بيانات المنتج وأسماء الصور.

يتم استدعاء addProduct() في js/turo.js.

turo.js يرسل طلب POST إلى api/products.js مع بيانات المنتج الكاملة (بما في ذلك product_key الذي تم إنشاؤه في الواجهة الأمامية).

قاعدة البيانات: api/products.js يقوم بحفظ بيانات المنتج في جدول products بقاعدة بيانات Turso.

تعديل منتج موجود (للبائع)

الواجهة الأمامية: البائع يفتح نموذج التعديل الذي يتم ملؤه ببيانات المنتج الحالية وصوره.

إدارة الصور:

يمكن للبائع حذف الصور القديمة أو إضافة صور جديدة.

عند الحفظ، يتم تحديد الصور التي حُذفت والصور الجديدة التي أُضيفت.

حذف الصور القديمة:

السكريبت يستدعي deleteFile2cf() لكل صورة تم حذفها.

cloudFileManager.js يرسل طلب DELETE إلى Cloudflare Worker (/delete).

رفع الصور الجديدة:

يتم ضغط ورفع الصور الجديدة بنفس طريقة "إضافة منتج جديد".

تحديث بيانات المنتج:

بعد إدارة الصور، يتم تجميع بيانات المنتج المحدثة والقائمة النهائية لأسماء الصور.

يتم استدعاء updateProduct() في js/turo.js.

turo.js يرسل طلب PUT إلى api/products.js مع البيانات الجديدة.

قاعدة البيانات: api/products.js يقوم بتحديث سجل المنتج في قاعدة بيانات Turso.

إضافة منتج إلى سلة المشتريات (للمشتري)

الواجهة الأمامية: المشتري يتصفح المنتجات في index.html.

عرض التفاصيل: عند النقر على صورة منتج، تُستدعى window.showProductDetails() التي تحمّل pages/showProduct.html وتعرض تفاصيل المنتج في نافذة منبثقة.

تحديد الكمية: المشتري يحدد الكمية المطلوبة.

الإضافة للسلة: عند النقر على زر "إضافة للسلة":

يتم التحقق أولاً من أن المستخدم مسجل دخوله. إذا لم يكن، تظهر رسالة تطلب منه تسجيل الدخول.

تُستدعى دالة addToCart() من js/cart.js.

addToCart() تستقبل كائن المنتج الذي يتضمن seller_key (وهو user_key الخاص بالبائع)، ثم تقوم بجلب السلة الحالية من LocalStorage باستخدام مفتاح مربوط بـ user_key الخاص بالمستخدم.

إذا كان المنتج موجودًا، يتم تحديث كميته. إذا لم يكن، يتم إضافته كعنصر جديد.

يتم حفظ السلة المحدثة مرة أخرى في LocalStorage بنفس المفتاح المربوط بالمستخدم.

تحديث الواجهة:

يتم إرسال حدث cartUpdated لتحديث شارة عدد المنتجات في السلة (cart-badge) في رأس الصفحة.

8. تدفقات متقدمة

عرض سجل المشتريات (للمستخدم المسجل)

الواجهة الأمامية: المستخدم يضغط على زر "المشتريات" في لوحة التحكم (login.html).

طلب البيانات:

تُستدعى دالة showPurchasesModal() التي بدورها تستدعي getUserPurchases(user_key) من js/turo.js.

turo.js يرسل طلب GET إلى api/purchases.js?user_key={userKey}.

الواجهة الخلفية:

api/purchases.js يستقبل الطلب ويتحقق من user_key.

يقوم بتنفيذ استعلام JOIN بين جداول orders, order_items, و marketplace_products لجلب تفاصيل كل منتج تم شراؤه (الاسم، الصورة، السعر، الكمية، تاريخ الطلب، حالة الطلب).

عرض البيانات:

يتم إرجاع قائمة بالمنتجات المشتراة إلى الواجهة الأمامية.

تُعرض البيانات في نافذة منبثقة منسقة، مع إظهار حالة كل طلب (قيد المعالجة، جارٍ الشحن، تم التسليم).

إتمام عملية الشراء (Checkout)

الواجهة الأمامية: المستخدم يضغط على زر "إتمام الشراء" في نافذة السلة المنبثقة (cart-modal).

تجميع البيانات:

يتم جلب بيانات المستخدم المسجل من LocalStorage.

يتم جلب محتويات السلة من LocalStorage.

يتم حساب المبلغ الإجمالي للطلب وإنشاء مفتاح فريد للطلب (order_key).

يتم إنشاء مفتاح فريد للطلب (order_key).

إرسال الطلب:

تُستدعى دالة createOrder() من js/turo.js.

turo.js يرسل طلب POST إلى api/orders.js يحتوي على order_key, user_key, total_amount, ومصفوفة بالمنتجات المطلوبة (items)، حيث يحتوي كل عنصر في المصفوفة على product_key, quantity, و seller_key.

الواجهة الخلفية (api/orders.js):

يستقبل الطلب ويقوم بتنفيذ معاملة (Transaction) في قاعدة البيانات.

أولاً: يُدرج سجل الطلب الرئيسي في جدول orders (المفتاح، المستخدم، الإجمالي).

ثانياً: يمر على كل عنصر في مصفوفة items ويُدرجه في جدول order_items (مفتاح الطلب، مفتاح المنتج، الكمية، ومفتاح البائع seller_key).

إذا نجحت جميع العمليات، يتم تأكيد المعاملة. إذا فشلت أي عملية، يتم التراجع عن كل شيء.

تحديث الواجهة:

عند استلام استجابة النجاح، يتم إفراغ سلة المشتريات من LocalStorage.

يتم تحديث شارة السلة.

تُعرض رسالة نجاح للمستخدم مع رقم الطلب.

8. تدفق نظام الإشعارات (Firebase Cloud Messaging) - شرح دقيق

يعمل النظام عبر ثلاث مراحل متكاملة لضمان وصول الإشعارات للمستخدمين بشكل فعال.

#### 1. تسجيل الجهاز (الواجهة الأمامية - Client-Side)

هذه هي الخطوة التي يتم فيها ربط جهاز المستخدم بحسابه في التطبيق.

*   **متى؟**: تتم هذه العملية **فورًا** بعد نجاح تسجيل دخول المستخدم، وتحديدًا عند استدعاء دالة `handleLoginSuccess` في `js/login-page.js`.
*   **كيف؟**:
    1.  تستدعي `handleLoginSuccess` دالة `setupFCM()` الموجودة في `js/auth.js`.
    2.  `setupFCM()` تطلب من المستخدم الإذن لعرض الإشعارات.
    3.  عند الموافقة، تحصل على "توكن" فريد (FCM Token) من Firebase يمثل "عنوان" هذا المتصفح على هذا الجهاز.
    4.  يتم تخزين هذا التوكن في `localStorage` لتقليل طلبات الحصول على توكن جديد في كل مرة.
    5.  أخيرًا، يتم إرسال التوكن مع `user_key` الخاص بالمستخدم إلى الواجهة الخلفية (`POST /api/tokens`) ليتم حفظه في قاعدة البيانات.

#### 2. تخزين وإدارة التوكن (الواجهة الخلفية - Backend)

هذه المرحلة مسؤولة عن حفظ "عناوين" أجهزة المستخدمين بشكل آمن وموثوق.

*   **الملف المسؤول**: `api/tokens.js`.
*   **الآلية**:
    1.  عند استلام طلب `POST`، يستخدم الملف معاملة قاعدة بيانات (Transaction) لضمان سلامة البيانات.
    2.  **داخل المعاملة**:
        *   **أولاً**: يتم حذف أي توكن قديم مسجل لنفس المستخدم (`DELETE ... WHERE user_key = ?`). هذا يضمن أنه إذا سجل المستخدم دخوله من جهاز جديد، يتم اعتماد التوكن الجديد فقط.
        *   **ثانياً**: يتم حذف أي ارتباط قديم لنفس التوكن إذا كان مسجلاً لمستخدم آخر (`DELETE ... WHERE fcm_token = ?`). هذه خطوة ذكية تمنع إرسال إشعارات لمستخدم قديم في حال تم استخدام جهازه من قبل مستخدم جديد.
        *   **ثالثاً**: يتم إدراج الارتباط الجديد بين `user_key` و `fcm_token` في جدول `user_tokens`.
    *   هذه الطريقة تضمن أن كل مستخدم يمتلك أحدث توكن فقط، وأن كل توكن مرتبط بمستخدم واحد فقط.

#### 3. إرسال واستقبال الإشعارات

*   **الإرسال (من الخادم)**:
    *   **الملف المسؤول**: `api/send-notification.js`.
    *   عندما يحدث إجراء معين (مثل تغيير حالة طلب)، يمكن استدعاء هذا الـ API.
    *   يتم جلب `fcm_token` الخاص بالمستخدم المستهدف من جدول `user_tokens`.
    *   يستخدم `api/send-notification.js` مكتبة `firebase-admin` لإرسال رسالة إلى التوكن المحدد عبر خوادم Firebase.
*   **الاستقبال (في المتصفح)**:
    *   **إذا كان التطبيق مغلقًا**: يتولى ملف `firebase-messaging-sw.js` (Service Worker) مهمة استقبال الإشعار وعرضه.
    *   **إذا كان التطبيق مفتوحًا**: تستقبل دالة `onMessage` (في `js/auth.js`) بيانات الإشعار وتعرضه مباشرة في الصفحة.

#### تحسينات مقترحة

*   **حذف التوكن عند تسجيل الخروج**:
    *   **المشكلة**: حاليًا، عند تسجيل الخروج، يتم حذف التوكن من `localStorage` فقط، ولكنه يبقى في قاعدة البيانات.
    *   **الحل**: إرسال طلب `DELETE` إلى `api/tokens.js` قبل حذف بيانات المستخدم من `localStorage` لضمان عدم إرسال إشعارات لجهاز غير نشط.

*   **تبسيط منطق الحذف**:
    *   **المشكلة**: طلب `DELETE` يتطلب `user_key` و `token`.
    *   **الحل**: تعديل الطلب ليحذف أي توكن مرتبط بـ `user_key` المحدد فقط، مما يجعل عملية الحذف عند تسجيل الخروج أبسط وأكثر موثوقية.

*   **نقل مفاتيح Firebase إلى متغيرات البيئة**:
    *   **المشكلة**: مفاتيح `firebaseConfig` مكتوبة بشكل مباشر في ملفات JavaScript (`js/auth.js` و `firebase-messaging-sw.js`).
    *   **الحل**: نقل هذه المفاتيح إلى متغيرات البيئة في Vercel لزيادة الأمان وسهولة الإدارة.

9. كيفية البدء (Getting Started)

استنساخ المشروع:

git clone <repository-url>
cd <project-directory>


إعداد متغيرات البيئة:

أنشئ ملف .env في جذر المشروع وأضف متغيرات Vercel.

قم بتحديث ملف wrangler.toml بمعلومات Cloudflare الخاصة بك.

نشر الواجهة الخلفية:

انشر دوال Vercel باستخدام vercel deploy.

انشر عامل Cloudflare باستخدام npx wrangler deploy.

تشغيل الواجهة الأمامية:

يمكنك فتح ملفات الـ HTML مباشرة في المتصفح أو استخدام خادم محلي بسيط.