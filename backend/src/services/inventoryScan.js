import { db } from './db.js';

export async function runInventoryScan() {
  try {
    const medicines = await db.medicines.raw();
    const notifications = await db.notifications.raw();
    
    const now = new Date();
    const ninetyDaysFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));
    
    let newNotificationsCount = 0;

    for (const med of medicines) {
      const expiry = new Date(med.expiryDate);
      const isExpired = expiry < now;
      const isNearExpiry = !isExpired && expiry <= ninetyDaysFromNow;
      const isLowStock = med.stockQuantity <= (med.lowStockThreshold || 20) && med.stockQuantity > 0;
      const isOutOfStock = med.stockQuantity === 0;

      // Update availabilityStatus on the medicine record if it changed
      let expectedStatus = 'In Stock';
      if (isExpired) expectedStatus = 'Expired';
      else if (isOutOfStock) expectedStatus = 'Out of Stock';
      else if (isLowStock) expectedStatus = 'Low Stock';

      if (med.availabilityStatus !== expectedStatus) {
        await db.medicines.update(med.id, { availabilityStatus: expectedStatus });
      }

      // Check expired notifications
      if (isExpired) {
        const type = 'expired';
        const msg = `Medicine ${med.name} (Batch: ${med.batchNumber}) has expired (Expiry: ${med.expiryDate}).`;
        // Check if an unread notification of this type already exists for this medicine
        const exists = notifications.some(n => n.medicineId === med.id && n.type === type && n.status === 'unread');
        if (!exists) {
          await db.notifications.insert({
            medicineId: med.id,
            medicineName: med.name,
            batchNumber: med.batchNumber,
            type,
            message: msg,
            status: 'unread'
          });
          newNotificationsCount++;
        }
      }

      // Check near expiry
      if (isNearExpiry) {
        const type = 'near_expiry';
        const msg = `Medicine ${med.name} (Batch: ${med.batchNumber}) is expiring soon (Expiry: ${med.expiryDate}).`;
        const exists = notifications.some(n => n.medicineId === med.id && n.type === type && n.status === 'unread');
        if (!exists) {
          await db.notifications.insert({
            medicineId: med.id,
            medicineName: med.name,
            batchNumber: med.batchNumber,
            type,
            message: msg,
            status: 'unread'
          });
          newNotificationsCount++;
        }
      }

      // Check low stock
      if (isLowStock) {
        const type = 'low_stock';
        const msg = `Medicine ${med.name} is running low. Only ${med.stockQuantity} units left.`;
        const exists = notifications.some(n => n.medicineId === med.id && n.type === type && n.status === 'unread');
        if (!exists) {
          await db.notifications.insert({
            medicineId: med.id,
            medicineName: med.name,
            batchNumber: med.batchNumber,
            type,
            message: msg,
            status: 'unread'
          });
          newNotificationsCount++;
        }
      }

      // Check out of stock
      if (isOutOfStock) {
        const type = 'out_of_stock';
        const msg = `Medicine ${med.name} is out of stock!`;
        const exists = notifications.some(n => n.medicineId === med.id && n.type === type && n.status === 'unread');
        if (!exists) {
          await db.notifications.insert({
            medicineId: med.id,
            medicineName: med.name,
            batchNumber: med.batchNumber,
            type,
            message: msg,
            status: 'unread'
          });
          newNotificationsCount++;
        }
      }
    }

    console.log(`[Inventory Scan] Completed. Generated ${newNotificationsCount} new notifications.`);
    return { success: true, newNotificationsCount };
  } catch (error) {
    console.error('[Inventory Scan] Failed:', error);
    return { success: false, error: error.message };
  }
}
