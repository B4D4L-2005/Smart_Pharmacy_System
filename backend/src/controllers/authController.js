import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { db } from '../services/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pharmacy-super-secret-key-12345';
const TOKEN_EXPIRY = '24h';

let emailTransporter = null;
const initEmailTransporter = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  if (emailUser && emailPass) {
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });
    console.log('[OTP] Email Transporter (Gmail) initialized successfully.');
  } else {
    console.log('[OTP Warning] EMAIL_USER and EMAIL_PASS environment variables are not configured. Email simulator active.');
  }
};
initEmailTransporter();

export async function signup(req, res) {
  try {
    const { email, password, username, shopName, shopPhone, shopAddress, gstin } = req.body;

    if (!email || !password || !username || !shopName) {
      return res.status(400).json({ message: 'Email, password, username, and shop name are required.' });
    }

    // Check if user already exists
    const existingUser = await db.users.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user with shop details
    const newUser = await db.users.insert({
      email: email.toLowerCase(),
      password: hashedPassword,
      username,
      shopDetails: {
        name: shopName,
        phone: shopPhone || '',
        address: shopAddress || '',
        gstin: gstin || ''
      }
    });

    // Generate token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, username: newUser.username },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({
      message: 'Store owner registered successfully.',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user.', error: error.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find user
    const user = await db.users.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    // Return user details
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      message: 'Login successful.',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: 'Error during login.', error: error.message });
  }
}

export async function getProfile(req, res) {
  try {
    const user = await db.users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving profile.', error: error.message });
  }
}

