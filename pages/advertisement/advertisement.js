/**
 * @file pages/advertisement/advertisement.js
 * @description Advertisement module for displaying ad banners with slider functionality.
 * Handles fetching, caching, and displaying advertisement images.
 */

/**
 * @description Fetches the latest update date recorded in the `updates` table from the API.
 * @returns {Promise<Object|null>} - Promise containing an object with date (`{ datetime: '...' }`), or `null` on failure.
 * @throws {Error} - If fetching data from API fails.
 */
async function getLatestUpdate() {
    try {
        const data = await apiFetch('/api/updates', {
            specialHandlers: {
                404: () => ({ datetime: null }) // Not a fatal error
            }
        });
        return data;
    } catch (error) {
        console.error("%c[getLatestUpdate] فشل:", "color: red;", error);
        return null;
    }
}

/**
 * @description Initializes and displays the advertisement module.
 *   Fetches ad images from local cache or server, then builds and displays an ad slider.
 *   Supports caching mechanism to avoid frequent fetching.
 * @param {HTMLElement} container - DOM element to contain the ad slider.
 * @param {boolean} [forceRefresh=false] - If `true`, bypasses cache and fetches ads directly from server.
 * @returns {Promise<void>} - Promise returning no value on completion.
 * @see getLatestUpdate
 * @see buildSlider
 */
