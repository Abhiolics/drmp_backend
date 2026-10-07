# 📱 DreamPay (DRMP) Mobile App — API Integration Guide

This guide is designed for the **Mobile App Developers** (React Native, Expo, Flutter, Kotlin/Android, Swift/iOS) to integrate all client-facing APIs smoothly and reliably.

---

## 📑 Table of Contents

1. [Base URLs & Environment Setup](#1-base-urls--environment-setup)
2. [Authentication & Request Headers](#2-authentication--request-headers)
3. [Standard Response & Error Formats](#3-standard-response--error-formats)
4. [App Startup & System Config](#4-app-startup--system-config)
5. [Authentication & Profile](#5-authentication--profile)
6. [Membership Plans](#6-membership-plans)
7. [Gift Codes](#7-gift-codes)
8. [Deposits (Money In)](#8-deposits-money-in)
9. [Withdrawals (Money Out)](#9-withdrawals-money-out)
10. [Daily Tasks & Earnings](#10-daily-tasks--earnings)
11. [Wallet & Passbook Ledger](#11-wallet--passbook-ledger)
12. [In-App Notifications](#12-in-app-notifications)
13. [Ready-to-Use React Native / Expo Code Samples](#13-ready-to-use-react-native--expo-code-samples)
14. [Mobile Integration Tips & Common Gotchas](#14-mobile-integration-tips--common-gotchas)

---

## 1. Base URLs & Environment Setup

The backend is configured with dual-routing: you can use either `/api/<endpoint>` or `/<endpoint>`. For clean architecture, using the `/api/` prefix is recommended.

| Environment | Base URL | API Prefix | Notes |
| :--- | :--- | :--- | :--- |
| **Production (Vercel)** | `https://drmpbackend.vercel.app` | `https://drmpbackend.vercel.app/api` | Live production cloud |
| **Local (iOS Simulator / Web)** | `http://localhost:5003` | `http://localhost:5003/api` | Mac / iOS Simulator |
| **Local (Android Emulator)** | `http://10.0.2.2:5003` | `http://10.0.2.2:5003/api` | Standard Android AVD host alias |
| **Physical Device (Expo Go)** | `http://<YOUR_MAC_IP>:5003` | `http://<YOUR_MAC_IP>:5003/api` | e.g. `http://192.168.1.15:5003/api` |

> 🖼️ **Media & Image URLs:**
> - Uploaded proofs (payment screenshots, task proofs) are uploaded to **Cloudinary** and return **full HTTPS URLs** (e.g. `https://res.cloudinary.com/...`).
> - For any legacy or locally served asset, the backend serves from `/uploads/...`.
> - Use the [Image URL Helper](#3-image-url-helper) below to safely display images regardless of origin.

---

## 2. Authentication & Request Headers

### JSON Requests (Default)
Include the JWT token received during login/register for all protected endpoints:

```http
Authorization: Bearer <USER_JWT_TOKEN>
Content-Type: application/json
Accept: application/json
```

### File Upload Requests (Multipart)
For uploading deposit screenshots (`/api/deposits`) and task proofs (`/api/tasks/:id/submit`):
- Use `multipart/form-data`.
- **Do not** manually hardcode the `Content-Type` header in your HTTP client (Axios/Fetch). Let your runtime set the multipart boundary automatically.

---

## 3. Standard Response & Error Formats

### Standard Success Response (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Standard Error Response (`400`, `401`, `403`, `404`, `500`)
```json
{
  "success": false,
  "message": "Clear error explanation for user"
}
```

### Common HTTP Status Codes
| Code | Meaning | Action Needed in App |
| :--- | :--- | :--- |
| `200` | OK | Parse response data |
| `201` | Created | Resource successfully created |
| `400` | Bad Request | Display `message` in toast/banner |
| `401` | Unauthorized | Clear stored token & redirect to Login screen |
| `403` | Forbidden / Blocked | Account blocked or restricted; alert user |
| `404` | Not Found | Resource or route does not exist |
| `500` | Server Error | Generic error prompt ("Please try again later") |

---

## 4. App Startup & System Config

Call these endpoints when the app initializes (Splash Screen or App Launch) before loading core screens.

---

### 4.1 Server Health Ping
- **Endpoint:** `GET /health` or `GET /`
- **Auth:** Public
- **Use Case:** Test backend connectivity before attempting network requests.

#### Response `200 OK`
```json
{
  "status": "OK",
  "message": "DreamPay Backend API is running smoothly",
  "database": "connected",
  "timestamp": "2026-10-03T12:00:00.000Z"
}
```

---

### 4.2 App Settings & Maintenance Check
- **Endpoint:** `GET /api/app/settings`
- **Auth:** Public
- **Use Case:**
  1. If `maintenanceMode: true`, show full-screen maintenance overlay blocking access.
  2. If `forceUpdate: true` and app installed version < `currentVersion`, show mandatory update modal linking to Play Store / App Store.

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "maintenanceMode": false,
    "maintenanceMessage": "The system is currently under maintenance. Please try again later.",
    "forceUpdate": false,
    "updateMessage": "A new version of the app is available. Please update to continue using the application.",
    "currentVersion": "1.0.0"
  }
}
```

---

### 4.3 Get Active Deposit Payment Methods (QR & Bank)
- **Endpoint:** `GET /api/payment-methods`
- **Auth:** Public
- **Use Case:** Fetch payment information to display on the **Deposit Screen** (QR code to scan and Bank/UPI details to copy).

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "qrCode": {
      "enabled": true,
      "imageUrl": "https://res.cloudinary.com/demo/image/upload/v1/dreampay/qr.png"
    },
    "bankAccount": {
      "enabled": true,
      "accountHolder": "DreamPay Services",
      "bankName": "State Bank of India",
      "accountNumber": "987654321012",
      "ifscCode": "SBIN0001234",
      "upiId": "dreampay@upi"
    }
  }
}
```

---

### 4.4 Get Customer Support Contacts
- **Endpoint:** `GET /api/contacts`
- **Auth:** Public
- **Use Case:** Display active help channels (WhatsApp link, Telegram channel, Helpline, Email) on the "Help & Support" screen.

#### Response `200 OK`
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "6740a1b2c3d4e5f6a7b8c9d0",
      "type": "whatsapp",
      "label": "24/7 WhatsApp Support",
      "value": "+919876543210",
      "isActive": true
    },
    {
      "_id": "6740a1b2c3d4e5f6a7b8c9d1",
      "type": "telegram",
      "label": "Official Announcement Channel",
      "value": "https://t.me/dreampay_official",
      "isActive": true
    }
  ]
}
```

---

## 5. Authentication & Profile

---

### 5.1 Register New Account
- **Endpoint:** `POST /api/auth/register`
- **Auth:** Public
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "fullName": "Amit Verma",
  "phoneNumber": "9876543210",
  "email": "amit@example.com",
  "password": "Password@123"
}
```

#### Response `201 Created`
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "6740b2c3d4e5f6a7b8c9d0e1",
    "fullName": "Amit Verma",
    "email": "amit@example.com",
    "phoneNumber": "9876543210",
    "role": "user",
    "isEmailVerified": false,
    "wallet": {
      "balance": 0
    }
  }
}
```

---

### 5.2 Login with Password
- **Endpoint:** `POST /api/auth/login`
- **Auth:** Public
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "email": "amit@example.com",
  "password": "Password@123"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "6740b2c3d4e5f6a7b8c9d0e1",
    "fullName": "Amit Verma",
    "email": "amit@example.com",
    "phoneNumber": "9876543210",
    "role": "user"
  }
}
```

---

### 5.3 Send Login / Verification OTP to Email
- **Endpoint:** `POST /api/auth/send-otp`
- **Auth:** Public
- **Headers:** `Content-Type: application/json`
- **Use Case:** Passwordless login, forgot password, or email verification.

#### Request Body
```json
{
  "email": "amit@example.com"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "message": "OTP sent successfully to email"
}
```
*(Note: In `NODE_ENV=development`, an `otp` field is also returned in the response for easy testing).*

---

### 5.4 Verify OTP & Authenticate
- **Endpoint:** `POST /api/auth/verify-otp`
- **Auth:** Public
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "email": "amit@example.com",
  "otp": "489201"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "6740b2c3d4e5f6a7b8c9d0e1",
    "fullName": "Amit Verma",
    "email": "amit@example.com",
    "role": "user"
  }
}
```

---

### 5.5 Get Current Profile, Wallet & Active Plan
- **Endpoint:** `GET /api/auth/me`
- **Auth:** `Bearer <token>`
- **Use Case:** Call on app open or tab focus to refresh user wallet balance and current membership tier.

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "6740b2c3d4e5f6a7b8c9d0e1",
    "fullName": "Amit Verma",
    "email": "amit@example.com",
    "phoneNumber": "9876543210",
    "role": "user",
    "isBlocked": false,
    "isActive": true,
    "isEmailVerified": true,
    "plan": {
      "_id": "6740c3d4e5f6a7b8c9d0e1f2",
      "name": "VIP Silver",
      "amount": 1000
    },
    "wallet": {
      "balance": 2450,
      "pendingBalance": 0
    },
    "createdAt": "2026-09-24T05:00:00.000Z"
  }
}
```

---

### 5.6 Update Profile Details
- **Endpoint:** `PUT /api/auth/update-profile`
- **Auth:** `Bearer <token>`
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "fullName": "Amit Kumar Verma",
  "phoneNumber": "9876543299"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "6740b2c3d4e5f6a7b8c9d0e1",
    "fullName": "Amit Kumar Verma",
    "phoneNumber": "9876543299"
  }
}
```

---

## 6. Membership Plans

---

### 6.1 Get Active Membership Plans
- **Endpoint:** `GET /api/plans`
- **Auth:** Public
- **Use Case:** Render investment/VIP package cards on the Plans/VIP screen or Deposit plan picker.

#### Response `200 OK`
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "6740c3d4e5f6a7b8c9d0e1f2",
      "name": "VIP 1 - Starter",
      "amount": 500,
      "description": "Unlock 5 daily tasks with ₹30 daily earning potential",
      "isActive": true
    },
    {
      "_id": "6740c3d4e5f6a7b8c9d0e1f3",
      "name": "VIP 2 - Premium",
      "amount": 1500,
      "description": "Unlock 15 daily tasks with ₹100 daily earning potential",
      "isActive": true
    }
  ]
}
```

---

## 7. Gift Codes

---

### 7.1 Redeem Voucher / Promo Code
- **Endpoint:** `POST /api/gift-codes/redeem`
- **Auth:** `Bearer <token>`
- **Headers:** `Content-Type: application/json`
- **Use Case:** Users enter a referral or promo code; the reward amount credits directly to their main wallet instantly.

#### Request Body
```json
{
  "code": "WELCOME100"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Successfully redeemed ₹100!",
  "data": {
    "code": "WELCOME100",
    "rewardAmount": 100
  }
}
```

#### Error Response (Already Claimed or Expired)
```json
{
  "success": false,
  "message": "You have already redeemed this gift code"
}
```

---

## 8. Deposits (Money In)

Users transfer funds via UPI or Net Banking to the admin bank/QR details and upload their screenshot proof along with the bank reference (UTR).

---

### 8.1 Submit Deposit with Screenshot Proof
- **Endpoint:** `POST /api/deposits`
- **Auth:** `Bearer <token>`
- **Headers:** `Content-Type: multipart/form-data`

#### Multipart Form Fields
| Field Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `amount` | Number / String | Yes | Amount paid (e.g. `1000`) |
| `transactionRef` | String | Yes | Bank UTR / UPI Reference Number (e.g. `423847291048`) |
| `paymentProof` | File / Blob | Yes | Screenshot image of payment completion |
| `planId` | String | No | ID of chosen VIP Plan (if activating a plan) |

#### Response `201 Created`
```json
{
  "success": true,
  "message": "Deposit request submitted successfully",
  "data": {
    "_id": "6740d4e5f6a7b8c9d0e1f2a3",
    "user": "6740b2c3d4e5f6a7b8c9d0e1",
    "plan": "6740c3d4e5f6a7b8c9d0e1f2",
    "amount": 1000,
    "transactionRef": "423847291048",
    "paymentProof": "https://res.cloudinary.com/j1fnt9oc/image/upload/v1727950000/dreampay/deposits/proof123.jpg",
    "status": "pending",
    "createdAt": "2026-10-03T12:00:00.000Z"
  }
}
```

---

### 8.2 Get User Deposit History
- **Endpoint:** `GET /api/deposits`
- **Auth:** `Bearer <token>`
- **Use Case:** Display deposit passbook / history list.

#### Response `200 OK`
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "6740d4e5f6a7b8c9d0e1f2a3",
      "amount": 1000,
      "transactionRef": "423847291048",
      "paymentProof": "https://res.cloudinary.com/.../proof123.jpg",
      "status": "approved",
      "plan": {
        "_id": "6740c3d4e5f6a7b8c9d0e1f2",
        "name": "VIP 1 - Starter",
        "amount": 1000
      },
      "createdAt": "2026-10-03T12:00:00.000Z"
    }
  ]
}
```

> **Possible Deposit Status Values:**
> - `"pending"`: Verification in progress by admin.
> - `"approved"`: Funds added to wallet & plan activated.
> - `"rejected"`: Admin rejected (invalid UTR or fake proof).

---

## 9. Withdrawals (Money Out)

---

### 9.1 Submit Withdrawal Request
- **Endpoint:** `POST /api/withdrawals`
- **Auth:** `Bearer <token>`
- **Headers:** `Content-Type: application/json`
- **Important:** Requested amount is **debited immediately** from the user's wallet to prevent double-spending. If admin later rejects it, the money is automatically refunded back to the wallet.

#### Request Body
```json
{
  "amount": 500,
  "bankDetails": {
    "accountHolderName": "Amit Verma",
    "bankName": "State Bank of India",
    "accountNumber": "123456789012",
    "ifscCode": "SBIN0001234",
    "upiId": "amit@okaxis"
  }
}
```

#### Response `201 Created`
```json
{
  "success": true,
  "message": "Withdrawal request submitted successfully",
  "data": {
    "_id": "6740e5f6a7b8c9d0e1f2a3b4",
    "user": "6740b2c3d4e5f6a7b8c9d0e1",
    "amount": 500,
    "bankDetails": {
      "accountHolderName": "Amit Verma",
      "bankName": "State Bank of India",
      "accountNumber": "123456789012",
      "ifscCode": "SBIN0001234",
      "upiId": "amit@okaxis"
    },
    "status": "pending",
    "createdAt": "2026-10-03T12:30:00.000Z"
  }
}
```

#### Error Response (Insufficient Wallet Balance)
```json
{
  "success": false,
  "message": "Insufficient wallet balance"
}
```

---

### 9.2 Get User Withdrawal History
- **Endpoint:** `GET /api/withdrawals`
- **Auth:** `Bearer <token>`

#### Response `200 OK`
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "6740e5f6a7b8c9d0e1f2a3b4",
      "amount": 500,
      "bankDetails": {
        "accountHolderName": "Amit Verma",
        "accountNumber": "123456789012",
        "ifscCode": "SBIN0001234",
        "upiId": "amit@okaxis"
      },
      "status": "approved",
      "createdAt": "2026-10-03T12:30:00.000Z"
    }
  ]
}
```

> **Possible Withdrawal Status Values:** `"pending"` | `"approved"` | `"rejected"`

---

## 10. Daily Tasks & Earnings

---

### 10.1 Get Active Tasks with User Submission Status
- **Endpoint:** `GET /api/tasks`
- **Auth:** `Bearer <token>`
- **Use Case:** Displays earning task cards in the task screen. Includes `mySubmission` so the app knows whether the button should say "Start Task", "In Review", or "Completed".

#### Response `200 OK`
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "6740f6a7b8c9d0e1f2a3b4c5",
      "title": "Subscribe to Official YouTube Channel",
      "description": "Subscribe to channel, like the video and take a screenshot showing the subscribed state.",
      "rewardAmount": 25,
      "isActive": true,
      "mySubmission": null
    },
    {
      "_id": "6740f6a7b8c9d0e1f2a3b4c6",
      "title": "Join Telegram Community Channel",
      "description": "Join our Telegram community and upload screenshot.",
      "rewardAmount": 15,
      "isActive": true,
      "mySubmission": {
        "status": "pending",
        "submittedAt": "2026-10-03T13:00:00.000Z"
      }
    }
  ]
}
```

> **`mySubmission` Handling Logic:**
> - `null`: User has not submitted yet → Show **"Submit Proof"** button.
> - `mySubmission.status === 'pending'`: Submitted and waiting for review → Show **"Under Review"** tag.
> - `mySubmission.status === 'approved'`: Approved and credited → Show **"Completed"** green badge.

---

### 10.2 Submit Task Completion Proof
- **Endpoint:** `POST /api/tasks/:id/submit`
- **Auth:** `Bearer <token>`
- **Headers:** `Content-Type: multipart/form-data`
- **Params:** `:id` = Task `_id` (e.g. `/api/tasks/6740f6a7b8c9d0e1f2a3b4c5/submit`)

#### Multipart Form Fields
| Field Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `proof` | File / Blob | Yes | Screenshot image proving task completion |

#### Response `201 Created`
```json
{
  "success": true,
  "message": "Task proof submitted successfully",
  "data": {
    "_id": "6740a7b8c9d0e1f2a3b4c5d6",
    "task": "6740f6a7b8c9d0e1f2a3b4c5",
    "user": "6740b2c3d4e5f6a7b8c9d0e1",
    "proof": "https://res.cloudinary.com/.../task_proof.jpg",
    "rewardAmount": 25,
    "status": "pending",
    "createdAt": "2026-10-03T13:15:00.000Z"
  }
}
```

---

### 10.3 Get User's Task Submission History
- **Endpoint:** `GET /api/tasks/submissions`
- **Auth:** `Bearer <token>`

#### Response `200 OK`
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "6740a7b8c9d0e1f2a3b4c5d6",
      "rewardAmount": 25,
      "status": "approved",
      "proof": "https://res.cloudinary.com/.../task_proof.jpg",
      "task": {
        "_id": "6740f6a7b8c9d0e1f2a3b4c5",
        "title": "Subscribe to Official YouTube Channel",
        "rewardAmount": 25
      },
      "createdAt": "2026-10-03T13:15:00.000Z"
    }
  ]
}
```