export async function updateProfile(req, res) {
  try {
    const { username, shopDetails } = req.body;
    const userId = req.user.id;

    const user = await db.users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const updatedData = {};
    if (username) updatedData.username = username;
    if (shopDetails) {
      updatedData.shopDetails = {
        ...user.shopDetails,
        ...shopDetails
      };
    }

    const updatedUser = await db.users.update(userId, updatedData);
    const { password, ...userWithoutPassword } = updatedUser;
    
    res.json({
      message: 'Profile updated successfully.',
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile.', error: error.message });
  }
}

let twilioClient = null;
const initTwilio = async () => {
  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  if (TWILIO_SID && TWILIO_AUTH_TOKEN) {
    try {
      const twilioModule = await import('twilio');
      const twilioInit = twilioModule.default || twilioModule;
      twilioClient = typeof twilioInit === 'function' ? twilioInit(TWILIO_SID, TWILIO_AUTH_TOKEN) : twilioInit;
      console.log('[OTP] Twilio SDK loaded and client initialized successfully.');
    } catch (err) {
      console.warn('[OTP WARNING] Twilio SDK failed to load dynamically:', err.message, err.stack);
    }
  }
};
initTwilio();

// Helper to compare last 10 digits of phone numbers to avoid variations in formatting
function phonesMatch(phone1, phone2) {
  if (!phone1 || !phone2) return false;
  const p1 = phone1.replace(/[^0-9]/g, '');
  const p2 = phone2.replace(/[^0-9]/g, '');
  if (p1.length >= 10 && p2.length >= 10) {
    return p1.slice(-10) === p2.slice(-10);
  }
  return p1 === p2;
}

// Normalize email key for activeOTPs map
function normalizeEmailKey(email) {
  return email ? email.trim().toLowerCase() : '';
}

const activeOTPs = new Map(); // emailKey -> { code, expires }

export async function sendOTP(req, res) {
  try {
    const { email, isSignup } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const emailKey = normalizeEmailKey(email);
    
    // Check if user exists in db by email
    const users = await db.users.raw();
    const existingUser = users.find(u => u.email && u.email.toLowerCase() === emailKey);

    if (isSignup && existingUser) {
      return res.status(400).json({ message: 'Email address already registered. Please sign in instead.' });
    }
    if (!isSignup && !existingUser) {
      return res.status(400).json({ message: 'Email address is not registered under any pharmacy store.' });
    }

    // Generate simulated/real 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes expiry for email

    activeOTPs.set(emailKey, { code: otpCode, expires });
    console.log(`[OTP Simulation] Generated verification code ${otpCode} for ${email} (Key: ${emailKey})`);

    let realEmailSent = false;
    let emailErrorMessage = '';
    const emailApiUrl = process.env.EMAIL_API_URL;
    const usingEmailApi = !!emailApiUrl;
    const usingRealEmail = !!emailTransporter || usingEmailApi;

    const emailSubject = 'RxSmart Verification Code';
    const emailText = `Your RxSmart pharmacy store verification code is ${otpCode}. Valid for 5 minutes.`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff; color: #333333;">
        <div style="text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 15px;">
          <h2 style="color: #6366f1; margin: 0;">RxSmart Pharmacy Shop</h2>
        </div>
        <div style="padding: 20px 0;">
          <p>Hello,</p>
          <p>You requested a verification code to access the RxSmart Pharmacy Management System.</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 10px 25px; border-radius: 6px; background-color: #f3f4f6; color: #111827; border: 1px dashed #d1d5db;">
              ${otpCode}
            </span>
          </div>
          <p style="color: #ef4444; font-weight: bold;">This code is valid for 5 minutes.</p>
          <p style="font-size: 13px; color: #6b7280; margin-top: 25px;">If you did not request this verification, please ignore this email.</p>
        </div>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
          &copy; 2026 RxSmart Pharmacy Management System. All rights reserved.
        </div>
      </div>
    `;

    if (usingEmailApi) {
      try {
        const response = await fetch(emailApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: email,
            subject: emailSubject,
            body: emailText,
            htmlBody: emailHtml
          })
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.status === 'success') {
            realEmailSent = true;
            console.log(`[OTP] Sent verification email via Google Apps Script API successfully to ${email}`);
          } else {
            emailErrorMessage = resData.message || 'Apps Script returned error status';
            console.error(`[OTP Error] Google Apps Script email dispatch failed:`, emailErrorMessage);
          }
        } else {
          emailErrorMessage = `HTTP status ${response.status}: ${response.statusText}`;
          console.error(`[OTP Error] Google Apps Script HTTP post failed:`, emailErrorMessage);
        }
      } catch (err) {
        emailErrorMessage = err.message;
        console.error(`[OTP Error] Google Apps Script API connection failed:`, err.message);
      }
    } else if (emailTransporter) {
      try {
        const mailOptions = {
          from: `"RxSmart Security" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: emailSubject,
          text: emailText,
          html: emailHtml
        };
        await emailTransporter.sendMail(mailOptions);
        realEmailSent = true;
        console.log(`[OTP] Sent verification email successfully to ${email}`);
      } catch (err) {
        emailErrorMessage = err.message;
        console.error(`[OTP Error] Email dispatch failed:`, err.message);
      }
    }

    if (usingRealEmail && !realEmailSent) {
      return res.status(500).json({
        message: `Failed to send email OTP to your address. Error details: ${emailErrorMessage || 'Unknown mail/API server response'}. Please verify your SMTP settings or EMAIL_API_URL in the Render Dashboard.`
      });
    }

    res.json({
      message: realEmailSent 
        ? `Verification code sent to ${email} successfully.` 
        : `OTP sent to ${email} (Simulated).`,
      isSimulated: !realEmailSent,
      otpCode: realEmailSent ? undefined : otpCode
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating OTP.', error: error.message });
  }
}

export async function verifyOTPLogin(req, res) {
  try {
    const { email, otpCode } = req.body;
    if (!email || !otpCode) {
      return res.status(400).json({ message: 'Email and OTP code are required.' });
    }

    const emailKey = normalizeEmailKey(email);
    const record = activeOTPs.get(emailKey);
    if (!record) {
      return res.status(400).json({ message: 'No OTP requested for this email address.' });
    }
    if (Date.now() > record.expires) {
      activeOTPs.delete(emailKey);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }
    if (record.code !== otpCode) {
      return res.status(400).json({ message: 'Invalid OTP code. Please try again.' });
    }

    // Clear OTP after successful verification
    activeOTPs.delete(emailKey);

    // Fetch user
    const users = await db.users.raw();
    const user = users.find(u => u.email && u.email.toLowerCase() === emailKey);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    const { password, ...userWithoutPassword } = user;
    res.json({
      message: 'OTP verification successful. Welcome!',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying login OTP.', error: error.message });
  }
}

export async function verifyOTPRegister(req, res) {
  try {
    const { email, otpCode, username, password, shopName, shopPhone, shopAddress, gstin } = req.body;
    if (!email || !otpCode || !username || !password || !shopName) {
      return res.status(400).json({ message: 'All registration parameters are required.' });
    }

    const emailKey = normalizeEmailKey(email);
    const record = activeOTPs.get(emailKey);
    if (!record) {
      return res.status(400).json({ message: 'No OTP requested for this email address.' });
    }
    if (Date.now() > record.expires) {
      activeOTPs.delete(emailKey);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }
    if (record.code !== otpCode) {
      return res.status(400).json({ message: 'Invalid OTP code. Please try again.' });
    }

    // Clear OTP
    activeOTPs.delete(emailKey);

    // Verify email is not registered
    const existingUser = await db.users.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await db.users.insert({
      email: email.toLowerCase(),
      password: hashedPassword,
      username,
      shopDetails: {
        name: shopName,
        phone: shopPhone || '',
        address: shopAddress || '',
        gstin: gstin || ''
      }
    });

    // Generate token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, username: newUser.username },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({
      message: 'Store registration with OTP verification completed successfully.',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying signup OTP.', error: error.message });
  }
}

export async function restoreUser(req, res) {
  try {
    const { email, password, username, shopName, shopPhone, shopAddress, gstin } = req.body;
    if (!email || !username || !shopName || !shopPhone) {
      return res.status(400).json({ message: 'Missing parameters for user restoration.' });
    }

    // Check if user already exists in db
    const users = await db.users.raw();
    const existingUser = users.find(u => (u.shopDetails?.phone && phonesMatch(u.shopDetails.phone, shopPhone)) || u.email === email.toLowerCase());
    if (existingUser) {
      return res.status(200).json({ message: 'User already exists, no restoration needed.', user: existingUser });
    }

    // Save user with shop details directly (password is already hashed in local backup)
    let hashedPassword = password;
    if (password && !password.startsWith('$2a$') && !password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const newUser = await db.users.insert({
      email: email.toLowerCase(),
      password: hashedPassword || '',
      username,
      shopDetails: {
        name: shopName,
        phone: shopPhone,
        address: shopAddress || '',
        gstin: gstin || ''
      }
    });

    console.log(`[Backup System] Restored user account for shop ${shopName} (${shopPhone})`);
    res.status(201).json({ message: 'User restored successfully.', user: newUser });
  } catch (error) {
    res.status(500).json({ message: 'Error restoring user.', error: error.message });
  }
}