async function initAdverModule(container, forceRefresh = false) {
    if (!container) {
        console.error(`[AdverModule] لم يتم توفير عنصر الحاوية.`);
        return;
    }

    console.log('%c[AdverModule] جاري التهيئة...', 'color: #20c997');

    // --- ✅ NEW: Caching Logic ---
    const CACHE_KEY_IMAGES = 'adver_images_cache';
    const CACHE_KEY_TIMESTAMP = 'adver_timestamp_cache';
    const CACHE_KEY_LAST_CHECK = 'adver_last_check_timestamp'; // ✅ NEW: Store last check time
    // 🔴 Set cache duration: Here we define how long the browser trusts cached data without asking server.
    // Changed to 1 hour (1 * 60 * 60 * 1000) instead of 24 hours, to increase update accuracy.
    const CHECK_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour in milliseconds

    const cachedTimestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);
    const cachedImages = JSON.parse(localStorage.getItem(CACHE_KEY_IMAGES));
    const lastCheckTimestamp = localStorage.getItem(CACHE_KEY_LAST_CHECK);

    // ✅ Check: Has 1 hour passed since last check? And do we have cached images?
    // If yes (less than 1 hour and have images), show cached images immediately and stop connection.
    if (!forceRefresh && lastCheckTimestamp && (Date.now() - lastCheckTimestamp < CHECK_INTERVAL) && cachedImages && cachedImages.length > 0) {
        console.log('%c[AdverModule] تحميل الإعلانات من الذاكرة المؤقتة (فترة 1 ساعة).', 'color: green; font-weight: bold;');
        buildSlider(container, cachedImages);
        return; // Stop here, no need to bother the server
    }

    // If we reached here, cache is old (> 1 hour) or missing, or forced refresh requested.
    // We will now ask the server: "Do you have updates?"
    console.log('%c[AdverModule] التحقق من التحديثات من الخادم (انقضت الفترة أو لا توجد ذاكرة مؤقتة).', 'color: #17a2b8;');
    const latestUpdate = await getLatestUpdate();
    const serverTimestamp = latestUpdate ? latestUpdate.datetime : null;

    console.log(`[AdverModule] طابع زمن الخادم: ${serverTimestamp}`);
    console.log(`[AdverModule] طابع زمن الذاكرة المؤقتة: ${cachedTimestamp}`);

    // If dates match and images are saved, use saved copy (after server check)
    if (!forceRefresh && serverTimestamp && serverTimestamp === cachedTimestamp && cachedImages && cachedImages.length > 0) {
        console.log('%c[AdverModule] تحميل الإعلانات من الذاكرة المؤقتة.', 'color: green; font-weight: bold;');
        localStorage.setItem(CACHE_KEY_LAST_CHECK, Date.now()); // ✅ NEW: Update last check time
        buildSlider(container, cachedImages);
        return; // Stop here, no need to fetch images from network
    }

    // --- If dates don't match or no saved copy, fetch from network ---
    console.log('%c[AdverModule] الذاكرة المؤقتة قديمة أو فارغة. جاري الجلب من الشبكة...', 'color: orange; font-weight: bold;');

    const fetchedImages = [];
    let fetchSuccess = false;

    // ✅ NEW: Attempt to fetch manifest (advertisements.json)
    try {
        if (typeof getPublicR2FileUrl !== 'function') {
            throw new Error("getPublicR2FileUrl is not defined");
        }

        const manifestUrl = getPublicR2FileUrl('advertisements.json');
        const manifestRes = await fetch(`${manifestUrl}?t=${Date.now()}`);

        if (manifestRes.ok) {
            const manifestData = await manifestRes.json();
            if (Array.isArray(manifestData)) {
                console.log('%c[AdverModule] تم تحميل البيان.', 'color: green;', manifestData);
                manifestData.forEach(item => {
                    const adData = typeof item === 'object' ? item : { img: item, query: '' };
                    fetchedImages.push({
                        url: getPublicR2FileUrl(adData.img),
                        query: adData.query || ''
                    });
                });
                fetchSuccess = true;
            } else {
                console.warn("[AdverModule] تنسيق البيان غير صالح.");
            }
        } else {
            console.error(`[AdverModule] فشل تحميل البيان: ${manifestRes.status}`);
        }
    } catch (e) {
        console.error("[AdverModule] فشل فحص البيان:", e);
    }

    // ✅ NEW: Logic to handle results safely
    if (fetchSuccess) {
        if (fetchedImages.length > 0) {
            // Case 1: New images found
            console.log(`[AdverModule] تم جلب ${fetchedImages.length} صور. جاري تحديث الذاكرة.`);
            localStorage.setItem(CACHE_KEY_IMAGES, JSON.stringify(fetchedImages));
            if (serverTimestamp) {
                localStorage.setItem(CACHE_KEY_TIMESTAMP, serverTimestamp);
            }
            localStorage.setItem(CACHE_KEY_LAST_CHECK, Date.now());
            buildSlider(container, fetchedImages);
        } else {
            // Case 2: Manifest loaded but is empty (Admin removed all ads)
            console.warn('[AdverModule] لا توجد إعلانات في البيان الجديد.');
            const noAdsMsg = container.querySelector('.no-ads-message');
            if (noAdsMsg) noAdsMsg.style.display = 'block';

            // Should we clear cache? Yes, because this is an explicit "empty" state.
            localStorage.removeItem(CACHE_KEY_IMAGES);
            container.innerHTML = '<p class="no-ads-message">لا توجد إعلانات حالياً.</p>';
        }
    } else {
        // Case 3: Fetch Failed (Network error, CORS, etc.)
        // FALLBACK: Try to use cached images even if expired
        console.warn('[AdverModule] فشل الجلب. محاولة استخدام النسخة القديمة...');
        if (cachedImages && cachedImages.length > 0) {
            console.log('[AdverModule] تم استرجاع النسخة القديمة من الذاكرة.');
            buildSlider(container, cachedImages);
        } else {
            // Real failure: No network and no cache
            const noAdsMsg = container.querySelector('.no-ads-message');
            if (noAdsMsg) noAdsMsg.style.display = 'block';
        }
    }
}

/**
 * @description Builds and displays ad image slider inside specified container.
 *   Creates slides, dots, and navigation buttons, handles auto-play and manual interactions.
 * @function buildSlider
 * @param {HTMLElement} container - DOM element to contain the slider.
 * @param {Object[]} adImages - Array of ad image objects {url, query}.
 * @returns {void}
 * @see goToSlide
 * @see startAutoPlay
 * @see pauseAutoPlay
 * @see resetAutoPlay
 */
