import bcrypt from 'bcryptjs';
import { db } from './db.js';

export async function seedDatabase() {
  try {
    // 1. Seed default user if empty
    const users = await db.users.raw();
    if (users.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await db.users.insert({
        email: 'admin@pharmacy.com',
        password: hashedPassword,
        username: 'Store Manager',
        shopDetails: {
          name: 'Care & Cure Pharmacy',
          phone: '+91 98765 43210',
          address: '12, MG Road, Metro Station Hub, Bengaluru, Karnataka - 560001',
          gstin: '29AAAAA1111A1Z1'
        }
      });
      console.log('[Seed] Admin user created (admin@pharmacy.com / admin123).');
    }

    // 2. Seed medicines if empty
    const medicines = await db.medicines.raw();
    if (medicines.length === 0) {
      const sampleMedicines = [
        // Tablets
        {
          name: 'Paracetamol 650mg (Dolo)',
          category: 'Tablet',
          brand: 'Micro Labs',
          price: 32.50,
          stockQuantity: 120,
          manufactureDate: '2025-10-01',
          expiryDate: '2027-09-30',
          batchNumber: 'DL90432',
          lowStockThreshold: 30,
          availabilityStatus: 'In Stock'
        },
        {
          name: 'Metformin 500mg (Glycomet)',
          category: 'Tablet',
          brand: 'USV',
          price: 24.80,
          stockQuantity: 300,
          manufactureDate: '2025-01-01',
          expiryDate: '2027-12-31',
          batchNumber: 'GM22481',
          lowStockThreshold: 50,
          availabilityStatus: 'In Stock'
        },
        {
          name: 'Pantoprazole 40mg (Pan-D)',
          category: 'Tablet',
          brand: 'Alkem',
          price: 155.00,
          stockQuantity: 80,
          manufactureDate: '2025-06-12',
          expiryDate: '2027-05-31',
          batchNumber: 'PD44321',
          lowStockThreshold: 20,
          availabilityStatus: 'In Stock'
        },
        {
          name: 'Azithromycin 500mg (Azee)',
          category: 'Tablet',
          brand: 'Cipla',
          price: 125.40,
          stockQuantity: 15,
          manufactureDate: '2024-12-05',
          expiryDate: '2026-12-31',
          batchNumber: 'AZ55210',
          lowStockThreshold: 20,
          availabilityStatus: 'Low Stock'
        },
        {
          name: 'Cetirizine 10mg (Alerid)',
          category: 'Tablet',
          brand: 'Cipla',
          price: 18.20,
          stockQuantity: 150,
          manufactureDate: '2024-04-10',
          expiryDate: '2026-03-31', // Expired
          batchNumber: 'CT11003',
          lowStockThreshold: 25,
          availabilityStatus: 'Expired'
        },
        {
          name: 'Atorvastatin 10mg (Lipvas)',
          category: 'Tablet',
          brand: 'Cipla',
          price: 85.50,
          stockQuantity: 95,
          manufactureDate: '2025-02-14',
          expiryDate: '2027-01-31',
          batchNumber: 'LP88410',
          lowStockThreshold: 20,
          availabilityStatus: 'In Stock'
        },
        {
          name: 'Limcee 500mg (Vitamin C)',
          category: 'Tablet',
          brand: 'Abbott',
          price: 22.00,
          stockQuantity: 250,
          manufactureDate: '2025-09-01',
          expiryDate: '2027-08-31',
          batchNumber: 'LC33012',
          lowStockThreshold: 40,
          availabilityStatus: 'In Stock'
        },
        {
          name: 'Combiflam',
          category: 'Tablet',
          brand: 'Sanofi',
          price: 45.00,
          stockQuantity: 180,
          manufactureDate: '2025-08-15',
          expiryDate: '2027-07-31',
          batchNumber: 'CB22104',
          lowStockThreshold: 30,
          availabilityStatus: 'In Stock'
        },
        {
          name: 'Telmisartan 40mg (Telma)',
          category: 'Tablet',
          brand: 'Glenmark',
          price: 92.00,
          stockQuantity: 140,
          manufactureDate: '2025-07-10',
          expiryDate: '2027-06-30',
          batchNumber: 'TL88902',
          lowStockThreshold: 25,
          availabilityStatus: 'In Stock'
        },

        // Capsules
        {
          name: 'Amoxicillin 500mg',
          category: 'Capsule',
          brand: 'Alkem',
          price: 110.00,
          stockQuantity: 12,
          manufactureDate: '2025-05-15',
          expiryDate: '2026-11-30',
          batchNumber: 'AX88102',
          lowStockThreshold: 20,
          availabilityStatus: 'Low Stock'
        },
        {
          name: 'Becosules (B-Complex)',
          category: 'Capsule',
          brand: 'Pfizer',
          price: 48.50,
          stockQuantity: 110,
          manufactureDate: '2025-03-01',
          expiryDate: '2027-02-28',
          batchNumber: 'BC55120',
          lowStockThreshold: 25,
          availabilityStatus: 'In Stock'
        },
        {
          name: 'Omeprazole 20mg',
          category: 'Capsule',
          brand: 'Dr. Reddys',
          price: 58.00,
          stockQuantity: 70,
          manufactureDate: '2025-02-10',
          expiryDate: '2027-01-31',
          batchNumber: 'OM44021',
          lowStockThreshold: 20,
          availabilityStatus: 'In Stock'
        },
        {
          name: 'Rabeprazole 20mg (Veloz-D)',
          category: 'Capsule',
          brand: 'Torrent',
          price: 185.00,
          stockQuantity: 90,
          manufactureDate: '2025-04-12',
          expiryDate: '2027-03-31',
          batchNumber: 'VZ99182',
          lowStockThreshold: 20,
          availabilityStatus: 'In Stock'
        },
        {
          name: 'Rosuvastatin 10mg (Rosavas)',
          category: 'Capsule',
          brand: 'Sun Pharma',
          price: 142.00,
          stockQuantity: 40,
          manufactureDate: '2025-06-01',
          expiryDate: '2027-05-31',
          batchNumber: 'RV33091',
          lowStockThreshold: 15,
          availabilityStatus: 'In Stock'
        },

        // Syrups
        {
          name: 'Cough Syrup (Ascoril LS)',
          category: 'Syrup',
          brand: 'Glenmark',
          price: 145.00,
          stockQuantity: 45,
          manufactureDate: '2025-08-10',
          expiryDate: '2026-06-25', // Near expiry
          batchNumber: 'AC77199',
          lowStockThreshold: 15,
          availabilityStatus: 'In Stock'
        },
        {
          name: 'Gelusil (Antacid)',
          category: 'Syrup',
          brand: 'Pfizer',
          price: 128.00,
          stockQuantity: 60,
          manufactureDate: '2025-05-20',
          expiryDate: '2027-04-30',
          batchNumber: 'GL44192',
          lowStockThreshold: 15,
          availabilityStatus: 'In Stock'
        },
        {
          name: 'Grilinctus Cough Syrup',
          category: 'Syrup',
          brand: 'Franco-Indian',
          price: 135.00,
          stockQuantity: 30,
          manufactureDate: '2025-07-01',
          expiryDate: '2026-12-31',
          batchNumber: 'GR66210',
          lowStockThreshold: 10,
          availabilityStatus: 'In Stock'
        },
        {
          name: 'Laxative Syrup (Duphalac)',
          category: 'Syrup',
          brand: 'Abbott',
          price: 295.00,
          stockQuantity: 8,
          manufactureDate: '2025-09-12',
          expiryDate: '2027-08-31',
          batchNumber: 'DP88042',
          lowStockThreshold: 10,
          availabilityStatus: 'Low Stock'
        },
        {
          name: 'Cremaffin 225ml',
          category: 'Syrup',
          brand: 'Abbott',
          price: 260.00,
          stockQuantity: 25,
          manufactureDate: '2025-10-15',
          expiryDate: '2027-09-30',
          batchNumber: 'CR11094',
          lowStockThreshold: 10,
          availabilityStatus: 'In Stock'
        },

        // Injections
        {
          name: 'Insulin Glargine (Lantus)',
          category: 'Injection',
          brand: 'Sanofi',
          price: 680.00,
          stockQuantity: 5,
          manufactureDate: '2025-11-20',
          expiryDate: '2026-10-31',
          batchNumber: 'LT99388',
          lowStockThreshold: 10,
          availabilityStatus: 'Low Stock'
        },
        {
          name: 'Humalog (Insulin)',
          category: 'Injection',
          brand: 'Lilly',
          price: 840.00,
          stockQuantity: 4,
          manufactureDate: '2025-10-10',
          expiryDate: '2026-11-30',
          batchNumber: 'HM22091',
          lowStockThreshold: 8,
          availabilityStatus: 'Low Stock'
        },
        {
          name: 'Monocef 1g',
          category: 'Injection',
          brand: 'Aristo',
          price: 65.50,
          stockQuantity: 50,
          manufactureDate: '2025-12-01',
          expiryDate: '2027-11-30',
          batchNumber: 'MC44910',
          lowStockThreshold: 15,
          availabilityStatus: 'In Stock'
        },
        {
          name: 'Dynapar AQ 1ml',
          category: 'Injection',
          brand: 'Troikaa',
          price: 35.00,
          stockQuantity: 35,
          manufactureDate: '2026-01-15',
          expiryDate: '2027-12-31',
          batchNumber: 'DP11029',
          lowStockThreshold: 10,
          availabilityStatus: 'In Stock'
        },

        // Ointments / Gels
        {
          name: 'Volini Pain Relief Gel',
          category: 'Ointment',
          brand: 'Sun Pharma',
          price: 115.00,
          stockQuantity: 85,
          manufactureDate: '2025-11-01',
          expiryDate: '2027-10-31',
          batchNumber: 'VL88492',
          lowStockThreshold: 20,
          availabilityStatus: 'In Stock'
        },
        {
          name: 'Betadine Antiseptic Cream',
          category: 'Ointment',
          brand: 'Win-Medicare',
          price: 85.00,
          stockQuantity: 120,
          manufactureDate: '2025-08-10',
          expiryDate: '2027-07-31',
          batchNumber: 'BT55192',
          lowStockThreshold: 25,
          availabilityStatus: 'In Stock'
        },
        {
          name: 'Soframycin Skin Cream',
          category: 'Ointment',
          brand: 'Sanofi',
          price: 52.00,
          stockQuantity: 140,
          manufactureDate: '2025-09-20',
          expiryDate: '2027-08-31',
          batchNumber: 'SF99302',
          lowStockThreshold: 30,
          availabilityStatus: 'In Stock'
        },
        {
          name: 'Candid Cream 20g',
          category: 'Ointment',
          brand: 'Glenmark',
          price: 125.00,
          stockQuantity: 65,
          manufactureDate: '2025-10-05',
          expiryDate: '2027-09-30',
          batchNumber: 'CD44102',
          lowStockThreshold: 15,
          availabilityStatus: 'In Stock'
        }
      ];

      for (const med of sampleMedicines) {
        await db.medicines.insert(med);
      }
      console.log(`[Seed] Seeded ${sampleMedicines.length} sample medicines.`);
    }

    // 3. Seed default bills if empty
    const bills = await db.bills.raw();
    if (bills.length === 0) {
      // Let's create some bills for the last 5 days to populate the dashboard charts
      const now = new Date();
      const sampleBills = [
        {
          invoiceNumber: 'INV-20260516-0001',
          customerName: 'Rahul Sharma',
          customerPhone: '9876543211',
          items: [
            { medicineId: 1, name: 'Paracetamol 650mg (Dolo)', category: 'Tablet', batchNumber: 'DL90432', price: 32.50, quantity: 2, total: 65.00 },
            { medicineId: 3, name: 'Cough Syrup (Ascoril LS)', category: 'Syrup', batchNumber: 'AC77199', price: 145.00, quantity: 1, total: 145.00 }
          ],
          subtotal: 210.00,
          discount: 10.00,
          tax: 12.00, // 12% GST
          finalTotal: 224.00,
          date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString() // 4 days ago
        },
        {
          invoiceNumber: 'INV-20260517-0001',
          customerName: 'Priya Patel',
          customerPhone: '9822334455',
          items: [
            { medicineId: 5, name: 'Pantoprazole 40mg (Pan-D)', category: 'Tablet', batchNumber: 'PD44321', price: 155.00, quantity: 2, total: 310.00 }
          ],
          subtotal: 310.00,
          discount: 15.00,
          tax: 18.00, // 18% GST
          finalTotal: 348.10,
          date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
        },
        {
          invoiceNumber: 'INV-20260518-0001',
          customerName: 'Anil Kumar',
          customerPhone: '9123456789',
          items: [
            { medicineId: 4, name: 'Metformin 500mg (Glycomet)', category: 'Tablet', batchNumber: 'GM22481', price: 24.80, quantity: 4, total: 99.20 },
            { medicineId: 9, name: 'Atorvastatin 10mg (Lipvas)', category: 'Tablet', batchNumber: 'LP88410', price: 85.50, quantity: 1, total: 85.50 }
          ],
          subtotal: 184.70,
          discount: 0.00,
          tax: 12.00,
          finalTotal: 206.86,
          date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
        },
        {
          invoiceNumber: 'INV-20260519-0001',
          customerName: 'Walk-in Customer',
          customerPhone: '',
          items: [
            { medicineId: 10, name: 'Multivitamin (Zincovit)', category: 'Tablet', batchNumber: 'ZC11048', price: 110.00, quantity: 2, total: 220.00 }
          ],
          subtotal: 220.00,
          discount: 20.00,
          tax: 5.00,
          finalTotal: 210.00,
          date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        },
        {
          invoiceNumber: 'INV-20260520-0001',
          customerName: 'Suresh Mehta',
          customerPhone: '9448833112',
          items: [
            { medicineId: 1, name: 'Paracetamol 650mg (Dolo)', category: 'Tablet', batchNumber: 'DL90432', price: 32.50, quantity: 5, total: 162.50 },
            { medicineId: 5, name: 'Pantoprazole 40mg (Pan-D)', category: 'Tablet', batchNumber: 'PD44321', price: 155.00, quantity: 1, total: 155.00 }
          ],
          subtotal: 317.50,
          discount: 0.00,
          tax: 12.00,
          finalTotal: 355.60,
          date: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
        }
      ];

      for (const bill of sampleBills) {
        await db.bills.insert(bill);
      }
      console.log(`[Seed] Seeded ${sampleBills.length} sample billing records.`);
    }

  } catch (error) {
    console.error('[Seed] Database seeding failed:', error);
  }
}
