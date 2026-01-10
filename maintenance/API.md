# 🚀 Application Programming Interface (API) Documentation - Bazaar

This document provides a comprehensive and accurate technical explanation of all operations available in the system, clarifying the programming logic behind each path to ensure ease of maintenance and development.

---

## 📦 1. Product Management (`/api/products`)

This path handles the `marketplace_products` table and supports all CRUD operations.

### 🔍 Fetching Products (GET)

#### Search and Filtering Parameters

| Parameter      | Type    | Description                 | Programming Logic                                                   |
| :------------- | :------ | :-------------------------- | :------------------------------------------------------------------ |
| `product_key`  | string  | Specific product identifier | Returns only one product (JSON object) instead of an array          |
| `user_key`     | string  | Seller identifier           | Fetches products of a specific seller                               |
| `searchTerm`   | string  | Search text                 | Searches in `productName` using `LIKE %term%`                       |
| `MainCategory` | integer | Main category               | Filters by main category                                            |
| `SubCategory`  | integer | Sub-category                | Filters by sub-category                                             |
| `status`       | integer | Approval status             | `null`: approved only (default), `0`: pending review, `1`: approved |

#### Fetching Scenarios

1. **Fetch Single Product**: When `product_key` is passed, product details are fetched along with seller data (username, phone, location, limitPackage, isDelevred).
2. **General Search**: When `searchTerm` or `MainCategory` is passed, only approved products are searched (unless `status` is specified).
3. **Seller Products**: When only `user_key` is passed, all products of the seller are fetched.
4. **Admin View**: When only `status` is passed, products are fetched according to approval status.

> [!IMPORTANT]
> - All queries use `JOIN` with the `users` table to fetch seller data.
> - Order is always by `id DESC` (newest first).
> - When no valid parameters are passed, an empty array is returned.

### ➕ Add Product (POST)

#### Required Fields
- `user_key`, `product_key`, `MainCategory`, `productName`

#### Optional Fields
- `product_description`, `product_price`, `original_price`, `realPrice`, `product_quantity`
- `user_message`, `user_note`, `ImageName`, `SubCategory`, `ImageIndex`
- `serviceType` (default: 0), `heavyLoad` (default: 0)

> [!NOTE]
> - `is_approved = 0` is automatically assigned (pending review).
> - `product_key` is sent from the client and not generated on the server to ensure synchronization with image names.

### ✏️ Update Product (PUT)

- **Logic**: Dynamic update - only sent fields are updated.
- **Required**: `product_key`
- **Updatable Fields**: All product fields including `is_approved`.

### 🗑️ Delete Product (DELETE)

- **Parameter**: `product_key` (via Query Parameter)
- **Response**: Success message or 404 error if not found.

---

## 🛒 2. Order Management (`/api/orders`)

This path manages two tables (`orders` and `order_items`) as a single atomic transaction using `db.batch`.

### 📝 Create New Order (POST)

#### Required Fields
```json
{
  "order_key": "string",
  "user_key": "string",
  "total_amount": number,
  "orderType": number,
  "items": [
    {
      "product_key": "string",
      "quantity": number,
      "seller_key": "string",
      "note": "string"
    }
  ]
}
```

#### Programming Logic
1. Verify data completeness (allows `total_amount = 0`).
2. Create default status: `0#${ISO_Timestamp}`.
3. Execute `db.batch` to insert the order and its items together.
4. Return `order_key` on success.

> [!CAUTION]
> If any operation in the batch fails, the entire transaction is rolled back (Atomic Transaction).

### 🔄 Update Order Status (PUT)

- **Required Fields**: `order_key`, `order_status`
- **Format**: `order_status` is converted to text (String) before saving.
- **Usage**: To update the general status of the order (e.g., `1#2026-01-01T12:00:00.000Z`).

---

## 💰 Update Total Amount (`/api/update-order-amount`)

### POST

- **Required Fields**: `order_key`, `total_amount`
- **Logic**: 
  1. Verify order existence.
  2. Update `total_amount` only.
- **Usage**: When the order is modified by the admin or cost is recalculated.

---

## 👤 3. Users and Permissions (`/api/users`)

### 🛡️ Roles (is_seller)

| Value | Role      | Description      |
| :---: | :-------- | :--------------- |
|   0   | Purchaser | Regular user     |
|   1   | Seller    | Can add products |
|   2   | Delivery  | Delivery service |
|   3   | Admin     | Full permissions |

### 🔐 Create/Verify (POST)

#### Scenario 1: Password Verification
```json
{
  "action": "verify",
  "phone": "string",
  "password": "string"
}
```
- **Logic**: Query `SELECT * FROM users WHERE phone = ? AND Password = ?`.
- **Response**: Full user data or 401 error.

