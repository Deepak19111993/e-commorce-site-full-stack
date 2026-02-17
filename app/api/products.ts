
import { Hono } from 'hono';
import { db } from '@/db';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();

app.get('/', async (c) => {
    const allProducts = await db.select().from(products);
    return c.json(allProducts);
});

app.post('/', async (c) => {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const body = await c.req.json();
    const newProduct = await db.insert(products).values(body).returning();
    return c.json(newProduct[0], 201);
});

app.get('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const product = await db.select().from(products).where(eq(products.id, id));
    if (product.length === 0) return c.json({ error: 'Product not found' }, 404);
    return c.json(product[0]);
});

app.put('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.json();
    const updatedProduct = await db.update(products).set(body).where(eq(products.id, id)).returning();

    if (updatedProduct.length === 0) return c.json({ error: 'Product not found' }, 404);
    return c.json(updatedProduct[0]);
});

app.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'));
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const deleted = await db.delete(products).where(eq(products.id, id)).returning();
    if (deleted.length === 0) return c.json({ error: 'Product not found' }, 404);

    return c.json({ message: 'Product deleted successfully' });
});

export default app;
