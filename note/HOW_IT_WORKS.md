
# شرح تفصيلي لآلية عمل تطبيق SuezBazaar

هذا المستند يشرح بالتفصيل كيف يقوم التطبيق بتحويل موقع ويب محلي (مخزن داخل التطبيق) إلى تجربة تشبه التطبيق الأصلي، مع التركيز على كيفية تحميل المحتوى والتعامل مع الوظائف المتقدمة مثل رفع الصور والملفات.

## الجزء الأول: تحميل الموقع المحلي داخل التطبيق

الفكرة الأساسية هي أننا لا نفتح متصفح ويب خارجي (مثل Chrome)، بل نستخدم مكونًا أصليًا من أندرويد اسمه `WebView` لعرض الموقع مباشرةً داخل شاشة التطبيق الرئيسية.

### 1. إعداد واجهة المستخدم (`activity_main.xml`)
تم حجز مساحة على الشاشة لعرض محتوى الويب عن طريق إضافة عنصر `<WebView>` داخل ملف التصميم.

```xml
<!-- في ملف res/layout/activity_main.xml -->
<WebView
    android:id="@+id/webView"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />
```

### 2. تهيئة WebView في الكود (`MainActivity.kt`)
في دالة `onCreate`، تبدأ العملية الفعلية لتحميل الموقع:

- **تمكين JavaScript**: السطر `webView.settings.javaScriptEnabled = true` هو خطوة حيوية. معظم مواقع الويب الحديثة تعتمد بشكل كبير على JavaScript. بدون هذا السطر، لن تعمل الوظائف التفاعلية في موقعك.

### 3. تحميل الأصول المحلية (Local Assets) بذكاء
بدلاً من تحميل الموقع من خادم بعيد، يقوم التطبيق بتحميل الملفات (HTML, CSS, JS) المخزنة مباشرةً داخل مجلد `assets` الخاص بالتطبيق.

- **`WebViewAssetLoader`**: هذا الكائن المتقدم من مكتبة `androidx.webkit` يقوم باعتراض طلبات الشبكة الصادرة من `WebView`.
- **تحديد مسار الأصول**:
  ```kotlin
  val assetLoader = WebViewAssetLoader.Builder()
      .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this))
      .build()
  ```
  هذا الكود يخبر `AssetLoader` بما يلي: "إذا حاول `WebView` طلب أي ملف من المسار الجذر (`/`)، فلا تبحث عنه على الإنترنت، بل ابحث عنه في مجلد `assets` الخاص بالتطبيق".

- **اعتراض الطلبات باستخدام `WebViewClient`**:
  ```kotlin
  webView.webViewClient = object : WebViewClient() {
      override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
          return assetLoader.shouldInterceptRequest(request.url)
      }
  }
  ```
  هنا نخبر `WebView` باستخدام `AssetLoader`. في كل مرة يحاول فيها `WebView` تحميل مورد، يتم تمرير الطلب إلى `AssetLoader` الذي يقوم بدوره بتحميل الملف من مجلد `assets` المحلي.

### 4. تحميل الصفحة الابتدائية
```kotlin
webView.loadUrl("https://appassets.androidplatform.net/index.html")
```
- **لماذا هذا الرابط؟**: `https://appassets.androidplatform.net` هو عنوان URL افتراضي وآمن تستخدمه مكتبة `WebViewAssetLoader`. عندما يرى `WebViewClient` هذا الطلب، يعترضه. وبما أن المسار هو `/index.html`، فإن `AssetLoader` الذي أعددناه سيقوم بتحميل ملف `index.html` من مجلد `assets` وعرضه.

---

## الجزء الثاني: التعامل مع رفع الصور والملفات

هذا هو الجزء الأكثر تعقيدًا وقوة. عندما يضغط المستخدم على زر `<input type="file">` في صفحة الويب، يتم تفعيل آلية متكاملة بين `WebView` والنظام الأصلي للأندرويد.