#### Scenario 2: Create New User
- **Required**: `username`, `phone`, `user_key`
- **Optional**: `password`, `address`, `location`, `isDelevred`, `limitPackage`
- **Logic**: 
  1. Verify phone number uniqueness.
  2. Insert user with default values for empty fields.

### 🔍 Fetch Users (GET)

| Parameter     | Description               | Response                              |
| :------------ | :------------------------ | :------------------------------------ |
| `phone`       | Specific phone number     | Single user or 404                    |
| `role`        | Specific role (is_seller) | Array of users + fcm_token            |
| No parameters | All users                 | Array with `phone_link` and fcm_token |

> [!TIP]
> When fetching all users, a `phone_link: "tel:${phone}"` field is automatically added for easy calling from the interface.

### ✏️ Update Users (PUT)

#### Scenario 1: Bulk Update
- **Data**: Array of objects `[{phone, is_seller}]`
- **Logic**: Use `transaction` to update multiple users at once.
- **Usage**: Upgrading a group of sellers.

#### Scenario 2: Individual Update
- **Required**: `user_key`
- **Updatable Fields**: `username`, `phone`, `password`, `address`, `location`, `limitPackage`, `isDelevred`
- **Logic**: Build dynamic SQL for sent fields only + verify phone uniqueness.

### 🗑️ Delete User (DELETE)

- **Required**: `user_key` (in the body)
- **Logic**: Associated data is automatically deleted thanks to `ON DELETE CASCADE`.

---

## 🔔 4. Notifications and Tokens

### 📱 Token Management (`/api/tokens`)

#### Save Token (POST)
- **Required**: `user_key`, `token`, `platform`
- **Logic** (Transaction):
  1. Delete any old token for the same user.
  2. Delete any old token for the same device (if registered to another user).
  3. Insert the new token.
- **Goal**: Ensure only one token per user/device.

#### Fetch Tokens (GET)
- **Parameter**: `userKeys` (comma-separated: `key1,key2,key3`)
- **Response**: `{success: true, tokens: [...]}`
- **Usage**: Sending group notifications.

#### Delete Token (DELETE)
- **Required**: `user_key`
- **Usage**: Upon logout.

### 📨 Send Notifications (`/api/send-notification`)

> [!WARNING]
> **Legacy / Fallback Only**: This path uses Node.js Runtime (not Edge) to support Firebase Admin SDK. It is now considered a fallback mechanism, as the system has transitioned to a 100% P2P architecture where clients send notifications directly to FCM.

#### Required
```json
{
  "token": "string",
  "title": "string",
  "body": "string"
}
```

#### Logic
1. Verify Firebase Admin SDK initialization.
2. Verify token validity.
3. Send notification as `data payload` only (without `notification`).
4. Special handling for expired tokens (code 410).

> [!IMPORTANT]
> Data is sent as `data: {title, body}` only to ensure `onBackgroundMessage` is called in all cases.

---

## 📊 5. Reports and Aggregated Data

### 📈 Sales Movement (`/api/sales-movement`)

#### Parameter
- `user_key`: Identifier of the requesting user.

#### Programming Logic
1. Fetch user role from the `users` table.
2. Build dynamic WHERE clause:
   - `is_seller = 1`: `WHERE oi.seller_key = ?` (Seller sees only their sales).
   - `is_seller = 2 or 3`: No condition (Delivery/Admin sees all).
   - `is_seller = 0`: `WHERE 1 = 0` (No results).
3. Fetch data from 4 tables: `orders`, `users`, `order_items`, `marketplace_products`.
4. Aggregate data using `Map` to convert rows into a nested structure.

#### Response
```json
[
  {
    "order_key": "string",
    "total_amount": number,
    "order_status": "string",
    "created_at": "string",
    "customer_name": "string",
    "customer_phone": "string",
    "customer_address": "string",
    "items": [
      {
        "productName": "string",
        "product_price": number,
        "realPrice": number,
        "quantity": number,
        "product_key": "string",
        "seller_key": "string"
      }
    ]
  }
]
```

### 📁 All User Orders (`/api/user-all-orders`)

#### Required Parameters
- `user_key`: User identifier.
- `role`: Role (`purchaser`, `seller`, `delivery`, `admin`).
- `order_key` (optional): To fetch a specific order.

#### Programming Logic (3 Stages)