---

## 11. Wallet & Passbook Ledger

---

### 11.1 Get Live Wallet Balance
- **Endpoint:** `GET /api/wallet`
- **Auth:** `Bearer <token>`

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "6740b8c9d0e1f2a3b4c5d6e7",
    "user": "6740b2c3d4e5f6a7b8c9d0e1",
    "balance": 2450,
    "pendingBalance": 0
  }
}
```

---

### 11.2 Get Transaction History (Passbook)
- **Endpoint:** `GET /api/wallet/transactions`
- **Auth:** `Bearer <token>`
- **Query Parameters:**
  - `page` *(optional, default: 1)*
  - `limit` *(optional, default: 20)*
  - `type` *(optional: `credit` | `debit`)*
  - `category` *(optional: `deposit` | `withdrawal` | `task_reward` | `gift_code` | `admin_adjustment`)*

*Example:* `GET /api/wallet/transactions?page=1&limit=15&type=credit`

#### Response `200 OK`
```json
{
  "success": true,
  "count": 3,
  "total": 12,
  "data": [
    {
      "_id": "6740c9d0e1f2a3b4c5d6e7f8",
      "amount": 25,
      "type": "credit",
      "category": "task_reward",
      "status": "completed",
      "description": "Task reward: Subscribe to Official YouTube Channel",
      "createdAt": "2026-10-03T13:20:00.000Z"
    },
    {
      "_id": "6740c9d0e1f2a3b4c5d6e7f9",
      "amount": 500,
      "type": "debit",
      "category": "withdrawal",
      "status": "completed",
      "description": "Withdrawal request initiated",
      "createdAt": "2026-10-03T12:30:00.000Z"
    },
    {
      "_id": "6740c9d0e1f2a3b4c5d6e7fa",
      "amount": 1000,
      "type": "credit",
      "category": "deposit",
      "status": "completed",
      "description": "Deposit approved (Ref: 423847291048)",
      "createdAt": "2026-10-03T12:05:00.000Z"
    }
  ]
}
```

---

## 12. In-App Notifications

---

### 12.1 Get Notification List
- **Endpoint:** `GET /api/notifications`
- **Auth:** `Bearer <token>`

#### Response `200 OK`
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "6740d0e1f2a3b4c5d6e7f8a9",
      "title": "Deposit Approved",
      "message": "Your deposit of ₹1000 has been approved and credited to your wallet.",
      "type": "deposit",
      "isRead": false,
      "createdAt": "2026-10-03T12:05:00.000Z"
    },
    {
      "_id": "6740d0e1f2a3b4c5d6e7f8aa",
      "title": "Task Reward Credited",
      "message": "Your task submission was approved! ₹25 added to your wallet.",
      "type": "task",
      "isRead": true,
      "createdAt": "2026-10-03T13:20:00.000Z"
    }
  ]
}
```

