const { Router } = require('express');
const pool = require('../db/connection');

const router = Router();

// GET /api/v1/products - List active products
router.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, unit, default_price, is_active, created_at FROM products WHERE is_active = TRUE ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/products - Create a new product
router.post('/', async (req, res, next) => {
  try {
    const { name, unit, default_price } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Product name is required' });
    }
    if (!unit || unit.trim().length === 0) {
      return res.status(400).json({ error: 'Unit is required' });
    }

    const priceValue = default_price ? parseFloat(default_price) : null;

    const result = await pool.query(
      `INSERT INTO products (name, unit, default_price, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, name, unit, default_price, is_active, created_at`,
      [name.trim(), unit.trim(), priceValue]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/products/:id - Get product details
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, unit, default_price, is_active, created_at FROM products WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/products/:id - Update product details
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, unit, default_price, is_active } = req.body;
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    if (unit !== undefined) {
      updates.push(`unit = $${paramCount++}`);
      values.push(unit.trim());
    }
    if (default_price !== undefined) {
      updates.push(`default_price = $${paramCount++}`);
      values.push(default_price ? parseFloat(default_price) : null);
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
      `UPDATE products SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, unit, default_price, is_active, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
