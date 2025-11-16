/**
 * @file admin-page.js
 * @description Handles the logic for the main admin dashboard page.
 *
 * This script manages:
 * - Checking for admin privileges.
 * - Dynamically creating and adding action buttons to the admin panel.
 * - Setting up event listeners for admin actions (e.g., opening modals).
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[AdminPage] DOM loaded. Initializing admin panel.');

  const loadingContainer = document.getElementById('loading-container');
  const adminPanelContainer = document.getElementById('admin-panel-container');
  const welcomeMessage = document.getElementById('welcome-message');

  // 1. Authenticate and authorize the user
  const loggedInUser = checkAdminStatus(); // Assuming this function is in auth.js and returns user data or null

  if (!loggedInUser) {
    // If not an admin, show access denied and stop.
    loadingContainer.innerHTML = `
      <div class="login-container" style="text-align: center;">
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #c0392b;"></i>
        <h2>وصول مرفوض</h2>
        <p>يجب أن تكون مسؤولاً للوصول إلى هذه الصفحة.</p>
        <a href="login.html" class="button login-btn">العودة لتسجيل الدخول</a>
      </div>
    `;
    return;
  }

  // 2. If admin, show the panel
  console.log('[AdminPage] Admin access granted.');
  loadingContainer.style.display = 'none';
  adminPanelContainer.style.display = 'block';
  welcomeMessage.innerHTML = `أهلاً بك يا <span class="highlight">${loggedInUser.username}</span>!`;

  // 3. Dynamically create and append admin buttons
  buildAdminButtons();

  // 4. Add event listeners for the buttons
  setupEventListeners();
});

function buildAdminButtons() {
  console.log('[AdminPage] Building admin action buttons.');
  const contentManagementRow = document.getElementById('content-management-row');
  
  if (contentManagementRow) {
    // Create Advertisement Management Button
    const adverButton = document.createElement('button');
    adverButton.id = 'manage-adver-btn';
    adverButton.className = 'button logout-btn-small'; // Using existing styles
    adverButton.innerHTML = `<i class="fas fa-images"></i> إدارة الإعلانات`;
    contentManagementRow.appendChild(adverButton);
  }
  // ... other buttons can be added here ...
}

function setupEventListeners() {
  const manageAdverBtn = document.getElementById('manage-adver-btn');
  if (manageAdverBtn) {
    manageAdverBtn.addEventListener('click', () => {
      console.log('[AdminPage] "Manage Advertisements" button clicked.');
      // Ensure the modal function is available before calling it
      if (typeof showAdverModal === 'function') {
        showAdverModal('adver-modal');
      } else {
        console.error('[AdminPage] `showAdverModal` function is not defined. Make sure adver-admin-modal.js is loaded.');
        Swal.fire('خطأ', 'فشلت تهيئة نافذة إدارة الإعلانات.', 'error');
      }
    });
  }
}