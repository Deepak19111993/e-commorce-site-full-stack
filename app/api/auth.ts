
import { Hono } from 'hono';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();

app.post('/login', async (c) => {
    const { email, password } = await c.req.json();
    // Validate
    const user = await db.select().from(users).where(eq(users.email, email));
    if (!user.length || user[0].password !== password) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }
    // Simple response for now (JWT/Session normally here)
    return c.json({ user: user[0] });
});

app.post('/signup', async (c) => {
    const { name, email, password, role } = await c.req.json();
    // Validate role
    if (role && !['user', 'admin'].includes(role)) {
        return c.json({ error: 'Invalid role' }, 400);
    }
    try {
        const newUser = await db.insert(users).values({
            name,
            email,
            password,
            role: role || 'user',
        }).returning();
        return c.json({ user: newUser[0] }, 201);
    } catch (e) {
        return c.json({ error: 'User already exists' }, 400);
    }
});

export default app;
