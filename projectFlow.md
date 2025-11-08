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

Vercel Serverless Functions

api/users.js: لإدارة بيانات المستخدمين (إنشاء، جلب، تحديث).

POST /api/users: إنشاء مستخدم جديد.

POST /api/users (مع action: 'verify'): للتحقق من صحة كلمة مرور المستخدم.

GET /api/users: جلب كل المستخدمين.

GET /api/users?phone={phone}: جلب مستخدم معين.

PUT /api/users: تحديث بيانات مستخدم واحد (تعديل الملف الشخصي) أو مجموعة مستخدمين (مثل ترقيتهم لبائعين).

api/products.js: لإدارة بيانات المنتجات.

POST /api/products: إنشاء منتج جديد.

PUT /api/products: تحديث منتج موجود.

GET /api/products?user_key={userKey}: جلب منتجات بائع معين.

GET /api/products?MainCategory={mainId}&SubCategory={subId}: جلب المنتجات حسب الفئة.

api/orders.js: لإدارة الطلبات الجديدة (Checkout).

POST /api/orders: إنشاء طلب جديد مع بنوده.

api/purchases.js: لجلب سجل مشتريات المستخدم.

GET /api/purchases?user_key={userKey}: جلب جميع الطلبات السابقة لمستخدم معين مع تفاصيل المنتجات.

api/tokens.js: لإدارة توكنات FCM.

POST /api/tokens: حفظ توكن FCM جديد للمستخدم.

DELETE /api/tokens: حذف توكن FCM عند تسجيل الخروج أو انتهاء صلاحيته.

Cloudflare

cloudflare-workers/file-manager.js: عامل Cloudflare لإدارة الملفات بشكل آمن مع R2.

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

8. تدفق نظام الإشعارات (Firebase Cloud Messaging)

يعتمد المشروع على بنية متكاملة وقوية لإدارة إشعارات المستخدمين باستخدام خدمة Firebase Cloud Messaging (FCM). الهدف هو إبقاء المستخدمين على اطلاع دائم بالمستجدات الهامة، مثل تحديثات حالة الطلبات أو العروض الجديدة.

ينقسم النظام إلى ثلاثة أجزاء رئيسية:

1.  **تسجيل الجهاز والتوكن (الواجهة الأمامية - Client-Side)**
2.  **تخزين وإدارة التوكنات (الواجهة الخلفية - Backend)**
3.  **إرسال الإشعارات (من الخادم - Server-Side)**

---

#### 1. تسجيل الجهاز والتوكن (الواجهة الأمامية)

هذه هي الخطوة الأولى التي يتم فيها ربط جهاز المستخدم بحسابه في النظام.

*   **متى تحدث؟**: تتم هذه العملية مباشرة **بعد نجاح تسجيل دخول المستخدم**.
*   **الآلية**:
    1.  **طلب الإذن**: بمجرد تسجيل الدخول، يطلب التطبيق من المستخدم الإذن لعرض الإشعارات عبر نافذة منبثقة في المتصفح.
    2.  **الحصول على التوكن**: في حال موافقة المستخدم، تتواصل الواجهة الأمامية مع خوادم Firebase للحصول على "توكن" فريد (FCM Token). هذا التوكن هو بمثابة "عنوان" فريد لهذا المتصفح على هذا الجهاز.
    3.  **إرسال التوكن للخادم**: يتم إرسال هذا التوكن مع `user_key` الخاص بالمستخدم المسجل حاليًا إلى الواجهة الخلفية عبر طلب `POST` إلى نقطة النهاية `/api/tokens`.

#### 2. تخزين وإدارة التوكنات (الواجهة الخلفية)

هذا الجزء مسؤول عن حفظ "عناوين" أجهزة المستخدمين للرجوع إليها عند الحاجة لإرسال إشعار.

*   **الملف المسؤول**: `api/tokens.js`
*   **قاعدة البيانات**: يتم استخدام جدول `user_tokens` في قاعدة بيانات Turso لتخزين العلاقة بين المستخدم والتوكن.
*   **الآلية عند استلام طلب `POST`**:
    1.  **التحقق من البيانات**: يتأكد الخادم من استلام `user_key` و `token`.
    2.  **ضمان عدم التكرار (عملية ذرية - Transaction)**: لضمان أن كل مستخدم لديه توكن واحد فقط وأن كل توكن مرتبط بمستخدم واحد فقط، يتم تنفيذ الخطوات التالية داخل معاملة واحدة:
        *   **حذف التوكن القديم للمستخدم**: `DELETE FROM user_tokens WHERE user_key = ?`
          *   هذا يضمن أنه إذا سجل المستخدم الدخول من جهاز جديد، يتم اعتماد التوكن الجديد فقط.
        *   **حذف أي ارتباط قديم للتوكن**: `DELETE FROM user_tokens WHERE fcm_token = ?`
          *   هذه خطوة احترازية مهمة. إذا سجل مستخدم "أ" دخوله على جهاز كان يستخدمه مستخدم "ب"، فإنها تضمن إزالة ارتباط التوكن القديم بالمستخدم "ب".
        *   **إدراج السجل الجديد**: `INSERT INTO user_tokens (user_key, fcm_token) VALUES (?, ?)`
          *   يتم حفظ الارتباط الجديد بين المستخدم والتوكن.
*   **الحذف عند تسجيل الخروج**: عند تسجيل خروج المستخدم، يتم إرسال طلب `DELETE` إلى `/api/tokens` لحذف التوكن من قاعدة البيانات، مما يمنع إرسال إشعارات إلى جهاز لم يعد المستخدم مسجلاً للدخول عليه.

#### 3. استقبال وإرسال الإشعارات

*   **استقبال الإشعارات (الواجهة الأمامية)**:
    *   **إذا كان التطبيق في الخلفية أو مغلقًا**: يتولى ملف `firebase-messaging-sw.js` (Service Worker) مهمة استقبال الإشعار وعرضه مباشرة.
    *   **إذا كان التطبيق مفتوحًا وفي الواجهة**: يتم استقبال بيانات الإشعار وعرضها كإشعار فوري باستخدام `new Notification()`.

*   **إرسال الإشعارات (من الخادم)**:
    *   هذه العملية تتم من الخادم عند وقوع حدث معين (مثل تغيير حالة طلب من "قيد المعالجة" إلى "جارٍ الشحن").
    *   **الآلية**:
        1.  يحدد الخادم المستخدم الذي يجب إرسال الإشعار إليه (`user_key`).
        2.  يبحث في جدول `user_tokens` عن الـ `fcm_token` المرتبط بهذا الـ `user_key`.
        3.  باستخدام مكتبة `firebase-admin` على الخادم، يتم إرسال رسالة إلى التوكن المحدد.
        4.  تستلم خوادم Firebase الرسالة وتقوم بتوصيلها إلى جهاز المستخدم المستهدف.

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