const { Router } = require('express');
const pool = require('../db/connection');

const router = Router();

// POST /api/v1/sales-entries/quick - Quick save from voice entry
// Accepts product_name instead of product_id, auto-creates products if needed
router.post('/quick', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { shop_id, business_date, items, input_method } = req.body;

    // Validation
    if (!shop_id) return res.status(400).json({ error: 'shop_id is required' });
    if (!business_date) return res.status(400).json({ error: 'business_date is required' });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Validate each item
    for (const item of items) {
      if (!item.product_name) {
        return res.status(400).json({ error: 'product_name is required for each item' });
      }
      const qty = Number(item.quantity);
      const price = Number(item.unit_price);
      if (!qty || qty <= 0) {
        return res.status(400).json({ error: 'quantity must be positive' });
      }
      if (price === undefined || price < 0) {
        return res.status(400).json({ error: 'unit_price must be non-negative' });
      }
    }

    // Use transaction to ensure atomicity
    await client.query('BEGIN');

    // Create sales entry
    const entryResult = await client.query(
      `INSERT INTO sales_entries (shop_id, business_date, status, input_method)
       VALUES ($1, $2, 'confirmed', $3)
       RETURNING id, shop_id, business_date, status, input_method, created_at, updated_at`,
      [shop_id, business_date, input_method || 'voice']
    );

    const entry = entryResult.rows[0];

    // Process each item - lookup or create product
    const saleItems = [];
    for (const item of items) {
      const productName = item.product_name.trim();
      const qty = Number(item.quantity);
      const price = Number(item.unit_price);
      const lineTotal = item.line_total || (qty * price);

      // Try to find existing product (case-insensitive)
      let productResult = await client.query(
        `SELECT id, name FROM products WHERE LOWER(name) = LOWER($1) AND is_active = true LIMIT 1`,
        [productName]
      );

      let productId;
      if (productResult.rows.length > 0) {
        // Product exists
        productId = productResult.rows[0].id;
      } else {
        // Create new product
        const newProductResult = await client.query(
          `INSERT INTO products (name, unit, is_active)
           VALUES ($1, 'piece', true)
           RETURNING id, name`,
          [productName]
        );
        productId = newProductResult.rows[0].id;
      }

      // Insert sale item
      const itemResult = await client.query(
        `INSERT INTO sale_items (sales_entry_id, product_id, product_name_snapshot, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, sales_entry_id, product_id, product_name_snapshot, quantity, unit_price, line_total, created_at`,
        [entry.id, productId, productName, qty, price, lineTotal]
      );

      saleItems.push(itemResult.rows[0]);
    }

    await client.query('COMMIT');

    // Return entry with items
    res.status(201).json({
      ...entry,
      items: saleItems,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/v1/sales-entries - Create a new sales entry with items
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { shop_id, business_date, items, input_method } = req.body;

    // Validation
    if (!shop_id) return res.status(400).json({ error: 'shop_id is required' });
    if (!business_date) return res.status(400).json({ error: 'business_date is required' });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Validate each item
    for (const item of items) {
      if (!item.product_id) {
        return res.status(400).json({ error: 'product_id is required for each item' });
      }
      const qty = Number(item.quantity);
      const price = Number(item.unit_price);
      if (!qty || qty <= 0) {
        return res.status(400).json({ error: 'quantity must be positive' });
      }
      if (price === undefined || price < 0) {
        return res.status(400).json({ error: 'unit_price must be non-negative' });
      }
    }

    // Use transaction to ensure atomicity
    await client.query('BEGIN');

    // Create sales entry
    const entryResult = await client.query(
      `INSERT INTO sales_entries (shop_id, business_date, status, input_method)
       VALUES ($1, $2, 'confirmed', $3)
       RETURNING id, shop_id, business_date, status, input_method, created_at, updated_at`,
      [shop_id, business_date, input_method || 'manual']
    );

    const entry = entryResult.rows[0];

    // Insert all sale items
    const saleItems = [];
    for (const item of items) {
      const qty = Number(item.quantity);
      const price = Number(item.unit_price);
      const lineTotal = qty * price;

      const itemResult = await client.query(
        `INSERT INTO sale_items (sales_entry_id, product_id, product_name_snapshot, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, sales_entry_id, product_id, product_name_snapshot, quantity, unit_price, line_total, created_at`,
        [entry.id, item.product_id, item.product_name_snapshot, qty, price, lineTotal]
      );

      saleItems.push(itemResult.rows[0]);
    }

    await client.query('COMMIT');

    // Return entry with items
    res.status(201).json({
      ...entry,
      items: saleItems,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/v1/sales-entries?shopId=&date= - Get sales entries with filters
router.get('/', async (req, res, next) => {
  try {
    const { shopId, date } = req.query;
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (shopId) {
      conditions.push(`se.shop_id = $${paramCount++}`);
      values.push(shopId);
    }
    if (date) {
      conditions.push(`se.business_date = $${paramCount++}`);
      values.push(date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get entries with their items in one query using JSON aggregation
    const result = await pool.query(
      `SELECT se.id, se.shop_id, se.business_date, se.status, se.input_method,
              se.created_at, se.updated_at,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', si.id,
                    'product_id', si.product_id,
                    'product_name_snapshot', si.product_name_snapshot,
                    'quantity', si.quantity,
                    'unit_price', si.unit_price,
                    'line_total', si.line_total,
                    'created_at', si.created_at
                  ) ORDER BY si.id
                ) FILTER (WHERE si.id IS NOT NULL),
                '[]'
              ) as items
       FROM sales_entries se
       LEFT JOIN sale_items si ON si.sales_entry_id = se.id
       ${whereClause}
       GROUP BY se.id
       ORDER BY se.business_date DESC, se.created_at DESC`,
      values
    );

    res.json({ sales_entries: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/sales-entries/:id - Get single sales entry
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT se.id, se.shop_id, se.business_date, se.status, se.input_method,
              se.created_at, se.updated_at,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', si.id,
                    'product_id', si.product_id,
                    'product_name_snapshot', si.product_name_snapshot,
                    'quantity', si.quantity,
                    'unit_price', si.unit_price,
                    'line_total', si.line_total,
                    'created_at', si.created_at
                  ) ORDER BY si.id
                ) FILTER (WHERE si.id IS NOT NULL),
                '[]'
              ) as items
       FROM sales_entries se
       LEFT JOIN sale_items si ON si.sales_entry_id = se.id
       WHERE se.id = $1
       GROUP BY se.id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sales entry not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/sales-entries/:id - Update sales entry items
router.patch('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    // Check entry exists and is editable
    const entryCheck = await client.query(
      'SELECT id, status FROM sales_entries WHERE id = $1',
      [req.params.id]
    );

    if (entryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Sales entry not found' });
    }

    const entry = entryCheck.rows[0];

    if (entry.status === 'invoiced') {
      return res.status(400).json({ error: 'Cannot edit an invoiced entry' });
    }
    if (entry.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot edit a cancelled entry' });
    }

    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'items array is required' });
    }

    await client.query('BEGIN');

    // Delete existing items
    await client.query('DELETE FROM sale_items WHERE sales_entry_id = $1', [req.params.id]);

    // Insert new items
    const saleItems = [];
    for (const item of items) {
      const qty = Number(item.quantity);
      const price = Number(item.unit_price);
      const lineTotal = qty * price;

      const itemResult = await client.query(
        `INSERT INTO sale_items (sales_entry_id, product_id, product_name_snapshot, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, sales_entry_id, product_id, product_name_snapshot, quantity, unit_price, line_total, created_at`,
        [req.params.id, item.product_id, item.product_name_snapshot, qty, price, lineTotal]
      );

      saleItems.push(itemResult.rows[0]);
    }

    // Update timestamp
    await client.query(
      'UPDATE sales_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [req.params.id]
    );

    await client.query('COMMIT');

    // Get updated entry
    const updated = await client.query(
      `SELECT se.id, se.shop_id, se.business_date, se.status, se.input_method,
              se.created_at, se.updated_at
       FROM sales_entries se
       WHERE se.id = $1`,
      [req.params.id]
    );

    res.json({
      ...updated.rows[0],
      items: saleItems,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/v1/sales-entries/:id/cancel - Cancel a sales entry
router.post('/:id/cancel', async (req, res, next) => {
  try {
    // Check if entry is invoiced
    const entryCheck = await pool.query(
      'SELECT id, status FROM sales_entries WHERE id = $1',
      [req.params.id]
    );

    if (entryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Sales entry not found' });
    }

    if (entryCheck.rows[0].status === 'invoiced') {
      return res.status(400).json({ error: 'Cannot cancel an invoiced entry' });
    }

    const result = await pool.query(
      `UPDATE sales_entries
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, shop_id, business_date, status, input_method, created_at, updated_at`,
      [req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
