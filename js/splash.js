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
        const lang = localStorage.getItem('app_language') || 'ar';
        const taglineEl = document.querySelector('.splash-tagline');
        const carouselTrack = document.querySelector('.splash-carousel-track');

        // 1. Set Random Tagline
        if (taglineEl) {
            const list = taglines[lang] || taglines.ar;
            taglineEl.textContent = list[Math.floor(Math.random() * list.length)];
        }

        // 2. Setup Carousel Items
        if (carouselTrack) {
            // Shuffle and duplicate for infinite effect
            // Use exactly 2 sets (Double) to match CSS translateX(-50%)
            const shuffled = [...categories].sort(() => 0.5 - Math.random());
            const displayList = [...shuffled, ...shuffled];

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
