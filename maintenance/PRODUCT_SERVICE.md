# Products and Services Handling Guide

## Overview

The project uses a flexible system to differentiate between **Products** and **Services** based on Categories. The item type is determined dynamically through a central configuration file, allowing new categories to be added as services without modifying the code.

---

## Mechanism for Differentiating Products and Services

### Configuration File

**Location:** [`js/PRODUCT_SERVICE/serviceCategories.config.json`](/bazaar/js/PRODUCT_SERVICE/serviceCategories.config.json)

```json
{
  "serviceMainCategories": [6, 20],
  "serviceSubCategories": [
    { "mainId": 3, "subId": 5, "description": "Web Development Services" },
    { "mainId": 44, "subId": 4, "description": "Oriflame Membership" },
    { "mainId": 7, "subId": 3, "description": "Shipping and Delivery Services" }
  ],
  "settings": {
    "hidePrice": true,
    "serviceType": "2",
    "productType": "0"
  }
}
```

**Components:**
- **`serviceMainCategories`**: Main categories considered entirely as services (e.g., 6 = General Services, 20 = Medical Services).
- **`serviceSubCategories`**: Specific subcategories considered as services.
- **`settings`**: Global settings for services.

---

## Core Modules and Functions

### 1. Helper Module: `serviceCategoryHelper.js`

**Location:** [`js/PRODUCT_SERVICE/serviceCategoryHelper.js`](/bazaar/js/PRODUCT_SERVICE/serviceCategoryHelper.js)

#### Main Functions:

##### `loadServiceConfig()`
```javascript
async function loadServiceConfig()
```
- **Functionality:** Loads the configuration file from `serviceCategories.config.json`.
- **Returns:** `Promise<object>` - The configuration object.
- **Caching:** The configuration is stored in `_serviceConfig` to avoid repeated loading.

##### `isServiceCategory(mainId, subId)`
```javascript
function isServiceCategory(mainId, subId = null)
```
- **Functionality:** Checks whether a category is a service or a product.
- **Parameters:**
  - `mainId`: Main category ID.
  - `subId`: Subcategory ID (optional).
- **Returns:** `boolean` - `true` if it's a service, `false` if it's a product.

**Example:**
```javascript
isServiceCategory(6, null);     // true (Main category as service)
isServiceCategory(3, 5);         // true (Subcategory as service)
isServiceCategory(1, 1);         // false (Normal product)
```

##### `getServiceType(mainId, subId)`
```javascript
function getServiceType(mainId, subId = null)
```
- **Functionality:** Gets the item type as a string.
- **Returns:** `'2'` for services, `'0'` for products (or according to values defined in `settings`).

##### `getServiceSettings()`
```javascript
function getServiceSettings()
```
- **Functionality:** Gets all global service settings.
- **Returns:** An object containing `hidePrice`, `serviceType`, `productType`.

---

### 2. State Management Module: `productStateManager.js`

**Location:** [`js/PRODUCT_SERVICE/productStateManager.js`](/bazaar/js/PRODUCT_SERVICE/productStateManager.js)

#### Main Functions:

##### `setProductForView(productData, options)`
```javascript
ProductStateManager.setProductForView(productData, options = {})
```
- **Functionality:** Stores product/service data for viewing.
- **Parameters:**
  - `productData`: Product/service data object.
  - `options`: View options (e.g., `showAddToCart`).

##### `getCurrentProduct()`
```javascript
ProductStateManager.getCurrentProduct()
```
- **Functionality:** Gets the currently stored product/service data.
- **Returns:** `object|null`

##### `getViewOptions()`
```javascript
ProductStateManager.getViewOptions()
```
- **Functionality:** Gets the stored view options (e.g., `showAddToCart`).
- **Returns:** `object` (empty `{}` by default).

##### `setSelectedCategories(mainId, subId)`
```javascript
ProductStateManager.setSelectedCategories(mainId, subId)
```
- **Functionality:** Stores selected categories during add/edit.
- **Parameters:**
  - `mainId`: Main category ID.
  - `subId`: Subcategory ID.

##### `getSelectedCategories()`
```javascript
ProductStateManager.getSelectedCategories()
```
- **Functionality:** Gets the currently selected categories.
- **Returns:** `{mainId, subId}|null`

##### `clear()`
```javascript
ProductStateManager.clear()
```
- **Functionality:** Clears all data stored in the State (current product, options, categories).

##### `getState()`
```javascript
ProductStateManager.getState()
```
- **Functionality:** Gets a full copy of the internal state (for development and debugging purposes).

##### `resolveCategoryNames()`
```javascript
async ProductStateManager.resolveCategoryNames()
```
- **Functionality:** Fetches names of currently stored main and sub categories from `shared/list.json`.
- **Returns:** `Promise<{main: string, sub: string}>` - Object containing category names.
- **Usage:** In add and edit pages to display selected category cards visually to the user.
- **Example:**
```javascript
const names = await ProductStateManager.resolveCategoryNames();
// { main: "Clothing & Fashion", sub: "Women's Clothing" }
```

