# Database Setup Guide

## Prerequisites

- PostgreSQL 12 or higher installed
- `psql` command-line tool available

## Installation Steps

### 1. Install PostgreSQL

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Run the installer
- Use default port **5432**
- Remember the password you set for the `postgres` superuser

**Verify installation:**
```bash
psql --version
```

You should see something like `psql (PostgreSQL) 14.x`

---

### 2. Create Database

Open a terminal and connect to PostgreSQL:

```bash
# Connect as postgres superuser
psql -U postgres
```

You'll be prompted for the password you set during installation.

**Inside the PostgreSQL prompt (`postgres=#`), run:**

```sql
-- Create the database
CREATE DATABASE kadaivoice;

-- Optional: Create a dedicated user for security
CREATE USER kadaivoice_user WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE kadaivoice TO kadaivoice_user;

-- Connect to the new database
\c kadaivoice

-- Grant schema privileges (PostgreSQL 15+ requires this)
GRANT ALL ON SCHEMA public TO kadaivoice_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kadaivoice_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kadaivoice_user;

-- Exit
\q
```

---

### 3. Create Tables

From the `server` directory, run the schema file:

```bash
# Make sure you're in the server directory
cd server

# Run the schema
psql -U postgres -d kadaivoice -f schema.sql
```

You should see output showing tables being created:
```
DROP TABLE
DROP TABLE
...
CREATE TABLE
CREATE TABLE
...
INSERT 0 3
INSERT 0 5
```

---

### 4. Verify Database Setup

Connect to the database:

```bash
psql -U postgres -d kadaivoice
```

**Run these verification commands:**

```sql
-- List all tables
\dt

-- Should show:
-- invoice_items, invoices, products, sale_items, sales_entries, 
-- shop_product_prices, shops

-- Check sample data
SELECT * FROM shops;
SELECT * FROM products;
SELECT * FROM shop_product_prices;

-- Exit
\q
```

---

### 5. Configure Environment Variables

Create `server/.env` file with your credentials:

```env
# Server Configuration
PORT=3000
APP_TOKEN=your-secret-token-change-this

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kadaivoice
DB_USER=postgres
# Or use: kadaivoice_user (if you created the dedicated user)
DB_PASSWORD=your_postgres_password_here
```

**Security note:** Never commit `.env` to git. It's already in `.gitignore`.

---

### 6. Install Dependencies and Test

```bash
# Install pg package
npm install

# Test database connection
npm run test:db
```

You should see:
```
✓ Database connection successful
✓ Query successful
✓ Tables found: ...
✓ Sample data loaded: 3 shops, 5 products
✅ All database tests passed!
```

---

### 7. Start the Server

```bash
npm run dev
```

Check the console for:
```
✓ Database pool connected
Server running on port 3000
```

---

## Common Issues

### Connection Refused

**Error:** `ECONNREFUSED`

**Solutions:**
- PostgreSQL service not running
- Start it: `pg_ctl start` (or use Windows Services app)
- Check if port 5432 is correct

---

### Authentication Failed

**Error:** `28P01: password authentication failed`

**Solutions:**
- Wrong password in `.env`
- Check `DB_USER` and `DB_PASSWORD`
- Try connecting manually: `psql -U postgres` to verify credentials

---

### Database Does Not Exist

**Error:** `3D000: database "kadaivoice" does not exist`

**Solution:**
```bash
psql -U postgres -c "CREATE DATABASE kadaivoice;"
```

---

### Tables Not Found

**Error:** `relation "shops" does not exist`

**Solution:**
```bash
# Run schema from server directory
psql -U postgres -d kadaivoice -f schema.sql
```

---

### Permission Denied on Schema

**Error:** `permission denied for schema public`

**Solution (PostgreSQL 15+):**
```sql
-- Connect as superuser
psql -U postgres -d kadaivoice

-- Grant permissions
GRANT ALL ON SCHEMA public TO kadaivoice_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kadaivoice_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kadaivoice_user;
```

---

## Database Management Commands

### Backup Database
```bash
pg_dump -U postgres kadaivoice > backup.sql
```

### Restore Database
```bash
psql -U postgres -d kadaivoice < backup.sql
```

### Reset Database (careful!)
```bash
psql -U postgres -d kadaivoice -f schema.sql
```

### View All Data
```bash
psql -U postgres -d kadaivoice -c "SELECT * FROM shops;"
psql -U postgres -d kadaivoice -c "SELECT * FROM products;"
```

---

## Next Steps

Once database setup is complete:

1. ✅ Database connected and tested
2. ⏭️ Test API endpoints (shops, products)
3. ⏭️ Connect React frontend
4. ⏭️ Test sales entry creation
5. ⏭️ Test invoice generation

---

## Schema Overview

```
shops (customer shops)
  ├── id, name, phone, address, is_active

products (product catalogue)
  ├── id, name, unit, default_price, is_active

shop_product_prices (shop-specific pricing overrides)
  ├── shop_id → shops.id
  ├── product_id → products.id
  └── unit_price, valid_from, valid_until

sales_entries (daily transaction records)
  ├── id, shop_id → shops.id
  ├── business_date, status, input_method
  └── created_at, updated_at

sale_items (line items in each entry)
  ├── sales_entry_id → sales_entries.id
  ├── product_id → products.id
  ├── product_name_snapshot (historical)
  └── quantity, unit_price, line_total

invoices (consolidated daily bills)
  ├── id, invoice_number (unique)
  ├── shop_id → shops.id
  ├── business_date, status
  └── subtotal, grand_total, finalized_at

invoice_items (snapshot of finalized invoice items)
  ├── invoice_id → invoices.id
  └── product_name, quantity, unit_price, line_total
```

---

For issues or questions, check the server logs or test with `npm run test:db`.
