const postgres = require('postgres');
require('dotenv').config();

const run = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is missing');
    }
    const sql = postgres(process.env.DATABASE_URL);

    console.log('Dropping tables...');
    try {
        await sql`DROP TABLE IF EXISTS "order_items", "orders", "products", "users" CASCADE`;
        console.log('Tables dropped successfully');
    } catch (e) {
        console.error('Error dropping tables:', e);
    } finally {
        await sql.end();
    }
};

run();
