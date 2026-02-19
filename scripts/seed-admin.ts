
import 'dotenv/config';
import { db } from '../db';
import { storeUsers as users } from '../db/schema';

const run = async () => {
    try {
        console.log('Seeding admin user...');

        const adminUser = {
            name: 'Admin User',
            email: 'admin@test.com',
            password: 'admin',
            role: 'admin'
        };

        await db.insert(users).values(adminUser);
        console.log(`Added admin user: ${adminUser.email}`);

        console.log('Seeding complete!');
        process.exit(0);
    } catch (e) {
        console.error('Seeding failed:', e);
        process.exit(1);
    }
};

run();
