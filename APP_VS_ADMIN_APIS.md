# DreamPay (DRMP) Backend API - App vs Admin Panel Breakdown

This document provides a clean separation and complete reference for which APIs are designed for the **Mobile / End-User App** and which are designed for the **Admin Panel / Dashboard**.

> **Note on URL Prefixes:** All routes in this backend support dual-mounting. You can access them with or without `/api` (for example, both `POST /api/auth/login` and `POST /auth/login` work identically).

---

## 📊 Summary Overview

| Category | Target Audience | Authentication Required | Total Endpoints |
| :--- | :--- | :--- | :--- |
| **Mobile App APIs** | Regular App Users / Mobile Clients | Public or User JWT (`Bearer <token>`) | **19 Endpoints** |
| **Admin Panel APIs** | Super Admin / System Operators | Admin JWT (`protect` + `isAdmin`) | **22 Endpoints** |
| **Shared APIs** | Both App and Admin | Public | **1 Endpoint** (`/auth/login`) |

---

## 📱 PART 1: APIs for the Mobile App (End Users)

These endpoints are consumed by the mobile application (Expo / React Native) for user registration, onboarding, task earning, deposits, withdrawals, and wallet management.

### 1. Authentication & User Profile
| Method | Endpoint | Auth | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user account | `{ fullName, phoneNumber, email, password }` |
| `POST` | `/api/auth/login` | Public | Login with email & password | `{ email, password }` |
| `POST` | `/api/auth/send-otp` | Public | Send 6-digit login/verification OTP to email | `{ email }` |
| `POST` | `/api/auth/verify-otp` | Public | Verify OTP and return JWT token | `{ email, otp }` |
| `GET` | `/api/auth/me` | Bearer Token | Get current logged-in user profile, plan & wallet | None |
| `PUT` | `/api/auth/update-profile` | Bearer Token | Update user profile information | `{ fullName, phoneNumber }` |
| `GET` | `/api/auth/verify-email/:token` | Public | Verify email address via verification link | URL parameter `token` |

### 2. App System Configuration & Support (Public)
| Method | Endpoint | Auth | Description | Response Details |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/app/settings` | Public | Check maintenance mode status, force update & current version | `{ maintenanceMode, maintenanceMessage, forceUpdate, updateMessage, currentVersion }` |
| `GET` | `/api/payment-methods` | Public | Fetch active bank details & QR code image for making deposits | `{ qrCode: { imageUrl, upiId }, bankAccount: { ... } }` |
| `GET` | `/api/contacts` | Public | Fetch active customer support channels (WhatsApp, Telegram, Phone) | List of active contact channels |

### 3. Membership Plans
| Method | Endpoint | Auth | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/plans` | Public | View all available active membership investment plans | None |

### 4. Gift Codes
| Method | Endpoint | Auth | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/gift-codes/redeem` | Bearer Token | Redeem promo code; credits reward immediately to user wallet | `{ "code": "GIFT2026" }` |

### 5. Deposits (Money In)
| Method | Endpoint | Auth | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/deposits` | Bearer Token | Submit deposit request with payment screenshot proof | `multipart/form-data`:<br>• `amount`<br>• `transactionRef`<br>• `planId` (optional)<br>• `paymentProof` (file) |
| `GET` | `/api/deposits` | Bearer Token | Fetch deposit history of logged-in user with status | None |

### 6. Withdrawals (Money Out)
| Method | Endpoint | Auth | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/withdrawals` | Bearer Token | Submit withdrawal request (debited from balance immediately) | `{ amount, bankDetails: { accountHolder, accountNumber, ifscCode, upiId } }` |
| `GET` | `/api/withdrawals` | Bearer Token | Fetch withdrawal history of logged-in user with status | None |

### 7. Tasks & Daily Earnings
| Method | Endpoint | Auth | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks` | Bearer Token | List all active earning tasks along with user's submission status | None |
| `POST` | `/api/tasks/:id/submit` | Bearer Token | Submit proof screenshot for a completed task | `multipart/form-data`:<br>• `proof` (file) |
| `GET` | `/api/tasks/submissions` | Bearer Token | View history of task submissions made by the user | None |

