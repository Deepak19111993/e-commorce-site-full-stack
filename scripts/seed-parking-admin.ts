import 'dotenv/config';
import { db } from '../db';
import { parkingUsers } from '../db/schema';
import { eq } from 'drizzle-orm';

async function run() {
    console.log('Seeding parking admin user...');

    const email = 'admin@test.com';
    const existing = await db.select().from(parkingUsers).where(eq(parkingUsers.email, email));

    if (existing.length > 0) {
        console.log('Admin already exists in parking_users. Updating role to admin...');
        await db.update(parkingUsers).set({ role: 'admin' }).where(eq(parkingUsers.email, email));
    } else {
        await db.insert(parkingUsers).values({
            name: 'Admin User',
            email: email,
            password: 'admin',
            role: 'admin',
        });
        console.log('Added: Admin User');
    }

    console.log('Seeding complete!');
    process.exit(0);
}

run().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
