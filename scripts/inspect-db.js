const postgres = require('postgres');
require('dotenv').config();

const run = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is missing');
    }
    const sql = postgres(process.env.DATABASE_URL);

    console.log('Checking columns for users table...');
    try {
        const columns = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `;
        console.log('Columns in users table:', columns);

        const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        `;
        console.log('Tables in public schema:', tables.map(t => t.table_name));

    } catch (e) {
        console.error('Error checking schema:', e);
    } finally {
        await sql.end();
    }
};

run();
