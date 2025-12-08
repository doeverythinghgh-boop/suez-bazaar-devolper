/* cameraCapture.js
   - لا يستخدم modules/import
   - يحول الصورة إلى Blob فقط (لا DataURL)
   - يعرضها عبر URL.createObjectURL()
   - يخزنها في IndexedDB داخل object store موحد 'images'
   - الحقول: { id(auto), store, blob, type, size, createdAt }
   - دوال متاحة عالمياً:
       openCameraAndCapture(options) -> Promise<{ blob, type, size, url }>
       saveImage(storeName, blob) -> Promise<id>
       getImages(storeName) -> Promise<[ { id, store, blob, type, size, createdAt, url } ]>
       deleteImage(id) -> Promise<void>
       clearStore(storeName) -> Promise<void>
       setDBName(name) -> void (اختياري)
*/

(function () {
  'use strict';

  // إعدادات DB الافتراضية
  var DB_NAME = 'suzeBazaarImagesDB';
  var DB_VERSION = 1; // سنستخدم object store واحد اسمه 'images'
  var IMAGES_STORE = 'images';
  var dbPromise = null;

  // تهيئة IndexedDB (singleton)
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(IMAGES_STORE)) {
          // keyPath auto-increment id
          var os = db.createObjectStore(IMAGES_STORE, { keyPath: 'id', autoIncrement: true });
          // فهرس بحسب اسم المخزن لسهولة البحث
          os.createIndex('store_idx', 'store', { unique: false });
          os.createIndex('createdAt_idx', 'createdAt', { unique: false });
        }
      };
      req.onsuccess = function (e) {
        resolve(e.target.result);
      };
      req.onerror = function (e) {
        reject(e.target.error || new Error('Failed to open IndexedDB'));
      };
    });
    return dbPromise;
  }

  // تسمية DB (اختياري إذا أردت تغيير اسم القاعدة)
  function setDBName(name) {
    if (typeof name === 'string' && name.trim()) {
      DB_NAME = name;
      // اعادة تهيئة ال promise في حال تم التغيير
      dbPromise = null;
    }
  }

  // فتح الكاميرا / اختيار ملف، وإرجاع Blob (لا DataURL)
  // options: { accept: 'image/*', capture: 'environment' }
  function openCameraAndCapture(options) {
    var opts = {
      accept: 'image/*',
      capture: 'environment'
    };
    if (options && typeof options === 'object') {
      if (options.accept) opts.accept = options.accept;
      if (options.capture) opts.capture = options.capture;
    }

    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = opts.accept;
      input.capture = opts.capture;
      input.style.display = 'none';
      input.setAttribute('aria-hidden', 'true');

      function cleanup() {
        input.removeEventListener('change', onChange);
        if (input.parentNode) input.parentNode.removeChild(input);
      }

      function onChange() {
        var file = input.files && input.files[0];
        cleanup();

        if (!file) {
          resolve(null);
          return;
        }

        // إذا احتجنا لتقليل الأبعاد سنقوم بذلك عبر canvas لكن نحاول المحافظة على Blob
        // لتحميل أسرع واستهلاك ذاكرة أقل، سنفعل إعادة القياس فقط إذا حجم البلوك كبير جداً (اختياري)
        // هنا نتحقق: إذا عرض الصورة > 1600px نقوم بإعادة القياس إلى 1600
        // لكن لا نحولها إلى DataURL: نستخدم canvas.toBlob
        try {
          // نحتاج قراءة البلوك كـ Object URL لتحميل الصورة كـ Image
          var imgUrl = URL.createObjectURL(file);
          var img = new Image();
          img.onload = function () {
            var maxWidth = 1600;
            if (img.width > maxWidth) {
              var ratio = maxWidth / img.width;
              var newW = Math.round(img.width * ratio);
              var newH = Math.round(img.height * ratio);
              var canvas = document.createElement('canvas');
              canvas.width = newW;
              canvas.height = newH;
              var ctx = canvas.getContext('2d');
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, newW, newH);
              // إلىBlob بجودة 0.85 افتراضياً
              canvas.toBlob(function (blob) {
                URL.revokeObjectURL(imgUrl);
                if (!blob) {
                  // فشل تحويل، نستخدم الملف الأصلي ك fallback
                  resolve({ blob: file, type: file.type, size: file.size, url: URL.createObjectURL(file) });
                } else {
                  resolve({ blob: blob, type: blob.type || 'image/jpeg', size: blob.size, url: URL.createObjectURL(blob) });
                }
              }, 'image/jpeg', 0.85);
            } else {
              // لا حاجة للقياس: استخدم الملف الأصلي
              URL.revokeObjectURL(imgUrl);
              resolve({ blob: file, type: file.type, size: file.size, url: URL.createObjectURL(file) });
            }
          };
          img.onerror = function () {
            // فشل تحميل الصورة كـ Image -> استخدم الملف الأصلي
            URL.revokeObjectURL(imgUrl);
            resolve({ blob: file, type: file.type, size: file.size, url: URL.createObjectURL(file) });
          };
          img.src = imgUrl;
        } catch (err) {
          console.error('capture/processing error', err);
          resolve({ blob: file, type: file.type, size: file.size, url: URL.createObjectURL(file) });
        }
      }

      input.addEventListener('change', onChange);
      document.body.appendChild(input);

      // نضغط على العنصر لفتح واجهة الاختيار (أو الكاميرا)
      setTimeout(function () {
        try {
          input.click();
        } catch (err) {
          console.error('Could not programmatically click input', err);
          input.style.display = '';
        }
      }, 50);
    });
  }

  // حفظ البلوبي في IndexedDB مع الحقل storeName (ديناميكي)
  function saveImage(storeName, blob) {
    if (!storeName || !blob) return Promise.reject(new Error('storeName and blob are required'));
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IMAGES_STORE, 'readwrite');
        var os = tx.objectStore(IMAGES_STORE);
        var record = {
          store: storeName,
          blob: blob,
          type: blob.type || 'image/jpeg',
          size: blob.size || 0,
          createdAt: Date.now()
        };
        var req = os.add(record);
        req.onsuccess = function (e) {
          resolve(e.target.result); // id
        };
        req.onerror = function (e) {
          reject(e.target.error || new Error('Failed to save image'));
        };
      });
    });
  }

  // جلب كل الصور لمخزن معين (ترجع مصفوفة من السجلات مع url لكل blob)
  function getImages(storeName) {
    if (!storeName) return Promise.reject(new Error('storeName is required'));
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IMAGES_STORE, 'readonly');
        var os = tx.objectStore(IMAGES_STORE);
        var idx = os.index('store_idx');
        var range = IDBKeyRange.only(storeName);
        var req = idx.openCursor(range);
        var out = [];
        req.onsuccess = function (e) {
          var cursor = e.target.result;
          if (!cursor) {
            // اكتمال التصفح
            resolve(out);
            return;
          }
          var rec = cursor.value;
          // أنشئ URL مؤقت للعرض (المستخدم مسؤول عن revoke بعد العرض إن لزم)
          var url = URL.createObjectURL(rec.blob);
          out.push({
            id: rec.id,
            store: rec.store,
            type: rec.type,
            size: rec.size,
            createdAt: rec.createdAt,
            blob: rec.blob,
            url: url
          });
          cursor.continue();
        };
        req.onerror = function (e) {
          reject(e.target.error || new Error('Failed to fetch images'));
        };
      });
    });
  }

  // حذف صورة عبر id
  function deleteImage(id) {
    if (typeof id === 'undefined' || id === null) return Promise.reject(new Error('id is required'));
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IMAGES_STORE, 'readwrite');
        var os = tx.objectStore(IMAGES_STORE);
        var req = os.delete(id);
        req.onsuccess = function () { resolve(); };
        req.onerror = function (e) { reject(e.target.error || new Error('Failed to delete image')); };
      });
    });
  }

  // مسح كل الصور لمخزن معين
  function clearStore(storeName) {
    if (!storeName) return Promise.reject(new Error('storeName is required'));
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IMAGES_STORE, 'readwrite');
        var os = tx.objectStore(IMAGES_STORE);
        var idx = os.index('store_idx');
        var range = IDBKeyRange.only(storeName);
        var req = idx.openCursor(range);
        req.onsuccess = function (e) {
          var cursor = e.target.result;
          if (!cursor) {
            resolve();
            return;
          }
          cursor.delete();
          cursor.continue();
        };
        req.onerror = function (e) {
          reject(e.target.error || new Error('Failed to clear store'));
        };
      });
    });
  }

  // تصدير دوال عالمية
  window.suzeBazaarCamera = {
    openCameraAndCapture: openCameraAndCapture,
    saveImage: saveImage,
    getImages: getImages,
    deleteImage: deleteImage,
    clearStore: clearStore,
    setDBName: setDBName
  };

})();
