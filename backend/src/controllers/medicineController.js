import { db } from '../services/db.js';
import { runInventoryScan } from '../services/inventoryScan.js';

export async function createMedicine(req, res) {
  try {
    const {
      name,
      category,
      brand,
      price,
      stockQuantity,
      manufactureDate,
      expiryDate,
      batchNumber,
      lowStockThreshold
    } = req.body;

    if (!name || !category || !price || stockQuantity === undefined || !expiryDate || !batchNumber) {
      return res.status(400).json({ message: 'Name, category, price, stock quantity, expiry date, and batch number are required.' });
    }

    const priceNum = parseFloat(price);
    const stockQtyNum = parseInt(stockQuantity, 10);
    const thresholdNum = lowStockThreshold !== undefined ? parseInt(lowStockThreshold, 10) : 20;

    const newMed = await db.medicines.insert({
      name,
      category,
      brand: brand || '',
      price: priceNum,
      stockQuantity: stockQtyNum,
      manufactureDate: manufactureDate || '',
      expiryDate,
      batchNumber,
      lowStockThreshold: thresholdNum,
      availabilityStatus: 'In Stock' // Will be updated by scan
    });

    // Run a scan to sync status and notifications
    await runInventoryScan();
    
    // Fetch the updated medicine record
    const updatedMed = await db.medicines.findById(newMed.id);

    res.status(201).json({
      message: 'Medicine added successfully.',
      medicine: updatedMed
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating medicine.', error: error.message });
  }
}

export async function getMedicines(req, res) {
  try {
    const { search, category, status, sortBy, order } = req.query;
    let medicines = await db.medicines.raw();

    // 1. Search Filter
    if (search) {
      const searchLower = search.toLowerCase();
      medicines = medicines.filter(med => 
        med.name.toLowerCase().includes(searchLower) ||
        med.brand.toLowerCase().includes(searchLower) ||
        med.batchNumber.toLowerCase().includes(searchLower)
      );
    }

    // 2. Category Filter
    if (category && category !== 'All') {
      medicines = medicines.filter(med => med.category === category);
    }

    // 3. Status Filter (availabilityStatus)
    if (status && status !== 'All') {
      medicines = medicines.filter(med => med.availabilityStatus === status);
    }

    // 4. Sort
    if (sortBy) {
      const field = sortBy;
      const isAsc = order !== 'desc';
      medicines.sort((a, b) => {
        let valA = a[field];
        let valB = b[field];

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB ? valB.toLowerCase() : '';
          return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
          valA = valA || 0;
          valB = valB || 0;
          return isAsc ? valA - valB : valB - valA;
        }
      });
    }

    res.json(medicines);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving medicines.', error: error.message });
  }
}

export async function getMedicineById(req, res) {
  try {
    const medicine = await db.medicines.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found.' });
    }
    res.json(medicine);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving medicine.', error: error.message });
  }
}

export async function updateMedicine(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      brand,
      price,
      stockQuantity,
      manufactureDate,
      expiryDate,
      batchNumber,
      lowStockThreshold
    } = req.body;

    const currentMed = await db.medicines.findById(id);
    if (!currentMed) {
      return res.status(404).json({ message: 'Medicine not found.' });
    }

    const updatedFields = {};
    if (name !== undefined) updatedFields.name = name;
    if (category !== undefined) updatedFields.category = category;
    if (brand !== undefined) updatedFields.brand = brand;
    if (price !== undefined) updatedFields.price = parseFloat(price);
    if (stockQuantity !== undefined) updatedFields.stockQuantity = parseInt(stockQuantity, 10);
    if (manufactureDate !== undefined) updatedFields.manufactureDate = manufactureDate;
    if (expiryDate !== undefined) updatedFields.expiryDate = expiryDate;
    if (batchNumber !== undefined) updatedFields.batchNumber = batchNumber;
    if (lowStockThreshold !== undefined) updatedFields.lowStockThreshold = parseInt(lowStockThreshold, 10);

    const updatedMed = await db.medicines.update(id, updatedFields);

    // Run inventory scan to update notifications and medicine status
    await runInventoryScan();

    const finalMed = await db.medicines.findById(id);
    res.json({
      message: 'Medicine updated successfully.',
      medicine: finalMed
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating medicine.', error: error.message });
  }
}

export async function deleteMedicine(req, res) {
  try {
    const deleted = await db.medicines.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Medicine not found.' });
    }
    
    // Scan after deletion to clean up status or trigger updates
    await runInventoryScan();

    res.json({ message: 'Medicine deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting medicine.', error: error.message });
  }
}

export async function triggerScan(req, res) {
  try {
    const result = await runInventoryScan();
    if (result.success) {
      res.json({ message: 'Inventory scan completed successfully.', count: result.newNotificationsCount });
    } else {
      res.status(500).json({ message: 'Inventory scan failed.', error: result.error });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error triggering scan.', error: error.message });
  }
}
