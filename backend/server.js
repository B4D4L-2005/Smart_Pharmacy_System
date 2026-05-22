import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticateToken } from './src/middleware/auth.js';
import { signup, login, getProfile, updateProfile, sendOTP, verifyOTPLogin, verifyOTPRegister, restoreUser, exportDatabase, importDatabase } from './src/controllers/authController.js';
import { createMedicine, getMedicines, getMedicineById, updateMedicine, deleteMedicine, triggerScan } from './src/controllers/medicineController.js';
import { createBill, getBills, getBillById } from './src/controllers/billingController.js';
import { getDashboardStats, getDetailedReports } from './src/controllers/reportController.js';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } from './src/controllers/notificationController.js';
import { seedDatabase } from './src/services/seed.js';
import { runInventoryScan } from './src/services/inventoryScan.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for simplicity in local setup
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Public Welcome Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'rxsmart-api',
    version: '1.0.0',
    timestamp: new Date()
  });
});

// Public Auth routes
app.post('/api/auth/signup', signup);
app.post('/api/auth/login', login);
app.post('/api/auth/send-otp', sendOTP);
app.post('/api/auth/restore', restoreUser);
app.post('/api/auth/verify-otp-login', verifyOTPLogin);
app.post('/api/auth/verify-otp-register', verifyOTPRegister);

// Protected Profile routes
app.get('/api/auth/profile', authenticateToken, getProfile);
app.put('/api/auth/profile', authenticateToken, updateProfile);

// Protected Database Sync routes
app.get('/api/db/export', authenticateToken, exportDatabase);
app.post('/api/db/import', authenticateToken, importDatabase);

// Protected Medicines routes
app.get('/api/medicines', authenticateToken, getMedicines);
app.post('/api/medicines', authenticateToken, createMedicine);
app.get('/api/medicines/:id', authenticateToken, getMedicineById);
app.put('/api/medicines/:id', authenticateToken, updateMedicine);
app.delete('/api/medicines/:id', authenticateToken, deleteMedicine);
app.post('/api/medicines/scan', authenticateToken, triggerScan);

// Protected Billing/Invoicing routes
app.post('/api/billing', authenticateToken, createBill);
app.get('/api/billing', authenticateToken, getBills);
app.get('/api/billing/:id', authenticateToken, getBillById);

// Protected Reports/Dashboard routes
app.get('/api/reports/dashboard', authenticateToken, getDashboardStats);
app.get('/api/reports/detailed', authenticateToken, getDetailedReports);

// Protected Notifications routes
app.get('/api/notifications', authenticateToken, getNotifications);
app.put('/api/notifications/read-all', authenticateToken, markAllAsRead);
app.put('/api/notifications/:id/read', authenticateToken, markAsRead);
app.delete('/api/notifications/clear-all', authenticateToken, clearAllNotifications);
app.delete('/api/notifications/:id', authenticateToken, deleteNotification);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]:', err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Startup routines
async function bootstrap() {
  console.log('Initializing database seeding checks...');
  await seedDatabase();
  
  console.log('Running initial inventory status scan...');
  await runInventoryScan();
  
  // Set up periodic scanning every 6 hours
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(async () => {
    console.log('[Interval] Running scheduled inventory scan...');
    await runInventoryScan();
  }, SIX_HOURS);

  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  Smart Pharmacy Shop Server running on port ${PORT} `);
    console.log(`  Local Address: http://localhost:${PORT}          `);
    console.log(`==================================================`);
  });
}

bootstrap().catch(err => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
