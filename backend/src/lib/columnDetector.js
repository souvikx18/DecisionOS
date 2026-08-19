// src/lib/columnDetector.js
// ============================================================
// Smart Column Auto-Detection & Schema Matching
// Fuzzy matches user spreadsheet headers to database field schemas
// ============================================================

/**
 * Standard schemas & synonyms for each import type
 */
export const IMPORT_SCHEMAS = {
  SALES: {
    required: ['quantity', 'unitPrice'],
    fields: {
      soldAt: {
        label: 'Sale Date',
        type: 'date',
        synonyms: ['date', 'soldat', 'sold_at', 'sale_date', 'order_date', 'transaction_date', 'timestamp', 'time'],
      },
      customerName: {
        label: 'Customer Name',
        type: 'string',
        synonyms: ['customer', 'customer_name', 'client', 'buyer', 'account', 'customer_email', 'client_name'],
      },
      productName: {
        label: 'Product / SKU',
        type: 'string',
        synonyms: ['product', 'product_name', 'item', 'item_name', 'sku', 'product_sku', 'code', 'product_code'],
      },
      quantity: {
        label: 'Quantity',
        type: 'number',
        synonyms: ['qty', 'quantity', 'units', 'count', 'pieces', 'volume', 'item_count'],
      },
      unitPrice: {
        label: 'Unit Price',
        type: 'number',
        synonyms: ['price', 'unitprice', 'unit_price', 'rate', 'item_price', 'selling_price', 'amount_per_unit'],
      },
      discount: {
        label: 'Discount',
        type: 'number',
        synonyms: ['discount', 'rebate', 'discount_amount', 'promo_discount', 'concession'],
      },
      channel: {
        label: 'Sales Channel',
        type: 'string',
        synonyms: ['channel', 'sales_channel', 'platform', 'source', 'store', 'marketplace', 'medium'],
      },
      region: {
        label: 'Region / Territory',
        type: 'string',
        synonyms: ['region', 'location', 'zone', 'territory', 'state', 'city', 'country', 'area'],
      },
      notes: {
        label: 'Notes',
        type: 'string',
        synonyms: ['notes', 'comments', 'description', 'remarks', 'memo'],
      },
    },
  },

  EXPENSES: {
    required: ['category', 'amount'],
    fields: {
      occurredAt: {
        label: 'Expense Date',
        type: 'date',
        synonyms: ['date', 'occurredat', 'occurred_at', 'expense_date', 'spent_on', 'timestamp', 'bill_date'],
      },
      category: {
        label: 'Category',
        type: 'string',
        synonyms: ['category', 'expense_category', 'type', 'head', 'account', 'cost_center', 'dept', 'department'],
      },
      subCategory: {
        label: 'Sub Category',
        type: 'string',
        synonyms: ['subcategory', 'sub_category', 'sub_type', 'classification'],
      },
      amount: {
        label: 'Amount',
        type: 'number',
        synonyms: ['amount', 'cost', 'total', 'spent', 'expense_amount', 'charge', 'price', 'paid'],
      },
      vendor: {
        label: 'Vendor / Payee',
        type: 'string',
        synonyms: ['vendor', 'supplier', 'payee', 'merchant', 'biller', 'company', 'provider', 'paid_to'],
      },
      description: {
        label: 'Description',
        type: 'string',
        synonyms: ['description', 'desc', 'memo', 'details', 'purpose', 'notes', 'narration'],
      },
    },
  },

  INVENTORY: {
    required: ['name', 'quantity'],
    fields: {
      name: {
        label: 'Item Name',
        type: 'string',
        synonyms: ['name', 'item_name', 'product_name', 'item', 'product', 'title', 'description'],
      },
      sku: {
        label: 'SKU / Barcode',
        type: 'string',
        synonyms: ['sku', 'item_sku', 'barcode', 'code', 'product_code', 'item_code', 'upc', 'part_number'],
      },
      quantity: {
        label: 'Current Stock Qty',
        type: 'number',
        synonyms: ['quantity', 'qty', 'stock', 'current_stock', 'units', 'on_hand', 'count', 'available_qty'],
      },
      reorderLevel: {
        label: 'Reorder Level (Alert threshold)',
        type: 'number',
        synonyms: ['reorderlevel', 'reorder_level', 'min_stock', 'threshold', 'alert_level', 'safety_stock', 'minimum_quantity'],
      },
      reorderQty: {
        label: 'Reorder Batch Quantity',
        type: 'number',
        synonyms: ['reorderqty', 'reorder_qty', 'batch_size', 'restock_qty', 'order_quantity'],
      },
      warehouseLocation: {
        label: 'Warehouse Location',
        type: 'string',
        synonyms: ['location', 'warehouse', 'warehouse_location', 'bin', 'shelf', 'aisle', 'rack', 'storage_zone'],
      },
    },
  },

  CUSTOMERS: {
    required: ['name'],
    fields: {
      name: {
        label: 'Customer Name',
        type: 'string',
        synonyms: ['name', 'customer_name', 'full_name', 'contact_name', 'client', 'buyer'],
      },
      email: {
        label: 'Email',
        type: 'string',
        synonyms: ['email', 'email_address', 'mail', 'contact_email', 'e_mail'],
      },
      phone: {
        label: 'Phone Number',
        type: 'string',
        synonyms: ['phone', 'phone_number', 'mobile', 'cell', 'telephone', 'contact_number'],
      },
      company: {
        label: 'Company / Organization',
        type: 'string',
        synonyms: ['company', 'organization', 'org', 'firm', 'business', 'enterprise', 'account'],
      },
      region: {
        label: 'Region / City / Country',
        type: 'string',
        synonyms: ['region', 'city', 'state', 'country', 'location', 'territory', 'address'],
      },
      segment: {
        label: 'Segment / Tier',
        type: 'string',
        synonyms: ['segment', 'tier', 'customer_segment', 'type', 'group', 'category'],
      },
    },
  },

  PRODUCTS: {
    required: ['name', 'costPrice', 'sellingPrice'],
    fields: {
      name: {
        label: 'Product Name',
        type: 'string',
        synonyms: ['name', 'product_name', 'title', 'item_name', 'product'],
      },
      sku: {
        label: 'SKU',
        type: 'string',
        synonyms: ['sku', 'product_sku', 'code', 'barcode', 'item_code'],
      },
      category: {
        label: 'Category',
        type: 'string',
        synonyms: ['category', 'product_category', 'department', 'type', 'group'],
      },
      unit: {
        label: 'Unit of Measure',
        type: 'string',
        synonyms: ['unit', 'uom', 'unit_of_measure', 'measurement'],
      },
      costPrice: {
        label: 'Cost Price',
        type: 'number',
        synonyms: ['costprice', 'cost_price', 'cost', 'buy_price', 'purchase_price', 'wholesale_price'],
      },
      sellingPrice: {
        label: 'Selling Price (MRP / Retail)',
        type: 'number',
        synonyms: ['sellingprice', 'selling_price', 'price', 'retail_price', 'sale_price', 'mrp', 'rate'],
      },
    },
  },
};

