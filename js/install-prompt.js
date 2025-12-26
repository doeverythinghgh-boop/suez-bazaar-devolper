/**
 * @file js/install-prompt.js
 * @description Handles the PWA installation prompt behavior.
 * Checks if the user is on mobile, hasn't seen the prompt recently, and offers
 * a choice between Google Play Store (app) or Apple Store style (PWA Install).
 */

let deferredPrompt;

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

  Swal.fire({
    title: '<span style="font-family: var(--font-primary); font-size: 1.2rem; color: var(--dark-blue);">اختر الطريقة المناسبة لك</span>',
    html: `
      <div style="display: flex; flex-direction: column; gap: 15px; padding: 10px;">
        
        <!-- Option 1: Google Play -->
        <a href="${PLAY_STORE_URL}" target="_blank" class="install-btn google-play-style" onclick="handleInstallChoice('google')">
          <i class="fab fa-google-play fa-2x"></i>
          <div class="btn-text">
            <span>GET IT ON</span>
            <span class="store-name">Google Play</span>
          </div>
        </a>

        <!-- Option 2: PWA Install (Styled as generic App Store / Apple Style) -->
        <div class="install-btn apple-store-style" onclick="triggerPWAInstall()">
          <i class="fab fa-apple fa-2x"></i>
          <div class="btn-text">
            <span>Download on the</span>
            <span class="store-name">App Store</span>
          </div>
        </div>

      </div>
      <style>
        .install-btn {
          display: flex;
          align-items: center;
          background-color: #000;
          color: #fff;
          border-radius: 10px;
          padding: 8px 15px;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.2s, opacity 0.2s;
          box-shadow: 0 4px 6px rgba(0,0,0,0.2);
          width: 240px;
          margin: 0 auto;
        }
        .install-btn:active {
          transform: scale(0.98);
        }
        .google-play-style {
          background-color: #000; /* or standard dark grey/green if preferred, user said "Store Icon" */
        }
        .apple-store-style {
          background-color: #000;
        }
        .install-btn i {
          margin-right: 15px; /* RTL flip might be needed if dir=rtl, keeping logic general */
          width: 30px;
          text-align: center;
        }
        .btn-text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1.1;
        }
        .btn-text span:first-child {
          font-size: 0.7rem;
          font-weight: 300;
        }
        .btn-text .store-name {
          font-size: 1.2rem;
          font-weight: 600;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif; /* Store fonts look usually generic sans */
        }
      </style>
    `,
    showConfirmButton: false,
    showCloseButton: true,
    background: '#fff',
    didOpen: () => {
      // REMOVED: User requested to show always.
      // localStorage.setItem('installPromptShown_v1', 'true');
    }
  });
}

// 3. Trigger PWA Logic
window.triggerPWAInstall = async () => {
  console.log('[InstallPrompt] Apple/PWA button clicked');

  if (deferredPrompt) {
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[InstallPrompt] User response to install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    deferredPrompt = null;
    Swal.close(); // Close our modal
  } else {
    // Fallback for iOS or if prompt unavailable (e.g. fired too early/late or not supported)
    // Show instruction for iOS
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS) {
      Swal.fire({
        icon: 'info',
        title: 'تثبيت التطبيق',
        html: 'لتثبيت التطبيق على الآيفون:<br><br>1. اضغط على زر <b>مشاركة</b> <i class="fas fa-share-square"></i><br>2. اختر <b>إضافة إلى الصفحة الرئيسية</b> <i class="fas fa-plus-square"></i>',
        confirmButtonText: 'حسناً'
      });
    } else {
      // Fallback generic
      console.warn('[InstallPrompt] No deferred prompt available.');
      Swal.close();
      // Maybe reload page?
    }
  }
};

window.handleInstallChoice = (choice) => {
  console.log('[InstallPrompt] User chose:', choice);
  Swal.close();
};