---

### 12.2 Get Unread Notification Count (For Tab/Header Badge)
- **Endpoint:** `GET /api/notifications/unread-count`
- **Auth:** `Bearer <token>`

#### Response `200 OK`
```json
{
  "success": true,
  "unreadCount": 1
}
```

---

### 12.3 Mark All Notifications as Read
- **Endpoint:** `PATCH /api/notifications/read-all`
- **Auth:** `Bearer <token>`

#### Response `200 OK`
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

### 12.4 Mark Single Notification as Read
- **Endpoint:** `PATCH /api/notifications/:id/read`
- **Auth:** `Bearer <token>`

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

## 13. Ready-to-Use React Native / Expo Code Samples

Copy and adapt these files into your mobile app (`drmpay_app`) directory for clean, modular code.

---

### 1. Axios API Client (`src/services/apiClient.ts`)

```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Dynamically select base URL based on platform & environment
export const getBaseUrl = (): string => {
  if (!__DEV__) {
    return 'https://drmpbackend.vercel.app';
  }
  // Local Development URLs
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5003'; // Android Emulator
  }
  return 'http://localhost:5003'; // iOS Simulator & Web
  // For Physical Device via Expo, replace with your Mac's LAN IP:
  // return 'http://192.168.1.15:5003';
};

export const BASE_URL = getBaseUrl();
export const API_URL = `${BASE_URL}/api`;

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
  },
});

// Automatic JWT Bearer token injection
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('user_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for automatic 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid -> Clear local session
      await AsyncStorage.multiRemove(['user_token', 'user_profile']);
      // Trigger navigation or auth state reset if required
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

### 2. Deposit Upload Service (`src/services/depositService.ts`)

```typescript
import apiClient from './apiClient';

