/**
 * splash.js - PWA Splash Screen Logic
 * Mirrors Android's SplashImageManager behavior.
 */

(function () {
    window.splashStartTime = performance.now();

    const taglines = {
        ar: [
            "بازار السويس... فرصة واحدة تجمع كل الفرص",
            "اكتشف آلاف المنتجات من موردين موثوقين في السويس",
            "تابع طلبك حتى باب منزلك",
            "عروض وخصومات حصرية من الموردين",
            "جودة مضمونة وتقييم شفاف من المشترين",
            "من المورد للمستهلك مباشرة جودة وسعر أفضل"
        ],
        en: [
            "Suez Bazaar... One opportunity for all opportunities",
            "Discover thousands of products from trusted suppliers in Suez",
            "Track your order to your doorstep",
            "Exclusive offers and discounts from suppliers",
            "Guaranteed quality and transparent buyer reviews",
            "Directly from supplier to consumer - better quality and price"
        ]
    };

    const categories = [
        "Arts & Crafts.webp", "Avon.webp", "Charity Work.webp", "Clothing & Fashion.webp",
        "Events & Gifts.webp", "Food & Beverages.webp", "General Services.webp",
        "Health & Beauty.webp", "Home & Furniture.webp", "Medical Services.webp",
        "My Way.webp", "Oriflame.webp", "Pets.webp", "Real Estate.webp",
        "Sports.webp", "Tech & Electronics.webp", "Vehicles Market.webp", "Wholesalers.webp"
    ];

    function initSplash() {
        // 1. If running inside Android bridge, remove PWA splash immediately 
        if (window.Android) {
            const splash = document.getElementById('pwa-splash-screen');
            if (splash) splash.remove();
            console.log("📱 [Splash] Android bridge detected. PWA splash removed.");
            return;
        }

        // 2. ONLY show splash if in Standalone mode (Installed PWA)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (!isStandalone) {
            const splash = document.getElementById('pwa-splash-screen');
            if (splash) splash.remove();
            console.log("🌐 [Splash] Regular browser detected. PWA splash removed.");
            return;
        }

        const lang = localStorage.getItem('app_language') || 'ar';
        const taglineEl = document.querySelector('.splash-tagline');
        const carouselTrack = document.querySelector('.splash-carousel-track');

        // --- Sequential Logic Implementation ---

        // 1. Tagline Sequence
        let taglineIndex = parseInt(localStorage.getItem('pwa_splash_tagline_idx') || '0');
        const list = taglines[lang] || taglines.ar;
        if (taglineEl) {
            taglineEl.textContent = list[taglineIndex % list.length];
        }
        localStorage.setItem('pwa_splash_tagline_idx', (taglineIndex + 1) % list.length);

        // 2. Image Sequence (Rotation)
        let imageOffset = parseInt(localStorage.getItem('pwa_splash_image_offset') || '0');
        if (carouselTrack) {
            // Rotate the base list based on saved offset
            const baseList = [...categories];
            const rotation = imageOffset % baseList.length;
            const rotatedList = baseList.slice(rotation).concat(baseList.slice(0, rotation));

            // Increment offset for next time (move by 3 to show significantly different start)
            localStorage.setItem('pwa_splash_image_offset', (imageOffset + 3) % baseList.length);

            // Create [A][B][A][B] pattern for 4 sets (Quadruple)
            // This ensures a seamless loop at -50% translateX in CSS
            const displayList = [...rotatedList, ...rotatedList, ...rotatedList, ...rotatedList];

            displayList.forEach(imgName => {
                const item = document.createElement('div');
                item.className = 'splash-carousel-item';
                const img = document.createElement('img');
                img.src = `images/mainCategories/${imgName}`;
                img.alt = "";
                item.appendChild(img);
                carouselTrack.appendChild(item);
            });
        }
    }

    /**
     * Finalizes the transition from splash screen to main content.
     * Enforces a minimum 4-second duration.
     */
    window.hideSplashScreen = function () {
        const minDuration = 4000;
        const elapsed = performance.now() - window.splashStartTime;
        const remaining = Math.max(0, minDuration - elapsed);

        setTimeout(() => {
            const splash = document.getElementById('pwa-splash-screen');
            if (splash) {
                splash.classList.add('hidden');
                // Remove from DOM after transition to save resources
                setTimeout(() => {
                    if (splash.parentNode) splash.parentNode.removeChild(splash);
                }, 600);
            }
        }, remaining);
    };

    // Initialize when DOM is ready but CSS might still be loading
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSplash);
    } else {
        initSplash();
    }
})();
