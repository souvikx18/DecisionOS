// src/lib/templateGenerator.js
// ============================================================
// Starter CSV Template Generator
// Generates clean CSV templates with valid sample rows for each entity
// ============================================================

export const CSV_TEMPLATES = {
  SALES: {
    filename: 'sales_import_template.csv',
    content: `Sale Date,Customer Name,Product / SKU,Quantity,Unit Price,Discount,Sales Channel,Region,Notes
2026-08-01,Acme Corporation,WIDGET-001,10,750.00,0.00,Online Store,North,Standard order
2026-08-02,Global Industries,ERP-LIC-01,2,15000.00,1000.00,Direct Sales,West,Annual enterprise contract
2026-08-03,Metro Logistics,WIDGET-002,25,450.00,50.00,Wholesale,South,Bulk discount applied`,
  },

  EXPENSES: {
    filename: 'expenses_import_template.csv',
    content: `Expense Date,Category,Sub Category,Amount,Vendor / Payee,Description
2026-08-01,Marketing,Digital Advertising,45000.00,Google Ads,Q3 search ad campaign
2026-08-02,Software,Cloud Hosting,18500.00,Amazon Web Services,Production cluster hosting
2026-08-03,Logistics,Freight Charges,6200.00,BlueDart Express,Raw material shipment delivery`,
  },

  INVENTORY: {
    filename: 'inventory_import_template.csv',
    content: `Item Name,SKU,Current Stock Qty,Reorder Level,Reorder Batch Qty,Warehouse Location
Industrial Sensor X1,SENSOR-X1,150,30,50,Warehouse 1 - Aisle 4
Titanium Fastener M8,FAST-M8,500,100,200,Warehouse 1 - Shelf B2
High Torque Motor 24V,MOTOR-24V,45,15,30,Warehouse 2 - Zone C`,
  },

  CUSTOMERS: {
    filename: 'customers_import_template.csv',
    content: `Customer Name,Email,Phone Number,Company,Region,Segment
Rajesh Sharma,rajesh@sharmatraders.com,+919876543210,Sharma Traders,North,Enterprise
Priya Patel,priya@innovatetech.io,+919123456780,Innovate Tech,West,SMB
Vikram Malhotra,vikram@apexmanufacturing.com,+919988776655,Apex Manufacturing,South,VIP`,
  },

  PRODUCTS: {
    filename: 'products_import_template.csv',
    content: `Product Name,SKU,Category,Unit,Cost Price,Selling Price
Premium Precision Toolset,TOOL-PRO-01,Hardware,set,1200.00,1950.00
Heavy Duty Bearing Kit,BEAR-HD-50,Mechanical,box,650.00,980.00
Industrial IoT Gateway,IOT-GW-V2,Electronics,unit,4500.00,6800.00`,
  },
};

/**
 * Get CSV template by type
 * @param {'SALES' | 'EXPENSES' | 'INVENTORY' | 'CUSTOMERS' | 'PRODUCTS'} type
 */
export function getCsvTemplate(type) {
  const normalizedType = String(type || '').toUpperCase();
  return CSV_TEMPLATES[normalizedType] || null;
}
