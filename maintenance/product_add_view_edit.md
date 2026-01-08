# Product Addition Module Documentation (ProductAdd - Add1)

The `productAdd` module is responsible for the interface to add new products to the system (Add1). It follows the same modular philosophy for ease of development.

## 📁 Directory Structure
Path: `pages/productAdd/`

- **`productAdd.css`**: Styles for the addition interface, including the interactive image upload area.

### 📂 Software Folder (js/)
The programming logic is divided into 5 files:

1. **`add1_config.js`**:
   - Constants: Compression dimensions (1600px), quality (0.75), and maximum (6 images).
   - State: `add1_images` array and `isProcessingFilesAdd1` processing flag.

2. **`add1_utils.js`**:
   - Custom error display tools (`add1_showError`).
   - Helper formatting functions and unique ID generation for images.

3. **`add1_image.js`**:
   - Image processing: Checking `WebP` support and executing compression compatible with mobile memory.
   - New file manager (`add1_handleNewFiles`) that organizes the validation and compression process.

4. **`add1_ui.js`**:
   - Management of DOM elements and event listeners.
   - Creating image previews (`add1_createPreviewItem`) and deleting them.
   - Launching the camera via the system interface (Capture Environment) for mobile.
   - Real-time character counters and numeric field filters.
   - **Displaying Category Cards (`add1_renderCategories`)**: Fetches names of selected categories from `ProductStateManager.resolveCategoryNames()` and displays them as colored cards under the page title.
   - **"Discard Changes" Button (`add1_btn_discard`)**: Displays a modern SweetAlert2 confirmation window, then clears the state from `ProductStateManager`, cleans the container, and goes back via `containerGoBack()`.

5. **`add1_submit.js`**:
   - Validation of all fields (6 basic checks).
   - Management of the submit button state (`add1_setSubmitLoading`).
   - Serial number generation, uploading images to the cloud, and saving final data.
   - Notifying administration of the new product addition.

## ⚙️ Technical Workflow

1.  **Displaying Selected Categories**: Upon page load, `add1_renderCategories()` is called to fetch main and sub category names from `shared/list.json` via `ProductStateManager.resolveCategoryNames()` and display them as colored cards (`add1_category_badges`) directly under the page title.
2.  **Image Processing**: Images are compressed immediately upon selection using `add1_handleNewFiles`. Images are converted to `WebP` format (if supported) to reduce uploaded data size.
3.  **Data Validation**: 6 basic checks are performed before starting the submission:
    - Presence of at least one image.
    - Product name (required).
    - Product description (minimum 10 characters).
    - Seller message (minimum 10 characters).
    - Quantity (greater than 0).
    - Price (positive number).
4.  **ID Generation**: `generateSerial()` is used to create a unique product ID (`product_key`).
5.  **Data Saving**:
    - **Cloud Upload**: Images are uploaded to Cloudflare R2 using `uploadFile2cf`. Priority is given to the `.webp` format.
    - **Database**: The `addProduct` function is called (via `dbResult`) to send the final `productData` object.
    - **Notifications**: `notifyAdminOnNewItem` is called to send an immediate notification to system administrators.
6.  **Form Reset**: After success, the form is emptied, the `add1_images` array is cleared, and character counters are reset to zero.
7.  **Discard Changes**: When the "Discard Changes" button (`add1_btn_discard`) is clicked, a modern SweetAlert2 confirmation window is displayed. Upon confirmation, selected categories are cleared from `ProductStateManager.setSelectedCategories(null, null)`, `data-page-url` and container content are cleaned, then it goes back via `containerGoBack()`.

---

# Product Editing Module Documentation (ProductEdit)

The `productEdit` module is responsible for the interface to edit existing products and services in the system. It is designed to be modular and organized for easy maintenance.

## 📁 Directory Structure
Path: `pages/productEdit/`

- **`productEdit.html`**: Defines the form structure, input fields, image upload area, and script tags for modular files.
- **`productEdit.css`**: Contains modern designs for the form, image preview grid, and responsive layouts for different devices.

### 📂 Software Folder (js/)
The programming logic is divided into 6 core files:

1.  **`edit_config.js`**:
    - Management of static settings for image compression (max width 1600px, quality 0.75).
    - Global State management such as the current image array and original image names.
    - Supports the `window.productModule` object for compatibility.

2.  **`edit_utils.js`**:
    - Helper functions to display and remove error messages (`EDIT_showError`, `EDIT_clearError`).
    - Function to convert file sizes to readable text (`EDIT_formatBytes`).
    - Generating unique IDs for preview elements (`EDIT_genId`).

3.  **`edit_image.js`**:
    - Checking browser support for `WebP` format.
    - Processing image compression using `Canvas` to improve performance and reduce upload size.
    - Loading pre-existing images from Cloudflare R2 when opening the edit page.
    - Processing and filtering newly added files.

4.  **`edit_ui.js`**:
    - Management of user interface events (file selection, camera launch).
    - Dynamically creating and managing preview elements.
    - Implementing the desktop camera feature (Webcam Capture).
    - Real-time character counters for text fields and validation of numeric inputs.
    - **Displaying Category Cards (`EDIT_renderCategories`)**: Fetches names of selected categories from `ProductStateManager.resolveCategoryNames()` and displays them as colored cards under the page title.
    - **"Discard Changes" Button (`edit_btn_discard`)**: Displays a modern SweetAlert2 confirmation window, then clears the state from `ProductStateManager`, cleans the container, and goes back via `containerGoBack()`.

5.  **`edit_submit.js`**:
    - Form submission handler: Manages the cloud upload and saving process.
    - **Change Detection**: New data is compared with existing data in `ProductStateManager.getCurrentProduct()`. If no changes are made, the user is alerted and unnecessary submission is prevented.
    - **Image Management**: Only new images are uploaded, and images removed by the user are physically deleted from the cloud via `deleteFile2cf`.
    - **Database Update**: `updateProduct` is called with `is_approved: 0` to have the product re-reviewed by administration after modification.

