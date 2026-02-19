
import { Hono } from 'hono';
import { db } from '@/db';
import { storeUsers, parkingUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();

app.post('/login', async (c) => {
    const { email, password, type } = await c.req.json();
    // Validate
    let user;
    if (type === 'parking') {
        user = await db.select().from(parkingUsers).where(eq(parkingUsers.email, email));
    } else {
        user = await db.select().from(storeUsers).where(eq(storeUsers.email, email));
    }

    if (!user.length || user[0].password !== password) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }
    // Simple response for now (JWT/Session normally here)
    const userData = { ...user[0], type: type || 'store' };
    return c.json({ user: userData });
});

app.post('/signup', async (c) => {
    const { name, email, password, role, type } = await c.req.json();
    // Validate role
    if (role && !['user', 'admin'].includes(role)) {
        return c.json({ error: 'Invalid role' }, 400);
    }
    try {
        let newUser;
        if (type === 'parking') {
            newUser = await db.insert(parkingUsers).values({
                name,
                email,
                password,
                role: role || 'user',
            }).returning();
        } else {
            newUser = await db.insert(storeUsers).values({
                name,
                email,
                password,
                role: role || 'user',
            }).returning();
        }
        const userData = { ...newUser[0], type: type || 'store' };
        return c.json({ user: userData }, 201);
    } catch (e) {
        return c.json({ error: 'User already exists' }, 400);
    }
});

export default app;
