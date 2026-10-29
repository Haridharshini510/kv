const { Router } = require('express');
const pool = require('../db/connection');

const router = Router();

// Generate invoice number with date prefix: YYYYMMDD-001
async function generateInvoiceNumber(businessDate, client) {
  const dateStr = businessDate.replace(/-/g, '');

  // Get the highest sequence number for this date
  const result = await client.query(
    `SELECT invoice_number FROM invoices
     WHERE invoice_number LIKE $1
     ORDER BY invoice_number DESC
     LIMIT 1`,
    [`${dateStr}-%`]
  );

  let seq = 1;
  if (result.rows.length > 0) {
    const lastNumber = result.rows[0].invoice_number;
    const lastSeq = parseInt(lastNumber.split('-')[1], 10);
    seq = lastSeq + 1;
  }

  return `${dateStr}-${String(seq).padStart(3, '0')}`;
}

// GET /api/v1/invoices?date= - List invoices with optional date filter
router.get('/', async (req, res, next) => {
  try {
    const { date } = req.query;
    const conditions = [];
    const values = [];

    if (date) {
      conditions.push('business_date = $1');
      values.push(date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT i.id, i.invoice_number, i.shop_id, i.business_date, i.status,
              i.subtotal, i.grand_total, i.created_at, i.finalized_at,
              s.name as shop_name
       FROM invoices i
       JOIN shops s ON s.id = i.shop_id
       ${whereClause}
       ORDER BY i.business_date DESC, i.created_at DESC`,
      values
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/invoices/:id - Get invoice details with items
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT i.id, i.invoice_number, i.shop_id, i.business_date, i.status,
              i.subtotal, i.grand_total, i.created_at, i.finalized_at,
              s.name as shop_name, s.phone as shop_phone, s.address as shop_address,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', ii.id,
                    'product_name', ii.product_name,
                    'quantity', ii.quantity,
                    'unit_price', ii.unit_price,
                    'line_total', ii.line_total
                  ) ORDER BY ii.id
                ) FILTER (WHERE ii.id IS NOT NULL),
                '[]'
              ) as items
       FROM invoices i
       JOIN shops s ON s.id = i.shop_id
       LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
       WHERE i.id = $1
       GROUP BY i.id, s.name, s.phone, s.address`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/invoices/daily - Generate/prepare a daily invoice for a shop
router.post('/daily', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { shop_id, business_date } = req.body;

    if (!shop_id) {
      return res.status(400).json({ error: 'shop_id is required' });
    }
    if (!business_date) {
      return res.status(400).json({ error: 'business_date is required' });
    }

    await client.query('BEGIN');

    // Check for existing invoice
    const existingCheck = await client.query(
      `SELECT id, invoice_number, status FROM invoices
       WHERE shop_id = $1 AND business_date = $2 AND status != 'cancelled'`,
      [shop_id, business_date]
    );

    if (existingCheck.rows.length > 0) {
      const existing = existingCheck.rows[0];
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'An invoice already exists for this shop and date',
        invoice_id: existing.id,
        invoice_number: existing.invoice_number,
        status: existing.status,
      });
    }

    // Get all confirmed sales entries for this shop and date
    const salesEntries = await client.query(
      `SELECT se.id, si.product_name_snapshot, si.quantity, si.unit_price, si.line_total
       FROM sales_entries se
       JOIN sale_items si ON si.sales_entry_id = se.id
       WHERE se.shop_id = $1
         AND se.business_date = $2
         AND se.status = 'confirmed'
       ORDER BY se.id, si.id`,
      [shop_id, business_date]
    );

    if (salesEntries.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'No confirmed sales entries found for this shop and date',
      });
    }

    // Calculate totals
    const items = salesEntries.rows;
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.line_total), 0);
    const grandTotal = subtotal; // Can add taxes/discounts here later

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(business_date, client);

    // Create invoice
    const invoiceResult = await client.query(
      `INSERT INTO invoices (invoice_number, shop_id, business_date, status, subtotal, grand_total)
       VALUES ($1, $2, $3, 'draft', $4, $5)
       RETURNING id, invoice_number, shop_id, business_date, status, subtotal, grand_total, created_at, finalized_at`,
      [invoiceNumber, shop_id, business_date, subtotal, grandTotal]
    );

    const invoice = invoiceResult.rows[0];

    // Insert invoice items (snapshot)
    for (const item of items) {
      await client.query(
        `INSERT INTO invoice_items (invoice_id, product_name, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5)`,
        [invoice.id, item.product_name_snapshot, item.quantity, item.unit_price, item.line_total]
      );
    }

    await client.query('COMMIT');

    // Get complete invoice with items
    const completeInvoice = await client.query(
      `SELECT i.id, i.invoice_number, i.shop_id, i.business_date, i.status,
              i.subtotal, i.grand_total, i.created_at, i.finalized_at,
              s.name as shop_name,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', ii.id,
                    'product_name', ii.product_name,
                    'quantity', ii.quantity,
                    'unit_price', ii.unit_price,
                    'line_total', ii.line_total
                  ) ORDER BY ii.id
                ) FILTER (WHERE ii.id IS NOT NULL),
                '[]'
              ) as items
       FROM invoices i
       JOIN shops s ON s.id = i.shop_id
       LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
       WHERE i.id = $1
       GROUP BY i.id, s.name`,
      [invoice.id]
    );

    res.status(201).json(completeInvoice.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// POST /api/v1/invoices/:id/finalize - Finalize an invoice
router.post('/:id/finalize', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get invoice
    const invoiceCheck = await client.query(
      'SELECT id, shop_id, business_date, status FROM invoices WHERE id = $1',
      [req.params.id]
    );

    if (invoiceCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceCheck.rows[0];

    if (invoice.status === 'finalized') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Invoice is already finalized' });
    }

    if (invoice.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot finalize a cancelled invoice' });
    }

    // Finalize invoice
    await client.query(
      `UPDATE invoices
       SET status = 'finalized', finalized_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [req.params.id]
    );

    // Mark all related sales entries as invoiced
    await client.query(
      `UPDATE sales_entries
       SET status = 'invoiced'
       WHERE shop_id = $1
         AND business_date = $2
         AND status = 'confirmed'`,
      [invoice.shop_id, invoice.business_date]
    );

    await client.query('COMMIT');

    // Return updated invoice
    const result = await client.query(
      `SELECT i.id, i.invoice_number, i.shop_id, i.business_date, i.status,
              i.subtotal, i.grand_total, i.created_at, i.finalized_at,
              s.name as shop_name,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', ii.id,
                    'product_name', ii.product_name,
                    'quantity', ii.quantity,
                    'unit_price', ii.unit_price,
                    'line_total', ii.line_total
                  ) ORDER BY ii.id
                ) FILTER (WHERE ii.id IS NOT NULL),
                '[]'
              ) as items
       FROM invoices i
       JOIN shops s ON s.id = i.shop_id
       LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
       WHERE i.id = $1
       GROUP BY i.id, s.name`,
      [req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/v1/invoices/:id/print - Get invoice in print format
router.get('/:id/print', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT i.id, i.invoice_number, i.shop_id, i.business_date, i.status,
              i.subtotal, i.grand_total, i.created_at, i.finalized_at,
              s.name as shop_name, s.phone as shop_phone, s.address as shop_address,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', ii.id,
                    'product_name', ii.product_name,
                    'quantity', ii.quantity,
                    'unit_price', ii.unit_price,
                    'line_total', ii.line_total
                  ) ORDER BY ii.id
                ) FILTER (WHERE ii.id IS NOT NULL),
                '[]'
              ) as items
       FROM invoices i
       JOIN shops s ON s.id = i.shop_id
       LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
       WHERE i.id = $1
       GROUP BY i.id, s.name, s.phone, s.address`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = result.rows[0];

    // Return in print-friendly format
    res.json({
      ...invoice,
      _format: 'printable',
      print_date: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