/**
 * Clean string for comparison (remove symbols, spaces, lowercase)
 */
function normalizeString(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Auto-detect column mapping between raw file headers and target entity schema
 * @param {string[]} headers - Headers from file
 * @param {keyof typeof IMPORT_SCHEMAS} type - Entity type
 */
export function autoDetectColumnMapping(headers, type) {
  const schema = IMPORT_SCHEMAS[type];
  if (!schema) return {};

  const mapping = {};
  const usedHeaders = new Set();

  // Iterate over each database field in the target schema
  Object.entries(schema.fields).forEach(([targetField, fieldDef]) => {
    const normalizedTarget = normalizeString(targetField);
    const normalizedSynonyms = fieldDef.synonyms.map(normalizeString);

    let bestMatch = null;
    let bestScore = 0;

    headers.forEach((header) => {
      if (usedHeaders.has(header)) return;
      const normalizedHeader = normalizeString(header);

      // Exact match with target field name
      if (normalizedHeader === normalizedTarget) {
        bestMatch = header;
        bestScore = 1.0;
        return;
      }

      // Exact match with one of the synonyms
      if (normalizedSynonyms.includes(normalizedHeader)) {
        bestMatch = header;
        bestScore = 0.9;
        return;
      }

      // Substring match
      for (const syn of normalizedSynonyms) {
        if (normalizedHeader.includes(syn) || syn.includes(normalizedHeader)) {
          if (bestScore < 0.6) {
            bestMatch = header;
            bestScore = 0.6;
          }
        }
      }
    });

    if (bestMatch && bestScore >= 0.5) {
      mapping[targetField] = bestMatch;
      usedHeaders.add(bestMatch);
    }
  });

  return mapping;
}
