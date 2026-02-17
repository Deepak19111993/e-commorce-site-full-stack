
import { Hono } from 'hono';
import { db } from '@/db';
import { orders, orderItems } from '@/db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();

app.get('/', async (c) => {
    try {
        const role = c.req.header('X-User-Role');
        const userId = c.req.header('X-User-Id');

        if (!role || !userId) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        let query = db.query.orders.findMany({
            with: {
                user: true,
                items: {
                    with: {
                        product: true
                    }
                }
            },
            orderBy: (orders, { desc }) => [desc(orders.createdAt)],
            // If not admin, filter by userId
            where: role !== 'admin' ? (orders, { eq }) => eq(orders.userId, userId) : undefined
        });

        const allOrders = await query;
        return c.json(allOrders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        return c.json({ error: "Failed to fetch orders" }, 500);
    }
});

app.post('/', async (c) => {
    try {
        const body = await c.req.json();
        // Simple order creation logic (transaction handling can be added later)
        const newOrder = await db.insert(orders).values({
            userId: body.userId,
            total: body.total,
            status: 'processing',
            paymentMethod: body.paymentMethod || 'cod'
        }).returning();

        // Insert items if provided
        if (body.items && Array.isArray(body.items)) {
            const items = body.items.map((item: any) => ({
                orderId: newOrder[0].id,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price
            }));
            await db.insert(orderItems).values(items);
        }

        return c.json(newOrder[0], 201);
    } catch (error) {
        console.error("Error creating order:", error);
        return c.json({ error: "Failed to create order" }, 500);
    }
});

app.put('/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    const role = c.req.header('X-User-Role');
    const body = await c.req.json();

    if (role !== 'admin') {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    if (!body.status) {
        return c.json({ error: 'Status is required' }, 400);
    }

    try {
        const updatedOrder = await db.update(orders)
            .set({ status: body.status })
            .where(eq(orders.id, id))
            .returning();

        if (updatedOrder.length === 0) {
            return c.json({ error: 'Order not found' }, 404);
        }

        return c.json(updatedOrder[0]);
    } catch (e) {
        console.error('Error updating order:', e);
        return c.json({ error: 'Failed to update order' }, 500);
    }
});

app.delete('/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    const userId = c.req.header('X-User-Id');
    const role = c.req.header('X-User-Role');

    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        // Fetch the order to check status and ownership
        const order = await db.query.orders.findFirst({
            where: eq(orders.id, id),
        });

        if (!order) {
            return c.json({ error: 'Order not found' }, 404);
        }

        // Check ownership (unless admin)
        if (role !== 'admin' && order.userId !== userId) {
            return c.json({ error: 'Unauthorized' }, 403);
        }

        // Check status
        if (order.status !== 'processing') {
            return c.json({ error: 'Cannot cancel order that is not processing' }, 400);
        }

        // Delete order items first (foreign key constraint)
        await db.delete(orderItems).where(eq(orderItems.orderId, id));

        // Delete order
        await db.delete(orders).where(eq(orders.id, id));

        return c.json({ message: 'Order cancelled successfully' });
    } catch (error) {
        console.error("Error cancelling order:", error);
        return c.json({ error: "Failed to cancel order" }, 500);
    }
});

export default app;
