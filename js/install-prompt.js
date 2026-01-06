/**
 * @file js/install-prompt.js
 * @description Handles the PWA installation prompt behavior.
 * Checks if the user is on mobile, hasn't seen the prompt recently, and offers
 * a choice between Google Play Store (app) or Apple Store style (PWA Install).
 */

var deferredPrompt;

// 1. Capture the PWA install prompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Log
  console.log('[InstallPrompt] captured beforeinstallprompt event');

  // Attempt to show the custom prompt
  // checkAndShowInstallPrompt();
});

// Run check on load to support iOS and cases where prompt event doesn't fire
window.addEventListener('load', () => {
  setTimeout(() => {
    checkAndShowInstallPrompt();
  }, 3000);
});

// 2. Check conditions and show modal
function checkAndShowInstallPrompt() {
  // A. Check if already installed (standalone)
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
    console.log('[InstallPrompt] App is already running in standalone mode.');
    return;
  }

  // B. Check if Mobile (Simple User Agent check)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (!isMobile) {
    console.log('[InstallPrompt] Not a mobile device, skipping prompt.');
    return;
  }

  // C. Check LocalStorage (Don't show if dismissed recently)
  // REMOVED: User requested to show always on mobile.
  // if (localStorage.getItem('installPromptShown_v1')) { ... }

  // D. Show the SweetAlert2 Modal
  showCustomInstallModal();
}

function showCustomInstallModal() {
  // Google Play Link
  const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=hgh.hgh.suezbazaar&pcampaignid=web_share";
  if (!window.Android) {
    Swal.fire({
      title: `<span style="font-family: var(--font-primary); font-size: 1.2rem; color: var(--dark-blue);">${window.langu("install_pwa_title")}</span>`,
      html: `
      <div class="install-modal-container">
        
        <!-- Option 1: Google Play -->
        <a href="${PLAY_STORE_URL}" target="_blank" class="install-btn google-play-style" onclick="handleInstallChoice('google')">
          <i class="fab fa-google-play"></i>
          <div class="btn-text">
            <span class="small-text">GET IT ON</span>
            <span class="store-name">Google Play</span>
          </div>
        </a>

        <!-- Option 2: PWA Install (Styled as generic App Store / Apple Style) -->
        <div class="install-btn apple-store-style" onclick="triggerPWAInstall('apple')">
          <i class="fab fa-apple"></i>
          <div class="btn-text">
            <span class="small-text">Download on the</span>
            <span class="store-name">App Store</span>
          </div>
        </div>

      </div>
      <style>
        .install-modal-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
          padding: 10px;
          align-items: center;
          width: 100%;
        }
        .install-btn {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          background-color: #1a1a1a;
          color: #fff;
          border-radius: 12px;
          padding: 10px 20px;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.2s, background-color 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
          width: 100%;
          max-width: 280px; /* Max width for larger screens */
          border: 1px solid rgba(255,255,255,0.1);
        }
        .install-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 14px rgba(0,0,0,0.2);
        }
        .install-btn:active {
          transform: scale(0.97);
        }
        .google-play-style {
          background-color: #202124; /* Google Dark Grey */
        }
        .apple-store-style {
          background-color: #000000; /* Apple Black */
        }
        .install-btn i {
          margin-right: 15px;
          font-size: 28px;
          width: 35px;
          text-align: center;
        }
        /* Mobile adjustments for RTL */
        [dir="rtl"] .install-btn i {
          margin-right: 0;
          margin-left: 15px;
        }
        .btn-text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1.2;
        }
        .small-text {
          font-size: 0.75rem;
          font-weight: 300;
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .store-name {
          font-size: 1.3rem;
          font-weight: 600;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        @media (max-width: 360px) {
            .install-btn {
                padding: 8px 15px;
            }
            .store-name {
                font-size: 1.1rem;
            }
            .install-btn i {
                font-size: 24px;
            }
        }
      </style>
    `,
      showConfirmButton: false,
      showCloseButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      background: '#fff',
      didOpen: () => {
        // REMOVED: User requested to show always.
        // localStorage.setItem('installPromptShown_v1', 'true');
      }
    });
  }
}

