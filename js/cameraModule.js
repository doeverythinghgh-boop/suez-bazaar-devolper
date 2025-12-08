// cameraModule.js
(function() {
    'use strict';
    
    // المتغيرات الداخلية
    let videoElement = null;
    let codeReader = null;
    let currentDeviceId = null;
    let availableDevices = [];
    let capturedImages = [];
    let selectedThumbIndex = -1;
    let options = {};
    let db = null;
    let dbVersion = 1;
    let isScanning = false;
    
    // القيم الافتراضية
    const defaultOptions = {
        dbName: 'suzeBazaarIMAGES',
        storeName: 'cameraImages',
        // لا نستخدم maxWidth أو jpegQuality لأننا نحفظ الصور كما هي
        enableBarcodeScanning: false, // تفعيل/تعطيل قراءة الباركود
        scanInterval: 3000 // الفترة بين عمليات المسح (مللي ثانية)
    };
    
    // إنشاء عناصر واجهة الكاميرا
    function createCameraUI() {
        if (document.getElementById('camera-popup')) return;
        
        const popup = document.createElement('div');
        popup.id = 'camera-popup';
        
        popup.innerHTML = `
            <div class="camera-box">
                <button id="camera-close-btn">×</button>
                
                <!-- مؤشر تحميل -->
                <div id="camera-loading" style="display:none; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:white;">
                    جاري تحميل الكاميرا...
                </div>
                
                <!-- حالة الباركود -->
                <div id="barcode-status" style="display:none; position:absolute; top:20px; left:20px; background:rgba(0,0,0,0.7); color:#4CAF50; padding:10px; border-radius:5px;">
                    جاري البحث عن باركود...
                </div>
                
                <video id="camera-video" autoplay playsinline muted></video>
                
                <div class="camera-controls">
                    <button id="camera-switch">تبديل الكاميرا</button>
                    <button id="camera-capture">التقاط</button>
                    <button id="camera-save-all">حفظ الكل</button>
                    <button id="camera-toggle-scan" style="display:none;">تفعيل المسح</button>
                </div>
                
                <div id="camera-thumbs" class="thumbs"></div>
            </div>
        `;
        
        document.body.appendChild(popup);
        videoElement = document.getElementById('camera-video');
        
        // إضافة مستمعي الأحداث
        document.getElementById('camera-close-btn').addEventListener('click', close);
        document.getElementById('camera-switch').addEventListener('click', switchCamera);
        document.getElementById('camera-capture').addEventListener('click', capture);
        document.getElementById('camera-save-all').addEventListener('click', saveAllToDB);
        document.getElementById('camera-toggle-scan').addEventListener('click', toggleBarcodeScanning);
        
        // إغلاق النافذة عند النقر خارجها
        popup.addEventListener('click', function(e) {
            if (e.target === this) close();
        });
    }
    
    // تهيئة قاعدة البيانات
    function openDatabase(storeName) {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }
            
            const request = indexedDB.open(options.dbName, dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'id' });
                }
            };
        });
    }
    
    // تحميل مكتبة ZXing بشكل متزامن
    function loadZXingLibrary() {
        return new Promise((resolve, reject) => {
            if (window.ZXing) {
                resolve(window.ZXing);
                return;
            }
            
            // إذا لم تكن المكتبة محملة، نحاول تحميلها
            console.warn('مكتبة ZXing غير محملة. تأكد من تحميلها قبل استخدام CameraModule.');
            reject(new Error('مكتبة ZXing غير متوفرة'));
        });
    }
    
    // بدء تشغيل الكاميرا باستخدام ZXing
    async function startCamera(deviceId = null) {
        try {
            document.getElementById('camera-loading').style.display = 'block';
            
            // تحميل مكتبة ZXing
            const ZXing = await loadZXingLibrary();
            
            // إنشاء كائن CodeReader من ZXing
            codeReader = new ZXing.BrowserBarcodeReader();
            
            // الحصول على قائمة أجهزة الكاميرا
            availableDevices = await codeReader.getVideoInputDevices();
            
            if (availableDevices.length === 0) {
                throw new Error('لا توجد كاميرا متاحة');
            }
            
            // تحديد الجهاز المراد استخدامه
            let selectedDeviceId = deviceId;
            if (!selectedDeviceId) {
                // محاولة استخدام الكاميرا الخلفية أولاً
                const backCamera = availableDevices.find(device => 
                    device.label.toLowerCase().includes('back') || 
                    device.label.toLowerCase().includes('خلف')
                );
                selectedDeviceId = backCamera ? backCamera.deviceId : availableDevices[0].deviceId;
            }
            
            currentDeviceId = selectedDeviceId;
            
            // بدء تشغيل الكاميرا باستخدام ZXing
            await codeReader.decodeFromVideoDevice(
                selectedDeviceId, 
                videoElement, 
                (result, error, controls) => {
                    if (result && options.enableBarcodeScanning && isScanning) {
                        handleBarcodeResult(result);
                    }
                    
                    // تخزين عناصر التحكم لإيقاف المسح لاحقاً
                    if (controls) {
                        videoElement._controls = controls;
                    }
                }
            );
            
            document.getElementById('camera-loading').style.display = 'none';
            
            // إظهار زر تفعيل المسح إذا كانت خاصية المسح مفعلة
            if (options.enableBarcodeScanning) {
                document.getElementById('camera-toggle-scan').style.display = 'inline-block';
                document.getElementById('barcode-status').style.display = 'block';
            }
            
            return true;
            
        } catch (err) {
            document.getElementById('camera-loading').style.display = 'none';
            console.error('فشل في تشغيل الكاميرا باستخدام ZXing:', err);
            
            // Fallback: استخدام MediaDevices API مباشرة
            console.log('جرب استخدام واجهة المتصفح الأصلية كبديل...');
            return startCameraFallback();
        }
    }
    
    // Fallback: استخدام MediaDevices API مباشرة
    async function startCameraFallback() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment'
                },
                audio: false
            });
            
            videoElement.srcObject = stream;
            // تخزين الـ stream للإغلاق لاحقاً
            videoElement._stream = stream;
            
            // تحديث قائمة الأجهزة المتاحة
            const devices = await navigator.mediaDevices.enumerateDevices();
            availableDevices = devices.filter(device => device.kind === 'videoinput');
            
            return true;
        } catch (err) {
            console.error('فشل في Fallback للكاميرا:', err);
            
            // Fallback نهائي: استخدام input file
            alert('لا يمكن الوصول إلى الكاميرا. يرجى السماح بالوصول أو استخدام تحميل الملفات.');
            openFileInput();
            return false;
        }
    }
    
    // فتح إدخال ملف كبديل
    function openFileInput() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                // حفظ الصورة كما هي بدون معالجة
                const metadata = {
                    blob: file,
                    width: 0,
                    height: 0,
                    mimeType: file.type,
                    timestamp: Date.now(),
                    source: 'file',
                    facingMode: 'environment'
                };
                
                // محاولة الحصول على أبعاد الصورة
                const img = new Image();
                const url = URL.createObjectURL(file);
                
                img.onload = () => {
                    metadata.width = img.width;
                    metadata.height = img.height;
                    URL.revokeObjectURL(url);
                    addCapturedImage(metadata);
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    addCapturedImage(metadata);
                };
                
                img.src = url;
            }
        };
        
        input.click();
    }
    
    // إيقاف الكاميرا
    function stopCamera() {
        // إيقاف مسح الباركود إذا كان قيد التشغيل
        if (isScanning) {
            toggleBarcodeScanning();
        }
        
        // إيقاف كاميرا ZXing
        if (codeReader) {
            codeReader.reset();
            codeReader = null;
        }
        
        // إيقاف التحكم في ZXing إذا كان موجوداً
        if (videoElement && videoElement._controls) {
            videoElement._controls.stop();
            delete videoElement._controls;
        }
        
        // إيقاف stream الفيديو إذا كان من fallback
        if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            videoElement.srcObject = null;
        }
        
        // إخفاء عناصر الواجهة
        document.getElementById('camera-toggle-scan').style.display = 'none';
        document.getElementById('barcode-status').style.display = 'none';
    }
    
    // التقاط صورة من الفيديو (بدون ضغط)
    function capture() {
        if (!videoElement || videoElement.readyState !== 4) {
            console.error('الفيديو غير جاهز');
            return;
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // تعيين أبعاد الكانفاس لتتناسب مع دقة الفيديو الأصلية
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        
        // رسم الفيديو على الكانفاس
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // تحويل إلى Blob بدون ضغط وبجودة عالية
        canvas.toBlob((blob) => {
            const metadata = {
                blob: blob,
                width: canvas.width,
                height: canvas.height,
                mimeType: 'image/png', // استخدام PNG للحفاظ على الجودة
                timestamp: Date.now(),
                source: 'camera',
                facingMode: getFacingModeFromDevice(currentDeviceId)
            };
            
            addCapturedImage(metadata);
            
            // إشعار المستخدم بالتقاط الصورة
            showNotification('تم التقاط الصورة بنجاح');
        }, 'image/png', 1.0); // جودة 1.0 (بدون ضغط)
    }
    
    // الحصول على وضع الكاميرا بناءً على معرف الجهاز
    function getFacingModeFromDevice(deviceId) {
        if (!deviceId || !availableDevices.length) return 'environment';
        
        const device = availableDevices.find(d => d.deviceId === deviceId);
        if (!device) return 'environment';
        
        const label = device.label.toLowerCase();
        if (label.includes('front') || label.includes('أمام')) {
            return 'user';
        }
        return 'environment';
    }
    
    // إضافة صورة مقتطعة إلى القائمة
    function addCapturedImage(metadata) {
        const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        metadata.id = id;
        capturedImages.push(metadata);
        updateThumbnails();
        selectThumb(capturedImages.length - 1);
    }
    
    // تحديث الصور المصغرة
    function updateThumbnails() {
        const thumbsContainer = document.getElementById('camera-thumbs');
        if (!thumbsContainer) return;
        
        thumbsContainer.innerHTML = '';
        
        capturedImages.forEach((img, index) => {
            const thumbDiv = document.createElement('div');
            thumbDiv.className = 'thumb-item';
            if (index === selectedThumbIndex) {
                thumbDiv.classList.add('selected');
            }
            
            const imgUrl = URL.createObjectURL(img.blob);
            thumbDiv.innerHTML = `
                <img src="${imgUrl}" alt="صورة ${index + 1}">
                <button class="thumb-delete" data-index="${index}">×</button>
            `;
            
            thumbDiv.querySelector('img').onload = () => {
                URL.revokeObjectURL(imgUrl);
            };
            
            thumbDiv.addEventListener('click', (e) => {
                if (!e.target.classList.contains('thumb-delete')) {
                    selectThumb(index);
                }
            });
            
            thumbDiv.querySelector('.thumb-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteCapturedImage(index);
            });
            
            thumbsContainer.appendChild(thumbDiv);
        });
    }
    
    // تحديد صورة مصغرة
    function selectThumb(index) {
        if (index >= 0 && index < capturedImages.length) {
            selectedThumbIndex = index;
            updateThumbnails();
        }
    }
    
    // حذف صورة مقتطعة
    function deleteCapturedImage(index) {
        if (index >= 0 && index < capturedImages.length) {
            // تحرير الذاكرة
            const imgUrl = URL.createObjectURL(capturedImages[index].blob);
            URL.revokeObjectURL(imgUrl);
            
            capturedImages.splice(index, 1);
            
            if (selectedThumbIndex >= capturedImages.length) {
                selectedThumbIndex = capturedImages.length - 1;
            }
            
            updateThumbnails();
        }
    }
    
    // تبديل الكاميرا
    async function switchCamera() {
        if (availableDevices.length < 2) {
            alert('لا توجد كاميرا أخرى للتبديل إليها');
            return;
        }
        
        // العثور على الفهرس الحالي
        const currentIndex = availableDevices.findIndex(device => device.deviceId === currentDeviceId);
        const nextIndex = (currentIndex + 1) % availableDevices.length;
        const nextDevice = availableDevices[nextIndex];
        
        // إيقاف الكاميرا الحالية
        stopCamera();
        
        // إعادة تشغيل الكاميرا الجديدة
        await startCamera(nextDevice.deviceId);
        
        // تحديث حالة زر التبديل
        const nextLabel = nextDevice.label || `كاميرا ${nextIndex + 1}`;
        showNotification(`تم التبديل إلى: ${nextLabel}`);
    }
    
    // تفعيل/تعطيل مسح الباركود
    function toggleBarcodeScanning() {
        if (!options.enableBarcodeScanning) {
            alert('خاصية مسح الباركود غير مفعلة في الإعدادات');
            return;
        }
        
        isScanning = !isScanning;
        const toggleBtn = document.getElementById('camera-toggle-scan');
        const statusDiv = document.getElementById('barcode-status');
        
        if (isScanning) {
            toggleBtn.textContent = 'تعطيل المسح';
            statusDiv.style.display = 'block';
            statusDiv.textContent = 'جاري البحث عن باركود...';
            statusDiv.style.color = '#4CAF50';
            showNotification('تم تفعيل مسح الباركود');
        } else {
            toggleBtn.textContent = 'تفعيل المسح';
            statusDiv.style.display = 'none';
            showNotification('تم تعطيل مسح الباركود');
        }
    }
    
    // معالجة نتيجة الباركود
    function handleBarcodeResult(result) {
        const statusDiv = document.getElementById('barcode-status');
        statusDiv.textContent = `تم العثور على باركود: ${result.text}`;
        statusDiv.style.color = '#FF9800';
        
        // عرض تنبيه
        showNotification(`تم العثور على باركود: ${result.text}`);
        
        // إرسال الحدث
        const event = new CustomEvent('barcodeScanned', { detail: result });
        window.dispatchEvent(event);
        
        // إعادة تعيين الحالة بعد فترة
        setTimeout(() => {
            if (isScanning) {
                statusDiv.textContent = 'جاري البحث عن باركود...';
                statusDiv.style.color = '#4CAF50';
            }
        }, options.scanInterval);
    }
    
    // حفظ جميع الصور إلى قاعدة البيانات
    async function saveAllToDB() {
        if (capturedImages.length === 0) {
            alert('لا توجد صور لحفظها');
            return;
        }
        
        const storeName = options.storeName;
        try {
            let savedCount = 0;
            
            for (const img of capturedImages) {
                await saveToDB(storeName, img.blob, {
                    width: img.width,
                    height: img.height,
                    mimeType: img.mimeType,
                    timestamp: img.timestamp,
                    source: img.source,
                    facingMode: img.facingMode
                });
                savedCount++;
            }
            
            showNotification(`تم حفظ ${savedCount} صورة في قاعدة البيانات`);
            capturedImages = [];
            updateThumbnails();
            
        } catch (err) {
            console.error('فشل في حفظ الصور:', err);
            alert('فشل في حفظ الصور: ' + err.message);
        }
    }
    
    // عرض إشعار
    function showNotification(message) {
        // إنشاء عنصر إشعار مؤقت
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 150, 0, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            animation: fadeInOut 3s ease-in-out;
        `;
        
        // إضافة أنيميشن
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(-20px); }
                10% { opacity: 1; transform: translateY(0); }
                90% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
            document.head.removeChild(style);
        }, 3000);
    }
    
    // تعريف كائن CameraModule العام
    window.CameraModule = {
        // 1. تهيئة النظام
        init: function(userOptions = {}) {
            options = { ...defaultOptions, ...userOptions };
            createCameraUI();
            console.log('تم تهيئة وحدة الكاميرا مع ZXing والخيارات:', options);
            return Promise.resolve();
        },
        
        // 2. فتح نافذة الكاميرا
        open: function() {
            const popup = document.getElementById('camera-popup');
            if (!popup) {
                console.error('لم يتم تهيئة وحدة الكاميرا. قم باستدعاء init() أولاً.');
                return Promise.reject('لم يتم تهيئة وحدة الكاميرا');
            }
            
            popup.classList.add('active');
            return startCamera().then(success => {
                if (!success) {
                    console.warn('فشل في بدء تشغيل الكاميرا باستخدام ZXing، تم استخدام البديل');
                }
                return success;
            });
        },
        
        // 3. إغلاق النافذة
        close: function() {
            const popup = document.getElementById('camera-popup');
            if (popup) {
                popup.classList.remove('active');
            }
            stopCamera();
            capturedImages = [];
            updateThumbnails();
        },
        
        // 4. تبديل الكاميرا
        switchCamera: function() {
            return switchCamera();
        },
        
        // 5. التقاط صورة
        capture: function() {
            return new Promise((resolve) => {
                if (!videoElement || videoElement.readyState !== 4) {
                    resolve(null);
                    return;
                }
                
                capture();
                
                setTimeout(() => {
                    if (capturedImages.length > 0) {
                        const lastImg = capturedImages[capturedImages.length - 1];
                        resolve({
                            blob: lastImg.blob,
                            width: lastImg.width,
                            height: lastImg.height,
                            id: lastImg.id
                        });
                    } else {
                        resolve(null);
                    }
                }, 100);
            });
        },
        
        // 6. حفظ صورة في قاعدة البيانات
        saveToDB: async function(storeName, blob, meta = {}) {
            try {
                const db = await openDatabase(storeName);
                
                const id = meta.id || 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                const imageData = {
                    id: id,
                    blob: blob,
                    width: meta.width || 0,
                    height: meta.height || 0,
                    mimeType: meta.mimeType || blob.type || 'image/png',
                    timestamp: meta.timestamp || Date.now(),
                    source: meta.source || 'imported',
                    facingMode: meta.facingMode || 'environment'
                };
                
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction([storeName], 'readwrite');
                    const store = transaction.objectStore(storeName);
                    const request = store.add(imageData);
                    
                    request.onsuccess = () => resolve(id);
                    request.onerror = () => reject(request.error);
                });
            } catch (err) {
                console.error('فشل في حفظ الصورة في قاعدة البيانات:', err);
                throw err;
            }
        },
        
        // 7. جلب الصور من قاعدة البيانات
        getImages: async function(storeName) {
            try {
                const db = await openDatabase(storeName);
                
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction([storeName], 'readonly');
                    const store = transaction.objectStore(storeName);
                    const request = store.getAll();
                    
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            } catch (err) {
                console.error('فشل في جلب الصور من قاعدة البيانات:', err);
                throw err;
            }
        },
        
        // 8. حذف صورة من قاعدة البيانات
        deleteImage: async function(storeName, id) {
            try {
                const db = await openDatabase(storeName);
                
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction([storeName], 'readwrite');
                    const store = transaction.objectStore(storeName);
                    const request = store.delete(id);
                    
                    request.onsuccess = () => resolve(true);
                    request.onerror = () => reject(request.error);
                });
            } catch (err) {
                console.error('فشل في حذف الصورة من قاعدة البيانات:', err);
                throw err;
            }
        },
        
        // 9. مسح جميع الصور من مخزن محدد
        clearStore: async function(storeName) {
            try {
                const db = await openDatabase(storeName);
                
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction([storeName], 'readwrite');
                    const store = transaction.objectStore(storeName);
                    const request = store.clear();
                    
                    request.onsuccess = () => resolve(true);
                    request.onerror = () => reject(request.error);
                });
            } catch (err) {
                console.error('فشل في مسح المخزن:', err);
                throw err;
            }
        },
        
        // 10. جلب صور خارجية (اختياري)
        fetchExternalImages: async function(url) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`فشل HTTP: ${response.status}`);
                
                const data = await response.json();
                
                if (!Array.isArray(data.images)) {
                    throw new Error('تنسيق البيانات غير صحيح');
                }
                
                const results = [];
                for (const imgUrl of data.images) {
                    try {
                        const imgResponse = await fetch(imgUrl);
                        const blob = await imgResponse.blob();
                        
                        const id = 'ext_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                        
                        results.push({
                            id: id,
                            url: imgUrl,
                            blob: blob
                        });
                    } catch (err) {
                        console.warn(`فشل في جلب الصورة ${imgUrl}:`, err);
                    }
                }
                
                return results;
            } catch (err) {
                console.error('فشل في جلب الصور الخارجية:', err);
                throw err;
            }
        },
        
        // 11. قراءة الباركود من صورة (استخدام ZXing)
        scanBarcodeFromImage: function(imageBlob) {
            return new Promise(async (resolve, reject) => {
                try {
                    const ZXing = await loadZXingLibrary();
                    const codeReader = new ZXing.BrowserBarcodeReader();
                    
                    // تحويل Blob إلى URL
                    const imageUrl = URL.createObjectURL(imageBlob);
                    const img = new Image();
                    
                    img.onload = async () => {
                        try {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx.drawImage(img, 0, 0);
                            
                            const result = await codeReader.decodeFromCanvas(canvas);
                            URL.revokeObjectURL(imageUrl);
                            resolve(result);
                        } catch (err) {
                            URL.revokeObjectURL(imageUrl);
                            reject(err);
                        }
                    };
                    
                    img.onerror = () => {
                        URL.revokeObjectURL(imageUrl);
                        reject(new Error('فشل في تحميل الصورة'));
                    };
                    
                    img.src = imageUrl;
                    
                } catch (err) {
                    reject(err);
                }
            });
        },
        
        // 12. تفعيل/تعطيل مسح الباركود من الكاميرا
        toggleBarcodeScan: function() {
            toggleBarcodeScanning();
        },
        
        // 13. الحصول على أجهزة الكاميرا المتاحة
        getAvailableCameras: function() {
            return availableDevices;
        },
        
        // 14. التبديل إلى كاميرا محددة
        switchToCamera: function(deviceId) {
            if (!deviceId) {
                console.error('يجب تحديد معرف الجهاز');
                return Promise.reject('يجب تحديد معرف الجهاز');
            }
            
            const deviceExists = availableDevices.some(device => device.deviceId === deviceId);
            if (!deviceExists) {
                console.error('جهاز الكاميرا غير موجود');
                return Promise.reject('جهاز الكاميرا غير موجود');
            }
            
            stopCamera();
            return startCamera(deviceId);
        },
        
        // 15. الحصول على الصور الملتقطة في الجلسة الحالية
        getCapturedImages: function() {
            return capturedImages;
        },
        
        // 16. مسح الصور الملتقطة في الجلسة الحالية
        clearCapturedImages: function() {
            capturedImages.forEach(img => {
                const imgUrl = URL.createObjectURL(img.blob);
                URL.revokeObjectURL(imgUrl);
            });
            capturedImages = [];
            updateThumbnails();
        },
        
        // 17. تحديث إعدادات ZXing
        updateZXingSettings: function(newOptions) {
            options = { ...options, ...newOptions };
            
            // إذا كانت خاصية المسح قد تغيرت، نحدث الواجهة
            if (newOptions.enableBarcodeScanning !== undefined) {
                const toggleBtn = document.getElementById('camera-toggle-scan');
                if (toggleBtn) {
                    toggleBtn.style.display = newOptions.enableBarcodeScanning ? 'inline-block' : 'none';
                }
            }
            
            return options;
        }
    };
})();