# الدليل الفني لمشروع "بازار السويس"

**آخر تحديث: 4 نوفمبر 2025**

## 1. نظرة عامة على المشروع (Project Overview)
"بازار السويس" هو تطبيق ويب لسوق إلكتروني (E-commerce) يهدف إلى إنشاء منصة تجارية للبائعين والمشترين في السويس.

**الأهداف الرئيسية:**
- السماح للمستخدمين بإنشاء حسابات وتسجيل الدخول.
- تمكين البائعين المعتمدين من إضافة منتجاتهم، بما في ذلك الصور والتفاصيل.
- تمكين المسؤولين (Admins) من إدارة المستخدمين وترقية حساباتهم إلى "بائع".
- عرض المنتجات والفئات للمشترين.
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
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  user_key TEXT NOT NULL UNIQUE,
  is_seller INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### جدول `products`
```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_key) REFERENCES users (user_key)
);
```

## 6. هيكل الملفات وشرحها (File Structure & Breakdown)

### 6.1. الواجهة الأمامية (HTML & Client-Side JS)

- **`index.html`**: الصفحة الرئيسية ونقطة الدخول.
- **`login.html`**: صفحة تسجيل الدخول ولوحة تحكم المستخدم (بائع/مسؤول).
- **`register.html`**: صفحة إنشاء حساب جديد.
- **`js/auth.js`**: لإدارة حالة تسجيل الدخول (login/logout).
- **`js/config.js`**: يحتوي على الإعدادات العامة مثل `baseURL` للـ API.
- **`js/turo.js`**: طبقة الاتصال بالـ API (API Service Layer) للتفاعل مع الواجهة الخلفية.
- **`pages/addProduct.html`**: جزء HTML يحتوي على نموذج إضافة منتج جديد، يتم تحميله ديناميكيًا.

### 6.2. الواجهة الخلفية (Serverless & Cloudflare)

#### Vercel Serverless Functions

- **`api/users.js`**: لإدارة بيانات المستخدمين (إنشاء، جلب، تحديث).
  - `POST /api/users`: إنشاء مستخدم جديد.
  - `GET /api/users`: جلب كل المستخدمين.
  - `GET /api/users?phone={phone}`: جلب مستخدم معين.
  - `PUT /api/users`: تحديث مجموعة مستخدمين (مثل ترقيتهم لبائعين).

- **`api/products.js`**: لإدارة بيانات المنتجات.
  - `POST /api/products`: إنشاء منتج جديد.
  - `GET /api/products`: جلب كل المنتجات (يمكن تطويره ليدعم الفلترة).

#### Cloudflare

- **`cloudflare-workers/file-manager.js`**: عامل Cloudflare لإدارة الملفات بشكل آمن مع R2.
  - `/login`: لإصدار توكن مؤقت.
  - `/upload`: لرفع الملفات.
  - `/download`: لتحميل الملفات.
  - `/delete`: لحذف الملفات.

- **`cloudflare-workers/cloudFileManager.js`**: مكتبة من جهة العميل للتفاعل مع `file-manager.js`.

## 7. تدفق البيانات والمنطق (Data Flow & Logic)

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
    - `turo.js` يرسل طلب `POST` إلى `api/products.js` مع بيانات المنتج.
5.  **قاعدة البيانات**: `api/products.js` يقوم بحفظ بيانات المنتج في جدول `products` بقاعدة بيانات Turso.

## 8. كيفية البدء (Getting Started)

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
