# DreamPay (DRMP) Mobile App - API Integration Guide

This guide is specifically created for the **Mobile App Developer** (React Native / Expo / Flutter) to integrate all client-facing APIs smoothly.

---

## 🌐 Server Base URL & Setup

| Environment | Base URL |
| :--- | :--- |
| **Production / Hosted Server** | `https://gdpebackend.vercel.app` |
| **API Path Prefix** | `https://gdpebackend.vercel.app/api` |
| **Media / Uploads Base URL** | `https://gdpebackend.vercel.app` |

> **Note on Uploaded Files:** All uploaded images (payment proof screenshots, task proofs, QR codes) are returned with relative paths like `/uploads/1727170000000-image.jpg`. To display them in the app, prepend the base URL:  
> `https://gdpebackend.vercel.app/uploads/1727170000000-image.jpg`

---

## 🔑 Authentication & Headers

For all protected routes, include the JWT token returned from registration or login in the request headers:

```http
Authorization: Bearer <YOUR_JWT_TOKEN>
Content-Type: application/json
```

For file upload endpoints (`/api/deposits` and `/api/tasks/:id/submit`), use `multipart/form-data` (in Axios / Fetch, do **not** set the `Content-Type` header manually; allow `FormData` to set its boundary automatically).

---

## 📦 Standard API Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response (HTTP 400, 401, 403, 404, 500)
```json
{
  "success": false,
  "message": "Error description here"
}
```

---

## 📑 Complete API Directory for Mobile App

1. [App System Config & Maintenance](#1-app-system-configuration--maintenance)
2. [Authentication & Profile](#2-authentication--user-profile)
3. [Membership Plans](#3-membership-plans)
4. [Gift Codes](#4-gift-codes)
5. [Deposits](#5-deposits-money-in)
6. [Withdrawals](#6-withdrawals-money-out)
7. [Tasks & Daily Earnings](#7-tasks--daily-earnings)
8. [Wallet & Transaction History](#8-wallet--transaction-history)
9. [Notifications](#9-notifications)

---

## 1. App System Configuration & Maintenance

Always call these endpoints on app splash/startup to verify maintenance mode, force app updates, and fetch payment options.

---

### 1.1 Check App Status & Maintenance Mode
- **URL:** `GET https://gdpebackend.vercel.app/api/app/settings`
- **Auth:** Not required (Public)
- **Use Case:** Call on app startup. If `maintenanceMode` is true, display a maintenance screen. If `forceUpdate` is true and installed version < `currentVersion`, block user with an update modal.

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "maintenanceMode": false,
    "maintenanceMessage": "App is under scheduled maintenance. Please check back later.",
    "forceUpdate": false,
    "updateMessage": "A new version of the app is available. Please update to continue.",
    "currentVersion": "1.0.0"
  }
}
```

---

### 1.2 Get Active Payment Methods (Deposit Bank / UPI QR)
- **URL:** `GET https://gdpebackend.vercel.app/api/payment-methods`
- **Auth:** Not required (Public)
- **Use Case:** Display active bank account details and QR code on the Deposit screen so users know where to send money.

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "qrCode": {
      "imageUrl": "https://gdpebackend.vercel.app/uploads/qr-sample.png",
      "upiId": "gdpepay@upi"
    },
    "bankAccount": {
      "accountHolder": "GDPE ENTERPRISE",
      "accountNumber": "919876543210",
      "ifscCode": "PYTM0123456",
      "bankName": "Paytm Payments Bank"
    }
  }
}
```

---

### 1.3 Get Support Channels & Contacts
- **URL:** `GET https://gdpebackend.vercel.app/api/contacts`
- **Auth:** Not required (Public)
- **Use Case:** Load WhatsApp, Telegram, or Email links in the "Help & Support" screen.

#### Response `200 OK`
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "6740a1b2c3d4e5f6a7b8c9d0",
      "type": "whatsapp",
      "label": "Official Support 1",
      "value": "+919876543210",
      "isActive": true
    },
    {
      "_id": "6740a1b2c3d4e5f6a7b8c9d1",
      "type": "telegram",
      "label": "GDPE Channel",
      "value": "https://t.me/gdpe_official",
      "isActive": true
    }
  ]
}
```

---

## 2. Authentication & User Profile

---

### 2.1 Register New User
- **URL:** `POST https://gdpebackend.vercel.app/api/auth/register`
- **Auth:** Not required (Public)
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "fullName": "Rahul Sharma",
  "phoneNumber": "9876543210",
  "email": "rahul@example.com",
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
    "fullName": "Rahul Sharma",
    "email": "rahul@example.com",
    "phoneNumber": "9876543210",
    "role": "user",
    "isEmailVerified": false,
    "verificationToken": "7b89f3a...",
    "wallet": {
      "balance": 0
    }
  }
}
```

---

### 2.2 Login with Email & Password
- **URL:** `POST https://gdpebackend.vercel.app/api/auth/login`
- **Auth:** Not required (Public)
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "email": "rahul@example.com",
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
    "fullName": "Rahul Sharma",
    "email": "rahul@example.com",
    "phoneNumber": "9876543210",
    "role": "user"
  }
}
```

---

### 2.3 Send OTP (Email Login / Forgot Password)
- **URL:** `POST https://gdpebackend.vercel.app/api/auth/send-otp`
- **Auth:** Not required (Public)
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "email": "rahul@example.com"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "message": "OTP sent successfully to email",
  "otp": "489201"
}
```

---

### 2.4 Verify OTP & Authenticate
- **URL:** `POST https://gdpebackend.vercel.app/api/auth/verify-otp`
- **Auth:** Not required (Public)
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "email": "rahul@example.com",
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
    "fullName": "Rahul Sharma",
    "email": "rahul@example.com",
    "role": "user"
  }
}
```

---

### 2.5 Get Current User Profile (with Wallet Balance & Plan)
- **URL:** `GET https://gdpebackend.vercel.app/api/auth/me`
- **Auth:** `Bearer <token>`

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "6740b2c3d4e5f6a7b8c9d0e1",
    "fullName": "Rahul Sharma",
    "email": "rahul@example.com",
    "phoneNumber": "9876543210",
    "role": "user",
    "isBlocked": false,
    "isActive": true,
    "isEmailVerified": true,
    "plan": {
      "_id": "6740c3d4e5f6a7b8c9d0e1f2",
      "name": "VIP 1",
      "amount": 1000
    },
    "wallet": {
      "balance": 1500,
      "pendingBalance": 0
    },
    "createdAt": "2026-09-24T05:00:00.000Z"
  }
}
```

---

### 2.6 Update User Profile
- **URL:** `PUT https://gdpebackend.vercel.app/api/auth/update-profile`
- **Auth:** `Bearer <token>`
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "fullName": "Rahul S. Sharma",
  "phoneNumber": "9876543219"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "6740b2c3d4e5f6a7b8c9d0e1",
    "fullName": "Rahul S. Sharma",
    "phoneNumber": "9876543219"
  }
}
```

---

## 3. Membership Plans

---

### 3.1 Get All Active Plans
- **URL:** `GET https://gdpebackend.vercel.app/api/plans`
- **Auth:** Not required (Public)
- **Use Case:** Display plan packages that users can purchase by making a deposit.

