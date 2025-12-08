# تكامل CameraModule في صفحة إضافة المنتجات

## نظرة عامة
تم دمج `js/cameraModule.js` بنجاح في صفحة `pages/productAdd.html` لتحسين وظائف الكاميرا وإدارة الصور.

## التغييرات الرئيسية

### 1. إزالة الكود القديم
تم إزالة الكود القديم الخاص بالكاميرا والذي كان يتضمن:
- دالة `openDesktopCamera()` المخصصة
- إدارة يدوية لـ `getUserMedia`
- معالجة يدوية للكاميرا على سطح المكتب

### 2. تكامل CameraModule

#### تهيئة الموديول
تمت إضافة تهيئة `CameraModule` في دالة `initializeAddProductForm()`:

```javascript
// تهيئة CameraModule
if (window.CameraModule) {
    CameraModule.init({
        dbName: 'suzeBazaarIMAGES',
        storeName: 'productAddImages',
        enableBarcodeScanning: false
    }).then(() => {
        console.log('%c[CameraModule] Initialized successfully', 'color: green;');
    }).catch(err => {
        console.error('[CameraModule] Initialization failed:', err);
    });
}
```

#### معالج زر الكاميرا الجديد
تم استبدال معالج زر الكاميرا القديم بالكود التالي:

```javascript
takePhotoBtn.addEventListener('click', async () => {
    console.log('[Camera] Opening CameraModule...');
    
    try {
        // فتح نافذة الكاميرا من CameraModule
        await CameraModule.open();
        
        // الاستماع لحدث إغلاق الكاميرا للحصول على الصور الملتقطة
        const checkForImages = setInterval(() => {
            const capturedImages = CameraModule.getCapturedImages();
            
            // التحقق من وجود صور جديدة
            if (capturedImages.length > 0) {
                console.log(`[Camera] Found ${capturedImages.length} captured images`);
                
                // معالجة كل صورة ملتقطة
                capturedImages.forEach(imgData => {
                    // إنشاء ملف Blob من البيانات
                    const file = new File([imgData.blob], `camera_${Date.now()}.png`, { 
                        type: imgData.mimeType || 'image/png' 
                    });
                    
                    // إضافة الصورة إلى قائمة الصور
                    handleNewFiles([file]);
                });
                
                // مسح الصور من CameraModule بعد المعالجة
                CameraModule.clearCapturedImages();
                clearInterval(checkForImages);
            }
        }, 500);
        
        // إيقاف التحقق بعد 30 ثانية (timeout)
        setTimeout(() => {
            clearInterval(checkForImages);
        }, 30000);
        
    } catch (err) {
        console.error('[Camera] Error opening CameraModule:', err);
        Swal.fire('خطأ!', 'لم نتمكن من فتح الكاميرا. يرجى المحاولة مرة أخرى.', 'error');
    }
});
```

## المزايا الجديدة

### 1. دعم ZXing للباركود
- يدعم `CameraModule` مكتبة ZXing لقراءة الباركود (معطل حالياً)
- يمكن تفعيله عند الحاجة بتغيير `enableBarcodeScanning: true`

### 2. إدارة أفضل للكاميرات
- التبديل التلقائي بين الكاميرات المتاحة
- دعم الكاميرا الأمامية والخلفية
- Fallback تلقائي إلى MediaDevices API إذا فشل ZXing

### 3. إدارة محسّنة للذاكرة
- تحرير تلقائي لموارد الكاميرا
- إدارة أفضل لـ Object URLs
- تخزين الصور في IndexedDB

### 4. واجهة مستخدم محسّنة
- نافذة كاميرا احترافية مع أزرار تحكم
- معاينة مصغرة للصور الملتقطة
- إمكانية حذف الصور قبل الحفظ
- مؤشرات تحميل وإشعارات

## كيفية الاستخدام

1. **فتح الكاميرا**: انقر على زر الكاميرا في صفحة إضافة المنتج
2. **التقاط الصور**: استخدم زر "التقاط" لالتقاط صورة
3. **معاينة**: شاهد الصور الملتقطة في المعاينات المصغرة
4. **حفظ**: اضغط "حفظ الكل" أو أغلق النافذة لإضافة الصور إلى المنتج
5. **حذف**: يمكنك حذف أي صورة قبل الحفظ

## الملفات المطلوبة

تأكد من تحميل الملفات التالية في `index.html`:

```html
<!-- مكتبة ZXing للباركود -->
<script src="https://unpkg.com/@zxing/library@latest"></script>

<!-- موديول الكاميرا -->
<script src="/js/cameraModule.js"></script>

<!-- أنماط الكاميرا -->
<link rel="stylesheet" href="/style/cameraPopup.css">
```

## الإعدادات القابلة للتخصيص

يمكن تخصيص الإعدادات في `initializeAddProductForm()`:

```javascript
CameraModule.init({
    dbName: 'suzeBazaarIMAGES',           // اسم قاعدة البيانات
    storeName: 'productAddImages',         // اسم المخزن
    enableBarcodeScanning: false           // تفعيل قراءة الباركود
});
```

## الاختبار

للتأكد من عمل التكامل بشكل صحيح:

1. افتح صفحة إضافة المنتج
2. افتح Console في المتصفح
3. ابحث عن الرسائل التالية:
   - `[ProductForm] Initializing simplified form...`
   - `[CameraModule] Initialized successfully`
4. انقر على زر الكاميرا وتحقق من فتح النافذة
5. التقط صورة وتحقق من ظهورها في المعاينة

## الملاحظات

- تم الحفاظ على جميع الوظائف الأخرى في الصفحة
- لم يتم تغيير معالجة الصور أو الضغط
- يعمل التكامل مع جميع المتصفحات الحديثة
- يدعم الأجهزة المحمولة وأجهزة سطح المكتب
