/**
 * @file js/mobile-keyboard-handler.js
 * @description Advanced keyboard scrolling handler for PWA environments.
 * Automatically scrolls input fields into view when the virtual keyboard appears.
 * 
 * IMPORTANT: This script ONLY runs in PWA mode (Standalone/Fullscreen).
 * It will NOT execute in Android WebView environment to avoid conflicts.
 */

(function() {
  'use strict';

  // ============================================
  // 1. PWA Environment Detection
  // ============================================
  
  /**
   * @description Checks if the app is running in PWA mode (not Android WebView).
   * @returns {boolean} True if PWA, false if Android WebView or regular browser.
   */
  function isPWAEnvironment() {
    // Check for Android WebView interface
    if (window.Android && typeof window.Android === 'object') {
      console.log('[KeyboardHandler] Android WebView detected. Handler disabled.');
      return false;
    }

    // Check if running in standalone mode (PWA)
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true ||
                       document.referrer.includes('android-app://');

    if (!isStandalone) {
      console.log('[KeyboardHandler] Not in PWA mode. Handler disabled.');
      return false;
    }

    console.log('[KeyboardHandler] PWA environment detected. Handler enabled.');
    return true;
  }

  // Exit immediately if not in PWA environment
  if (!isPWAEnvironment()) {
    return;
  }

  // ============================================
  // 2. Configuration & State
  // ============================================

  var config = {
    scrollDelay: 350,           // Delay to allow keyboard to appear
    debounceDelay: 200,         // Debounce delay for repeated events
    iosExtraDelay: 50,          // Extra delay for iOS Safari
    iosRetryDelay: 100,         // Retry delay for iOS if first scroll fails
    scrollOffset: 120,          // Extra space below focused element
    centerOffset: 0.4           // Position element at 40% from top
  };

  var state = {
    isKeyboardOpen: false,
    activeElement: null,
    originalBodyHeight: null,
    fixedElements: [],
    debounceTimer: null,
    isIOS: /iPhone|iPad|iPod/i.test(navigator.userAgent),
    isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  };

  // ============================================
  // 3. Utility Functions
  // ============================================

  /**
   * @description Debounce function to prevent excessive calls.
   */
  function debounce(func, delay) {
    return function() {
      var context = this;
      var args = arguments;
      clearTimeout(state.debounceTimer);
      state.debounceTimer = setTimeout(function() {
        func.apply(context, args);
      }, delay);
    };
  }

  /**
   * @description Gets the actual visible viewport height.
   */
  function getVisibleHeight() {
    if (window.visualViewport) {
      return window.visualViewport.height;
    }
    return window.innerHeight;
  }

  /**
   * @description Calculates the optimal scroll position for an element.
   */
  function calculateScrollPosition(element) {
    var rect = element.getBoundingClientRect();
    var visibleHeight = getVisibleHeight();
    var elementTop = rect.top + window.pageYOffset;
    var targetPosition = elementTop - (visibleHeight * config.centerOffset);
    
    return Math.max(0, targetPosition);
  }

  // ============================================
  // 4. Fixed Elements Management
  // ============================================

  /**
   * @description Identifies and stores fixed position elements.
   */
  function identifyFixedElements() {
    // Elements with data attribute
    var markedElements = document.querySelectorAll('[data-keyboard-fixed]');
    
    // Common fixed elements
    var commonSelectors = [
      'header',
      'footer',
      '.header',
      '.footer',
      '[class*="nav"]',
      '[class*="bottom"]'
    ];

    var allElements = Array.from(markedElements);
    
    commonSelectors.forEach(function(selector) {
      try {
        var elements = document.querySelectorAll(selector);
        elements.forEach(function(el) {
          var style = window.getComputedStyle(el);
          if (style.position === 'fixed') {
            allElements.push(el);
          }
        });
      } catch (e) {
        // Ignore invalid selectors
      }
    });

    state.fixedElements = allElements;
    console.log('[KeyboardHandler] Found ' + state.fixedElements.length + ' fixed elements');
  }

  /**
   * @description Temporarily disables fixed positioning.
   */
  function disableFixedElements() {
    state.fixedElements.forEach(function(el) {
      el.setAttribute('data-original-position', el.style.position || '');
      el.style.position = 'absolute';
      el.classList.add('keyboard-active');
    });
  }

  /**
   * @description Restores original fixed positioning.
   */
  function restoreFixedElements() {
    state.fixedElements.forEach(function(el) {
      var originalPosition = el.getAttribute('data-original-position');
      if (originalPosition) {
        el.style.position = originalPosition;
      } else {
        el.style.position = '';
      }
      el.classList.remove('keyboard-active');
      el.removeAttribute('data-original-position');
    });
  }

  // ============================================
  // 5. iOS-Specific Handling
  // ============================================

  /**
   * @description Handles iOS-specific keyboard behavior.
   */
  function handleIOSKeyboard(element) {
    // Save original body height
    if (!state.originalBodyHeight) {
      state.originalBodyHeight = document.body.style.height;
    }

    // Lock body height to prevent jumping
    var currentHeight = document.documentElement.scrollHeight;
    document.body.style.height = currentHeight + 'px';

    // Perform scroll with iOS-specific timing
    setTimeout(function() {
      performScroll(element);
      
      // Retry if needed (iOS sometimes ignores first scroll)
      setTimeout(function() {
        var rect = element.getBoundingClientRect();
        var visibleHeight = getVisibleHeight();
        
        // Check if element is still not visible
        if (rect.bottom > visibleHeight || rect.top < 0) {
          console.log('[KeyboardHandler] iOS retry scroll');
          performScroll(element);
        }
      }, config.iosRetryDelay);
    }, config.iosExtraDelay);
  }

  /**
   * @description Restores iOS-specific settings.
   */
  function restoreIOSSettings() {
    if (state.originalBodyHeight !== null) {
      document.body.style.height = state.originalBodyHeight;
      state.originalBodyHeight = null;
    }
  }

  // ============================================
  // 6. Core Scrolling Logic
  // ============================================

  /**
   * @description Performs the actual scroll operation with multiple strategies.
   */
  function performScroll(element) {
    try {
      // Strategy 1: scrollIntoView with smooth behavior
      if (element.scrollIntoView) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }

      // Strategy 2: Manual scroll calculation (fallback)
      setTimeout(function() {
        var targetPosition = calculateScrollPosition(element);
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }, 50);

    } catch (error) {
      console.warn('[KeyboardHandler] Scroll error:', error);
      
      // Strategy 3: Simple scrollIntoView (last resort)
      try {
        element.scrollIntoView(true);
      } catch (e) {
        console.error('[KeyboardHandler] All scroll strategies failed');
      }
    }
  }

  /**
   * @description Main handler for input focus events.
   */
  function handleInputFocus(event) {
    var element = event.target;
    
    // Verify it's an input element
    var tagName = element.tagName.toLowerCase();
    if (tagName !== 'input' && tagName !== 'textarea' && tagName !== 'select') {
      return;
    }

    console.log('[KeyboardHandler] Input focused:', tagName);
    
    state.activeElement = element;
    state.isKeyboardOpen = true;

    // Disable fixed elements
    disableFixedElements();

    // Apply platform-specific handling
    var scrollDelay = config.scrollDelay;
    
    if (state.isIOS && state.isSafari) {
      handleIOSKeyboard(element);
    } else {
      setTimeout(function() {
        performScroll(element);
      }, scrollDelay);
    }
  }

  /**
   * @description Debounced version of focus handler.
   */
  var debouncedFocusHandler = debounce(handleInputFocus, config.debounceDelay);

  /**
   * @description Handler for input blur events.
   */
  function handleInputBlur() {
    console.log('[KeyboardHandler] Input blurred');
    
    state.isKeyboardOpen = false;
    state.activeElement = null;

    // Restore fixed elements
    restoreFixedElements();

    // Restore iOS settings
    if (state.isIOS) {
      restoreIOSSettings();
    }
  }

  // ============================================
  // 7. Visual Viewport API Integration
  // ============================================

  /**
   * @description Monitors viewport changes (keyboard open/close).
   */
  function handleViewportResize() {
    if (!window.visualViewport) {
      return;
    }

    var currentHeight = window.visualViewport.height;
    var windowHeight = window.innerHeight;

    // Keyboard likely opened
    if (currentHeight < windowHeight * 0.75) {
      if (!state.isKeyboardOpen && state.activeElement) {
        console.log('[KeyboardHandler] Viewport resize detected - keyboard opened');
        state.isKeyboardOpen = true;
      }
    } 
    // Keyboard likely closed
    else {
      if (state.isKeyboardOpen) {
        console.log('[KeyboardHandler] Viewport resize detected - keyboard closed');
        handleInputBlur();
      }
    }
  }

  // ============================================
  // 8. Initialization
  // ============================================

  /**
   * @description Initializes the keyboard handler.
   */
  function init() {
    console.log('[KeyboardHandler] Initializing...');

    // Identify fixed elements
    identifyFixedElements();

    // Add event listeners using delegation
    document.addEventListener('focusin', function(e) {
      var tagName = e.target.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        debouncedFocusHandler(e);
      }
    }, true);

    document.addEventListener('focusout', function(e) {
      var tagName = e.target.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        handleInputBlur();
      }
    }, true);

    // Visual Viewport API support
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', debounce(handleViewportResize, 100));
      console.log('[KeyboardHandler] Visual Viewport API enabled');
    } else {
      // Fallback: monitor window resize
      window.addEventListener('resize', debounce(handleViewportResize, 100));
      console.log('[KeyboardHandler] Using window resize fallback');
    }

    console.log('[KeyboardHandler] Initialization complete');
  }

  // ============================================
  // 9. Auto-Start
  // ============================================

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