function buildSlider(container, adImages) {
    // If no images, show message
    if (adImages.length === 0) {
        container.innerHTML = '<p class="no-ads-message">لا توجد إعلانات حالياً تاكد من الاتصال بالانترنت</p>';
        container.style.height = 'auto'; // Adjust height
        return;
    }

    // Build slider structure
    container.innerHTML = `
    <div class="ad-slider-track"></div>
    <div class="ad-slider-dots"></div>
    <!-- ✅ NEW: Navigation Buttons -->
    <button class="ad-slider-nav prev" aria-label="Previous Slide"><i class="fas fa-chevron-left"></i></button>
    <button class="ad-slider-nav next" aria-label="Next Slide"><i class="fas fa-chevron-right"></i></button>
  `;

    const track = container.querySelector('.ad-slider-track');
    const dotsContainer = container.querySelector('.ad-slider-dots');
    const slides = [];
    const dots = [];
    let currentIndex = 0;
    let autoPlayInterval = null; // ✅ NEW: Variable to store auto-play timer

    const prevButton = container.querySelector('.ad-slider-nav.prev');
    const nextButton = container.querySelector('.ad-slider-nav.next');

    // Create slides and dots
    adImages.forEach((imageData, index) => {
        const slide = document.createElement('div');
        slide.className = 'ad-slide';
        slide.style.backgroundImage = `url(${imageData.url})`;
        slide.dataset.query = imageData.query || '';
        track.appendChild(slide);

        // ✅ NEW: Handle click for search redirection
        slide.addEventListener('click', () => {
            const query = slide.dataset.query;
            if (query && query.trim() !== '') {
                console.log(`[AdverModule] النقر على إعلان بكلمة بحث: ${query}`);
                localStorage.setItem('pendingSearchQuery', query);
                if (typeof mainLoader === 'function') {
                    mainLoader('pages/search/search.html', 'index-search-container', 0, undefined, 'showHomeIcon', true);
                } else {
                    window.location.hash = '#/pages/search/search.html';
                }
            }
        });

        // ✅ NEW: Add events to pause auto-play on hold
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
     * @description Navigates to a specific slide and applies circular carousel effect.
     *   Calculates and applies transforms for each slide based on its current position.
     * @param {number} index - Index of target slide.
     * @inner
     * @returns {void}
     */
    function goToSlide(index) {
        const newIndex = (index + slides.length) % slides.length;
        currentIndex = newIndex;

        slides.forEach((slide, i) => {
            // ✅ Fix: Calculate offset considering "shortest path"
            // This ensures movement is always circular and symmetrical.
            const totalSlides = slides.length;
            const directOffset = i - currentIndex;
            const wrapOffset = directOffset > 0 ? directOffset - totalSlides : directOffset + totalSlides;
            const offset = Math.abs(directOffset) < Math.abs(wrapOffset) ? directOffset : wrapOffset;

            const isActive = offset === 0;

            // Calculate horizontal transform and scale
            // Side slides are smaller and offset
            const translateX = offset * 55; // 55% of slide width to accommodate 80% width
            const scale = isActive ? 1 : 0.7;
            // ✅ NEW: Add slight Z-axis offset to give depth and prevent overlap
            const translateZ = -Math.abs(offset) * 50;

            slide.style.transform = `translateX(${translateX}%) translateZ(${translateZ}px) scale(${scale})`;
            slide.classList.toggle('active', isActive);

            // When clicking a side slide, it moves to become active
            slide.onclick = () => goToSlide(i);
        });

        dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
        if (slides.length > 1) {
            resetAutoPlay();
        }
    }

    /**
     * @description Starts auto-play for slider, changing slides every 4 seconds.
     * @returns {void}
     * @inner
     */
    function startAutoPlay() {
        if (autoPlayInterval) clearInterval(autoPlayInterval); // Clear old timer
        // Change slide every 4 seconds
        autoPlayInterval = setInterval(() => goToSlide(currentIndex + 1), 4000);
    }

    /**
     * @description Stops auto-play by clearing the timer.
     * @returns {void}
     * @inner
     */
    function pauseAutoPlay() {
        clearInterval(autoPlayInterval);
    }

    /**
     * @description Resets auto-play by stopping then restarting it.
     * @returns {void}
     * @see pauseAutoPlay
     * @see startAutoPlay
     * @inner
     */
    function resetAutoPlay() {
        pauseAutoPlay();
        startAutoPlay();
    }

    // Start animation
    if (slides.length > 0) {
        goToSlide(0); // Show first slide

        // ✅ NEW: Show/Hide navigation buttons and control animation
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
            // ✅ NEW: Hide dots container if only one image
            dotsContainer.style.display = 'none';
        }
    }
}
