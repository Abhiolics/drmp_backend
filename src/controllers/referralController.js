const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Deposit = require('../models/Deposit');
const { generateUniqueReferralCode } = require('../utils/referralHelper');

// Helper to determine base URL for referral link
const getBaseUrl = (req) => {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host');
  return `${protocol}://${host}`;
};

// @desc    Get referral statistics and team dashboard
// @route   GET /api/referral/stats or /referral/stats
// @access  Private
exports.getReferralStats = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;

    // 1. Fetch current user and ensure referralCode exists
    let user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.referralCode) {
      user.referralCode = await generateUniqueReferralCode('DRM');
      await user.save({ validateBeforeSave: false });
    }

    const referralCode = user.referralCode;
    const referralLink = `${getBaseUrl(req)}/ref/${referralCode}`;

    // 2. Calculate Commission Earnings from completed referral_bonus transactions
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

    const referralTransactions = await Transaction.find({
      user: currentUserId,
      category: 'referral_bonus',
      status: 'completed',
    }).sort({ createdAt: -1 });

    let totalCommission = 0;
    let todayCommission = 0;
    let yesterdayCommission = 0;

    for (const tx of referralTransactions) {
      const amt = Number(tx.amount) || 0;
      totalCommission += amt;

      const txDate = new Date(tx.createdAt);
      if (txDate >= startOfToday) {
        todayCommission += amt;
      } else if (txDate >= startOfYesterday && txDate <= endOfYesterday) {
        yesterdayCommission += amt;
      }
    }

    // 3. Query Level 1 & Level 2 Team Members
    const level1Users = await User.find({ referredBy: currentUserId })
      .select('fullName email phoneNumber createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const level2Users = await User.find({ referredByL2: currentUserId })
      .select('fullName email phoneNumber createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const level1Count = level1Users.length;
    const level2Count = level2Users.length;
    const totalMembers = level1Count + level2Count;

    // 4. Aggregate approved deposits made by all team members
    const allMemberIds = [
      ...level1Users.map((u) => u._id),
      ...level2Users.map((u) => u._id),
    ];

    const depositStats = await Deposit.aggregate([
      {
        $match: {
          user: { $in: allMemberIds },
          status: 'approved',
        },
      },
      {
        $group: {
          _id: '$user',
          totalDeposit: { $sum: '$amount' },
        },
      },
    ]);

    const depositMap = {};
    depositStats.forEach((stat) => {
      depositMap[stat._id.toString()] = Number(stat.totalDeposit) || 0;
    });

    let level1TeamDeposit = 0;
    let level2TeamDeposit = 0;

    const teamMembers = [];

    // Map Level 1 members
    for (const member of level1Users) {
      const dep = Number((depositMap[member._id.toString()] || 0).toFixed(2));
      level1TeamDeposit += dep;
      teamMembers.push({
        id: member._id,
        name: member.fullName,
        email: member.email,
        phone: member.phoneNumber,
        level: 1,
        totalDeposit: dep,
        registrationDate: member.createdAt,
      });
    }

    // Map Level 2 members
    for (const member of level2Users) {
      const dep = Number((depositMap[member._id.toString()] || 0).toFixed(2));
      level2TeamDeposit += dep;
      teamMembers.push({
        id: member._id,
        name: member.fullName,
        email: member.email,
        phone: member.phoneNumber,
        level: 2,
        totalDeposit: dep,
        registrationDate: member.createdAt,
      });
    }

    level1TeamDeposit = Number(level1TeamDeposit.toFixed(2));
    level2TeamDeposit = Number(level2TeamDeposit.toFixed(2));
    const totalTeamDeposit = Number((level1TeamDeposit + level2TeamDeposit).toFixed(2));

    // Response structure
    res.status(200).json({
      success: true,
      data: {
        referralCode,
        referralLink,
        totalCommission: Number(totalCommission.toFixed(2)),
        todayCommission: Number(todayCommission.toFixed(2)),
        yesterdayCommission: Number(yesterdayCommission.toFixed(2)),
        totalMembers,
        level1Count,
        level2Count,
        totalTeamDeposit,
        level1TeamDeposit,
        level2TeamDeposit,
        teamMembers,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Public Referral Landing Page
// @route   GET /ref/:code or /api/ref/:code
// @access  Public
exports.getReferralLandingPage = async (req, res, next) => {
  try {
    const rawCode = (req.params.code || '').trim().toUpperCase();
    const inviter = await User.findOne({ referralCode: rawCode }).select('fullName email phoneNumber referralCode');

    // If client requested JSON via query param or Accept header
    const wantsJson =
      req.query.json === 'true' ||
      (req.headers.accept && req.headers.accept.includes('application/json'));

    if (wantsJson) {
      if (!inviter) {
        return res.status(404).json({
          success: false,
          message: 'Referral code not found',
        });
      }
      return res.status(200).json({
        success: true,
        data: {
          inviterName: inviter.fullName,
          referralCode: inviter.referralCode,
        },
      });
    }

    // Render HTML Landing Page
    const html = renderLandingPageHtml({
      inviter,
      code: rawCode,
    });

    res.setHeader('Content-Type', 'text/html');
    return res.status(inviter ? 200 : 404).send(html);
  } catch (error) {
    next(error);
  }
};

/**
 * Generate ultra-modern, responsive HTML landing page
 */
function renderLandingPageHtml({ inviter, code }) {
  const inviterName = inviter ? inviter.fullName : 'Special Invitation';
  const isValid = !!inviter;
  const initial = inviterName ? inviterName.charAt(0).toUpperCase() : 'D';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join DreamPay - Invited by ${inviterName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --accent: #10b981;
      --accent-glow: rgba(16, 185, 129, 0.25);
      --bg: #090d16;
      --card-bg: rgba(17, 24, 39, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --input-bg: rgba(15, 23, 42, 0.65);
      --input-border: rgba(255, 255, 255, 0.12);
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      background-image:
        radial-gradient(at 15% 15%, rgba(99, 102, 241, 0.18) 0px, transparent 55%),
        radial-gradient(at 85% 25%, rgba(16, 185, 129, 0.15) 0px, transparent 55%),
        radial-gradient(at 50% 85%, rgba(139, 92, 246, 0.12) 0px, transparent 60%);
      background-attachment: fixed;
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      line-height: 1.5;
    }

    .container {
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
    }

    .logo-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 24px;
    }

    .logo-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: linear-gradient(135deg, #6366f1, #10b981);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Outfit', sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: #fff;
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
    }

    .logo-title {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ffffff, #cbd5e1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .inviter-banner {
      background: var(--card-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      position: relative;
      overflow: hidden;
    }

    .inviter-banner::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, #6366f1, #10b981);
    }

    .avatar-circle {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      background: linear-gradient(135deg, #4f46e5, #06b6d4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      flex-shrink: 0;
      border: 2px solid rgba(255, 255, 255, 0.15);
    }

    .inviter-info {
      flex: 1;
      min-width: 0;
    }

    .invited-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-weight: 600;
    }

    .inviter-name {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .perks-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 20px;
    }

    .perk-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .perk-tag {
      font-size: 11px;
      font-weight: 700;
      color: #818cf8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .perk-val {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
    }

    .perk-sub {
      font-size: 11px;
      color: var(--text-muted);
    }

    .form-card {
      background: var(--card-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--card-border);
      border-radius: 24px;
      padding: 28px 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }

    .form-header {
      margin-bottom: 22px;
      text-align: center;
    }

    .form-header h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
    }

    .form-header p {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .form-group {
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: #cbd5e1;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .form-input {
      width: 100%;
      height: 48px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 12px;
      padding: 0 16px;
      font-size: 14px;
      color: #ffffff;
      outline: none;
      transition: all 0.2s ease;
      font-family: inherit;
    }

    .form-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
      background: rgba(15, 23, 42, 0.9);
    }

    .form-input.code-input {
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.3);
      font-family: monospace;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #34d399;
      padding-right: 90px;
    }

    .code-badge {
      position: absolute;
      right: 12px;
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      pointer-events: none;
    }

    .btn-submit {
      width: 100%;
      height: 50px;
      margin-top: 8px;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      border: none;
      border-radius: 12px;
      color: #ffffff;
      font-size: 15px;
      font-weight: 700;
      font-family: 'Outfit', sans-serif;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 10px 24px rgba(99, 102, 241, 0.35);
      transition: all 0.2s ease;
    }

    .btn-submit:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 14px 28px rgba(99, 102, 241, 0.45);
    }

    .btn-submit:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .alert {
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 13px;
      margin-bottom: 16px;
      display: none;
      animation: fadeIn 0.3s ease;
    }

    .alert-error {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }

    .alert-success {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    .app-download-section {
      margin-top: 24px;
      text-align: center;
    }

    .btn-download {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      height: 48px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      color: #ffffff;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .btn-download:hover {
      background: rgba(255, 255, 255, 0.09);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .footer {
      margin-top: 28px;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #ffffff;
      animation: spin 0.8s linear infinite;
      display: none;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .success-card {
      display: none;
      text-align: center;
      padding: 16px 0;
      animation: fadeIn 0.4s ease;
    }

    .success-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.15);
      border: 2px solid #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      color: #10b981;
      font-size: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-badge">
      <div class="logo-icon">D</div>
      <div class="logo-title">DreamPay</div>
    </div>

    <!-- Inviter Banner -->
    <div class="inviter-banner">
      <div class="avatar-circle">${initial}</div>
      <div class="inviter-info">
        <div class="invited-label">
          <span>Invited By</span>
          ${isValid ? '<span class="badge-pill">✓ Verified</span>' : '<span class="badge-pill" style="color:#f87171;border-color:#f87171;">Invalid Code</span>'}
        </div>
        <div class="inviter-name">${inviterName}</div>
      </div>
    </div>

    <!-- Commission Highlights -->
    <div class="perks-grid">
      <div class="perk-card">
        <span class="perk-tag">Level 1 Commission</span>
        <span class="perk-val">2.0% Direct</span>
        <span class="perk-sub">On every team deposit</span>
      </div>
      <div class="perk-card">
        <span class="perk-tag">Level 2 Commission</span>
        <span class="perk-val">1.0% Indirect</span>
        <span class="perk-sub">On sub-team deposits</span>
      </div>
    </div>

    <!-- Web Registration Card -->
    <div class="form-card">
      <div id="formSection">
        <div class="form-header">
          <h1>Create Your Account</h1>
          <p>Register with referral code <strong>${code}</strong></p>
        </div>

        <div id="alertBox" class="alert"></div>

        <form id="registerForm">
          <div class="form-group">
            <label class="form-label" for="fullName">Full Name</label>
            <div class="input-wrapper">
              <input class="form-input" type="text" id="fullName" name="fullName" placeholder="e.g. Rahul Sharma" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="phoneNumber">Phone Number</label>
            <div class="input-wrapper">
              <input class="form-input" type="tel" id="phoneNumber" name="phoneNumber" placeholder="e.g. 9876543210" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="email">Email Address</label>
            <div class="input-wrapper">
              <input class="form-input" type="email" id="email" name="email" placeholder="e.g. rahul@example.com" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <div class="input-wrapper">
              <input class="form-input" type="password" id="password" name="password" placeholder="At least 6 characters" minlength="6" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="referralCode">Referral Code</label>
            <div class="input-wrapper">
              <input class="form-input code-input" type="text" id="referralCode" name="referralCode" value="${code}" readonly />
              <span class="code-badge">Applied</span>
            </div>
          </div>

          <button type="submit" id="submitBtn" class="btn-submit">
            <span class="spinner" id="btnSpinner"></span>
            <span id="btnText">Create Account & Join Team</span>
          </button>
        </form>
      </div>

      <!-- Registration Success State -->
      <div id="successCard" class="success-card">
        <div class="success-icon">✓</div>
        <h2 style="font-family:'Outfit';font-size:22px;margin-bottom:8px;color:#fff;">Welcome to the Team!</h2>
        <p style="font-size:14px;color:var(--text-muted);margin-bottom:20px;">
          Your DreamPay account has been registered successfully with inviter <strong>${inviterName}</strong>.
        </p>
        <div style="background:rgba(255,255,255,0.05);padding:14px;border-radius:12px;margin-bottom:20px;text-align:left;">
          <div style="font-size:12px;color:var(--text-muted);">Your Referral Code:</div>
          <div id="newUserCode" style="font-size:18px;font-weight:700;color:#34d399;font-family:monospace;margin-top:2px;"></div>
        </div>
        <a href="/" class="btn-submit" style="text-decoration:none;display:flex;">Go to Dashboard</a>
      </div>
    </div>

    <!-- App Download Section -->
    <div class="app-download-section">
      <a href="https://play.google.com" target="_blank" rel="noopener noreferrer" class="btn-download">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3.609 1.814L13.792 12 3.61 22.186a2.404 2.404 0 0 1-.61-.715V2.53c0-.265.07-.514.2-.716zm11.237 11.24l2.58 2.58-12.03 6.946 9.45-9.526zm2.58-2.58l-2.58 2.58-9.45-9.526 12.03 6.946zm1.093 1.094l2.96 1.71c.88.508.88 1.34 0 1.848l-2.96 1.71-2.457-2.634 2.457-2.634z"/>
        </svg>
        <span>Download DreamPay Android App</span>
      </a>
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} DreamPay Network. 2-Level Multi-Tier Referral System.
    </div>
  </div>

  <script>
    const form = document.getElementById('registerForm');
    const submitBtn = document.getElementById('submitBtn');
    const btnSpinner = document.getElementById('btnSpinner');
    const btnText = document.getElementById('btnText');
    const alertBox = document.getElementById('alertBox');
    const formSection = document.getElementById('formSection');
    const successCard = document.getElementById('successCard');
    const newUserCode = document.getElementById('newUserCode');

    const showAlert = (message, isError = true) => {
      alertBox.textContent = message;
      alertBox.className = 'alert ' + (isError ? 'alert-error' : 'alert-success');
      alertBox.style.display = 'block';
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.style.display = 'none';

      const fullName = document.getElementById('fullName').value.trim();
      const phoneNumber = document.getElementById('phoneNumber').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const referralCode = document.getElementById('referralCode').value.trim();

      if (!fullName || !phoneNumber || !email || !password) {
        return showAlert('Please fill out all required fields.');
      }

      // UI loading state
      submitBtn.disabled = true;
      btnSpinner.style.display = 'inline-block';
      btnText.textContent = 'Creating Account...';

      try {
        // Attempt POST to /api/auth/register or fallback /auth/register
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            fullName,
            phoneNumber,
            email,
            password,
            referralCode,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          if (data.token) {
            try { localStorage.setItem('token', data.token); } catch(_) {}
          }
          formSection.style.display = 'none';
          newUserCode.textContent = data.data && data.data.referralCode ? data.data.referralCode : referralCode;
          successCard.style.display = 'block';
        } else {
          showAlert(data.message || 'Registration failed. Please try again.');
        }
      } catch (err) {
        showAlert('Network error. Please check your connection and try again.');
      } finally {
        submitBtn.disabled = false;
        btnSpinner.style.display = 'none';
        btnText.textContent = 'Create Account & Join Team';
      }
    });
  </script>
</body>
</html>`;
}