### 8. Wallet & Transaction History
| Method | Endpoint | Auth | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/wallet` | Bearer Token | Get user's wallet balance and pending balances | None |
| `GET` | `/api/wallet/transactions` | Bearer Token | Get full immutable ledger of deposits, earnings, and withdrawals | Query params: `page`, `limit`, `type` (`credit`/`debit`), `category` |

### 9. User Notifications
| Method | Endpoint | Auth | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Bearer Token | Fetch in-app notifications (approvals, rejections, credits) | None |
| `GET` | `/api/notifications/unread-count` | Bearer Token | Get number of unread notifications for badge count | None |
| `PATCH` | `/api/notifications/read-all` | Bearer Token | Mark all user notifications as read | None |
| `PATCH` | `/api/notifications/:id/read` | Bearer Token | Mark a single notification as read | URL parameter `id` |

---

## 🖥️ PART 2: APIs for the Admin Panel (Web Dashboard)

These endpoints are strictly for the **Admin Dashboard** to manage users, approve/reject deposits and withdrawals, manage tasks and plans, adjust balances, and configure system settings.

> **Security:** All endpoints below require a valid JWT from a user with `role: "admin"` in the Authorization header: `Bearer <admin_jwt_token>`.

### 1. Dashboard & User Management
| Method | Endpoint | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/dashboard` | Aggregated metrics: total users, active users, blocked users, pending deposits/withdrawals, task submissions, total wallet balances | None |
| `GET` | `/api/admin/users` | List users with pagination and search | Query params: `page`, `limit`, `search` |
| `GET` | `/api/admin/users/:id` | View full details of a user including plan & wallet | URL parameter `id` |
| `PATCH` | `/api/admin/users/:id/block` | Block user account from logging in or making transactions | URL parameter `id` |
| `PATCH` | `/api/admin/users/:id/unblock` | Unblock a previously blocked user account | URL parameter `id` |
| `PATCH` | `/api/admin/users/:id/activate` | Mark user account as active | URL parameter `id` |
| `PATCH` | `/api/admin/users/:id/deactivate` | Mark user account as inactive | URL parameter `id` |

### 2. Deposit Verification & Approvals
| Method | Endpoint | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/deposits/admin` | View all submitted deposit requests across all users with status filter | Query params: `status`, `page`, `limit` |
| `PUT` | `/api/deposits/admin/:id/approve` | Approve deposit -> automatically credits user wallet & activates plan | Optional body: `{ "reason": "Verified" }` |
| `PUT` | `/api/deposits/admin/:id/reject` | Reject deposit with an explanation reason | Body: `{ "reason": "Invalid transaction reference" }` |

### 3. Withdrawal Processing & Approvals
| Method | Endpoint | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/withdrawals/admin` | View all user withdrawal requests across the platform | Query params: `status`, `page`, `limit` |
| `PUT` | `/api/withdrawals/admin/:id/approve` | Mark withdrawal as approved/processed | None |
| `PUT` | `/api/withdrawals/admin/:id/reject` | Reject withdrawal -> automatically refunds deducted amount back to user's wallet | Body: `{ "reason": "Incorrect bank account details" }` |

### 4. Task Management & Proof Verification
| Method | Endpoint | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks/admin` | List all tasks (both active and inactive) | None |
| `POST` | `/api/tasks/admin` | Create new earning task | Body: `{ title, description, rewardAmount }` |
| `PUT` | `/api/tasks/admin/:id` | Update task details | Body: `{ title, description, rewardAmount }` |
| `DELETE` | `/api/tasks/admin/:id` | Permanently remove a task | URL parameter `id` |
| `PATCH` | `/api/tasks/admin/:id/toggle` | Toggle task between Active and Inactive | URL parameter `id` |
| `GET` | `/api/tasks/admin/submissions` | List all user task screenshot submissions to review | Query params: `status`, `page`, `limit` |
| `PUT` | `/api/tasks/admin/submissions/:id/approve` | Approve submission -> automatically rewards user's wallet balance | URL parameter `id` |
| `PUT` | `/api/tasks/admin/submissions/:id/reject` | Reject submission with reason | Body: `{ "reason": "Screenshot unreadable" }` |

### 5. Membership Plans Management
| Method | Endpoint | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/plans/admin` | List all plans (including inactive ones) | None |
| `POST` | `/api/plans/admin` | Create a new membership plan | Body: `{ name, amount, description }` |
| `PUT` | `/api/plans/admin/:id` | Update membership plan details | Body: `{ name, amount, description }` |
| `DELETE` | `/api/plans/admin/:id` | Delete a membership plan | URL parameter `id` |
| `PATCH` | `/api/plans/admin/:id/toggle` | Toggle plan active/inactive status | URL parameter `id` |