---

### 3. Unified Data Mapping Module: `productMapper.js`

**Location:** [`js/PRODUCT_SERVICE/productMapper.js`](/bazaar/js/PRODUCT_SERVICE/productMapper.js)

This module aims to unify the format of product data coming from various API endpoints to ensure compatibility with view interfaces and the shopping cart, eliminating the need to process data manually on every page.

#### Main Functions:

##### `mapProductData(rawProduct)`
```javascript
function mapProductData(rawProduct)
```
- **Functionality:** Converts a raw API object into a unified view interface format.
- **Parameters:**
  - `rawProduct`: Data object coming directly from the API (supports different field names).
- **Returns:** `object` - Unified product object.

**Mapper Features:**
- **Field Name Unification:** Handles differences between `product_price` and `pricePerItem`.
- **Image Processing:** Automatically converts the `ImageName` array of names into full URLs.
- **New Field Support:** Ensures fields like `limitPackage`, `isDelevred`, and `heavyLoad` are passed consistently.

---

### 4. Main Functions: `globalVariable.js`

**Location:** [`js/globalVariable.js`](/bazaar/js/globalVariable.js)

#### `loadProductView(productData, options)`
```javascript
function loadProductView(productData, options = {})
```
- **Functionality:** Loads the appropriate product/service view page.
- **Parameters:**
  - `productData`: Product data object (must contain `MainCategory` and `SubCategory`).
  - `options`: View options (can be `boolean` or `object`).
- **Behavior:**
  - Determines item type using `isServiceCategory()`.
  - Loads `productView2.html` for services.
  - Loads `productView.html` for products.

**Example:**
```javascript
const productData = {
    product_key: "123",
    productName: "Web Development Service",
    MainCategory: 3,
    SubCategory: 5,
    // ... rest of data
};

loadProductView(productData, { showAddToCart: true });
```

---

#### `loadProductForm(options)`
```javascript
function loadProductForm(options = {})
```
- **Functionality:** Loads the appropriate product/service add/edit page.
- **Parameters:**
  - `options.editMode`: `boolean` - Edit mode (`true`) or Add mode (`false`).
  - `options.productData`: `object` - Product data (required in edit mode).
- **Behavior:**
  - Gets selected categories from `ProductStateManager`.
  - Determines item type using `isServiceCategory()`.
  - Loads the appropriate page:
    - `productAdd2/productAdd2.html` / `productEdit2/productEdit2.html` for services.
    - `productAdd/productAdd.html` / `productEdit/productEdit.html` for products.

**Example:**
```javascript
// Adding a new service
ProductStateManager.setSelectedCategories(6, 9);
loadProductForm({ editMode: false });

// Editing an existing product
ProductStateManager.setSelectedCategories(1, 1);
loadProductForm({ 
    editMode: true, 
    productData: existingProduct 
});
```

---

#### `showAddProductModal()`
```javascript
async function showAddProductModal()
```
- **Functionality:** Displays the category selection window then loads the appropriate add page.
- **Behavior:**
  1. Displays the `CategoryModal` window to select a category.
  2. Stores selected categories in `ProductStateManager`.
  3. Calls `loadProductForm()` to load the appropriate page.

---

## Pages Used

### View Pages

| Page                                                                             | Usage        | Description                                                            |
| -------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------- |
| [`productView/productView.html`](/bazaar/pages/productView/productView.html)     | Product View | Displays product details with price, quantity, and add to cart button. |
| [`productView2/productView2.html`](/bazaar/pages/productView2/productView2.html) | Service View | Displays service details with a 3D slider and image request form.      |

**How to Read Data:**
```javascript
// In productView.html and productView2.html
const productData = ProductStateManager.getCurrentProduct();
const viewOptions = ProductStateManager.getViewOptions();

if (productData) {
    productView_viewDetails(productData, viewOptions);
}
```

---

### Add Pages

| Page                                                                         | Usage       | Description                                              |
| ---------------------------------------------------------------------------- | ----------- | -------------------------------------------------------- |
| [`productAdd/productAdd.html`](/bazaar/pages/productAdd/productAdd.html)     | Add Product | Product addition form with price and quantity fields.    |
| [`productAdd2/productAdd2.html`](/bazaar/pages/productAdd2/productAdd2.html) | Add Service | Service addition form without price and quantity fields. |

**How to Read Categories:**
```javascript
// In Add pages
const categories = ProductStateManager.getSelectedCategories();
// Use categories.mainId and categories.subId
```

---

### Edit Pages

| Page                                                                             | Usage        | Description                       |
| -------------------------------------------------------------------------------- | ------------ | --------------------------------- |
| [`productEdit/productEdit.html`](/bazaar/pages/productEdit/productEdit.html)     | Edit Product | Form to edit an existing product. |
| [`productEdit2/productEdit2.html`](/bazaar/pages/productEdit2/productEdit2.html) | Edit Service | Form to edit an existing service. |

**How to Read Data:**
```javascript
// In Edit pages
const productData = ProductStateManager.getCurrentProduct();
const categories = ProductStateManager.getSelectedCategories();
```

