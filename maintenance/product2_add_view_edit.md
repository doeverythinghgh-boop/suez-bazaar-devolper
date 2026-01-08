# Service Addition Module Documentation (ProductAdd2 - Add2)

The `productAdd2` module is responsible for the interface to add services (Add2). It is designed to provide a smooth user experience with advanced multimedia support.

## 🧱 Structural Framework (HTML)
Path: `pages/productAdd2/productAdd2.html`

The structure relies on Modal elements containing a `form` with the following sections:
- **Image Upload Area**: Prompts the user to select files or use the camera.
- **Data Fields**: Include (Service Name, Service Description, Service Provider Message, Special Notes).
- **Footer**: Contains the save and publish button.
- **Camera Container**: A hidden element (`add2_camera_modal_container`) that appears when the desktop capture feature is activated.

## 🎨 Visual Styling (CSS)
Path: `pages/productAdd2/productAdd2.css`

- The design features solid gradients (Flat Colors) and blue (`#3498db`) as a core identity element.
- Uses a `Grid` system to display image previews responsively.
- Full support for `active` state instead of `hover` to ensure touch compatibility.
- Responsive design that adjusts font sizes and padding based on screen width.

## 🧠 Programming Logic (JavaScript)

### 1. General Settings (`add2_config.js`)
- Update constant values for image compression and maximum files (6 images).
- Management of the `add2_images` array which stores image states (pending, compressing, ready, error).

### 2. Core Tools and Functions (`add2_utils.js`)
- **`add2_showError(element, message)`**: Dynamically injects error messages under fields.
- **`add2_clearError(element)`**: Cleans up error messages.
- **`add2_formatBytes(bytes)`**: Converts file sizes to readable text.
- **`add2_genId()`**: Generates unique IDs for preview elements.

### 3. Advanced Image Processing (`add2_image.js`)
- **`add2_compressImage(file)`**: Uses `createImageBitmap` to intelligently scale images while considering mobile memory resources. Conversion is to `webp` or `jpeg`.
- **`add2_handleNewFiles(fileList)`**: The main coordinator that receives files, checks available space, and launches the parallel compression process.

### 4. User Interface and Live Capture (`add2_ui.js`)
- **`add2_createPreviewItem(state)`**: Builds preview elements with delete buttons and progress display.
- **`add2_removeImage(id)`**: Deletes images with confirmation via `Swal`.
- **`add2_openDesktopCamera()`**: Launches live video stream in a Modal and captures images via `Canvas`.
- **Event Listeners**: Management of real-time character counters and numeric input filtering.
- **`add2_renderCategories()`**: Fetches names of selected categories from `ProductStateManager.resolveCategoryNames()` and displays them as colored cards (`add2_category_badges`) under the page title.
- **"Discard Changes" Button (`add2_btn_discard`)**: Displays a modern SweetAlert2 confirmation window, then clears the state from `ProductStateManager`, cleans the container, and goes back via `containerGoBack()`.

### 5. Validation and Final Saving (`add2_submit.js`)
- **`add2_setSubmitLoading(isLoading)`**: Visually changes the submit button state and prevents double-clicking.
- **`submit` Handler**:
    - Executes 4 logical tests (presence of images, name, description length, seller message).
    - Uploads compressed images to Cloudflare R2 and obtains final links.
    - Aggregates the data object and sends it to `addProduct`.
    - Notifies administration and performs a comprehensive form reset after success.

## ⚙️ Technical Workflow

1.  **Real-time Processing**: Images are compressed and converted to `WebP` immediately upon selection to reduce memory consumption and upload speed.
2.  **Validation**: Ensures presence of at least one image, service name, and description length (minimum 10 characters).
3.  **Saving Management**:
    - Images are uploaded with a unique name based on the serial identifier.
    - `addProduct` is called with the appropriate `serviceType` for services.
    - An immediate notification is sent to administration after saving to ensure quick review.

## 📊 Data Fetching and Saving
- **Fetching**: The module starts with an empty form and relies entirely on user input.
- **Saving**: Performed via `Fetch API` to send final data to the database after successful image upload to Cloudflare R2.

---

# Service Editing Module Documentation (ProductEdit2 - Edit2)

The `productEdit2` module is the standardized version dedicated to editing pre-existing services. It is divided into 6 programming files to ensure ease of expansion.

## 📁 Directory Structure
Path: `pages/productEdit2/`

- **`productEdit2.html`**: The structure containing service fields (no price or quantity).
- **`productEdit2.css`**: Visual styling for the form and image previews.

### 📂 Software Folder (js/)
1. **`edit2_config.js`**:
   - Compression settings (1600px).
   - Shared state for `window.productModule` to ensure compatibility with legacy systems.

2. **`edit2_utils.js`**:
   - Error message management (`EDIT2_showError`).
   - Unique ID generation and file size formatting.

3. **`edit2_image.js`**:
   - `EDIT2_loadExistingImages`: Fetches current images from the cloud upon start.
   - Intelligent image compression logic for services.