### 1. بداية العملية: `WebChromeClient.onShowFileChooser`
لكي يتمكن `WebView` من فتح منتقي الملفات أو الكاميرا، يجب أن نعرّف `WebChromeClient` مخصص.

```kotlin
webView.webChromeClient = object : WebChromeClient() {
    override fun onShowFileChooser(
        webView: WebView,
        filePathCallback: ValueCallback<Array<Uri>>,
        fileChooserParams: FileChooserParams
    ): Boolean {
        // ... الكود هنا ...
        return true
    }
}
```
هذه الدالة هي الجسر بين الويب والأندرويد. عندما يتم الضغط على زر اختيار الملف في الويب، تستدعي `WebView` هذه الدالة في كود الكوتلن.

### 2. تجهيز خيارات المستخدم: الكاميرا أو معرض الصور
داخل `onShowFileChooser`، نقوم بإنشاء `Intent` (نية) لفتح شاشة تتيح للمستخدم الاختيار بين التقاط صورة جديدة أو اختيار صورة موجودة.

- **نية التقاط صورة (`ACTION_IMAGE_CAPTURE`)**:
    1.  **إنشاء ملف مؤقت**: دالة `createImageFile()` تقوم بإنشاء ملف صورة فارغ في مساحة تخزين آمنة خاصة بالتطبيق.
    2.  **`FileProvider`**: هذا هو الجزء الأهم للأمان. بدلاً من مشاركة مسار الملف الحقيقي مع تطبيق الكاميرا (وهو أمر محظور في إصدارات أندرويد الحديثة)، نستخدم `FileProvider` لإنشاء عنوان `Uri` آمن (يبدأ بـ `content://`).
    3.  **تمرير الـ `Uri` للكاميرا**: نمرر هذا الـ `Uri` إلى نية الكاميرا. سيقوم تطبيق الكاميرا بحفظ الصورة الملتقطة مباشرة في هذا العنوان.

- **نية اختيار ملف (`ACTION_GET_CONTENT`)**: هذه نية قياسية في أندرويد تفتح للمستخدم معرض الصور أو مدير الملفات لاختيار صورة أو أكثر.

- **دمج الخيارين (`ACTION_CHOOSER`)**: نقوم بدمج النيتين السابقتين في "نية اختيار" واحدة، والتي تعرض للمستخدم مربع حوار يسأل "التقط صورة" أو "اختر من المعرض".

### 3. استقبال النتائج: `ActivityResultLauncher`
نستخدم الآلية الحديثة `registerForActivityResult` لاستقبال الصورة (أو الصور) التي اختارها المستخدم.

```kotlin
private val fileChooserLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
    // ... الكود هنا ...
}
```

عندما يختار المستخدم صورة أو يلتقطها ويعود للتطبيق، يتم تنفيذ الكود داخل هذا الـ `Launcher`.

- **منطق المعالجة**:
    1.  **في حالة الكاميرا**: لا تعود بيانات في `result.data`. لكننا نكون قد حفظنا مسار الصورة في المتغير `cameraPhotoPath`، لذلك نستخدمه.
    2.  **في حالة المعرض**: `result.data` يحتوي على عناوين `Uri` الخاصة بالصور التي تم اختيارها.
- **إرجاع النتائج إلى `WebView`**:
  ```kotlin
  filePathCallback?.onReceiveValue(results.toTypedArray())
  ```
  في النهاية، وبعد تجميع كل عناوين `Uri` للصور المختارة، نقوم باستدعاء `onReceiveValue` على `filePathCallback` الذي أعطانا إياه `WebView` في البداية. هذا الإجراء "يُرجع" الملفات المختارة إلى صفحة الويب، فتظهر في عنصر `<input type="file">` وتكون جاهزة للرفع أو المعالجة بواسطة كود JavaScript.

### الخلاصة
بهذه الطريقة، يوفر التطبيق تجربة سلسة ومتكاملة، حيث يشعر المستخدم أنه يتعامل مع تطبيق أصلي بالكامل، حتى عند تنفيذ مهام معقدة مثل التفاعل مع كاميرا الجهاز ونظام الملفات.
