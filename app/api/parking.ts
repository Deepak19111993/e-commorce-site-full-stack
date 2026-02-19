import { Hono } from 'hono';
import { db } from '@/db';
import { parkingBookings, transactions } from '@/db/schema';
import { eq, and, gt, lt, desc } from 'drizzle-orm';

const app = new Hono();

// GET /availability?start=ISO&end=ISO
app.get('/availability', async (c) => {
    const start = c.req.query('start');
    const end = c.req.query('end');

    if (!start || !end) {
        return c.json({ error: 'Missing start or end time' }, 400);
    }

    const startTime = new Date(start);
    const endTime = new Date(end);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return c.json({ error: 'Invalid date format' }, 400);
    }

    // Find overlapping bookings: (b.start < endTime) AND (b.end > startTime)
    // AND paymentStatus is NOT 'failed' (optional: depending on business logic, pending might block slots)
    // For now, let's assume pending blocks slots too to prevent double booking during payment
    const overlaps = await db.select().from(parkingBookings).where(
        and(
            lt(parkingBookings.startTime, endTime),
            gt(parkingBookings.endTime, startTime)
        )
    );

    const occupiedSlots = new Set(overlaps.map(b => b.slotId));
    // Total 20 slots (1-20)
    const allSlots = Array.from({ length: 20 }, (_, i) => i + 1);
    const availableSlots = allSlots.filter(id => !occupiedSlots.has(id));

    return c.json({ availableSlots });
});

// POST /book
// Creates a PENDING booking and transaction
app.post('/book', async (c) => {
    try {
        const { slotId, start, end } = await c.req.json();
        const userId = c.req.header('X-User-Id');

        if (!userId) return c.json({ error: 'Unauthorized' }, 401);
        if (!slotId || !start || !end) return c.json({ error: 'Missing fields' }, 400);

        const startTime = new Date(start);
        const endTime = new Date(end);

        if (endTime <= startTime) {
            return c.json({ error: 'End time must be after start time' }, 400);
        }

        // Check if slot is still available
        const overlaps = await db.select().from(parkingBookings).where(
            and(
                eq(parkingBookings.slotId, slotId),
                lt(parkingBookings.startTime, endTime),
                gt(parkingBookings.endTime, startTime)
            )
        );

        if (overlaps.length > 0) {
            return c.json({ error: 'Slot already booked for this time period' }, 409);
        }

        // Transaction logic
        const pendingBooking = await db.insert(parkingBookings).values({
            userId,
            slotId,
            startTime,
            endTime,
            paymentStatus: 'pending'
        }).returning();

        const bookingId = pendingBooking[0].id;

        const transaction = await db.insert(transactions).values({
            userId,
            bookingId,
            amount: '20.00',
            status: 'pending'
        }).returning();

        return c.json({ booking: pendingBooking[0], transaction: transaction[0] }, 201);
    } catch (error) {
        console.error('Booking error:', error);
        return c.json({ error: 'Failed to book slot' }, 500);
    }
});

// POST /pay
// Confirm payment and update booking/transaction status
app.post('/pay', async (c) => {
    try {
        const { transactionId } = await c.req.json();
        const userId = c.req.header('X-User-Id');

        if (!userId) return c.json({ error: 'Unauthorized' }, 401);

        // Find transaction
        const transaction = await db.select().from(transactions).where(eq(transactions.id, transactionId));

        if (!transaction.length) return c.json({ error: 'Transaction not found' }, 404);

        // Simulate payment processing... success!

        // Update transaction
        const updatedTransaction = await db.update(transactions)
            .set({ status: 'completed' })
            .where(eq(transactions.id, transactionId))
            .returning();

        // Update booking
        if (transaction[0].bookingId) {
            await db.update(parkingBookings)
                .set({ paymentStatus: 'succcess' }) // Using 'succcess' as per user request flow implies confirmed
                .where(eq(parkingBookings.id, transaction[0].bookingId));
        }

        return c.json({ success: true, transaction: updatedTransaction[0] });

    } catch (error) {
        console.error('Payment error:', error);
        return c.json({ error: 'Payment failed' }, 500);
    }
});

// GET /transactions
app.get('/transactions', async (c) => {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    try {
        // Create a join or just fetch transactions for now (simple)
        // Ideally we join with bookings to show Slot info
        const userTransactions = await db.select({
            id: transactions.id,
            amount: transactions.amount,
            status: transactions.status,
            createdAt: transactions.createdAt,
            slotId: parkingBookings.slotId,
            startTime: parkingBookings.startTime,
            endTime: parkingBookings.endTime,
        })
            .from(transactions)
            .leftJoin(parkingBookings, eq(transactions.bookingId, parkingBookings.id))
            .where(eq(transactions.userId, userId))
            .orderBy(desc(transactions.createdAt));

        return c.json(userTransactions);
    } catch (error) {
        console.error('Fetch transactions error:', error);
        return c.json({ error: 'Failed to fetch transactions' }, 500);
    }
});


// GET /my-bookings
app.get('/my-bookings', async (c) => {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    try {
        const bookings = await db.select().from(parkingBookings)
            .where(eq(parkingBookings.userId, userId))
            .orderBy(desc(parkingBookings.startTime));

        return c.json(bookings);
    } catch (error) {
        console.error('Fetch bookings error:', error);
        return c.json({ error: 'Failed to fetch bookings' }, 500);
    }
});

export default app;
