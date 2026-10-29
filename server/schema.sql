-- KadaiVoice Database Schema
-- PostgreSQL 12+ required

-- Clean up existing tables (for development - be careful in production!)
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales_entries CASCADE;
DROP TABLE IF EXISTS shop_product_prices CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS shops CASCADE;

-- 1. Shops (customer shops)
CREATE TABLE shops (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products (catalogue)
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL, -- 'bag', 'kg', 'litre', 'piece'
  default_price NUMERIC(10, 2), -- use NUMERIC for money, not FLOAT
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Shop-specific pricing (optional override per shop)
CREATE TABLE shop_product_prices (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Prevent duplicate active prices for same shop+product on same date
  UNIQUE(shop_id, product_id, valid_from)
);

-- 4. Sales entries (daily transaction records)
CREATE TABLE sales_entries (
  id SERIAL PRIMARY KEY,
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  business_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed', -- 'draft', 'confirmed', 'invoiced', 'cancelled'
  input_method VARCHAR(20) DEFAULT 'manual', -- 'manual' or 'voice'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Sale items (products within each entry)
CREATE TABLE sale_items (
  id SERIAL PRIMARY KEY,
  sales_entry_id INTEGER NOT NULL REFERENCES sales_entries(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name_snapshot VARCHAR(255) NOT NULL, -- preserve name at time of sale
  quantity NUMERIC(10, 3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Invoices (consolidated daily bills)
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  shop_id INTEGER NOT NULL REFERENCES shops(id),
  business_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'finalized', 'cancelled'
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  grand_total NUMERIC(12, 2) NOT NULL CHECK (grand_total >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finalized_at TIMESTAMP,

  -- Only one finalized invoice per shop per date
  CONSTRAINT unique_finalized_invoice
    EXCLUDE (shop_id WITH =, business_date WITH =)
    WHERE (status = 'finalized')
);

-- 7. Invoice items (snapshot of items in finalized invoice)
CREATE TABLE invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(10, 3) NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  line_total NUMERIC(12, 2) NOT NULL
);

-- Indexes for common queries
CREATE INDEX idx_sales_entries_shop_date ON sales_entries(shop_id, business_date);
CREATE INDEX idx_sales_entries_date ON sales_entries(business_date);
CREATE INDEX idx_sales_entries_status ON sales_entries(status);
CREATE INDEX idx_invoices_shop_date ON invoices(shop_id, business_date);
CREATE INDEX idx_invoices_date ON invoices(business_date);
CREATE INDEX idx_sale_items_entry ON sale_items(sales_entry_id);
CREATE INDEX idx_shop_product_prices_lookup ON shop_product_prices(shop_id, product_id, valid_from);

-- Sample seed data
INSERT INTO shops (name, phone, address) VALUES
  ('Kumar Stores', '9876543210', 'Main Road'),
  ('Ramesh Stores', '9876543211', 'Market Street'),
  ('Lakshmi Kadai', '9876543212', 'Temple Road');

INSERT INTO products (name, unit, default_price) VALUES
  ('Rice Bag', 'bag', 1250.00),
  ('Sugar', 'kg', 45.00),
  ('Cooking Oil', 'litre', 180.00),
  ('Dal', 'kg', 120.00),
  ('Wheat Flour', 'bag', 650.00);

-- Sample shop-specific price (Kumar Stores gets Rice Bag cheaper)
INSERT INTO shop_product_prices (shop_id, product_id, unit_price) VALUES
  (1, 1, 1200.00); -- Kumar Stores: Rice Bag at ₹1200 instead of ₹1250
