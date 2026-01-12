/**
 * @file steper/dynamicGap.js
 * @description Calculates and sets dynamic gap for stepper
 * Updated to use 70px step width for better fitting
 */

function calculateStepperGap() {
    const wrapper = document.getElementById('primary-stepper-wrapper');
    if (!wrapper) return;

    const steps = wrapper.querySelectorAll('.step-item');
    if (steps.length === 0) return;

    const wrapperWidth = wrapper.clientWidth - 40; // padding
    const stepWidth = 70; // Updated to match CSS
    const totalStepsWidth = stepWidth * steps.length;
    const availableGapSpace = wrapperWidth - totalStepsWidth;
    const numGaps = steps.length - 1;

    let optimalGapPx = numGaps > 0 ? availableGapSpace / numGaps : 0;
    let optimalGap = optimalGapPx / 16; // to rem

    // Allow smaller minimum for very narrow screens
    optimalGap = Math.max(0.5, Math.min(3, optimalGap));

    wrapper.style.setProperty('--stepper-gap', `${optimalGap}rem`);

    console.log(`[Stepper] Gap: ${optimalGap.toFixed(2)}rem | Viewport: ${wrapperWidth}px | Steps: ${stepWidth}px × ${steps.length} = ${totalStepsWidth}px | Available: ${availableGapSpace}px`);
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(calculateStepperGap, 100));
} else {
    setTimeout(calculateStepperGap, 100);
}

// Resize handlers
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(calculateStepperGap, 150);
});

if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(calculateStepperGap);
    const tryObserve = () => {
        const wrapper = document.getElementById('primary-stepper-wrapper');
        if (wrapper) observer.observe(wrapper);
        else setTimeout(tryObserve, 100);
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryObserve);
    } else {
        tryObserve();
    }
}