#### Response `200 OK`
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "6740c3d4e5f6a7b8c9d0e1f2",
      "name": "VIP Starter",
      "amount": 500,
      "description": "Unlock 5 tasks daily with ₹20 daily earning potential",
      "isActive": true
    },
    {
      "_id": "6740c3d4e5f6a7b8c9d0e1f3",
      "name": "VIP Pro",
      "amount": 1500,
      "description": "Unlock 15 tasks daily with higher rewards",
      "isActive": true
    }
  ]
}
```

---

## 4. Gift Codes

---

### 4.1 Redeem Gift Code
- **URL:** `POST https://gdpebackend.vercel.app/api/gift-codes/redeem`
- **Auth:** `Bearer <token>`
- **Headers:** `Content-Type: application/json`
- **Use Case:** Users enter a promotional or referral voucher code; the amount is credited directly to their wallet.

#### Request Body
```json
{
  "code": "BONUS50"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Successfully redeemed ₹50!",
  "data": {
    "code": "BONUS50",
    "rewardAmount": 50
  }
}
```

#### Error Response (Already used or expired)
```json
{
  "success": false,
  "message": "You have already redeemed this gift code"
}
```

---

## 5. Deposits (Money In)

Users pay to the QR/Bank account and upload their screenshot proof + UTR reference.

---

### 5.1 Submit Deposit with Screenshot Proof
- **URL:** `POST https://gdpebackend.vercel.app/api/deposits`
- **Auth:** `Bearer <token>`
- **Content-Type:** `multipart/form-data`

#### Form-Data Fields
| Key | Type | Description |
| :--- | :--- | :--- |
| `amount` | Number/String | Deposit amount (e.g. `1000`) |
| `transactionRef` | String | Bank UTR / UPI Transaction Reference ID (e.g. `423847291048`) |
| `planId` | String *(optional)* | Plan ID if depositing for a specific membership plan |
| `paymentProof` | File (Image) | Screenshot of the payment completion receipt |

