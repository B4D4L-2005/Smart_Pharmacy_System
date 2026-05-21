import { db } from '../services/db.js';

export async function getDashboardStats(req, res) {
  try {
    const medicines = await db.medicines.raw();
    const bills = await db.bills.raw();
    const notifications = await db.notifications.raw();

    // 1. Core KPIs
    const totalSales = bills.reduce((sum, b) => sum + (b.finalTotal || 0), 0);
    const totalStock = medicines.reduce((sum, m) => sum + (m.stockQuantity || 0), 0);
    
    // Low stock and Expired counts
    const lowStockCount = medicines.filter(m => m.availabilityStatus === 'Low Stock' || m.stockQuantity <= (m.lowStockThreshold || 20)).length;
    const expiredCount = medicines.filter(m => m.availabilityStatus === 'Expired' || new Date(m.expiryDate) < new Date()).length;

    // 2. Recent Bills (limit 5)
    const sortedBills = [...bills].sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentBills = sortedBills.slice(0, 5);

    // 3. Medicine Categories Breakdown (Count & Stock)
    const categoryMap = {};
    medicines.forEach(med => {
      const cat = med.category || 'Other';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { count: 0, stock: 0 };
      }
      categoryMap[cat].count += 1;
      categoryMap[cat].stock += med.stockQuantity;
    });

    const categoriesBreakdown = Object.keys(categoryMap).map(name => ({
      name,
      count: categoryMap[name].count,
      stock: categoryMap[name].stock
    }));

    // 4. Daily Revenue Chart Data (Last 7 days)
    const dailyRevenueMap = {};
    const now = new Date();
    
    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
      dailyRevenueMap[dateStr] = 0;
    }

    bills.forEach(bill => {
      const dateStr = bill.date.slice(0, 10);
      if (dailyRevenueMap[dateStr] !== undefined) {
        dailyRevenueMap[dateStr] += bill.finalTotal;
      }
    });

    const dailyRevenue = Object.keys(dailyRevenueMap).map(date => {
      // Format as "Mon DD"
      const parts = date.split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      return {
        date,
        label,
        amount: Math.round(dailyRevenueMap[date] * 100) / 100
      };
    });

    // 5. Stock status counters for circular progress / rings
    const stockStatus = {
      inStock: medicines.filter(m => m.availabilityStatus === 'In Stock').length,
      lowStock: lowStockCount,
      outOfStock: medicines.filter(m => m.stockQuantity === 0).length,
      expired: expiredCount
    };

    res.json({
      totalSales: Math.round(totalSales * 100) / 100,
      totalStock,
      expiredCount,
      lowStockCount,
      recentBills,
      categories: categoriesBreakdown,
      dailyRevenue,
      stockStatus
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving dashboard statistics.', error: error.message });
  }
}

export async function getDetailedReports(req, res) {
  try {
    const medicines = await db.medicines.raw();
    const bills = await db.bills.raw();

    // 1. Inventory Valuation (Unit Cost * Stock)
    const valuation = medicines.map(med => ({
      id: med.id,
      name: med.name,
      batchNumber: med.batchNumber,
      category: med.category,
      price: med.price,
      stockQuantity: med.stockQuantity,
      value: Math.round(med.price * med.stockQuantity * 100) / 100
    }));
    valuation.sort((a, b) => b.value - a.value);

    // 2. Sales by Category
    const categorySales = {};
    bills.forEach(bill => {
      bill.items.forEach(item => {
        const cat = item.category || 'Other';
        if (!categorySales[cat]) {
          categorySales[cat] = 0;
        }
        categorySales[cat] += item.total;
      });
    });

    const salesByCategory = Object.keys(categorySales).map(name => ({
      name,
      sales: Math.round(categorySales[name] * 100) / 100
    })).sort((a, b) => b.sales - a.sales);

    // 3. Fast Selling Medicines (by total quantity sold)
    const medSalesMap = {};
    bills.forEach(bill => {
      bill.items.forEach(item => {
        if (!medSalesMap[item.medicineId]) {
          medSalesMap[item.medicineId] = { name: item.name, batch: item.batchNumber, qty: 0, sales: 0 };
        }
        medSalesMap[item.medicineId].qty += item.quantity;
        medSalesMap[item.medicineId].sales += item.total;
      });
    });

    const fastSelling = Object.keys(medSalesMap).map(id => ({
      medicineId: parseInt(id, 10),
      name: medSalesMap[id].name,
      batchNumber: medSalesMap[id].batch,
      quantitySold: medSalesMap[id].qty,
      totalSales: Math.round(medSalesMap[id].sales * 100) / 100
    })).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 10);

    res.json({
      inventoryValuation: valuation,
      salesByCategory,
      fastSelling
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving detailed reports.', error: error.message });
  }
}
