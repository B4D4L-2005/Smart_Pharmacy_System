import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../services/db.js';
import { sendEmail } from '../services/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pharmacy-super-secret-key-12345';
const TOKEN_EXPIRY = '24h';


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

    const emailSubject = '🔐 RxSmart Verification OTP Code';
    const emailText = `Your RxSmart verification code is: ${otpCode}. This code is valid for 5 minutes. Do not share this OTP with anyone.`;
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 20px auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 24px;">
          <div style="display: inline-block; background-color: #e0f2fe; padding: 12px; border-radius: 12px; margin-bottom: 12px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: 0 auto;"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
          </div>
          <h2 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">RxSmart Security</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-weight: 500;">Pharmacy Management System</p>
        </div>
        <div>
          <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">Hello Store Owner,</p>
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">A request was made to verify your identity. Please use the following 6-digit One-Time Password (OTP) to log in or register your pharmacy store:</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; padding: 16px 36px; border-radius: 12px; background-color: #f8fafc; color: #0284c7; border: 1.5px dashed #cbd5e1; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
              ${otpCode}
            </div>
            <p style="font-size: 12px; color: #ef4444; font-weight: 700; margin-top: 12px; margin-bottom: 0;">⚠️ Valid for 5 minutes only</p>
          </div>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; border-radius: 0 12px 12px 0; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 12.5px; line-height: 1.5; color: #475569; font-weight: 500;">
              <strong>Security Notice:</strong> Never share this verification code with anyone, including RxSmart employees. If you did not initiate this request, you can safely ignore this email.
            </p>
          </div>
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8; font-weight: 500;">
          <p style="margin: 0 0 4px 0;">This is an automated security message from your pharmacy system.</p>
          <p style="margin: 0;">&copy; 2026 RxSmart Pharmacy Inc. All rights reserved.</p>
        </div>
      </div>
    `;

    const emailResult = await sendEmail({
      to: email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    });

    res.json({
      message: emailResult.isSimulated 
        ? `OTP sent to ${email} (Simulated).`
        : `Verification code sent to ${email} successfully.`,
      isSimulated: emailResult.isSimulated,
      otpCode: emailResult.isSimulated ? otpCode : undefined
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
    if (!email || !otpCode || !username || !shopName) {
      return res.status(400).json({ message: 'Email, OTP code, username, and shop name are required.' });
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
    const hashedPassword = await bcrypt.hash(password || 'otp-secured-account-default', salt);

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
    const { email, password, username, shopName, shopPhone, shopAddress, gstin, dbBackup } = req.body;
    if (!email || !username || !shopName || !shopPhone) {
      return res.status(400).json({ message: 'Missing parameters for user restoration.' });
    }

    // 1. If full database backup is provided, import it
    if (dbBackup) {
      console.log('[Backup System] Restoring entire database from client backup...');
      await db.importData(dbBackup);
    } else {
      // 2. Otherwise, check if user exists, and if not, restore just this user
      const users = await db.users.raw();
      const existingUser = users.find(u => (u.shopDetails?.phone && phonesMatch(u.shopDetails.phone, shopPhone)) || u.email === email.toLowerCase());
      
      if (!existingUser) {
        let hashedPassword = password;
        if (password && !password.startsWith('$2a$') && !password.startsWith('$2b$')) {
          const salt = await bcrypt.genSalt(10);
          hashedPassword = await bcrypt.hash(password, salt);
        }

        await db.users.insert({
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
      }
    }

    // Fetch the restored user to send back
    const users = await db.users.raw();
    const restoredUser = users.find(u => u.email === email.toLowerCase());

    console.log(`[Backup System] Restored user account for shop ${shopName} (${shopPhone})`);
    res.status(201).json({ message: 'User restored successfully.', user: restoredUser });
  } catch (error) {
    res.status(500).json({ message: 'Error restoring user.', error: error.message });
  }
}

export async function exportDatabase(req, res) {
  try {
    const dump = await db.exportData();
    res.json(dump);
  } catch (error) {
    res.status(500).json({ message: 'Error exporting database.', error: error.message });
  }
}

export async function importDatabase(req, res) {
  try {
    const { dump } = req.body;
    if (!dump) {
      return res.status(400).json({ message: 'Database dump is required.' });
    }
    await db.importData(dump);
    res.json({ message: 'Database imported successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error importing database.', error: error.message });
  }
}
