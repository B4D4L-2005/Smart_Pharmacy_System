import { db } from '../services/db.js';
import { runInventoryScan } from '../services/inventoryScan.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGS_DIR = path.join(__dirname, '..', '..', 'delivery_logs');

// Helper to simulate SMS/WhatsApp gateway logs in backend
async function logDelivery(billId, customerPhone, customerName, message, type) {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
    const logFile = path.join(LOGS_DIR, `${type}_delivery.log`);
    const logEntry = `[${new Date().toISOString()}] Bill ID: ${billId} | Customer: ${customerName} (${customerPhone})\nMessage: ${message}\n----------------------------------------\n`;
    await fs.appendFile(logFile, logEntry, 'utf-8');
    console.log(`[${type.toUpperCase()} Mock Sent] logged to ${logFile}`);
  } catch (error) {
    console.error(`Failed to log ${type} delivery:`, error);
  }
}

export async function createBill(req, res) {
  try {
    const { customerName, customerPhone, items, discount, tax, subtotal, finalTotal } = req.body;

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

    // 4. Simulate SMS and WhatsApp delivery logging in background
    const storeDetails = (await db.users.find())[0]?.shopDetails || { name: 'Smart Pharmacy Store' };
    const smsMessage = `Thank you for shopping at ${storeDetails.name}. Your invoice ${result.invoiceNumber} total is ₹${result.finalTotal}. Download bill: http://rx.ph/${result.invoiceNumber}`;
    
    // Construct real-looking pharmacy bill items
    const itemLines = result.items.map((item, index) => {
      return `${index + 1}. *${item.name}* (Batch: ${item.batchNumber})\n   Qty: ${item.quantity} x ₹${item.price.toFixed(2)} = ₹${item.total.toFixed(2)}`;
    }).join('\n');

    const shopGstin = storeDetails.gstin ? `\n*GSTIN:* ${storeDetails.gstin}` : '';
    const shopAddr = storeDetails.address ? `\n*Address:* ${storeDetails.address}` : '';
    const shopPhone = storeDetails.phone ? `\n*Tel:* ${storeDetails.phone}` : '';

    const waMessage = `*==================================*\n*${storeDetails.name.toUpperCase()}*${shopAddr}${shopPhone}${shopGstin}\n*==================================*\n*INVOICE:* ${result.invoiceNumber}\n*DATE:* ${new Date(result.date).toLocaleString('en-IN')}\n*CUSTOMER:* ${result.customerName}${result.customerPhone ? ' (' + result.customerPhone + ')' : ''}\n*==================================*\n*ITEMS PURCHASED*:\n${itemLines}\n*----------------------------------*\n*Subtotal:* ₹${result.subtotal.toFixed(2)}\n*Discount:* -₹${result.discount.toFixed(2)}\n*GST/Tax:* ₹${((result.subtotal - result.discount) * (result.tax / 100)).toFixed(2)} (${result.tax}%)\n*GRAND TOTAL:* *₹${result.finalTotal.toFixed(2)}*\n*==================================*\nThank you for shopping! Stay healthy.\n_This is a system generated pharmacy bill._`;

    if (result.customerPhone) {
      logDelivery(result.id, result.customerPhone, result.customerName, smsMessage, 'sms');
      logDelivery(result.id, result.customerPhone, result.customerName, waMessage, 'whatsapp');
    }

    // Generate dynamic WhatsApp URL link to send in frontend
    const prefilledText = encodeURIComponent(waMessage);
    const waLink = result.customerPhone 
      ? `https://wa.me/${result.customerPhone.replace(/[^0-9]/g, '')}?text=${prefilledText}`
      : `https://wa.me/?text=${prefilledText}`;

    res.status(201).json({
      message: 'Invoice created and stock updated successfully.',
      bill: result,
      whatsappLink: waLink
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
