/**
 * @file steper/dynamicGap.js
 * @description Calculates and sets dynamic gap for stepper based on viewport width
 * Implements "Smart Estimation" to handle hidden steppers by using sibling width or viewport
 */

function calculateStepperGap() {
    const primaryWrapper = document.getElementById('primary-stepper-wrapper');
    const secondaryWrapper = document.getElementById('secondary-stepper-wrapper');

    // List of wrappers to process
    const wrappers = [primaryWrapper, secondaryWrapper].filter(w => w !== null);

    // Helper to get usable width
    const getEstimatedWidth = (el) => {
        if (el && el.clientWidth > 0) return el.clientWidth;
        // Try neighbor
        if (el === secondaryWrapper && primaryWrapper && primaryWrapper.clientWidth > 0) {
            return primaryWrapper.clientWidth;
        }
        if (el === primaryWrapper && secondaryWrapper && secondaryWrapper.clientWidth > 0) {
            return secondaryWrapper.clientWidth;
        }
        // Fallback to window width minus estimated padding (40px)
        return Math.min(window.innerWidth - 40, 1200);
    };

    wrappers.forEach(wrapper => {
        const steps = wrapper.querySelectorAll('.step-item');
        if (steps.length === 0) return;

        // Get effective width (Real or Estimated)
        // Subtract 40px for internal padding (20px left + 20px right)
        const wrapperWidth = getEstimatedWidth(wrapper) - 40;

        // Fixed step width from CSS
        const stepWidth = 70;

        // Calculate total width needed for all steps
        const totalStepsWidth = stepWidth * steps.length;

        // Calculate available space for gaps
        const availableGapSpace = wrapperWidth - totalStepsWidth;

        // Calculate optimal gap
        const numGaps = steps.length - 1;

        // Default gap if 0 gaps
        let optimalGapPx = 0;

        if (numGaps > 0) {
            // Distribute space evenly
            optimalGapPx = availableGapSpace / numGaps;
        }

        // Convert to rem (assuming 16px = 1rem)
        let optimalGap = optimalGapPx / 16;

        // Strict Clamping to ensure arrows don't overlap or go too far
        // Min: 0.5rem (8px) - enough to separate
        // Max: 4rem (64px) - don't stretch too much
        optimalGap = Math.max(0.5, Math.min(4, optimalGap));

        // Apply to CSS Variable
        wrapper.style.setProperty('--stepper-gap', `${optimalGap}rem`);
        wrapper.style.justifyContent = 'center';
    });
}

// Initialize
function initStickyGap() {
    calculateStepperGap();

    if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(calculateStepperGap);
        });

        const observeWrappers = () => {
            const w1 = document.getElementById('primary-stepper-wrapper');
            const w2 = document.getElementById('secondary-stepper-wrapper');
            if (w1) resizeObserver.observe(w1);
            if (w2) resizeObserver.observe(w2);
        };
        observeWrappers();
    } else {
        window.addEventListener('resize', () => {
            setTimeout(calculateStepperGap, 100);
        });
    }

    const mutationObserver = new MutationObserver(() => {
        calculateStepperGap();
    });

    if (document.body) {
        mutationObserver.observe(document.body, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['style', 'class', 'hidden', 'display']
        });
    }

    // Safety Net
    setInterval(calculateStepperGap, 2000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStickyGap);
} else {
    initStickyGap();
}
