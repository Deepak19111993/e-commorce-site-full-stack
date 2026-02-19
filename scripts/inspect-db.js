/* eslint-disable */
const postgres = require('postgres');
require('dotenv').config();

const run = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is missing');
    }
    const sql = postgres(process.env.DATABASE_URL);

    try {
        const bookings = await sql`SELECT * FROM parking_bookings ORDER BY start_time`;
        console.log('Current Bookings:', bookings);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await sql.end();
    }
};

run();
