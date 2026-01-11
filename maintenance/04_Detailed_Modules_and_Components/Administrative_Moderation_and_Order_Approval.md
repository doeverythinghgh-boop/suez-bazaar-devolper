# Administrative Moderation and Order Approval

Administrators hold privileged access to oversee the marketplace, approve content, and resolve transaction disputes.

## 1. Authentication & ID Security
- **`ADMIN_IDS` Array**: Centralized list in `config.js` defining all authorized administrative identifiers.
- **Permission Elevation**: Detecting an Admin ID enables hidden UI elements, such as the "App Price" preview and the "Admin" filter in sales movement.

## 2. Content Moderation Workflow
- **`pendingProducts.js`**: A dedicated dashboard for auditing new submissions.
- **Review Criteria**: Admins verify image quality, description accuracy, and category alignment.
- **Approval Logic**: Approving an item updates its `is_approved` status to `1`, triggering a notification to the seller and making the item publicly search-able.

## 3. Marketplace Control
- **Advertisement Control Panel**: (`pages/ADMIN/mainAdvertises.html`) allows for real-time manipulation of the `advertisements.json` manifest.
- **Global Broadcasts**: Admins can send system-wide notifications to all users or specific roles (e.g., notifying all Sellers of a policy change).
- **Impersonation**: The `SessionManager` allows admins to "logged in as" any user to debug specific session issues without needing their password.

## 4. Order & Pricing Authority
In the Stepper and Sales Movement modules:
- **The Ultimate Lock-Breaker**: Admins retain the ability to edit `total_amount` and change item statuses even after they have been locked for standard users.
- **Conflict Resolution**: Admins see full contact details for both buyer and seller to facilitate dispute resolution.

## 5. Maintenance Tools
Admins have access to the **Dev Console** specialized "Reset" functions, allowing them to force a remote FCM re-registration or a version-check for any user current session.
