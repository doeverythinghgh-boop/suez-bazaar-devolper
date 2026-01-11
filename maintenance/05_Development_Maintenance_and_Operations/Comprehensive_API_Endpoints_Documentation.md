# Comprehensive API Endpoints Documentation

This document provides a technical explanation of the backend services, mostly running as Vercel Edge Functions communicating with a Turso (LibSQL) database.

## 1. Core Logic & Architecture
- **Environment**: Vercel Edge Runtime.
- **Database**: LibSQL (Turso) for atomic transactions.
- **Security**: Prepared SQL statements to prevent SQL Injection.
- **Transactions**: Atomic operations using `db.batch` for complex multi-table updates (e.g., Orders + Order Items).

## 2. Inventory & Media APIs
- **`GET /api/products`**: Fetches marketplace products with support for `product_key`, category filters, and status codes (0=Pending, 1=Approved).
- **`POST /api/products`**: Creates new records and returns success confirmation for media sync.
- **`DELETE /api/products`**: Triggers R2 media deletion and removes the database record.

## 3. Order Management APIs
- **`/api/orders`**: Manages the `orders` and `order_items` tables. Handles complex JSON formatting for the `order_status` column.
- **`/api/update-order-amount`**: Specialized endpoint for updating the `total_amount` after a service is finalized.
- **`/api/update-item-status`**: Performs selective updates to the `order_status` JSON blob without overwriting other participants' data.
- **`/api/user-all-orders`**: A high-performance aggregator that recovers order history, item details, and delivery logs in a single request flow.

## 4. Identity & Notifications APIs
- **`/api/users`**: CRUD operations for the `users` table (Purchasers, Sellers, Delivery, Admin). Includes phone uniqueness checks and password hashing verification.
- **`/api/tokens`**: Manages FCM tokens. Enforces a policy of one active token per user-device pair to prevent spam.
- **`/api/suppliers-deliveries`**: (UPSERT) Manages the mapping between sellers and their authorized delivery personnel.

## 5. Analytics & Maintenance
- **`/api/sales-movement`**: Generates role-based reports. Dynamically adjusts the `WHERE` clause to filter data based on the requesting user's identity (Buyer vs Seller vs Admin).
- **`/api/updates`**: A lightweight timestamp service used for cache invalidation and version check protocols.

## 6. Error Handling Standards
All endpoints return JSON responses with standardized status codes:
- `200 OK`: Successful operation.
- `400 Bad Request`: Missing parameters or validation failure (Arabic error messages).
- `500 Internal Server Error`: Database or execution failure.
