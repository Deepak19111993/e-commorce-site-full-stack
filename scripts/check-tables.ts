
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing');
}

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client, { schema });

async function check() {
    try {
        const dbInfo = await client`SELECT current_database(), current_user, current_setting('port') as port`;
        console.log('--- Database Connection Info ---');
        console.log('DB Name:   ', dbInfo[0].current_database);
        console.log('User:      ', dbInfo[0].current_user);
        console.log('Port:      ', dbInfo[0].port);
        console.log('---');

        const result = await client`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    `;
        console.log('Found Tables:', result.map(r => r.table_name));

        // Check specific table
        const stationsTable = result.find(r => r.table_name === 'stations');
        if (stationsTable) {
            console.log('\n✅ "stations" table exists.');
            const count = await client`SELECT count(*) FROM stations`;
            console.log(`   Row count: ${count[0].count}`);
        } else {
            console.error('\n❌ "stations" table NOT found.');
        }

    } catch (error) {
        console.error('Error checking tables:', error);
    } finally {
        await client.end();
    }
}

check();
