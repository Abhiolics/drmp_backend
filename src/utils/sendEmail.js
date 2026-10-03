const nodemailer = require('nodemailer');

/**
 * Creates Nodemailer Transporter configured for ZeptoMail (Zoho)
 */
const createTransporter = () => {
  const host = process.env.ZEPTOMAIL_HOST || 'smtp.zeptomail.in';
  const port = Number(process.env.ZEPTOMAIL_PORT) || 587;
  const user = process.env.ZEPTOMAIL_USER || 'emailapikey';
  const pass = process.env.ZEPTOMAIL_TOKEN;

  // If no token is provided, return null to allow console logging fallback
  if (!pass || pass.includes('your_zeptomail_token')) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Send Email via ZeptoMail
 * @param {Object} options { to, subject, html, text }
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  const fromName = process.env.FROM_NAME || 'DreamPay';
  const fromEmail = process.env.FROM_EMAIL || 'noreply@dreampay.info';

  if (!transporter) {
    console.log('\n---------------- [EMAIL SIMULATION (ZeptoMail)] ----------------');
    console.log(`To: ${to}`);
    console.log(`From: "${fromName}" <${fromEmail}>`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${text || html}`);
    console.log('----------------------------------------------------------------\n');
    return { simulated: true };
  }

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text: text || html.replace(/<[^>]*>?/gm, ''),
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[ZeptoMail] Email sent successfully to ${to}: ${info.messageId}`);
  return info;
};

/**
 * Modern HTML Template for OTP Email
 */
const sendOtpEmail = async (email, otp) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Verification Code</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7fa; margin: 0; padding: 20px; }
      .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
      .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 20px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
      .body { padding: 32px 24px; color: #334155; }
      .body p { font-size: 15px; line-height: 1.6; margin: 0 0 20px 0; }
      .otp-box { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; text-align: center; padding: 20px; margin: 24px 0; }
      .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; margin: 0; }
      .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>DreamPay Verification</h1>
      </div>
      <div class="body">
        <p>Hello,</p>
        <p>We received a request to verify your account. Please use the One-Time Password (OTP) below to complete your verification:</p>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>
        <p style="font-size: 13px; color: #64748b;">This OTP is valid for <strong>10 minutes</strong>. If you did not request this verification, please ignore this email.</p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} DreamPay Platform. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;

  return sendEmail({
    to: email,
    subject: `Your DreamPay Verification Code: ${otp}`,
    html,
  });
};

/**
 * Modern HTML Template for Email Verification Link
 */
const sendVerificationEmail = async (email, fullName, token) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5003';
  const verifyUrl = `${baseUrl}/api/auth/verify-email/${token}`;

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7fa; margin: 0; padding: 20px; }
      .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
      .header { background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); padding: 32px 20px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
      .body { padding: 32px 24px; color: #334155; }
      .body p { font-size: 15px; line-height: 1.6; margin: 0 0 20px 0; }
      .btn-container { text-align: center; margin: 30px 0; }
      .btn { background: #2563eb; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block; }
      .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Welcome to DreamPay!</h1>
      </div>
      <div class="body">
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
        <div class="btn-container">
          <a href="${verifyUrl}" class="btn" target="_blank">Verify Email Address</a>
        </div>
        <p style="font-size: 12px; color: #64748b; word-break: break-all;">If the button above does not work, copy and paste this link into your browser:<br><a href="${verifyUrl}">${verifyUrl}</a></p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} DreamPay Platform. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Please Verify Your DreamPay Account Email',
    html,
  });
};

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendVerificationEmail,
};
