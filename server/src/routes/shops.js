const { Router } = require('express');
const pool = require('../db/connection');

const router = Router();

// GET /api/v1/shops - List active shops
router.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, phone, address, is_active, created_at FROM shops WHERE is_active = TRUE ORDER BY name'
    );
    res.json({ shops: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/shops/today-summary - Get today's summary per shop
router.get('/today-summary', async (_req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT
        s.id as shop_id,
        s.name,
        COUNT(DISTINCT se.id) as entry_count,
        COUNT(si.id) as item_count,
        COALESCE(SUM(si.line_total), 0) as total
       FROM shops s
       LEFT JOIN sales_entries se ON se.shop_id = s.id
         AND se.business_date = $1
         AND se.status = 'confirmed'
       LEFT JOIN sale_items si ON si.sales_entry_id = se.id
       WHERE s.is_active = TRUE
       GROUP BY s.id, s.name
       ORDER BY s.name`,
      [today]
    );

    res.json({ summary: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/shops - Create a new shop
router.post('/', async (req, res, next) => {
  try {
    const { name, phone, address } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Shop name is required' });
    }

    const result = await pool.query(
      `INSERT INTO shops (name, phone, address, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, name, phone, address, is_active, created_at`,
      [name.trim(), phone || null, address || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/shops/:id - Get shop details
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, phone, address, is_active, created_at FROM shops WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/shops/:id - Update shop details
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, phone, address, is_active } = req.body;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(address);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE shops SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, phone, address, is_active, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/shops/:id/prices - Get shop-specific prices
router.get('/:id/prices', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT spp.id, spp.product_id, p.name as product_name, p.unit,
              spp.unit_price, p.default_price, spp.valid_from, spp.valid_until
       FROM shop_product_prices spp
       JOIN products p ON p.id = spp.product_id
       WHERE spp.shop_id = $1
       ORDER BY p.name`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/shops/:id/products/:productId/price - Set shop-specific price
router.put('/:id/products/:productId/price', async (req, res, next) => {
  try {
    const { unit_price, valid_from } = req.body;
    const shopId = req.params.id;
    const productId = req.params.productId;

    if (!unit_price || unit_price < 0) {
      return res.status(400).json({ error: 'Valid unit_price is required' });
    }

    // Check if shop and product exist
    const shopCheck = await pool.query('SELECT id FROM shops WHERE id = $1', [shopId]);
    const productCheck = await pool.query('SELECT id FROM products WHERE id = $1', [productId]);

    if (shopCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const result = await pool.query(
      `INSERT INTO shop_product_prices (shop_id, product_id, unit_price, valid_from)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (shop_id, product_id, valid_from)
       DO UPDATE SET unit_price = $3
       RETURNING id, shop_id, product_id, unit_price, valid_from, valid_until`,
      [shopId, productId, unit_price, valid_from || new Date().toISOString().split('T')[0]]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
