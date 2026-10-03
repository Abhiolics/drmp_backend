const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, token missing',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists',
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked. Please contact support.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact support.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, invalid token',
    });
  }
};

const getAdminEmail = () => {
  if (
    process.env.ADMIN_EMAIL &&
    process.env.ADMIN_EMAIL.trim().toLowerCase() !== 'admin@example.com'
  ) {
    return process.env.ADMIN_EMAIL.trim().toLowerCase();
  }
  return 'abhisheksingh03674@gmail.com';
};

// Grant access to specific roles (strictly restricted to the designated admin email)
exports.isAdmin = (req, res, next) => {
  const allowedAdminEmail = getAdminEmail();

  if (
    req.user &&
    req.user.email &&
    req.user.email.toLowerCase().trim() === allowedAdminEmail
  ) {
    req.user.role = 'admin';
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied: Admin privileges required for this account',
  });
};
