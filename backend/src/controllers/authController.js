import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../services/db.js';

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
      twilioClient = twilioModule.default(TWILIO_SID, TWILIO_AUTH_TOKEN);
      console.log('[OTP] Twilio SDK loaded and client initialized successfully.');
    } catch (err) {
      console.warn('[OTP WARNING] Twilio SDK failed to load dynamically:', err.message);
    }
  }
};
initTwilio();

const activeOTPs = new Map(); // phone -> { code, expires }

export async function sendOTP(req, res) {
  try {
    const { phoneNumber, isSignup } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ message: 'Phone number is required.' });
    }

    const users = await db.users.raw();
    const existingUser = users.find(u => u.shopDetails?.phone === phoneNumber);

    if (isSignup && existingUser) {
      return res.status(400).json({ message: 'Phone number already registered. Please sign in instead.' });
    }
    if (!isSignup && !existingUser) {
      return res.status(400).json({ message: 'Phone number is not registered under any pharmacy store.' });
    }

    // Generate simulated 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 2 * 60 * 1000; // 2 minutes expiry

    activeOTPs.set(phoneNumber, { code: otpCode, expires });
    console.log(`[OTP Simulation] Sent verification code ${otpCode} to ${phoneNumber}`);

    // Choose active SMS provider and send SMS automatically
    let realSMSSent = false;
    let providerName = '';
    const textMessage = `Your RxSmart Pharmacy Shop verification code is ${otpCode}. Valid for 2 minutes.`;

    // 1. Fast2SMS Integration (India)
    if (process.env.FAST2SMS_API_KEY) {
      providerName = 'Fast2SMS';
      try {
        const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
          method: 'POST',
          headers: {
            'authorization': process.env.FAST2SMS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            route: 'q',
            message: textMessage,
            language: 'english',
            flash: 0,
            numbers: phoneNumber.replace(/[^0-9]/g, '')
          })
        });
        const data = await response.json();
        if (data.return) {
          realSMSSent = true;
          console.log(`[OTP] Sent via Fast2SMS successfully to ${phoneNumber}`);
        } else {
          console.error(`[OTP Error] Fast2SMS returned error:`, data.message || data);
        }
      } catch (err) {
        console.error(`[OTP Error] Fast2SMS dispatch failed:`, err.message);
      }
    }

    // 2. Twilio Integration
    if (!realSMSSent && twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      providerName = 'Twilio';
      try {
        await twilioClient.messages.create({
          body: textMessage,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber
        });
        realSMSSent = true;
        console.log(`[OTP] Sent via Twilio successfully to ${phoneNumber}`);
      } catch (smsError) {
        console.error('[OTP Error] Twilio SMS dispatch failed:', smsError.message);
      }
    }

    // 3. Vonage Integration
    if (!realSMSSent && process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET) {
      providerName = 'Vonage';
      try {
        const response = await fetch("https://rest.nexmo.com/sms/json", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: process.env.VONAGE_API_KEY,
            api_secret: process.env.VONAGE_API_SECRET,
            to: phoneNumber.replace(/[^0-9]/g, ''),
            from: process.env.VONAGE_FROM_NUMBER || 'RxSmart',
            text: textMessage
          })
        });
        const data = await response.json();
        if (data.messages && data.messages[0] && data.messages[0].status === '0') {
          realSMSSent = true;
          console.log(`[OTP] Sent via Vonage successfully to ${phoneNumber}`);
        } else {
          console.error(`[OTP Error] Vonage returned error:`, data.messages?.[0]?.['error-text'] || data);
        }
      } catch (err) {
        console.error(`[OTP Error] Vonage dispatch failed:`, err.message);
      }
    }

    // 4. TextBelt Integration (1 free per day)
    if (!realSMSSent && process.env.TEXTBELT_API_KEY) {
      providerName = 'TextBelt';
      try {
        const response = await fetch("https://textbelt.com/text", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phoneNumber,
            message: textMessage,
            key: process.env.TEXTBELT_API_KEY
          })
        });
        const data = await response.json();
        if (data.success) {
          realSMSSent = true;
          console.log(`[OTP] Sent via TextBelt successfully to ${phoneNumber}`);
        } else {
          console.error(`[OTP Error] TextBelt returned error:`, data.error || data);
        }
      } catch (err) {
        console.error(`[OTP Error] TextBelt dispatch failed:`, err.message);
      }
    }

    res.json({
      message: realSMSSent 
        ? `Verification code sent to ${phoneNumber} via ${providerName}.` 
        : `OTP sent to ${phoneNumber} (Simulated).`,
      isSimulated: !realSMSSent,
      otpCode: realSMSSent ? undefined : otpCode
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating OTP.', error: error.message });
  }
}

export async function verifyOTPLogin(req, res) {
  try {
    const { phoneNumber, otpCode } = req.body;
    if (!phoneNumber || !otpCode) {
      return res.status(400).json({ message: 'Phone number and OTP code are required.' });
    }

    const record = activeOTPs.get(phoneNumber);
    if (!record) {
      return res.status(400).json({ message: 'No OTP requested for this phone number.' });
    }
    if (Date.now() > record.expires) {
      activeOTPs.delete(phoneNumber);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }
    if (record.code !== otpCode) {
      return res.status(400).json({ message: 'Invalid OTP code. Please try again.' });
    }

    // Clear OTP after successful verification
    activeOTPs.delete(phoneNumber);

    // Fetch user
    const users = await db.users.raw();
    const user = users.find(u => u.shopDetails?.phone === phoneNumber);

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
    const { phoneNumber, otpCode, username, email, password, shopName, shopAddress, gstin } = req.body;
    if (!phoneNumber || !otpCode || !username || !email || !password || !shopName) {
      return res.status(400).json({ message: 'All registration parameters are required.' });
    }

    const record = activeOTPs.get(phoneNumber);
    if (!record) {
      return res.status(400).json({ message: 'No OTP requested for this phone number.' });
    }
    if (Date.now() > record.expires) {
      activeOTPs.delete(phoneNumber);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }
    if (record.code !== otpCode) {
      return res.status(400).json({ message: 'Invalid OTP code. Please try again.' });
    }

    // Clear OTP
    activeOTPs.delete(phoneNumber);

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
        phone: phoneNumber,
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
    const existingUser = users.find(u => u.shopDetails?.phone === shopPhone || u.email === email.toLowerCase());
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