6.  **`edit_init.js`**:
    - **Data Fetching**: Data is extracted from `ProductStateManager` pre-populated when the product is selected for editing.
    - Data Distribution: Text fields, price, quantity, and additional prices (app price and price before discount) are populated.

## 🔄 Data Flow
1. User opens the edit page -> Product data is loaded into `ProductStateManager`.
2. `edit_init.js` extracts data and fills the form.
3. `edit_ui.js` calls `EDIT_renderCategories()` to fetch and display selected category names as colored cards from `ProductStateManager.resolveCategoryNames()`.
4. `edit_image.js` loads current images from the cloud and displays them as deletable previews.
5. Upon clicking "Update" -> `edit_submit.js` checks for real changes by comparing with the state in `ProductStateManager`.
6. New images are uploaded -> Database is updated -> Old images are deleted from R2 -> Administration is notified via `notifyAdminOnItemUpdate`.
7. Upon clicking "Discard Changes" -> Confirmation window is displayed -> State is cleared -> Container is cleaned -> Go back.

---

# Product View Module Documentation (ProductView)

Responsible for displaying details of regular products with the ability to specify quantity and add to cart.

## 📁 Directory Structure
Path: `pages/productView/`

### 📂 Software Folder (js/)
1. **`view_config.js`**: Manages the local UI state.
2. **`view_utils.js`**: Contains the `productView_updateTotalPrice` function to calculate the total in real-time.
3. **`view_ui.js`**:
   - `productView_getDomElements`: Fetches DOM elements to ensure no old references.
   - `productView_populateThumbnails`: Creates the interactive image gallery.
   - `productView_setupQuantityControls`: Manages increment/decrement buttons and checks the maximum limit.
   - `productView_setupAddToCart`: Links product data to the global cart logic.
4. **`view_init.js`**:
   - `productView_viewDetails`: Central function that organizes data distribution and interaction initialization.
   - **Role-Based Display Logic**:
     - **For Seller (Owner)**: "App Price" (Real Price) is shown to help them know the actual cost.
     - **For Admin**: Seller data (name and identification key) is shown for quick communication.
     - **For Buyer (Guest/User)**: Sensitive data is hidden, and only the final price and "Add to Cart" button are shown.

### 🛡️ Sensitive Data Container (`productView_admin_seller_info`)
This element is the central container for displaying data that requires special permissions, featuring specific technical characteristics:
- **ID**: `productView_admin_seller_info`
- **Goal**: Protect seller privacy and display cost data (app price) only to authorized parties.
- **Access Control Logic**:
    - Appears for **Admins** (verified via `ADMIN_IDS` in `config.js`).
    - Appears for the **Product Owner** (verified by matching the user's `user_key` with the product's `user_key`).
    - Appears in **Impersonation** mode when `originalAdminSession` is detected.
- **Internal Components**:
    - **Title**: An alert text that changes dynamically to suit the viewer's identity ("Data visible to administration and seller only").
    - **Seller Data**: Includes the alias and unique user key (`user_key`).
    - **App Price (`productView_real_price_container`)**: A sub-element within this container displaying the original price (cost) from the `realPrice` field in the database.
- **Security**: This container is completely hidden from the default DOM (`display: none`) and is only populated with data after passing the permissions test in the `view_init.js` file.

## 🔄 State Integration
The module relies on `ProductStateManager.getCurrentProduct()` (the unified data exchange system) to fetch product data and view options.

- **Session Check**: `showLoginAlert()` is called before allowing addition to the cart to ensure the user is logged in.

## Where it Appears in the Project
The `ProductView` interface is dynamically called from 5 main locations:
1.  **Category Gallery (`categories.js`)**: When clicking on any product within a specific category.
2.  **Search Results (`search.js`)**: When clicking on a product from search results.
3.  **My Products Management (`product2Me.js`)**: Used by the seller to preview their own product details.
4.  **Admin Dashboard (`pendingProducts.js`)**: Used by the admin to preview pending products awaiting approval.
5.  **Order Details (`sales-movement.js`)**: Appears when clicking on a product name within the "Sales Movement" table or the Stepper to review its specifications.

## 🛠️ Display States
The interface changes based on **view options** and **user role**:

| State              | `showAddToCart` option | Sensitive Data | State Description                                                      |
| :----------------- | :--------------------- | :------------- | :--------------------------------------------------------------------- |
| **General Buyer**  | `true`                 | ❌ Hidden       | Default state when browsing and purchasing.                            |
| **Seller (Owner)** | `false`                | ✅ Visible      | When the seller enters to preview their product from "My Products".    |
| **Admin**          | `true/false`           | ✅ Visible      | When monitoring a product or following an order from "Sales Movement". |

## 📊 Data Schema
The `productView_viewDetails` function receives a product data object with the following structure:

| Field               | Description                    | Visibility                |
| :------------------ | :----------------------------- | :------------------------ |
| `productName`       | Main product name              | For everyone              |
| `pricePerItem`      | Current selling price          | For everyone              |
| `original_price`    | Price before discount (if any) | For everyone              |
| `availableQuantity` | Quantity available in stock    | For everyone              |
| `description`       | Detailed product description   | For everyone              |
| `sellerMessage`     | Seller note to buyers          | For everyone              |
| `imageSrc`          | Image link array (Gallery)     | For everyone              |
| `sellerName`        | Real seller name               | For Admin and Seller only |
| `user_key`          | Unique seller identifier       | For Admin and Seller only |
| `realPrice`         | Cost price (App Price)         | For Admin and Seller only |