**Stage 1: Fetch Order Keys**
- `purchaser`: `SELECT order_key FROM orders WHERE user_key = ?`
- `seller`: `SELECT DISTINCT o.order_key FROM orders o JOIN order_items oi WHERE oi.seller_key = ?`
- `delivery`: `SELECT DISTINCT o.order_key ... JOIN suppliers_deliveries sd WHERE sd.delivery_key = ? AND sd.is_active = 1`
- `admin`: `SELECT order_key FROM orders WHERE 1=1`

**Stage 2: Fetch Order Details and Items**
- Fetch order data from `orders` + `users`.
- Fetch order items from `order_items` + `marketplace_products`.
- Fetch active delivery services from `suppliers_deliveries` + `users`.

**Stage 3: Build Final Structure**
- Parse `order_status` to extract individual item statuses (JSON in part 3).
- Aggregate data into a nested structure containing:
  - Order details.
  - Array of items (with `item_status` for each item).
  - Available delivery services for each seller.

> [!TIP]
> This path provides advanced error handling with custom status codes (503 for network, 504 for timeout).

### 🛍️ Purchase History (`/api/purchases`)

#### Parameter
- `user_key`: User identifier.

#### Response
```json
[
  {
    "productName": "string",
    "product_price": number,
    "ImageName": "string",
    "quantity": number,
    "created_at": "string",
    "order_status": "string",
    "order_key": "string"
  }
]
```

> [!NOTE]
> This is a simplified path for quick display in the "My Purchases" section - it does not contain seller or delivery details.

---

## 🛠️ 6. Micro-Updates

### 🔧 Update Item Status (`/api/update-item-status`)

#### Required (POST)
```json
{
  "order_key": "string",
  "product_key": "string",
  "status": "any"
}
```

#### Programming Logic
1. Fetch current `order_status`.
2. Parse text: `StepID#Timestamp#JSON_Statuses`.
3. Update JSON object with new product status: `itemStatuses[product_key] = status`.
4. Rebuild text: `${stepId}#${timestamp}#${newJsonStr}`.
5. Update database.

> [!IMPORTANT]
> This path does not change `StepID` or `Timestamp`, it only updates the JSON part of the item statuses.

### 🚚 Suppliers and Distributors (`/api/suppliers-deliveries`)

#### Fetch Relations (GET)

**Scenario 1: Specific Seller Relations**
- `sellerKey`: Seller identifier.
- `activeOnly=true`: Fetch only active distributors (with fcm_token).
- `activeOnly=false/null`: Fetch all distributors with activation status.

**Scenario 2: User Relations (Bidirectional)**
- `relatedTo`: User identifier.
- **Response**:
```json
{
  "asSeller": [...],  // Distributors working with them.
  "asDelivery": [...]  // Sellers they distribute for.
}
```

#### Update/Create Relation (PUT - UPSERT)
```json
{
  "sellerKey": "string",
  "deliveryKey": "string",
  "isActive": boolean
}
```

> [!CAUTION]
> Requires a `UNIQUE INDEX` on `(seller_key, delivery_key)` to perform UPSERT correctly.

#### Role Verification (POST)
- **Required**: `{userKeys: [...]}`
- **Response**: Array containing `{key, isSeller, isDelivery}` for each user.

### 🔄 Updates Table (`/api/updates`)

#### Fetch Last Update (GET)
- **Response**: `{datetime: "ISO_String"}`
- **Logic**: `SELECT datetime FROM updates WHERE Id = 1`.

#### Update Date (POST)
- **Logic**: `UPDATE updates SET datetime = CURRENT_TIMESTAMP WHERE Id = 1`.
- **Usage**: Cache Invalidation - forcing apps to refresh data.

---

## 📝 General Technical Notes

### Environment and Technologies
- **Runtime**: Vercel Edge Functions (except `/api/send-notification` which uses Node.js).
- **Database**: Turso (LibSQL) via `@libsql/client/web`.
- **CORS**: All paths support `Access-Control-Allow-Origin: *`.

### Programming Patterns Used
- **Atomic Transactions**: In `/api/orders` (batch) and `/api/tokens` (transaction).
- **Dynamic SQL Building**: In `/api/products` (PUT) and `/api/users` (PUT).
- **Nested Data Structures**: In `/api/sales-movement` and `/api/user-all-orders`.
- **UPSERT Pattern**: In `/api/suppliers-deliveries`.

### Error Handling
- All paths use `try-catch` with Arabic error messages.
- Status codes used: 200, 201, 204, 400, 401, 404, 405, 409, 410, 500, 503, 504.
- Detailed logging using `console.log` and `console.error`.

### Data Security
- Verify required parameters before executing queries.
- Use Prepared Statements (args) to prevent SQL Injection.
- Verify phone number uniqueness in `/api/users`.
- Verify record existence before update/deletion.
