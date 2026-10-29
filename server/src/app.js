const express = require('express');
const cors = require('cors');

const shopRoutes = require('./routes/shops');
const productRoutes = require('./routes/products');
const salesEntryRoutes = require('./routes/salesEntries');
const invoiceRoutes = require('./routes/invoices');
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');

const app = express();

// Allow CORS from Vite dev servers (usually 5173 or 5174)
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1/auth', authRoutes);

app.use('/api/v1/shops', authMiddleware, shopRoutes);
app.use('/api/v1/products', authMiddleware, productRoutes);
app.use('/api/v1/sales-entries', authMiddleware, salesEntryRoutes);
app.use('/api/v1/invoices', authMiddleware, invoiceRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

module.exports = app;
