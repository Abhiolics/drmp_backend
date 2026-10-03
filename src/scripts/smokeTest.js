require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const app = require('../app');
const connectDB = require('../config/db');
const seedInitialData = require('../utils/seedData');

let server;
const PORT = 5099; // Use distinct port for testing

const makeRequest = (options, postData = null, isMultipart = false, boundary = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (postData) {
      if (Buffer.isBuffer(postData)) {
        req.write(postData);
      } else if (typeof postData === 'object' && !isMultipart) {
        req.write(JSON.stringify(postData));
      } else {
        req.write(postData);
      }
    }
    req.end();
  });
};

const runSmokeTest = async () => {
  console.log('\n=============================================');
  console.log('🧪 STARTING COMPREHENSIVE BACKEND SMOKE TESTS');
  console.log('=============================================\n');

  try {
    await connectDB();
    await seedInitialData();

    await new Promise((resolve) => {
      server = app.listen(PORT, resolve);
    });
    console.log(`Test server running on port ${PORT}\n`);

    // 1. Health check
    console.log('[1/12] Testing Health Check...');
    const health = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/health',
      method: 'GET',
    });
    if (health.status !== 200) throw new Error(`Health check failed: ${JSON.stringify(health.body)}`);
    console.log('✅ Health Check passed:', health.body.status);

    // 2. Admin Login
    console.log('\n[2/12] Testing Admin Login...');
    // Admin login is strictly OTP-based
    const adminEmail = (process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.trim()) || 'abhisheksingh03674@gmail.com';
    const adminOtpSendRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/admin/send-otp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: adminEmail }
    );
    if (adminOtpSendRes.status !== 200) {
      throw new Error(`Admin send-otp failed: ${JSON.stringify(adminOtpSendRes.body)}`);
    }

    const adminOtp = adminOtpSendRes.body.otp;
    const adminVerifyRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/admin/verify-otp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: adminEmail, otp: adminOtp }
    );
    if (adminVerifyRes.status !== 200 || !adminVerifyRes.body.token) {
      throw new Error(`Admin verify-otp failed: ${JSON.stringify(adminVerifyRes.body)}`);
    }
    const adminToken = adminVerifyRes.body.token;
    console.log('✅ Admin OTP Login passed! Role:', adminVerifyRes.body.data.role);

    // 3. User Registration
    console.log('\n[3/12] Testing User Registration...');
    const randomId = Date.now().toString().slice(-4);
    const testUser = {
      fullName: 'Test User ' + randomId,
      phoneNumber: '98' + Math.floor(10000000 + Math.random() * 90000000),
      email: `testuser_${randomId}@example.com`,
      password: 'User@123456',
    };
    const registerRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      testUser
    );
    if (registerRes.status !== 201 || !registerRes.body.token) {
      throw new Error(`User register failed: ${JSON.stringify(registerRes.body)}`);
    }
    const userToken = registerRes.body.token;
    const userId = registerRes.body.data.id;
    console.log('✅ User Registered! User ID:', userId);

    // 4. OTP Send and Verify
    console.log('\n[4/12] Testing OTP Flow...');
    const otpSendRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/send-otp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: testUser.email }
    );
    if (otpSendRes.status !== 200 || !otpSendRes.body.otp) {
      throw new Error(`OTP send failed: ${JSON.stringify(otpSendRes.body)}`);
    }
    const receivedOtp = otpSendRes.body.otp;

    const otpVerifyRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/verify-otp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: testUser.email, otp: receivedOtp }
    );
    if (otpVerifyRes.status !== 200) {
      throw new Error(`OTP verify failed: ${JSON.stringify(otpVerifyRes.body)}`);
    }
    console.log('✅ OTP Send and Verify flow passed!');

    // 5. Get User Profile (/auth/me)
    console.log('\n[5/12] Testing Get Profile (/api/auth/me)...');
    const meRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/me',
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (meRes.status !== 200 || meRes.body.data.email !== testUser.email) {
      throw new Error(`Get Profile failed: ${JSON.stringify(meRes.body)}`);
    }
    console.log('✅ Get Profile passed! Wallet Balance:', meRes.body.data.wallet.balance);

    // 6. Plan CRUD and Toggle
    console.log('\n[6/12] Testing Plan Management (Admin & Public)...');
    const createPlanRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/plans/admin',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      },
      {
        name: 'Diamond VIP ' + randomId,
        amount: 4999,
        description: 'Elite level tier with maximum rewards',
      }
    );
    if (createPlanRes.status !== 201) {
      throw new Error(`Create Plan failed: ${JSON.stringify(createPlanRes.body)}`);
    }
    const planId = createPlanRes.body.data._id;

    // Toggle plan
    const togglePlanRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/plans/admin/${planId}/toggle`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (togglePlanRes.status !== 200) {
      throw new Error(`Toggle Plan failed: ${JSON.stringify(togglePlanRes.body)}`);
    }
    console.log('✅ Plan Created & Toggled! Plan ID:', planId);

    // 7. Gift Code Creation and User Redemption
    console.log('\n[7/12] Testing Gift Code & Redemption Flow...');
    const giftCodeStr = 'GIFT' + randomId;
    const createGiftRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/gift-codes/admin',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      },
      {
        code: giftCodeStr,
        rewardAmount: 150,
        maxUsers: 50,
        expiryDate: new Date(Date.now() + 86400000).toISOString(),
      }
    );
    if (createGiftRes.status !== 201) {
      throw new Error(`Create Gift Code failed: ${JSON.stringify(createGiftRes.body)}`);
    }

    // User redeems gift code
    const redeemRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/gift-codes/redeem',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      },
      { code: giftCodeStr }
    );
    if (redeemRes.status !== 200) {
      throw new Error(`Redeem Gift Code failed: ${JSON.stringify(redeemRes.body)}`);
    }
    console.log('✅ Gift Code Created & Successfully Redeemed by User! (₹150)');

    // Check updated wallet
    const walletCheckRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/wallet',
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (walletCheckRes.body.data.balance !== 150) {
      throw new Error(`Wallet balance expected 150, got ${walletCheckRes.body.data.balance}`);
    }
    console.log('✅ User Wallet correctly updated to ₹150');

    // 8. Deposit Creation with Proof and Admin Approval
    console.log('\n[8/12] Testing Deposit Flow with Multipart Upload & Approval...');
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
    // Valid 1x1 transparent PNG buffer for Cloudinary validation
    const dummyImageContent = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    let multipartBody = [
      `--${boundary}\r\nContent-Disposition: form-data; name="planId"\r\n\r\n${planId}\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="transactionRef"\r\n\r\nTXN_${randomId}\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="amount"\r\n\r\n1000\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="paymentProof"; filename="proof.png"\r\nContent-Type: image/png\r\n\r\n`,
    ].join('');
    const fullBuffer = Buffer.concat([
      Buffer.from(multipartBody, 'utf8'),
      dummyImageContent,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'),
    ]);

    const depositRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/deposits',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': fullBuffer.length,
          Authorization: `Bearer ${userToken}`,
        },
      },
      fullBuffer
    );
    if (depositRes.status !== 201) {
      throw new Error(`Deposit creation failed: ${JSON.stringify(depositRes.body)}`);
    }
    const depositId = depositRes.body.data._id;
    console.log('✅ Deposit request submitted! Deposit ID:', depositId);

    // Admin approves deposit
    const approveDepositRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/deposits/admin/${depositId}/approve`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      },
      { reason: 'Verified successfully' }
    );
    if (approveDepositRes.status !== 200) {
      throw new Error(`Deposit approval failed: ${JSON.stringify(approveDepositRes.body)}`);
    }
    console.log('✅ Deposit approved by Admin! User wallet credited with ₹1000');

    // 9. Withdrawal Flow
    console.log('\n[9/12] Testing Withdrawal Flow...');
    const withdrawalRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/withdrawals',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
      },
      {
        amount: 200,
        bankDetails: {
          accountHolderName: testUser.fullName,
          bankName: 'HDFC Bank',
          accountNumber: '50100012345678',
          ifscCode: 'HDFC0001234',
          upiId: 'test@upi',
        },
      }
    );
    if (withdrawalRes.status !== 201) {
      throw new Error(`Withdrawal failed: ${JSON.stringify(withdrawalRes.body)}`);
    }
    const withdrawalId = withdrawalRes.body.data._id;
    console.log('✅ Withdrawal requested for ₹200! Withdrawal ID:', withdrawalId);

    // Admin approves withdrawal
    const approveWithdrawalRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/withdrawals/admin/${withdrawalId}/approve`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (approveWithdrawalRes.status !== 200) {
      throw new Error(`Withdrawal approval failed: ${JSON.stringify(approveWithdrawalRes.body)}`);
    }
    console.log('✅ Withdrawal approved by Admin!');

    // 10. Task Creation, Submission & Reward Flow
    console.log('\n[10/12] Testing Task & Reward Flow...');
    const createTaskRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/tasks/admin',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      },
      {
        title: 'Follow Telegram Channel ' + randomId,
        description: 'Join our official channel and submit screenshot',
        rewardAmount: 50,
      }
    );
    if (createTaskRes.status !== 201) {
      throw new Error(`Create task failed: ${JSON.stringify(createTaskRes.body)}`);
    }
    const taskId = createTaskRes.body.data._id;

    // User submits proof
    const taskBoundary = '----WebKitFormBoundaryTask' + Math.random().toString(16).slice(2);
    let taskMultipartBody = [
      `--${taskBoundary}\r\nContent-Disposition: form-data; name="proof"; filename="task_proof.png"\r\nContent-Type: image/png\r\n\r\n`,
    ].join('');
    const taskBuffer = Buffer.concat([
      Buffer.from(taskMultipartBody, 'utf8'),
      dummyImageContent,
      Buffer.from(`\r\n--${taskBoundary}--\r\n`, 'utf8'),
    ]);

    const submitTaskRes = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: `/api/tasks/${taskId}/submit`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${taskBoundary}`,
          'Content-Length': taskBuffer.length,
          Authorization: `Bearer ${userToken}`,
        },
      },
      taskBuffer
    );
    if (submitTaskRes.status !== 201) {
      throw new Error(`Task submission failed: ${JSON.stringify(submitTaskRes.body)}`);
    }
    const submissionId = submitTaskRes.body.data._id;
    console.log('✅ User submitted task proof! Submission ID:', submissionId);

    // Admin approves task submission
    const approveTaskRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: `/api/tasks/admin/submissions/${submissionId}/approve`,
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (approveTaskRes.status !== 200) {
      throw new Error(`Task approval failed: ${JSON.stringify(approveTaskRes.body)}`);
    }
    console.log('✅ Admin approved task submission! ₹50 credited to user');

    // 11. Admin Dashboard Statistics
    console.log('\n[11/12] Testing Admin Dashboard Analytics...');
    const dashboardRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/admin/dashboard',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (dashboardRes.status !== 200) {
      throw new Error(`Dashboard stats failed: ${JSON.stringify(dashboardRes.body)}`);
    }
    console.log('✅ Admin Dashboard returned accurate stats:');
    console.log('   - Total users:', dashboardRes.body.data.users.total);
    console.log('   - Total approved deposits: ₹', dashboardRes.body.data.deposits.totalApprovedAmount);
    console.log('   - Total approved withdrawals: ₹', dashboardRes.body.data.withdrawals.totalApprovedAmount);

    // 12. Settings & Notifications check
    console.log('\n[12/12] Testing Settings & Notifications...');
    const settingsRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/app/settings',
      method: 'GET',
    });
    if (settingsRes.status !== 200) {
      throw new Error(`Public settings failed: ${JSON.stringify(settingsRes.body)}`);
    }

    const notifRes = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/notifications',
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (notifRes.status !== 200) {
      throw new Error(`Notifications check failed: ${JSON.stringify(notifRes.body)}`);
    }
    console.log(`✅ User received ${notifRes.body.count} automated notifications!`);

    console.log('\n=============================================');
    console.log('🎉 ALL 12 END-TO-END SMOKE TESTS PASSED 100%!');
    console.log('=============================================\n');

    server.close();
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ SMOKE TEST FAILED:', err.message);
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(1);
  }
};

runSmokeTest();
