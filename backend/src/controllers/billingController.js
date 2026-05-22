import { db } from '../services/db.js';
import { runInventoryScan } from '../services/inventoryScan.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGS_DIR = path.join(__dirname, '..', '..', 'delivery_logs');

import { sendEmail } from '../services/emailService.js';


// Helper to simulate Email/SMS gateway logs in backend
async function logDelivery(billId, customerEmail, customerName, message, type) {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
    const logFile = path.join(LOGS_DIR, `${type}_delivery.log`);
    const logEntry = `[${new Date().toISOString()}] Bill ID: ${billId} | Customer: ${customerName} (${customerEmail})\nMessage: ${message}\n----------------------------------------\n`;
    await fs.appendFile(logFile, logEntry, 'utf-8');
    console.log(`[${type.toUpperCase()} Mock Sent] logged to ${logFile}`);
  } catch (error) {
    console.error(`Failed to log ${type} delivery:`, error);
  }
}

export async function createBill(req, res) {
  try {
    const { customerName, customerPhone, customerEmail, items, discount, tax, subtotal, finalTotal } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ message: 'Cart items are required for billing.' });
    }

    // Run transaction
    const result = await db.runTransaction(async (transactionDb) => {
      // 1. Validate stock and retrieve actual prices
      const processedItems = [];
      
      for (const cartItem of items) {
        const medicine = await transactionDb.medicines.findById(cartItem.medicineId);
        if (!medicine) {
          throw new Error(`Medicine "${cartItem.name || cartItem.medicineId}" not found.`);
        }

        if (medicine.stockQuantity < cartItem.quantity) {
          throw new Error(`Insufficient stock for "${medicine.name}". Available: ${medicine.stockQuantity}, Requested: ${cartItem.quantity}`);
        }

        // Check if expired
        if (new Date(medicine.expiryDate) < new Date()) {
          throw new Error(`Cannot sell expired medicine "${medicine.name}" (Batch: ${medicine.batchNumber}).`);
        }

        // Decrement stock
        const newStock = medicine.stockQuantity - cartItem.quantity;
        await transactionDb.medicines.update(medicine.id, {
          stockQuantity: newStock
        });

        processedItems.push({
          medicineId: medicine.id,
          name: medicine.name,
          batchNumber: medicine.batchNumber,
          category: medicine.category,
          price: medicine.price,
          quantity: cartItem.quantity,
          total: medicine.price * cartItem.quantity
        });
      }

      // 2. Generate invoice number (simple format: INV-YYYYMMDD-ID)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const bills = await transactionDb.bills.raw();
      const nextNum = bills.length + 1;
      const invoiceNumber = `INV-${dateStr}-${String(nextNum).padStart(4, '0')}`;

      // 3. Create the bill record
      const newBill = await transactionDb.bills.insert({
        invoiceNumber,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        customerEmail: customerEmail || '',
        items: processedItems,
        subtotal: parseFloat(subtotal),
        discount: parseFloat(discount || 0), // flat amount or percentage
        tax: parseFloat(tax || 0), // GST percentage
        finalTotal: parseFloat(finalTotal),
        date: new Date().toISOString()
      });

      return newBill;
    });

    // Run background scan immediately to trigger low-stock warnings if threshold crossed
    await runInventoryScan();

    // 4. Retrieve shop details for currently logged-in user
    const user = req.user ? await db.users.findById(req.user.id) : null;
    const storeDetails = user?.shopDetails || (await db.users.find())[0]?.shopDetails || { name: 'Care & Cure Pharmacy', phone: '', address: '', gstin: '' };
    
    // Construct text representation of purchase items
    const itemLinesText = result.items.map((item, index) => {
      return `${index + 1}. ${item.name} (Batch: ${item.batchNumber}) - Qty: ${item.quantity} - Price: ₹${item.price.toFixed(2)} - Total: ₹${item.total.toFixed(2)}`;
    }).join('\n');

    const emailSubject = `🧾 Invoice ${result.invoiceNumber} from ${storeDetails.name}`;
    const emailText = `Dear ${result.customerName},\n\nThank you for shopping at ${storeDetails.name}.\n\nYour invoice ${result.invoiceNumber} details:\n${itemLinesText}\n\nGrand Total: ₹${result.finalTotal.toFixed(2)}\n\nStay healthy!`;

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 20px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 16px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 800;">${storeDetails.name.toUpperCase()}</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">${storeDetails.address || ''}</p>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Tel: ${storeDetails.phone || ''} ${storeDetails.gstin ? ' | GSTIN: ' + storeDetails.gstin : ''}</p>
        </div>
        <div>
          <p style="font-size: 14px; color: #334155; margin-top: 0;">Dear <strong>${result.customerName}</strong>,</p>
          <p style="font-size: 14px; color: #334155;">Thank you for shopping at our pharmacy. Here is the receipt for your purchase:</p>
          
          <div style="background-color: #f8fafc; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 13px;">
            <div><strong>Invoice Number:</strong> ${result.invoiceNumber}</div>
            <div><strong>Date:</strong> ${new Date(result.date).toLocaleString('en-IN')}</div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; font-weight: 700; color: #475569;">
                <th style="text-align: left; padding: 8px 0;">Item</th>
                <th style="text-align: right; padding: 8px 0; width: 60px;">Qty</th>
                <th style="text-align: right; padding: 8px 0; width: 80px;">Price</th>
                <th style="text-align: right; padding: 8px 0; width: 90px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${result.items.map(item => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0;"><strong>${item.name}</strong><br><span style="font-size: 11px; color: #64748b;">Batch: ${item.batchNumber}</span></td>
                  <td style="text-align: right; padding: 10px 0;">${item.quantity}</td>
                  <td style="text-align: right; padding: 10px 0;">₹${item.price.toFixed(2)}</td>
                  <td style="text-align: right; padding: 10px 0;">₹${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="border-top: 2px solid #e2e8f0; padding-top: 12px; text-align: right; font-size: 13px; line-height: 1.6;">
            <div style="display: inline-block; width: 220px;">
              <div style="display: flex; justify-content: space-between;">
                <span>Subtotal:</span>
                <span>₹${result.subtotal.toFixed(2)}</span>
              </div>
              ${result.discount > 0 ? `
              <div style="display: flex; justify-content: space-between; color: #ef4444;">
                <span>Discount:</span>
                <span>-₹${result.discount.toFixed(2)}</span>
              </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between;">
                <span>GST (${result.tax}%):</span>
                <span>₹${((result.subtotal - result.discount) * (result.tax / 100)).toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 6px; color: #0284c7;">
                <span>Grand Total:</span>
                <span>₹${result.finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0 0 4px 0;">Thank you for shopping! Stay healthy.</p>
          <p style="margin: 0;">&copy; 2026 ${storeDetails.name.toUpperCase()}. All rights reserved.</p>
        </div>
      </div>
    `;

    if (result.customerEmail) {
      logDelivery(result.id, result.customerEmail, result.customerName, emailText, 'email');
      sendEmail({
        to: result.customerEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
        fromName: storeDetails.name
      }).catch(err => {
        console.error('[Billing Email Error] Failed to send invoice email:', err.message);
      });
    }

    res.status(201).json({
      message: 'Invoice created and stock updated successfully. Email receipt sent.',
      bill: result
    });

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export async function getBills(req, res) {
  try {
    const { search, startDate, endDate } = req.query;
    let bills = await db.bills.raw();

    if (search) {
      const searchLower = search.toLowerCase();
      bills = bills.filter(bill => 
        bill.invoiceNumber.toLowerCase().includes(searchLower) ||
        bill.customerName.toLowerCase().includes(searchLower) ||
        bill.customerPhone.includes(searchLower)
      );
    }

    if (startDate) {
      const start = new Date(startDate);
      bills = bills.filter(bill => new Date(bill.date) >= start);
    }

    if (endDate) {
      // Set end date to end of that day (23:59:59.999)
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      bills = bills.filter(bill => new Date(bill.date) <= end);
    }

    // Sort by newest first
    bills.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving bills.', error: error.message });
  }
}

export async function getBillById(req, res) {
  try {
    const bill = await db.bills.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving invoice.', error: error.message });
  }
}
