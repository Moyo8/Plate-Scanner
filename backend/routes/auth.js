const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendMail } = require('../mailTrap/mailTrapConfig');
const { JWT_SECRET } = require('../middleware/auth');
require('dotenv').config();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Signup - create user, send verification email
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const existing = await User.findOne({ email });
  if (existing) return res.json({ message: 'User already exists', exists: true });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed });
    const token = user.generateVerifyToken();
    await user.save();

    const verifyLink = `${CLIENT_URL}/api/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;
    const to = [{ email }];
    try {
      await sendMail({ to, subject: 'Verify your account', text: `Verify: ${verifyLink}`, html: `<p>Click <a href="${verifyLink}">here</a> to verify</p>` });
      return res.json({ message: 'User created, verification email sent' });
    } catch (mailErr) {
      console.error('Verification email failed to send:', mailErr && (mailErr.stack || mailErr));
      // Don't delete the user automatically; return success but indicate email failure so client can show proper message
      return res.json({ message: 'User created, but verification email failed to send', emailError: true });
    }
  } catch (err) {
    console.error('Signup error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Verify email
router.get('/verify', async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) return res.status(400).json({ error: 'Invalid verify link' });

    const user = await User.findOne({ email, verifyToken: token });
    if (!user) return res.status(400).json({ error: 'Invalid token or email' });

    user.isVerified = true;
    user.verifyToken = undefined;
    await user.save();

    res.json({ message: 'Email verified' });
  } catch (err) {
    console.error('Verify error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Login - return JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const accessToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // store refresh token on user
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push({ token: refreshToken, expires: new Date(Date.now() + 7*24*3600*1000) });
    await user.save();

    // set HttpOnly cookie for refresh token
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, sameSite: 'Lax', maxAge: 7*24*3600*1000 });

    res.json({ token: accessToken, user: { id: user._id, email: user.email, name: user.name, isVerified: user.isVerified } });
  } catch (err) {
    console.error('Login error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout - frontend should discard token; include endpoint for parity
router.post('/logout', (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    // remove refresh token from any user
    User.updateMany({}, { $pull: { refreshTokens: { token: refreshToken } } }).exec();
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});

// refresh endpoint - exchange refresh cookie for new access token
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'Invalid refresh token' });

    const found = user.refreshTokens?.find(r => r.token === refreshToken);
    if (!found || new Date(found.expires) < new Date()) {
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    const accessToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '15m' });
    res.json({ token: accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Forgot password - generate reset token and email link
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ message: 'If user exists, reset email sent' });

    const token = user.generateResetToken();
    await user.save();

    const resetLink = `${CLIENT_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    const to = [{ email }];
    // Try sending mail; sendMail will return { skipped: true } when MAILTRAP_TOKEN is missing
    let mailResult = null;
    try {
      mailResult = await sendMail({ to, subject: 'Reset your password', text: `Reset: ${resetLink}`, html: `<p>Reset your password <a href="${resetLink}">here</a></p>` });
    } catch (mailErr) {
      console.error('Forgot password - sendMail error:', mailErr && (mailErr.stack || mailErr));
      // proceed — we don't want to leak existence; but allow dev helper below
    }

    // Build a safe response: always return the same top-level message, but
    // in development or when mail was skipped include the reset link for testing.
    const response = { message: 'If user exists, reset email sent' };
    const isDev = (process.env.NODE_ENV || 'development') !== 'production';
    const mailSkipped = mailResult && mailResult.skipped;
    if (isDev || mailSkipped) {
      // Include reset link only in non-production or when mail wasn't sent
      response.resetLink = resetLink;
      if (mailSkipped) response.emailSkipped = true;
    }

    // Also log link server-side for convenience
    if (isDev || mailSkipped) console.log('Password reset link (dev):', resetLink);

    res.json(response);
  } catch (err) {
    console.error('Forgot password error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Forgot password failed' });
  }
});

// Request a 6-digit reset code (SMS-like flow)
router.post('/forgot-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ message: 'If user exists, reset code sent' });

    const code = user.generateResetCode(15); // 15 minutes
    await user.save();

    const to = [{ email }];
    const text = `Your password reset code: ${code}`;
    const html = `<p>Your password reset code: <strong>${code}</strong></p>`;
    let mailResult = null;
    try {
      mailResult = await sendMail({ to, subject: 'Your password reset code', text, html });
    } catch (mailErr) {
      console.error('Forgot-code sendMail error:', mailErr && (mailErr.stack || mailErr));
    }

    const response = { message: 'If user exists, reset code sent' };
    const isDev = (process.env.NODE_ENV || 'development') !== 'production';
    const mailSkipped = mailResult && mailResult.skipped;
    if (isDev || mailSkipped) {
      response.resetCode = code;
      if (mailSkipped) response.emailSkipped = true;
    }
    if (isDev || mailSkipped) console.log('Reset code (dev):', code, 'for', email);

    res.json(response);
  } catch (err) {
    console.error('Forgot-code error:', err && (err.stack || err));
    res.status(500).json({ error: 'Failed to request reset code' });
  }
});

// Verify a submitted reset code
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid code or email' });

    if (!user.resetCode || !user.resetCodeExpiry) return res.status(400).json({ error: 'No code issued' });
    if (new Date(user.resetCodeExpiry) < new Date()) return res.status(400).json({ error: 'Code expired' });
    if (user.resetCode !== code) return res.status(400).json({ error: 'Invalid code' });

    // consume code and issue a one-time reset token (long random token)
    const token = user.generateResetToken();
    // clear numeric code
    user.resetCode = undefined;
    user.resetCodeExpiry = undefined;
    await user.save();

    res.json({ message: 'Code verified', resetToken: token });
  } catch (err) {
    console.error('Verify-code error:', err && (err.stack || err));
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Reset password using a code-issued reset token
router.post('/reset-with-token', async (req, res) => {
  try {
    const { email, token, password } = req.body;
    if (!email || !token || !password) return res.status(400).json({ error: 'Invalid request' });

    const user = await User.findOne({ email, resetToken: token, resetTokenExpiry: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset-with-token error:', err && (err.stack || err));
    res.status(500).json({ error: 'Reset failed' });
  }
});

// Reset password - verify token and set new password
router.post('/reset', async (req, res) => {
  try {
    const { email, token, password } = req.body;
    if (!email || !token || !password) return res.status(400).json({ error: 'Invalid request' });

    const user = await User.findOne({ email, resetToken: token, resetTokenExpiry: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Reset failed' });
  }
});

// Check auth - protected endpoint to verify token
const { authMiddleware } = require('../middleware/auth');
router.get('/check', authMiddleware, async (req, res) => {
  const user = await User.findById(req.userId).select('-password -verifyToken -resetToken');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

module.exports = router;