// 3. Trigger PWA Logic
window.triggerPWAInstall = async (platform = 'generic') => {
  console.log(`[InstallPrompt] ${platform} button clicked`);

  // If user specifically clicked Apple/PWA or we are on iOS and native prompt fails
  if (platform === 'apple') {
    // Show instruction for iOS style (And anyone else clicking this)
    Swal.fire({
      title: `<span style="font-size: 1.1rem; font-weight: 600;">لتنصيب البرنامج كتطبيق وب اتبع الخطوات الاتية في الفديو</span>`,
      position: 'bottom',
      timer: 5000,
      timerProgressBar: true,
      showConfirmButton: false,
      background: '#f9f9f9',
      customClass: {
        popup: 'ios-install-popup'
      },
      backdrop: true,
      allowOutsideClick: false,
      allowEscapeKey: false
    }).then(() => {
      // Show the video after the 5s timer
      showIOSVideoPage();
    });
    return;
  }

  if (deferredPrompt) {
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[InstallPrompt] User response to install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    deferredPrompt = null;
    Swal.close(); // Close our modal
    window.showWelcomeAndThanksPage();
  } else {
    // Fallback if no deferredPrompt and not explicitly 'apple'
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS) {
        // Re-use logic for iOS fallback
        triggerPWAInstall('apple');
    } else {
        console.warn('[InstallPrompt] No deferred prompt available.');
        Swal.close();
        window.showWelcomeAndThanksPage();
    }
  }
};

window.handleInstallChoice = (choice) => {
  console.log('[InstallPrompt] User chose:', choice);
  Swal.close();
  window.showWelcomeAndThanksPage();
};

/**
 * @description Loads the welcome page and hides the main navigation to focus on "Thanks".
 * Shows features and benefits of Suez Bazaar.
 */
window.showWelcomeAndThanksPage = function () {
  try {
    console.log('[InstallPrompt] Showing Welcome/Thanks page.');

    // Hide Main Header
    /** @type {HTMLElement|null} */
    var header = document.getElementById('index-app-header');
    if (header) {
      header.style.display = 'none';
    }

    // Use index-user-container or a dedicated one to show the welcome page
    // We use mainLoader to fetch and insert it
    if (typeof mainLoader === 'function') {
      mainLoader(
        "pages/welcome.html",
        "index-user-container",
        0,
        "position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; overflow: auto; background: var(--bg-color-light);",
        undefined,
        true // Reload to ensure scripts run
      );
    } else {
      // Fallback if mainLoader not available
      window.location.href = "pages/welcome.html";
    }
  } catch (err) {
    console.error("Error showing welcome page:", err);
  }
};
/**
 * @description Substitutes the entire page content with a full-screen looping instructional video for iOS.
 */
function showIOSVideoPage() {
  console.log('[InstallPrompt] Transitioning to iOS Video instructional page.');
  
  // Create full-screen video container
  const videoHtml = `
    <div id="ios-video-wrapper" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #000; z-index: 100000; display: flex; align-items: center; justify-content: center;">
      <video autoplay loop muted playsinline aria-label="iOS Installation Guide" style="max-width: 100%; max-height: 100%; outline: none; border: none;">
        <source src="images/ios.mp4" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    </div>
  `;
  
  // Replace body content completely as requested
  document.body.innerHTML = videoHtml;
  
  // Ensure the video plays (sometimes autoplay attribute is blocked)
  const videoElement = document.querySelector('#ios-video-wrapper video');
  if (videoElement) {
    videoElement.play().catch(e => console.warn('[InstallPrompt] Video play failed:', e));
  }
  
  // Ensure the body doesn't scroll
  document.body.style.overflow = 'hidden';
  document.body.style.margin = '0';
  document.body.style.padding = '0';
  document.body.style.backgroundColor = '#000';
}