export interface SubmitDepositParams {
  amount: number | string;
  transactionRef: string;
  imageUri: string;
  planId?: string;
}

export const submitDepositProof = async ({
  amount,
  transactionRef,
  imageUri,
  planId,
}: SubmitDepositParams) => {
  const formData = new FormData();
  formData.append('amount', String(amount));
  formData.append('transactionRef', transactionRef.trim());
  if (planId) {
    formData.append('planId', planId);
  }

  // Format file object for React Native FormData
  const filename = imageUri.split('/').pop() || 'deposit_proof.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

  formData.append('paymentProof', {
    uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
    name: filename,
    type,
  } as any);

  const response = await apiClient.post('/deposits', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const fetchDepositHistory = async () => {
  const response = await apiClient.get('/deposits');
  return response.data;
};
```

---

### 3. Task Proof Upload Service (`src/services/taskService.ts`)

```typescript
import apiClient from './apiClient';
import { Platform } from 'react-native';

export const fetchTasks = async () => {
  const response = await apiClient.get('/tasks');
  return response.data;
};

export const submitTaskProof = async (taskId: string, imageUri: string) => {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'task_proof.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

  formData.append('proof', {
    uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
    name: filename,
    type,
  } as any);

  const response = await apiClient.post(`/tasks/${taskId}/submit`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};
```

---

### 4. Image URL Helper (`src/utils/imageUrl.ts`)

```typescript
import { BASE_URL } from '../services/apiClient';

/**
 * Normalizes image paths from Cloudinary or local uploads to complete, loadable URLs.
 */
export const getFullImageUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${cleanPath}`;
};
```

---

## 13. Refer & Earn (2-Level Commission System)

The backend features a fully automated 2-Level Referral System:
- **Level 1 (Direct Referrer):** Receives **2%** wallet credit instantly upon approval of their direct referral's deposit.
- **Level 2 (Indirect Referrer):** Receives **1%** wallet credit instantly upon approval of their second-degree team member's deposit.
- Immutable ledger records are logged with category `referral_bonus`.
- Real-time in-app notifications are triggered with type `referral`.

---

### A. User Registration with Referral Code
- **Method:** `POST`
- **Endpoint:** `/api/auth/register`
- **Auth:** Public

#### Request Body
```json
{
  "fullName": "Rahul Sharma",
  "phoneNumber": "9876543210",
  "email": "rahul@example.com",
  "password": "Password@123",
  "referralCode": "DRM598AB" // Optional (can also pass referCode or refCode)
}
```

#### Response (`201 Created`)
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbGciOi...",
  "data": {
    "id": "6ac671479dbcf51cdf5986a6",
    "fullName": "Rahul Sharma",
    "email": "rahul@example.com",
    "phoneNumber": "9876543210",
    "role": "user",
    "referralCode": "DRMA7K2P",
    "referralLink": "https://drmpbackend.vercel.app/ref/DRMA7K2P",
    "referredBy": "6ac671469dbcf51cdf598697",
    "referredByL2": null,
    "wallet": {
      "balance": 0
    }
  }
}
```

---

### B. Get Referral Statistics & Team Dashboard
- **Method:** `GET`
- **Endpoint:** `/api/referral/stats`
- **Auth:** Private (`Bearer <USER_JWT_TOKEN>`)

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "referralCode": "DRM598AB",
    "referralLink": "https://drmpbackend.vercel.app/ref/DRM598AB",
    "totalCommission": 100,
    "todayCommission": 100,
    "yesterdayCommission": 0,
    "totalMembers": 2,
    "level1Count": 1,
    "level2Count": 1,
    "totalTeamDeposit": 10000,
    "level1TeamDeposit": 0,
    "level2TeamDeposit": 10000,
    "teamMembers": [
      {
        "id": "6ac671479dbcf51cdf59869f",
        "name": "Bob Direct",
        "email": "bob@example.com",
        "phone": "9289778155",
        "level": 1,
        "totalDeposit": 0,
        "registrationDate": "2026-10-07T16:20:23.210Z"
      },
      {
        "id": "6ac671479dbcf51cdf5986a6",
        "name": "Charlie Indirect",
        "email": "charlie@example.com",
        "phone": "9399638091",
        "level": 2,
        "totalDeposit": 10000,
        "registrationDate": "2026-10-07T16:20:23.714Z"
      }
    ]
  }
}
```

---

### C. Public Referral Landing Page & JSON Lookup
- **Method:** `GET`
- **Endpoint:** `/ref/:code` (or `/api/ref/:code`)
- **Auth:** Public
- **Browser/Web:** Serves a responsive landing page with inviter name, perks, pre-filled registration form, and mobile app download CTA.
- **API/Mobile:** Send `Accept: application/json` or query param `?json=true` to receive JSON:

```json
{
  "success": true,
  "data": {
    "inviterName": "Alice Inviter",
    "referralCode": "DRM598AB"
  }
}
```

---

## 15. Mobile Integration Tips & Common Gotchas

1. **Android Emulator Localhost**:
   - `http://localhost` does **not** point to your development Mac/PC inside the Android emulator. Use `http://10.0.2.2:5003`.
2. **Android Cleartext (HTTP) Traffic**:
   - When testing locally over plain `http://`, make sure your `android/app/src/main/AndroidManifest.xml` includes `android:usesCleartextTraffic="true"` inside the `<application>` tag.
3. **Multipart Upload Boundary**:
   - When creating `FormData` in React Native, **never** set `Content-Type: multipart/form-data; boundary=...` manually. Simply let Axios omit the manual boundary or set `'Content-Type': 'multipart/form-data'` so the browser/native layer calculates boundaries.
4. **Token Persistence**:
   - Store the token securely in `AsyncStorage` (or `expo-secure-store`). Check for existing token on app boot; if present, call `GET /api/auth/me` to validate session and preload user wallet.
5. **Withdrawal Amount Debit**:
   - Remember that `POST /api/withdrawals` immediately deducts the amount from the user's available wallet balance. Update your client-side wallet state or refetch `GET /api/wallet` right after a successful withdrawal request.

