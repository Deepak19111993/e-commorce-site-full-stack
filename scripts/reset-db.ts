import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../db';

async function reset() {
    console.log('Dropping tables...');
    await db.execute(sql`DROP TABLE IF EXISTS order_items CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS orders CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS products CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);
    console.log('Tables dropped.');
    process.exit(0);
}

reset().catch((err) => {
    console.error(err);
    process.exit(1);
});
