
import { Hono } from 'hono';
import { db } from '@/db';
import { products } from '@/db/schema';
import { eq, gte, lte, gt, and, asc } from 'drizzle-orm';

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
        allProducts = await db.select().from(products).where(and(...conditions)).orderBy(asc(products.id));
    } else {
        allProducts = await db.select().from(products).orderBy(asc(products.id));
    }

    return c.json(allProducts);
});

app.post('/', async (c) => {
    const userId = c.req.header('X-User-Id');
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    try {
        const body = await c.req.json();

        if (!body.name || !body.price) {
            return c.json({ error: 'Name and Price are required' }, 400);
        }

        const productData = {
            name: body.name,
            description: body.description,
            category: body.category,
            price: String(body.price),
            stock: Number(body.stock),
            image: body.image
        };
        const newProduct = await db.insert(products).values(productData).returning();
        return c.json(newProduct[0], 201);
    } catch (error) {
        console.error('Error creating product:', error);
        return c.json({ error: 'Failed to create product', details: String(error) }, 500);
    }
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

    try {
        const body = await c.req.json();
        const productData = {
            name: body.name,
            description: body.description,
            category: body.category,
            price: String(body.price),
            stock: Number(body.stock),
            image: body.image
        };
        const updatedProduct = await db.update(products).set(productData).where(eq(products.id, id)).returning();

        if (updatedProduct.length === 0) return c.json({ error: 'Product not found' }, 404);
        return c.json(updatedProduct[0]);
    } catch (error) {
        console.error('Error updating product:', error);
        return c.json({ error: 'Failed to update product', details: String(error) }, 500);
    }
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
