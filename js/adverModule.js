/**
 * @file js/adverModule.js
 * @description موديول لعرض شريط إعلانات متحرك (Hero Slider).
 *
 * يقوم هذا الموديول بجلب الصور الإعلانية من رابط عام وعرضها
 * في حاوية محددة كشريط إعلاني ينتقل تلقائيًا.
 */

async function initAdverModule(containerId, forceRefresh = false) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[AdverModule] لم يتم العثور على الحاوية بالمعرف: ${containerId}`);
    return;
  }

  console.log('%c[AdverModule] Initializing...', 'color: #20c997');

  // ✅ جديد: التحقق من الاتصال بالإنترنت أولاً
  const isOnline = await checkInternetConnection();
  if (!isOnline) {
    console.warn('[AdverModule] No internet connection. Attempting to load from cache...');
    const cachedImages = JSON.parse(localStorage.getItem('adver_images_cache'));
    buildSlider(container, cachedImages || []);
    return; // توقف هنا، لا تحاول الاتصال بالخادم
  }
  // --- ✅ جديد: منطق التخزين المؤقت (Caching) ---
  const CACHE_KEY_IMAGES = 'adver_images_cache';
  const CACHE_KEY_TIMESTAMP = 'adver_timestamp_cache';
  const CACHE_KEY_LAST_CHECK = 'adver_last_check_timestamp'; // ✅ جديد: لتخزين وقت آخر فحص
  const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 ساعة بالمللي ثانية

  const cachedTimestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);
  const cachedImages = JSON.parse(localStorage.getItem(CACHE_KEY_IMAGES));
  const lastCheckTimestamp = localStorage.getItem(CACHE_KEY_LAST_CHECK);

  // ✅ جديد: التحقق مما إذا كان يجب استخدام النسخة المخبأة دون الاتصال بالخادم
  if (!forceRefresh && lastCheckTimestamp && (Date.now() - lastCheckTimestamp < CHECK_INTERVAL) && cachedImages && cachedImages.length > 0) {
    console.log('%c[AdverModule] Loading ads from cache (within 24h interval).', 'color: green; font-weight: bold;');
    buildSlider(container, cachedImages);
    return; // توقف هنا، لا حاجة للاتصال بالخادم
  }

  // جلب آخر تاريخ تحديث من الخادم
  console.log('%c[AdverModule] Checking for updates from server (interval elapsed or no cache).', 'color: #17a2b8;');
  const latestUpdate = await getLatestUpdate();
  const serverTimestamp = latestUpdate ? latestUpdate.datetime : null;

  console.log(`[AdverModule] Server Timestamp: ${serverTimestamp}`);
  console.log(`[AdverModule] Cached Timestamp: ${cachedTimestamp}`);

  // إذا كانت التواريخ متطابقة وهناك صور محفوظة، استخدم النسخة المحفوظة (بعد التحقق من الخادم)
  if (!forceRefresh && serverTimestamp && serverTimestamp === cachedTimestamp && cachedImages && cachedImages.length > 0) {
    console.log('%c[AdverModule] Loading ads from cache.', 'color: green; font-weight: bold;');
    localStorage.setItem(CACHE_KEY_LAST_CHECK, Date.now()); // ✅ جديد: تحديث وقت آخر فحص
    buildSlider(container, cachedImages);
    return; // توقف هنا، لا حاجة لجلب الصور من الشبكة
  }

  // --- إذا لم تتطابق التواريخ أو لا توجد نسخة محفوظة، قم بالجلب من الشبكة ---
  console.log('%c[AdverModule] Cache is outdated or empty. Fetching from network...', 'color: orange; font-weight: bold;');

  const R2_PUBLIC_URL = 'https://pub-e828389e2f1e484c89d8fb652c540c12.r2.dev';
  const MAX_ADS = 10; // أقصى عدد من الإعلانات للبحث عنه
  const fetchedImages = [];

  // دالة للتحقق من وجود صورة
  function checkImage(url) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ exists: true, url: url });
      img.onerror = () => resolve({ exists: false, url: url });
      img.src = url;
    });
  }

  // جلب الصور الموجودة بالتوازي لتحسين الأداء
  const imageChecks = [];
  for (let i = 1; i <= MAX_ADS; i++) {
    const imageUrl = `${R2_PUBLIC_URL}/pic${i}.webp`;
    imageChecks.push(checkImage(imageUrl));
  }

  const results = await Promise.all(imageChecks);
  results.forEach(result => {
    if (result.exists) fetchedImages.push(result.url);
  });

  // ✅ جديد: حفظ الصور الجديدة وتاريخ التحديث في localStorage
  console.log(`[AdverModule] Fetched ${fetchedImages.length} images. Caching results.`);
  localStorage.setItem(CACHE_KEY_IMAGES, JSON.stringify(fetchedImages));
  if (serverTimestamp) {
    localStorage.setItem(CACHE_KEY_TIMESTAMP, serverTimestamp);
  }
  localStorage.setItem(CACHE_KEY_LAST_CHECK, Date.now()); // ✅ جديد: تحديث وقت آخر فحص بعد جلب الصور

  buildSlider(container, fetchedImages);
}

function buildSlider(container, adImages) {
  // إذا لم توجد صور، اعرض رسالة
  if (adImages.length === 0) {
    container.innerHTML = '<p class="no-ads-message">لا توجد إعلانات حالياً</p>';
    container.style.height = 'auto'; // ضبط الارتفاع
    return;
  }

  // بناء هيكل الشريط الإعلاني
  container.innerHTML = `
    <div class="ad-slider-track"></div>
    <div class="ad-slider-dots"></div>
    <!-- ✅ جديد: أزرار التنقل -->
    <button class="ad-slider-nav prev" aria-label="Previous Slide"><i class="fas fa-chevron-left"></i></button>
    <button class="ad-slider-nav next" aria-label="Next Slide"><i class="fas fa-chevron-right"></i></button>
  `;

  const track = container.querySelector('.ad-slider-track');
  const dotsContainer = container.querySelector('.ad-slider-dots');
  const slides = [];
  const dots = [];
  let currentIndex = 0;
  let autoPlayInterval = null; // ✅ جديد: متغير لتخزين مؤقت الحركة التلقائية

  const prevButton = container.querySelector('.ad-slider-nav.prev');
  const nextButton = container.querySelector('.ad-slider-nav.next');

  // إنشاء الشرائح والنقاط
  adImages.forEach((imageUrl, index) => {
    const slide = document.createElement('div');
    slide.className = 'ad-slide';
    slide.style.backgroundImage = `url(${imageUrl})`;
    track.appendChild(slide);

    // ✅ جديد: إضافة أحداث لإيقاف الحركة مؤقتًا عند الضغط المستمر
    slide.addEventListener('mousedown', pauseAutoPlay);
    slide.addEventListener('mouseup', startAutoPlay);
    slide.addEventListener('touchstart', pauseAutoPlay, { passive: true });
    slide.addEventListener('touchend', startAutoPlay);
    slides.push(slide);

    const dot = document.createElement('div');
    dot.className = 'ad-slider-dot';
    dot.addEventListener('click', () => goToSlide(index));
    dotsContainer.appendChild(dot);
    dots.push(dot);
  });

  /**
   * ✅ تعديل شامل: تحديث الدالة لتطبيق تأثير الكاروسيل الدائري.
   * تقوم الآن بحساب وتطبيق transform لكل شريحة بناءً على موقعها.
   */
  function goToSlide(index) {
    const newIndex = (index + slides.length) % slides.length;
    currentIndex = newIndex;

    slides.forEach((slide, i) => {
      // ✅ تعديل: حساب الإزاحة بطريقة تأخذ "المسار الأقصر" في الاعتبار
      // هذا يضمن أن الحركة دائرية ومتناظرة دائمًا.
      const totalSlides = slides.length;
      const directOffset = i - currentIndex;
      const wrapOffset = directOffset > 0 ? directOffset - totalSlides : directOffset + totalSlides;
      const offset = Math.abs(directOffset) < Math.abs(wrapOffset) ? directOffset : wrapOffset;

      const isActive = offset === 0;

      // حساب التحريك الأفقي والتكبير
      // الشرائح الجانبية تكون أصغر ومزاحة
      const translateX = offset * 40; // 40% من عرض الشريحة
      const scale = isActive ? 1 : 0.7;
      // ✅ جديد: إضافة إزاحة بسيطة على المحور Z لإعطاء عمق ومنع التداخل
      const translateZ = -Math.abs(offset) * 50;

      slide.style.transform = `translateX(${translateX}%) translateZ(${translateZ}px) scale(${scale})`;
      slide.classList.toggle('active', isActive);

      // عند النقر على شريحة جانبية، تنتقل لتصبح هي النشطة
      slide.onclick = () => goToSlide(i);
    });

    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
    if (slides.length > 1) {
      resetAutoPlay();
    }
  }

  // ✅ جديد: دوال للتحكم في الحركة التلقائية
  function startAutoPlay() {
    if (autoPlayInterval) clearInterval(autoPlayInterval); // مسح المؤقت القديم
    // تغيير الشريحة كل 4 ثوانٍ
    autoPlayInterval = setInterval(() => goToSlide(currentIndex + 1), 4000);
  }

  function pauseAutoPlay() {
    clearInterval(autoPlayInterval);
  }

  function resetAutoPlay() {
    pauseAutoPlay();
    startAutoPlay();
  }

  // بدء الحركة
  if (slides.length > 0) {
    goToSlide(0); // عرض الشريحة الأولى

    // ✅ جديد: إظهار/إخفاء أزرار التنقل والتحكم في الحركة
    if (slides.length > 1) {
      startAutoPlay();
      prevButton.style.display = 'flex';
      nextButton.style.display = 'flex';

      prevButton.addEventListener('click', () => {
        goToSlide(currentIndex - 1);
      });

      nextButton.addEventListener('click', () => {
        goToSlide(currentIndex + 1);
      });
    } else {
      prevButton.style.display = 'none';
      nextButton.style.display = 'none';
      // ✅ جديد: إخفاء حاوية النقاط إذا كانت هناك صورة واحدة فقط
      dotsContainer.style.display = 'none';
    }
  }
}