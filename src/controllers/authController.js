const User = require('../models/User');
const Wallet = require('../models/Wallet');
const crypto = require('crypto');
const { sendOtpEmail, sendVerificationEmail } = require('../utils/sendEmail');

// Helper to resolve exclusive admin email, ignoring legacy admin@example.com
const getAdminEmail = () => {
  if (
    process.env.ADMIN_EMAIL &&
    process.env.ADMIN_EMAIL.trim().toLowerCase() !== 'admin@example.com'
  ) {
    return process.env.ADMIN_EMAIL.trim().toLowerCase();
  }
  return 'abhisheksingh03674@gmail.com';
};

// @desc    Register user
// @route   POST /api/auth/register or /auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { fullName, phoneNumber, email, password } = req.body;

    if (!fullName || !phoneNumber || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide fullName, phoneNumber, email, and password',
      });
    }

    // Check if user exists
    const userExists = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phoneNumber }],
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone number',
      });
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    // Create user
    const user = await User.create({
      fullName,
      phoneNumber,
      email: email.toLowerCase(),
      password,
      emailVerificationToken: verificationToken,
    });

    // Create user wallet
    const wallet = await Wallet.create({
      user: user._id,
      balance: 0,
    });

    // Send verification email asynchronously
    sendVerificationEmail(user.email, user.fullName, verificationToken).catch((err) =>
      console.error('[ZeptoMail] Error sending verification email:', err.message)
    );

    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        verificationToken,
        wallet: {
          balance: wallet.balance,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login or /auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+password'
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked',
      });
    }

    const adminEmail = getAdminEmail();

    // Enforce OTP-only login for administrator
    if (user.role === 'admin' || user.email.toLowerCase().trim() === adminEmail) {
      return res.status(403).json({
        success: false,
        message:
          'Admin login is strictly OTP-based. Password login is disabled for administrators. Please login using OTP.',
      });
    }

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send OTP
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOtp = async (req, res, next) => {
  try {
    const { email, isAdmin } = req.body;
    const adminEmail = getAdminEmail();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // If caller specifies admin access or endpoint is admin-specific, verify it matches the designated admin email
    if (isAdmin && cleanEmail !== adminEmail) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Only ${adminEmail} is authorized for administrator access.`,
      });
    }

    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address',
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save({ validateBeforeSave: false });

    // Send real email via ZeptoMail (or log to console if token not configured)
    await sendOtpEmail(cleanEmail, otp).catch((err) =>
      console.error('[ZeptoMail] Error sending OTP email:', err.message)
    );

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to email',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const adminEmail = getAdminEmail();

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and otp',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: cleanEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email',
      });
    }

    // Check OTP match
    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    if (user.otpExpires && user.otpExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired',
      });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    user.isEmailVerified = true;

    // Ensure authorized admin email receives admin role, others are user
    if (cleanEmail === adminEmail) {
      user.role = 'admin';
    } else if (user.role === 'admin') {
      user.role = 'user';
    }
    await user.save({ validateBeforeSave: false });

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      token,
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Send OTP (Strictly for designated admin email)
// @route   POST /api/admin/send-otp or /api/auth/admin/send-otp
// @access  Public
exports.adminSendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const adminEmail = getAdminEmail();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide administrator email',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (cleanEmail !== adminEmail) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Only ${adminEmail} is authorized for administrator access.`,
      });
    }

    let user = await User.findOne({ email: adminEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Administrator account not found in database',
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpires = otpExpires;
    user.role = 'admin';
    await user.save({ validateBeforeSave: false });

    // Send real email via ZeptoMail
    await sendOtpEmail(adminEmail, otp).catch((err) =>
      console.error('[ZeptoMail] Error sending Admin OTP email:', err.message)
    );

    res.status(200).json({
      success: true,
      message: `Admin verification OTP sent to ${adminEmail}`,
      otp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin Verify OTP & Login
// @route   POST /api/admin/verify-otp or /api/auth/admin/verify-otp
// @access  Public
exports.adminVerifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const adminEmail = getAdminEmail();

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide administrator email and OTP code',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (cleanEmail !== adminEmail) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Only ${adminEmail} is authorized for administrator access.`,
      });
    }

    const user = await User.findOne({ email: adminEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Administrator account not found',
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP code',
      });
    }

    if (user.otpExpires && user.otpExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP code has expired. Please request a new one.',
      });
    }

    // Clear OTP and ensure active admin
    user.otp = undefined;
    user.otpExpires = undefined;
    user.role = 'admin';
    user.isEmailVerified = true;
    user.isActive = true;
    user.isBlocked = false;
    await user.save({ validateBeforeSave: false });

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Admin authentication successful',
      token,
      data: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: 'admin',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Current User Profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('plan');
    const wallet = await Wallet.findOne({ user: req.user.id });

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role:
          user.email &&
          user.email.toLowerCase().trim() === getAdminEmail()
            ? 'admin'
            : user.role,
        isBlocked: user.isBlocked,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        plan: user.plan,
        wallet: wallet
          ? {
            balance: wallet.balance,
            pendingBalance: wallet.pendingBalance,
          }
          : { balance: 0, pendingBalance: 0 },
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Profile
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['fullName', 'phoneNumber'];
    const updateData = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Email via Token
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ emailVerificationToken: token });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    next(error);
  }
};
