
import { Hono } from 'hono';
import { db } from '@/db';
import { products } from '@/db/schema';
import { eq, gte, lte, gt, and } from 'drizzle-orm';

const app = new Hono();

app.get('/', async (c) => {
    const category = c.req.query('category');
    const minPrice = c.req.query('minPrice');
    const maxPrice = c.req.query('maxPrice');
    const inStock = c.req.query('inStock');

    const conditions: any[] = [];

    // Filter by category
    if (category && category !== 'All') {
        conditions.push(eq(products.category, category));
    }

    // Filter by price range
    if (minPrice) {
        conditions.push(gte(products.price, minPrice));
    }
    if (maxPrice) {
        conditions.push(lte(products.price, maxPrice));
    }

    // Filter by stock
    if (inStock === 'true') {
        conditions.push(gt(products.stock, 0));
    }

    // Build query with filters
    let allProducts;
    if (conditions.length > 0) {
        allProducts = await db.select().from(products).where(and(...conditions));
    } else {
        allProducts = await db.select().from(products);
    }

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

    try {
        const deleted = await db.delete(products).where(eq(products.id, id)).returning();
        if (deleted.length === 0) return c.json({ error: 'Product not found' }, 404);
        return c.json({ message: 'Product deleted successfully' });
    } catch (error: any) {
        // PostgreSQL error code for foreign key violation is 23503
        // Drizzle wraps the error in a 'cause' property
        if (error.cause?.code === '23503') {
            return c.json({
                error: 'Cannot delete product because it is associated with existing orders.'
            }, 409); // 409 Conflict
        }
        console.error('Delete error:', error);
        return c.json({ error: 'Failed to delete product' }, 500);
    }
});

export default app;
