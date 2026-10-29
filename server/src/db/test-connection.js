require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('./connection');

async function testConnection() {
  try {
    console.log('Testing database connection...\n');

    // Test basic connection
    const client = await pool.connect();
    console.log('✓ Database connection successful');

    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('✓ Query successful, current time:', result.rows[0].now);

    // Test tables exist
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n✓ Tables found:');
    tables.rows.forEach(row => console.log('  -', row.table_name));

    // Test sample data
    const shops = await client.query('SELECT COUNT(*) FROM shops');
    const products = await client.query('SELECT COUNT(*) FROM products');
    const shopPrices = await client.query('SELECT COUNT(*) FROM shop_product_prices');

    console.log('\n✓ Sample data loaded:');
    console.log(`  - ${shops.rows[0].count} shops`);
    console.log(`  - ${products.rows[0].count} products`);
    console.log(`  - ${shopPrices.rows[0].count} shop-specific prices`);

    // Test a shop-specific price query
    const priceTest = await client.query(`
      SELECT s.name as shop, p.name as product, spp.unit_price as special_price, p.default_price
      FROM shop_product_prices spp
      JOIN shops s ON s.id = spp.shop_id
      JOIN products p ON p.id = spp.product_id
    `);

    if (priceTest.rows.length > 0) {
      console.log('\n✓ Shop-specific pricing example:');
      priceTest.rows.forEach(row => {
        console.log(`  - ${row.shop}: ${row.product} @ ₹${row.special_price} (default: ₹${row.default_price})`);
      });
    }

    client.release();
    console.log('\n✅ All database tests passed!\n');
    console.log('Next steps:');
    console.log('  1. Start server: npm start');
    console.log('  2. Test API endpoints');
    console.log('  3. Connect frontend\n');

    process.exit(0);

  } catch (err) {
    console.error('\n❌ Database test failed:');
    console.error('Error:', err.message);

    if (err.code === 'ECONNREFUSED') {
      console.error('\nTroubleshooting:');
      console.error('  - Is PostgreSQL running?');
      console.error('  - Check DB_HOST and DB_PORT in .env');
    } else if (err.code === '28P01') {
      console.error('\nTroubleshooting:');
      console.error('  - Check DB_USER and DB_PASSWORD in .env');
    } else if (err.code === '3D000') {
      console.error('\nTroubleshooting:');
      console.error('  - Database does not exist. Create it first:');
      console.error('    psql -U postgres -c "CREATE DATABASE kadaivoice;"');
    } else if (err.message.includes('relation') && err.message.includes('does not exist')) {
      console.error('\nTroubleshooting:');
      console.error('  - Tables not created. Run schema:');
      console.error('    psql -U postgres -d kadaivoice -f schema.sql');
    }

    console.error('');
    process.exit(1);
  }
}

testConnection();
