
import { config } from 'dotenv';
config({ path: '.env' });

import { db } from '../db';
import { storeUsers as users } from '../db/schema';

const run = async () => {
    try {
        console.log('Attempting to select users...');
        const allUsers = await db.select().from(users);
        console.log('Users selected successfully:', allUsers);
    } catch (e) {
        console.error('Drizzle Query failed:', e);
    }
};

run();
