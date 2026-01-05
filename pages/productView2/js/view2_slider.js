/**
 * @file pages/productView2/js/view2_slider.js
 * @description 3D Slider logic for Service View.
 */

/**
 * @function pv2_buildSlider
 */
function pv2_buildSlider(images, dom) {
    const { sliderTrack, sliderDots, prevBtn, nextBtn } = dom;

    pv2_sliderState = {
        currentIndex: 0,
        slides: [],
        dots: [],
        autoPlayInterval: null,
        images: images
    };

    sliderTrack.innerHTML = '';
    sliderDots.innerHTML = '';
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';

    if (!images || images.length === 0) {
        sliderTrack.innerHTML = `<p style="text-align:center; color:#666; width:100%;">${window.langu('gen_lbl_no_images')}</p>`;
        return;
    }

    images.forEach((imageUrl, index) => {
        const slide = document.createElement('div');
        slide.className = 'pv2_slide';
        slide.style.backgroundImage = `url('${imageUrl}')`;

        slide.addEventListener('mousedown', pv2_pauseAutoPlay);
        slide.addEventListener('mouseup', pv2_startAutoPlay);
        slide.addEventListener('touchstart', pv2_pauseAutoPlay, { passive: true });
        slide.addEventListener('touchend', pv2_startAutoPlay);

        slide.onclick = () => pv2_goToSlide(index);
        sliderTrack.appendChild(slide);
        pv2_sliderState.slides.push(slide);

        const dot = document.createElement('div');
        dot.className = 'pv2_slider-dot';
        dot.onclick = (e) => {
            e.stopPropagation();
            pv2_goToSlide(index);
        };
        sliderDots.appendChild(dot);
        pv2_sliderState.dots.push(dot);
    });

    if (images.length > 1) {
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';

        // ✅ NEW: Bind navigation buttons
        prevBtn.onclick = (e) => {
            e.stopPropagation();
            pv2_goToSlide(pv2_sliderState.currentIndex - 1);
        };
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            pv2_goToSlide(pv2_sliderState.currentIndex + 1);
        };

        pv2_startAutoPlay();
    } else {
        sliderDots.style.display = 'none';
    }

    pv2_goToSlide(0);
}

/**
 * @function pv2_goToSlide
 */
function pv2_goToSlide(index) {
    const { slides, dots } = pv2_sliderState;
    if (!slides || slides.length === 0) return;

    const total = slides.length;
    const newIndex = (index + total) % total;
    pv2_sliderState.currentIndex = newIndex;

    slides.forEach((slide, i) => {
        const directOffset = i - newIndex;
        const wrapOffset = directOffset > 0 ? directOffset - total : directOffset + total;
        const offset = Math.abs(directOffset) < Math.abs(wrapOffset) ? directOffset : wrapOffset;
        const isActive = offset === 0;

        const translateX = offset * 40;
        const scale = isActive ? 1 : 0.7;
        const translateZ = -Math.abs(offset) * 50;

        slide.style.transform = `translateX(${translateX}%) translateZ(${translateZ}px) scale(${scale})`;

        if (isActive) {
            slide.classList.add('active');
            slide.style.zIndex = 10;
        } else {
            slide.classList.remove('active');
            slide.style.zIndex = 1;
        }
    });

    dots.forEach((dot, i) => {
        if (i === newIndex) dot.classList.add('active');
        else dot.classList.remove('active');
    });

    if (slides.length > 1) pv2_resetAutoPlay();
}

function pv2_startAutoPlay() {
    if (pv2_sliderState.images.length <= 1) return;
    if (pv2_sliderState.autoPlayInterval) clearInterval(pv2_sliderState.autoPlayInterval);
    pv2_sliderState.autoPlayInterval = setInterval(() => {
        pv2_goToSlide(pv2_sliderState.currentIndex + 1);
    }, 4000);
}

function pv2_pauseAutoPlay() {
    if (pv2_sliderState.autoPlayInterval) clearInterval(pv2_sliderState.autoPlayInterval);
}

function pv2_resetAutoPlay() {
    pv2_pauseAutoPlay();
    pv2_startAutoPlay();
}
