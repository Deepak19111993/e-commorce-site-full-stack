
import { Hono } from 'hono';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();

app.get('/', async (c) => {
    const role = c.req.header('X-User-Role');
    if (role !== 'admin') {
        return c.json({ error: 'Forbidden' }, 403);
    }
    const allUsers = await db.select().from(users);
    return c.json(allUsers);
});

app.post('/', async (c) => {
    const role = c.req.header('X-User-Role');
    if (role !== 'admin') {
        return c.json({ error: 'Forbidden' }, 403);
    }
    const body = await c.req.json();
    const newUser = await db.insert(users).values(body).returning();
    return c.json(newUser[0], 201);
});

app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const user = await db.select().from(users).where(eq(users.id, id));
    if (user.length === 0) return c.json({ error: 'User not found' }, 404);
    return c.json(user[0]);
});

app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const requestorRole = c.req.header('X-User-Role');
    const requestorId = c.req.header('X-User-Id');

    if (!requestorRole || !requestorId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    // Allow if Admin OR if deleting self
    if (requestorRole !== 'admin' && requestorId !== id) {
        return c.json({ error: 'Forbidden' }, 403);
    }

    try {
        // Delete dependencies first if necessary (e.g. orders)
        // For now, relying on cascade or manual deletion if foreign keys exist
        // But better to be safe given previous schema issues
        // We'll just try deleting the user. 
        // If dependent tables exist without ON DELETE CASCADE, this might fail.
        // Given reset-db.js dropped tables with CASCADE, we might need to assume 
        // standard behavior or specific cleanup.
        // Let's assume standard delete for now.

        const deleted = await db.delete(users).where(eq(users.id, id)).returning();
        if (deleted.length === 0) return c.json({ error: 'User not found' }, 404);

        return c.json({ message: 'User deleted successfully' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default app;