---

## Usage Scenarios

### 1. Adding a New Product/Service

```javascript
// 1. User clicks "Add Product" button
document.getElementById("dash-add-product-btn").addEventListener("click", () => {
    showAddProductModal();
});

// 2. Selects category from pop-up window
// 3. Categories are automatically stored
// 4. Appropriate page is automatically loaded
```

---

### 2. Viewing Product/Service Details

```javascript
// In search.html or product2Me/product2Me.html
const productData = {
    product_key: "123",
    productName: "Product Name",
    MainCategory: 6,
    SubCategory: 9,
    // ... rest of data
};

// Use the new function
loadProductView(productData, true);
```

---

### 3. Editing an Existing Product/Service

```javascript
// In product2Me.html
async function editProduct(productId) {
    const product = myProducts.find(p => p.id === productId);
    
    // Show category selection window
    const result = await CategoryModal.show(
        product.MainCategory, 
        product.SubCategory
    );
    
    if (result.status === 'success') {
        // Update categories
        product.MainCategory = result.mainId;
        product.SubCategory = result.subId;
        
        // Store in State Manager
        ProductStateManager.setSelectedCategories(result.mainId, result.subId);
        
        // Load appropriate edit page
        loadProductForm({ editMode: true, productData: product });
    }
}
```

---

### 4. Checking Item Type in Search

```javascript
// In search.html - generateSearchResultHTML function
function generateSearchResultHTML(product) {
    // Check item type
    const isService = isServiceCategory(
        product.MainCategory, 
        product.SubCategory
    );
    
    // Hide price for services
    const priceHTML = !isService 
        ? `<p class="price">${price} EGP</p>` 
        : "";
    
    return `<div class="product-card">${priceHTML}</div>`;
}
```

---

## Adding a New Category as a Service

### Steps:

1. **Open Configuration File:** [`js/PRODUCT_SERVICE/serviceCategories.config.json`](/bazaar/js/PRODUCT_SERVICE/serviceCategories.config.json)

2. **Add the Appropriate Category:**

```json
{
  "serviceMainCategories": [6, 20, 21],  // Adding a new main category
  "serviceSubCategories": [
    { "mainId": 3, "subId": 5, "description": "..." },
    { "mainId": 7, "subId": 8, "description": "New Service" }  // Adding a subcategory
  ]
}
```

3. **Save the File** - No need to modify any code!

4. **Reload the Page** - The new configuration will be loaded automatically.

## 🔄 State Integration

The project now relies entirely on a **Central State Management System** to ensure data consistency and ease of maintenance:

1. **Core Dependency**: `ProductStateManager.getCurrentProduct()` and `ProductStateManager.getSelectedCategories()` are used in all stages (View, Edit, Add).
2. **Smart Routing**: `loadProductView()` and `loadProductForm()` are used to control page navigation based on the automatically detected item type.

---

## Deprecated Functions and Variables

> [!CAUTION]
> **The following elements are prohibited from use in any new development.** Their definitions have been kept in `globalVariable.js` only to prevent breaking old parts of the project that haven't been updated yet, and they will be permanently removed in future updates.

### Deprecated Functions:
- `productViewLayout(View)` → **Alternative**: `loadProductView(productData, options)`
- `productAddSetType(editMode)` → **Alternative**: `loadProductForm(options)`

### Deprecated Global Variables:
- `window.productSession` → **Alternative**: `ProductStateManager.getCurrentProduct()`
- `window.mainCategorySelectToAdd` → **Alternative**: `ProductStateManager.getSelectedCategories()`
- `window.subCategorySelectToAdd` → **Alternative**: `ProductStateManager.getSelectedCategories()`
- `window.productTypeToAdd` → **Alternative**: `isServiceCategory()` or `getServiceType()`

---

## Order Identification System

The project uses the `orderType` field in the `orders` table for technical separation between order types, ensuring the correct interface appears in the progress bar (Stepper).

### `orderType` Field Values:
| Value   | Type        | Source                    | Stepper Behavior                                |
| :------ | :---------- | :------------------------ | :---------------------------------------------- |
| **`0`** | **Product** | `cartPackage-checkout.js` | Traditional display of quantities and prices    |
| **`1`** | **Service** | `view2_submit.js`         | Showing pricing tools and attached order images |

---

## Final Summary

| Operation                | Suggested Function     | System Used           | Numeric Value (`orderType`) |
| :----------------------- | :--------------------- | :-------------------- | :-------------------------- |
| **View Product/Service** | `loadProductView()`    | `ProductStateManager` | -                           |
| **Add/Edit**             | `loadProductForm()`    | `ProductStateManager` | -                           |
| **Data Mapping**         | `mapProductData()`     | `productMapper.js`    | -                           |
| **Send Product Order**   | `fetch('/api/orders')` | Shopping Cart         | `0`                         |
| **Send Service Order**   | `fetch('/api/orders')` | Service Interface     | `1`                         |

---
*Document last updated: December 2025 - Unification of data mapping and management system*
