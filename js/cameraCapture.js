/* cameraCapture.js
   دالة لفتح الكاميرا/اختيار صورة وتخزينها في متغير عام.
   الاستخدام:
     openCameraAndCapture() // يستخدم المتغير العام window.suzeBazaarCapturedImage
     openCameraAndCapture({ globalVarName: 'myImageVar' }).then(dataUrl => ...)
*/

(function () {
  'use strict';

  /**
   * فتح الكاميرا/نافذة اختيار صورة، وتحويلها إلى Data URL،
   * وتخزينها في متغير عام على window باسم محدد (افتراضياً suzeBazaarCapturedImage).
   *
   * @param {Object|string} options أو اسم المتغير العام كـ string.
   *   options = {
   *     globalVarName: 'suzeBazaarCapturedImage', // اسم المتغير العام على window
   *     maxWidth: 1600,    // اختياري: أقصى عرض لإعادة القياس (px). إذا null => لا تغيير الحجم.
   *     quality: 0.9       // اختياري: جودة الصورة عند ضغط JPEG (0..1)
   *   }
   * @returns {Promise<string|null>} Promise التي تحل إلى Data URL الصورة أو null إذا ألغى المستخدم.
   */
  function openCameraAndCapture(options) {
    var opts = {
      globalVarName: 'suzeBazaarCapturedImage',
      maxWidth: 1600,
      quality: 0.9
    };

    // إذا مرر المستخدم اسم متغير كسلسلة، اعتبره globalVarName
    if (typeof options === 'string') {
      opts.globalVarName = options;
    } else if (typeof options === 'object' && options !== null) {
      if (options.globalVarName) opts.globalVarName = options.globalVarName;
      if (typeof options.maxWidth === 'number') opts.maxWidth = options.maxWidth;
      if (typeof options.quality === 'number') opts.quality = options.quality;
    }

    return new Promise(function (resolve) {
      // إنشاء عنصر input مخفي لالتقاط الصورة
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // يطلب الكاميرا الخلفية على الأجهزة الداعمة
      input.style.display = 'none';
      input.setAttribute('aria-hidden', 'true');

      // عندما يختار المستخدم ملفاً أو يلتقط صورة
      input.addEventListener('change', function onFileChange(e) {
        var file = input.files && input.files[0];
        cleanup();

        if (!file) {
          // المستخدم ألغى
          resolve(null);
          return;
        }

        // قراءة الملف كـ DataURL
        var reader = new FileReader();
        reader.onerror = function () {
          console.error('Failed to read file');
          resolve(null);
        };
        reader.onload = function () {
          var dataUrl = reader.result;

          // إذا لم نرغب في تغيير الحجم، نعيد مباشرة
          if (!opts.maxWidth) {
            setGlobalAndResolve(dataUrl);
            return;
          }

          // إعادة قياس الصورة عبر canvas للحجم والجودة المطلوبة
          resizeImageDataUrl(dataUrl, opts.maxWidth, opts.quality, function (resizedDataUrl) {
            setGlobalAndResolve(resizedDataUrl);
          });
        };
        reader.readAsDataURL(file);
      });

      // إضافة العنصر إلى DOM ثم فتحه
      document.body.appendChild(input);

      // نستخدم setTimeout للتأكد من أن العنصر مضاف قبل النداء
      setTimeout(function () {
        try {
          input.click();
        } catch (err) {
          // بعض بيئات WebView قد تمنع click()، عرض رسالة بالموجِّه للمستخدم
          console.error('Could not open camera via programmatic click:', err);
          // في هذه الحالة نُظهر العنصر مرئياً ليختار المستخدم يدوياً
          input.style.display = '';
        }
      }, 50);

      // تنظيف العنصر من DOM
      function cleanup() {
        try {
          input.removeEventListener('change', onFileChange);
        } catch (e) {}
        if (input.parentNode) input.parentNode.removeChild(input);
      }

      // تعيين المتغير العام ثم حل الـ Promise
      function setGlobalAndResolve(dataUrl) {
        try {
          window[opts.globalVarName] = dataUrl;
        } catch (e) {
          console.warn('Could not set global variable on window:', e);
        }
        resolve(dataUrl);
      }
    });
  }

  /**
   * يعيد قياس DataURL لصورة باستخدام canvas بحيث لا يتجاوز العرض maxWidth.
   * يستدعي callback(dataUrl).
   */
  function resizeImageDataUrl(dataUrl, maxWidth, quality, callback) {
    var img = new Image();
    img.onload = function () {
      var width = img.width;
      var height = img.height;

      if (width <= maxWidth || !maxWidth) {
        // لا حاجة للقياس
        callback(dataUrl);
        return;
      }

      var ratio = maxWidth / width;
      var newW = Math.round(width * ratio);
      var newH = Math.round(height * ratio);

      var canvas = document.createElement('canvas');
      canvas.width = newW;
      canvas.height = newH;
      var ctx = canvas.getContext('2d');

      // رسم مع تحسين الحدة (حسب دعم المتصفح)
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, newW, newH);

      // الحصول على DataURL بجودة محددة (JPEG)
      var outDataUrl;
      try {
        outDataUrl = canvas.toDataURL('image/jpeg', quality);
      } catch (e) {
        // في حالة فشل (بعض المتصفحات قد ترمي)، نستخدم PNG كاحتياط
        try {
          outDataUrl = canvas.toDataURL();
        } catch (err) {
          console.error('Could not convert canvas to DataURL', err);
          outDataUrl = dataUrl;
        }
      }
      callback(outDataUrl);
    };
    img.onerror = function (err) {
      console.error('Image load error during resize', err);
      callback(dataUrl); // fallback
    };
    img.src = dataUrl;
  }

  // عرض الدالة على window للاستخدام العام
  window.openCameraAndCapture = openCameraAndCapture;

  // أيضاً نُعرّف اسم المتغير العام الافتراضي حتى يكون متاحاً دوماً (قد يكون null بالبداية)
  if (typeof window.suzeBazaarCapturedImage === 'undefined') {
    window.suzeBazaarCapturedImage = null;
  }

})();