4. **`edit2_ui.js`**:
   - Management of interaction with text fields (name, description, message) and updating counters.
   - Desktop and mobile camera feature.
   - Creating and deleting preview elements.
   - **`EDIT2_renderCategories()`**: Fetches names of selected categories from `ProductStateManager.resolveCategoryNames()` and displays them as colored cards under the page title.
   - **"Discard Changes" Button (`edit2_btn_discard`)**: Displays a modern SweetAlert2 confirmation window, then clears the state from `ProductStateManager`, cleans the container, and goes back via `containerGoBack()`.

5.  **`edit2_submit.js`**:
   - **Change Detection**: Entered data is compared with the original version stored in `ProductStateManager`. If no change occurs, submission is prevented to save resources.
   - **Cloud Image Management**: New images are uploaded and removed images are deleted from R2 to ensure no accumulation of unused files.
   - **Database Update**: `updateProduct` is called with state reset to `is_approved: 0` for administrative re-inspection.

6.  **`edit2_init.js`**:
   - **Data Fetching**: All data is extracted from `ProductStateManager` (name, description, message, notes) and distributed to fields as soon as the page loads.

## 📊 Data Flow
1. Page load -> `edit2_init.js` fills the form from the state in `ProductStateManager`.
2. `edit2_ui.js` calls `EDIT2_renderCategories()` to fetch and display selected category names as colored cards.
3. `edit2_image.js` fetches current images from the cloud.
4. Editing -> Real-time compression of new images.
5. Saving -> `edit2_submit.js` checks for changes compared to the original state -> upload images -> update record -> delete old -> notify administration.
6. Upon clicking "Discard Changes" -> confirmation window displayed -> clear state -> clean container -> go back.

---

# Service View Module Documentation (ProductView2)

Responsible for displaying advanced services using a 3D slider with a special photography request system.

## 📁 Directory Structure
Path: `pages/productView2/`

### 📂 Software Folder (js/)
1. **`view2_config.js`**: Constants for the slider, image compression, and the array of images attached to the order.
2. **`view2_utils.js`**: `pv2_compressImage` to compress and upload "photography request" images in high quality while converting them to WebP.
3. **`view2_slider.js`**: Full 3D slider engine logic, including matrix calculations for movement and auto-play.
4. **`view2_ui.js`**: Management of image previews attached in the photography request and control of interface elements.
5. **`view2_submit.js`**:
   - **Photo Order flow**:
     - Unique order ID generation (`order_key`).
     - Image naming system: `USERKEY_SELLERKEY_PRODUCTKEY_ORDERKEY_INDEX`.
     - Creating an order record in `/api/orders` with `total_amount: 0`.
   - **Integrated Notifications**: Calling `handlePurchaseNotifications` to immediately inform the seller and administration of the new order.
6. **`view2_init.js`**: Initialization function that relies on `ProductStateManager` to fetch service data and specific view options.

## 🚀 Advanced Display Features
- **3D Slider**: A matrix movement system (`CSSTransform`) providing high depth and interactivity with touch support.
- **Role Views**:
  - **Buyer**: Sees the attractive interface and "photography request" or "service request" form.
  - **View Only**: The order box can be hidden via the `showAddToCart: false` option.

## 📦 Service Order Management
- The module relies on compressing images attached by the buyer before uploading to ensure quick order execution even on slow internet speeds.
- A `showOrderPhotoMessage` flag is stored in `localStorage` to show a confirmation message to the user after returning to the main transaction.

## Where it Appears in the Project
The `ProductView2` interface (service display) is called from the following locations:
1.  **Category Gallery (`categories.js`)**: When clicking on any service within Oriflame, servers, or any category classified as a service.
2.  **Search Results (`search.js`)**: When clicking on a service from search results.
3.  **My Services Management (`product2Me.js`)**: Used by the service provider to preview their service details.
4.  **Order Details (`sales-movement.js`)**: When reviewing service orders in sales movement or the Stepper.

## 🛠️ Display States
The service interface is adapted based on the **user role** and the purpose of the display:

| State                        | "Submission Data" Section | Order Buttons  | State Description                                                  |
| :--------------------------- | :------------------------ | :------------- | :----------------------------------------------------------------- |
| **General Buyer**            | ✅ Visible                 | ✅ "Send Order" | Basic state for service request and image upload.                  |
| **Service Provider (Owner)** | ❌ Hidden                  | ❌ Disabled     | When previewing the service to check appearance.                   |
| **Administrative Preview**   | ❌ Hidden                  | ❌ Disabled     | When calling the interface with the `showAddToCart: false` option. |

## 📊 Data Schema - Services
The service module receives specific data that differs slightly from products:

| Field           | Description                                 | Visibility                |
| :-------------- | :------------------------------------------ | :------------------------ |
| `productName`   | Service name (Oriflame, shipping, etc.)     | For everyone              |
| `description`   | Detailed description of service features    | For everyone              |
| `sellerMessage` | Service provider instructions for buyers    | For everyone              |
| `imageSrc`      | Display image array (appears in the slider) | For everyone              |
| `MainCategory`  | Main category ID                            | Programmatic              |
| `SubCategory`   | Subcategory ID (optional)                   | Programmatic              |
| `type`          | Service type (fixed for services)           | Programmatic              |
| `sellerName`    | Service provider name                       | For Admin and Seller only |
| `user_key`      | Service provider ID                         | For Admin and Seller only |
| `realPrice`     | Cost (if present in delivery)               | For Admin and Seller only |