#### Response `201 Created`
```json
{
  "success": true,
  "message": "Deposit request submitted successfully",
  "data": {
    "_id": "6740d4e5f6a7b8c9d0e1f2a3",
    "user": "6740b2c3d4e5f6a7b8c9d0e1",
    "plan": "6740c3d4e5f6a7b8c9d0e1f2",
    "transactionRef": "423847291048",
    "amount": 1000,
    "paymentProof": "/uploads/1727170000000-payment.jpg",
    "status": "pending",
    "createdAt": "2026-09-24T06:00:00.000Z"
  }
}
```

---

### 5.2 Get User Deposit History
- **URL:** `GET https://gdpebackend.vercel.app/api/deposits`
- **Auth:** `Bearer <token>`

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
      "paymentProof": "/uploads/1727170000000-payment.jpg",
      "status": "approved",
      "plan": {
        "_id": "6740c3d4e5f6a7b8c9d0e1f2",
        "name": "VIP Starter",
        "amount": 1000
      },
      "createdAt": "2026-09-24T06:00:00.000Z"
    }
  ]
}
```

> **Deposit Status Values:** `"pending"` | `"approved"` | `"rejected"`

---

## 6. Withdrawals (Money Out)

---

### 6.1 Request Withdrawal
- **URL:** `POST https://gdpebackend.vercel.app/api/withdrawals`
- **Auth:** `Bearer <token>`
- **Headers:** `Content-Type: application/json`
- **Note:** The requested amount is instantly debited from the user's wallet. If admin rejects it later, the amount is automatically refunded.

#### Request Body
```json
{
  "amount": 500,
  "bankDetails": {
    "accountHolder": "Rahul Sharma",
    "accountNumber": "123456789012",
    "ifscCode": "SBIN0001234",
    "upiId": "rahul@okaxis"
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
      "accountHolder": "Rahul Sharma",
      "accountNumber": "123456789012",
      "ifscCode": "SBIN0001234",
      "upiId": "rahul@okaxis"
    },
    "status": "pending",
    "createdAt": "2026-09-24T07:00:00.000Z"
  }
}
```

#### Error Response (Insufficient Balance)
```json
{
  "success": false,
  "message": "Insufficient wallet balance"
}
```

---

### 6.2 Get User Withdrawal History
- **URL:** `GET https://gdpebackend.vercel.app/api/withdrawals`
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
        "accountHolder": "Rahul Sharma",
        "accountNumber": "123456789012",
        "ifscCode": "SBIN0001234",
        "upiId": "rahul@okaxis"
      },
      "status": "approved",
      "createdAt": "2026-09-24T07:00:00.000Z"
    }
  ]
}
```

> **Withdrawal Status Values:** `"pending"` | `"approved"` | `"rejected"`

---

## 7. Tasks & Daily Earnings

---

### 7.1 Get All Available Tasks (with User's Submission Status)
- **URL:** `GET https://gdpebackend.vercel.app/api/tasks`
- **Auth:** `Bearer <token>`
- **Use Case:** Displays earning task cards in the task screen. Shows whether user has already submitted proof for each task (`mySubmission` field).

#### Response `200 OK`
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "6740f6a7b8c9d0e1f2a3b4c5",
      "title": "Subscribe to Official YouTube Channel",
      "description": "Subscribe to our channel and upload a screenshot showing the subscribed button",
      "rewardAmount": 25,
      "isActive": true,
      "mySubmission": null
    },
    {
      "_id": "6740f6a7b8c9d0e1f2a3b4c6",
      "title": "Join Telegram Community",
      "description": "Join our Telegram group and upload screenshot",
      "rewardAmount": 15,
      "isActive": true,
      "mySubmission": {
        "status": "pending",
        "submittedAt": "2026-09-24T08:00:00.000Z"
      }
    }
  ]
}
```

---

### 7.2 Submit Proof for a Task
- **URL:** `POST https://gdpebackend.vercel.app/api/tasks/:id/submit`  
  *(Replace `:id` with task `_id` e.g., `https://gdpebackend.vercel.app/api/tasks/6740f6a7b8c9d0e1f2a3b4c5/submit`)*
- **Auth:** `Bearer <token>`
- **Content-Type:** `multipart/form-data`

#### Form-Data Fields
| Key | Type | Description |
| :--- | :--- | :--- |
| `proof` | File (Image) | Screenshot proof of completing the task |

#### Response `201 Created`
```json
{
  "success": true,
  "message": "Task proof submitted successfully",
  "data": {
    "_id": "6740a7b8c9d0e1f2a3b4c5d6",
    "task": "6740f6a7b8c9d0e1f2a3b4c5",
    "user": "6740b2c3d4e5f6a7b8c9d0e1",
    "proof": "/uploads/1727170000000-task-proof.jpg",
    "rewardAmount": 25,
    "status": "pending",
    "createdAt": "2026-09-24T08:30:00.000Z"
  }
}
```

---

