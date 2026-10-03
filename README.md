# drmp_backend

DreamPay (DRMP) Backend API built with Node.js, Express, MongoDB Atlas, ZeptoMail (Zoho), and Cloudinary.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (.env)
Create a `.env` file from `.env.example`:
```env
PORT=5003
NODE_ENV=development
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/drmp_backend?retryWrites=true&w=majority
JWT_SECRET=drmp_super_secret_jwt_key_2026_x89f
JWT_EXPIRE=30d
ADMIN_EMAIL=admin@dreampay.info
ADMIN_PASSWORD=Admin@123
ADMIN_NAME=Super Admin
ADMIN_PHONE=9999999999
BASE_URL=http://localhost:5003

# ZeptoMail (Zoho) Configuration
ZEPTOMAIL_HOST=smtp.zeptomail.in
ZEPTOMAIL_PORT=465
ZEPTOMAIL_USER=emailapikey
ZEPTOMAIL_TOKEN=your_zeptomail_token_here
FROM_EMAIL=noreply@dreampay.info
FROM_NAME=DreamPay

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Run Development Server
```bash
npm run dev
```
Or for production:
```bash
npm start
```

### 4. Run Automated Smoke Tests
To verify all 12 modules end-to-end:
```bash
npm test
```

---

## 🔑 Default Admin Account
The backend automatically creates this admin user on startup if not already present:
- **Email**: Configured via `ADMIN_EMAIL` in `.env`
- **Password**: Configured via `ADMIN_PASSWORD` in `.env` (default: `Admin@123`)
- **Role**: `admin`

---

## 📮 Postman Collection Configuration

To run your existing Postman collection, set your Postman Environment Variables:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `{{Base_url}}` | `http://localhost:5003` | Base server URL |
| `{{paylocal}}` | `http://localhost:5003/api/` (or `http://localhost:5003/`) | Pay routes prefix |

> **Dual Routing Compatibility:** All routes are mapped to **both** `/api/<endpoint>` and `/<endpoint>`. That means whether your Postman URL is `{{paylocal}}plans/admin` or `http://localhost:5003/api/auth/register`, it works seamlessly without modification!

---

## 📋 API Modules & Endpoints

### 1. Authentication (`/api/auth`)
- `POST /register`: Register new user (fullName, phoneNumber, email, password)
- `POST /login`: Email & password login, returns JWT token
- `POST /send-otp`: Generate & send 6-digit OTP (returned in dev response)
- `POST /verify-otp`: Verify OTP and issue JWT token
- `GET /me`: Authenticated user profile with populated wallet balance & plan
- `PUT /update-profile`: Update user profile (fullName, phoneNumber)
- `GET /verify-email/:token`: Email verification link

### 2. Membership Plans (`/api/plans`)
- `GET /`: Get all active plans (Public)
- `GET /admin`: List all plans (Admin)
- `POST /admin`: Create plan (`name`, `amount`, `description`)
- `PUT /admin/:id`: Update plan details
- `DELETE /admin/:id`: Delete plan
- `PATCH /admin/:id/toggle`: Toggle active/inactive status

### 3. Gift Codes (`/api/gift-codes`)
- `GET /admin`: List all gift codes with usage statistics
- `POST /admin`: Create gift code (`code`, `rewardAmount`, `maxUsers`, `expiryDate`)
- `PUT /admin/:id`: Update gift code
- `DELETE /admin/:id`: Delete gift code
- `PATCH /admin/:id/toggle`: Toggle active/inactive status
- `POST /redeem`: User redeems code, receives immediate wallet credit

### 4. Admin Management (`/api/admin`)
- `GET /dashboard`: Aggregate statistics (users, deposits, withdrawals, tasks, wallets)
- `GET /users`: List users with pagination and search
- `GET /users/:id`: Get detailed user profile
- `PATCH /users/:id/block`: Block user account
- `PATCH /users/:id/unblock`: Unblock user account
- `PATCH /users/:id/activate`: Activate user account
- `PATCH /users/:id/deactivate`: Deactivate user account

### 5. Deposits (`/api/deposits`)
- `POST /`: User submits deposit (multipart/form-data: `planId`, `transactionRef`, `amount`, `paymentProof` file)
- `GET /`: User's deposit history
- `GET /admin`: Admin view all deposits
- `PUT /admin/:id/approve`: Admin approves deposit -> credits wallet & activates plan
- `PUT /admin/:id/reject`: Admin rejects deposit with reason

### 6. Withdrawals (`/api/withdrawals`)
- `POST /`: User requests withdrawal -> immediate atomic debit from wallet
- `GET /`: User's withdrawal history
- `GET /admin`: Admin view all withdrawal requests
- `PUT /admin/:id/approve`: Admin marks withdrawal as approved
- `PUT /admin/:id/reject`: Admin rejects withdrawal and refunds balance back to wallet

### 7. Tasks & Earning (`/api/tasks`)
- `GET /`: User views active tasks with their submission status
- `POST /:id/submit`: User uploads screenshot proof (multipart/form-data: `proof` file)
- `GET /submissions`: User views their task submissions
- `GET /admin`: Admin lists all tasks
- `POST /admin`: Admin creates task (`title`, `description`, `rewardAmount`)
- `PUT /admin/:id`: Admin updates task
- `DELETE /admin/:id`: Admin deletes task
- `PATCH /admin/:id/toggle`: Admin toggles task active status
- `GET /admin/submissions`: Admin views all user task submissions
- `PUT /admin/submissions/:id/approve`: Admin approves task -> rewards user wallet
- `PUT /admin/submissions/:id/reject`: Admin rejects task with reason

### 8. Wallet & Ledger (`/api/wallet`)
- `GET /`: Get current user wallet balance and pending amounts
- `GET /transactions`: Get full immutable transaction history
- `POST /admin/adjust`: Admin manual credit/debit adjustment (`userId`, `amount`, `type`, `description`)

### 9. Notifications (`/api/notifications`)
- `GET /`: List user notifications
- `GET /unread-count`: Get unread count badge
- `PATCH /read-all`: Mark all notifications as read
- `PATCH /:id/read`: Mark single notification as read

### 10. App Settings & Contacts
- `GET /api/app/settings`: Public system settings (maintenance mode, force update, app version)
- `GET /api/payment-methods`: Public active QR code and bank account information
- `GET /api/contacts`: Public active support contacts (WhatsApp, Telegram, Help Desk)
- `GET /api/admin/settings`: Admin settings management
- `PUT /api/admin/settings/maintenance`: Admin updates maintenance status
- `PUT /api/admin/settings/update-control`: Admin updates app version and force-update
- `PUT /api/admin/settings/payment`: Admin updates QR code image and bank account details
- `POST /api/admin/contacts`: Admin creates contact
- `PUT /api/admin/contacts/:id`: Admin updates contact
- `DELETE /api/admin/contacts/:id`: Admin deletes contact

---

## 📁 Project Structure

```
gdpe_backend/
├── src/
│   ├── config/
│   │   └── db.js                 # MongoDB Atlas connection
│   ├── models/                   # 11 Mongoose Schemas
│   ├── middlewares/              # JWT Auth, Multer uploads, Error handler
│   ├── controllers/              # Business logic for all 10 modules
│   ├── routes/                   # Express routes
│   ├── utils/                    # Seeder & atomic wallet helper
│   ├── scripts/
│   │   └── smokeTest.js          # Automated end-to-end smoke test
│   ├── app.js                    # Express app configuration
│   └── server.js                 # Server entry point
├── uploads/                      # Uploaded payment proofs & task screenshots
├── .env                          # Environment variables
├── package.json
└── README.md
```