### 6. Gift Codes Management
| Method | Endpoint | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/gift-codes/admin` | List all gift codes with usage counts and list of users who redeemed | None |
| `POST` | `/api/gift-codes/admin` | Create gift code | Body: `{ code, rewardAmount, maxUsers, expiryDate }` |
| `PUT` | `/api/gift-codes/admin/:id` | Update gift code | Body: `{ code, rewardAmount, maxUsers, expiryDate }` |
| `DELETE` | `/api/gift-codes/admin/:id` | Delete gift code | URL parameter `id` |
| `PATCH` | `/api/gift-codes/admin/:id/toggle` | Toggle gift code active/inactive | URL parameter `id` |

### 7. Manual Wallet Adjustments
| Method | Endpoint | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/wallet/admin/adjust` | Manually credit or debit a user's wallet with custom audit reason | Body: `{ "userId": "<id>", "amount": 500, "type": "credit" \| "debit", "description": "Bonus" }` |

### 8. System Settings & Payment Methods Configuration
| Method | Endpoint | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/settings` | Get full platform settings (maintenance, app version, payment details) | None |
| `PUT` | `/api/admin/settings/maintenance` | Turn maintenance mode on/off and customize user notice | Body: `{ "maintenanceMode": true, "maintenanceMessage": "Under scheduled maintenance" }` |
| `PUT` | `/api/admin/settings/update-control` | Update latest version number and toggle forced app upgrade | Body: `{ "forceUpdate": true, "updateMessage": "Please update to v1.2", "currentVersion": "1.2.0" }` |
| `PUT` | `/api/admin/settings/payment` | Update the deposit bank account and QR Code image URL | Body: `{ "qrCode": { "imageUrl": "...", "upiId": "..." }, "bankAccount": { ... } }` |

### 9. Support Contacts Management
| Method | Endpoint | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/contacts` | List all support contacts (WhatsApp, Telegram, Email, etc.) | None |
| `POST` | `/api/admin/contacts` | Add new support contact | Body: `{ "type": "whatsapp", "label": "VIP Support", "value": "+919999999999" }` |
| `PUT` | `/api/admin/contacts/:id` | Update existing contact | Body: `{ "label": "...", "value": "..." }` |
| `DELETE` | `/api/admin/contacts/:id` | Delete contact | URL parameter `id` |

### 0. Admin Authentication (Strictly OTP-Based, No Password)
| Method | Endpoint | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/send-otp` (or `/api/auth/admin/send-otp`) | Request 6-digit OTP sent to administrator email. Strictly rejects non-admin emails. | `{ "email": "admin@dreampay.info" }` |
| `POST` | `/api/admin/verify-otp` (or `/api/auth/admin/verify-otp`) | Verify 6-digit OTP and receive Admin JWT token with `role: "admin"` | `{ "email": "admin@dreampay.info", "otp": "123456" }` |

---

## 🔒 Security Note on Admin Login
- **No Password Option for Admin:** The password login endpoint `POST /api/auth/login` is explicitly disabled for administrators. If the designated admin email attempts password login, the backend responds with `403 Forbidden` (`Admin login is strictly OTP-based. Password login is disabled for administrators`).
- **Exclusive Authorized Email:** Only the designated administrator email (configured via `ADMIN_EMAIL` in `.env`) can request admin OTPs and receive admin tokens. Any other email is rejected with `403 Forbidden`.

---

## 🛠️ Developer Integration Tips

1. **Authorization Header Format:**
   ```http
   Authorization: Bearer <your_jwt_token_here>
   ```

2. **File Uploads (Multipart Form-Data):**
   - For `POST /api/deposits`: field name must be `paymentProof`.
   - For `POST /api/tasks/:id/submit`: field name must be `proof`.
   - Content-Type should be automatically handled by `FormData` (do not manually set `Content-Type: multipart/form-data` in Axios/Fetch so boundary is preserved).

3. **Dual Routing:**
   - Both `http://localhost:5003/api/...` and `http://localhost:5003/...` work identically on the backend.
