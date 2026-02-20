
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { stations } from '../db/schema';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env' });

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

async function seed() {
    console.log('Seeding stations...');
    try {
        const jsonPath = path.join(process.cwd(), 'scripts', 'stations.json');
        const fileContent = fs.readFileSync(jsonPath, 'utf-8');
        const stationData = JSON.parse(fileContent);

        // Transform data to match schema
        // The JSON source structure needs to be checked.
        // Assuming array of objects. Let's inspect first if needed, but for now assuming standard keys or mapping them.
        // Most station jsons have 'code' and 'name'.

        const records = stationData.map((s: any) => ({
            code: s.Station_Code,
            name: s.Station_Name,
        })).filter((s: { code: any; name: any; }) => s.code && s.name);

        console.log(`Found ${records.length} stations to insert.`);

        // Batch insert to avoid huge query
        const batchSize = 1000;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            await db.insert(stations).values(batch).onConflictDoNothing().execute();
            console.log(`Inserted batch ${i / batchSize + 1}`);
        }

        console.log('Seeding completed!');
    } catch (error) {
        console.error('Error seeding stations:', error);
    } finally {
        await client.end();
    }
}

seed();