### 7.3 Get User's Task Submission History
- **URL:** `GET https://gdpebackend.vercel.app/api/tasks/submissions`
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
      "proof": "/uploads/1727170000000-task-proof.jpg",
      "task": {
        "_id": "6740f6a7b8c9d0e1f2a3b4c5",
        "title": "Subscribe to Official YouTube Channel",
        "rewardAmount": 25
      },
      "createdAt": "2026-09-24T08:30:00.000Z"
    }
  ]
}
```

---

## 8. Wallet & Transaction History

---

### 8.1 Get Current User Wallet Balance
- **URL:** `GET https://gdpebackend.vercel.app/api/wallet`
- **Auth:** `Bearer <token>`

#### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "6740b8c9d0e1f2a3b4c5d6e7",
    "user": "6740b2c3d4e5f6a7b8c9d0e1",
    "balance": 1825,
    "pendingBalance": 0
  }
}
```

---

### 8.2 Get Transaction History (Passbook / Ledger)
- **URL:** `GET https://gdpebackend.vercel.app/api/wallet/transactions`
- **Auth:** `Bearer <token>`
- **Optional Query Parameters:**
  - `page` (default: 1)
  - `limit` (default: 20)
  - `type` (`credit` or `debit`)
  - `category` (`deposit`, `withdrawal`, `task_reward`, `gift_code`, `admin_adjustment`)

*Example:* `GET https://gdpebackend.vercel.app/api/wallet/transactions?page=1&limit=10`

#### Response `200 OK`
```json
{
  "success": true,
  "count": 3,
  "total": 3,
  "data": [
    {
      "_id": "6740c9d0e1f2a3b4c5d6e7f8",
      "amount": 25,
      "type": "credit",
      "category": "task_reward",
      "status": "completed",
      "description": "Task reward: Subscribe to Official YouTube Channel",
      "createdAt": "2026-09-24T09:00:00.000Z"
    },
    {
      "_id": "6740c9d0e1f2a3b4c5d6e7f9",
      "amount": 500,
      "type": "debit",
      "category": "withdrawal",
      "status": "completed",
      "description": "Withdrawal request initiated",
      "createdAt": "2026-09-24T07:00:00.000Z"
    },
    {
      "_id": "6740c9d0e1f2a3b4c5d6e7fa",
      "amount": 1000,
      "type": "credit",
      "category": "deposit",
      "status": "completed",
      "description": "Deposit approved (Ref: 423847291048)",
      "createdAt": "2026-09-24T06:15:00.000Z"
    }
  ]
}
```

---

## 9. Notifications

---

### 9.1 Get User Notifications
- **URL:** `GET https://gdpebackend.vercel.app/api/notifications`
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
      "type": "success",
      "isRead": false,
      "createdAt": "2026-09-24T06:15:00.000Z"
    },
    {
      "_id": "6740d0e1f2a3b4c5d6e7f8aa",
      "title": "Task Approved",
      "message": "Your submission was approved! ₹25 has been credited to your wallet.",
      "type": "success",
      "isRead": true,
      "createdAt": "2026-09-24T09:00:00.000Z"
    }
  ]
}
```

---

### 9.2 Get Unread Notification Count (For Badges)
- **URL:** `GET https://gdpebackend.vercel.app/api/notifications/unread-count`
- **Auth:** `Bearer <token>`

#### Response `200 OK`
```json
{
  "success": true,
  "unreadCount": 1
}
```

---

### 9.3 Mark All Notifications as Read
- **URL:** `PATCH https://gdpebackend.vercel.app/api/notifications/read-all`
- **Auth:** `Bearer <token>`

#### Response `200 OK`
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

### 9.4 Mark Single Notification as Read
- **URL:** `PATCH https://gdpebackend.vercel.app/api/notifications/:id/read`  
  *(Replace `:id` with notification `_id`)*
- **Auth:** `Bearer <token>`

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

## 💻 Sample Code for Mobile App (React Native / Expo)

### 1. Axios Instance Setup (`api.ts`)
```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'https://gdpebackend.vercel.app';
export const API_URL = `${BASE_URL}/api`;

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Attach JWT token automatically
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('user_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

---

### 2. Uploading Deposit Proof (`depositService.ts`)
```typescript
import apiClient from './api';

export const submitDeposit = async (
  amount: number,
  transactionRef: string,
  imageUri: string,
  planId?: string
) => {
  const formData = new FormData();
  formData.append('amount', String(amount));
  formData.append('transactionRef', transactionRef);
  if (planId) formData.append('planId', planId);

  // Extract file name and extension
  const filename = imageUri.split('/').pop() || 'proof.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  formData.append('paymentProof', {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  // Send request
  const response = await apiClient.post('/deposits', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};
```

---

### 3. Displaying Uploaded Images
```typescript
import { BASE_URL } from './api';

export const getFullImageUrl = (path?: string) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};
```
