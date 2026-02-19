
import { Hono } from 'hono';
import { db } from '@/db';
import { parkingUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();

app.get('/', async (c) => {
    const role = c.req.header('X-User-Role');
    if (role !== 'admin') {
        return c.json({ error: 'Forbidden' }, 403);
    }
    const allUsers = await db.select().from(parkingUsers);
    return c.json(allUsers);
});

app.post('/', async (c) => {
    const role = c.req.header('X-User-Role');
    if (role !== 'admin') {
        return c.json({ error: 'Forbidden' }, 403);
    }
    const body = await c.req.json();
    const newUser = await db.insert(parkingUsers).values(body).returning();
    return c.json(newUser[0], 201);
});

app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const user = await db.select().from(parkingUsers).where(eq(parkingUsers.id, id));
    if (user.length === 0) return c.json({ error: 'User not found' }, 404);
    return c.json(user[0]);
});

app.put('/:id', async (c) => {
    const id = c.req.param('id');
    const requestorId = c.req.header('X-User-Id');
    const body = await c.req.json();

    if (requestorId !== id) {
        return c.json({ error: 'Forbidden' }, 403);
    }

    try {
        const updatedUser = await db.update(parkingUsers)
            .set(body)
            .where(eq(parkingUsers.id, id))
            .returning();

        if (updatedUser.length === 0) return c.json({ error: 'User not found' }, 404);
        return c.json(updatedUser[0]);
    } catch (e) {
        return c.json({ error: 'Failed to update user' }, 500);
    }
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
        const deleted = await db.delete(parkingUsers).where(eq(parkingUsers.id, id)).returning();
        if (deleted.length === 0) return c.json({ error: 'User not found' }, 404);

        return c.json({ message: 'User deleted successfully' });
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

export default app;
