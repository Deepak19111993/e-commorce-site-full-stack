import { Hono } from 'hono';
import { randomUUID, createHmac } from 'crypto';
import Razorpay from 'razorpay';
import { db } from '@/db';
import { parkingBookings, transactions, parkingUsers } from '@/db/schema';
import { eq, and, gt, lt, ne, desc } from 'drizzle-orm';

const app = new Hono();

// Check if real Razorpay keys are configured
const isRazorpayConfigured = process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    !process.env.RAZORPAY_KEY_ID.includes('YOUR_KEY');

// Initialize Razorpay (only if keys are configured)
const razorpay = isRazorpayConfigured ? new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
}) : null;

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
            gt(parkingBookings.endTime, startTime),
            ne(parkingBookings.approvalStatus, 'rejected') // Rejected bookings free up slots
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

// POST /create-order
// Create a Razorpay order for payment (or demo order if keys not configured)
app.post('/create-order', async (c) => {
    const userId = c.req.header('X-User-Id');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    try {
        const { amount, transactionId } = await c.req.json();
        if (!amount || !transactionId) return c.json({ error: 'Missing fields' }, 400);

        // Demo mode — no real Razorpay keys
        if (!isRazorpayConfigured || !razorpay) {
            return c.json({
                orderId: `demo_order_${transactionId}`,
                amount: Math.round(amount * 100),
                currency: 'INR',
                demo: true
            });
        }

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: `txn_${transactionId}`,
            notes: {
                transactionId: String(transactionId),
                userId
            }
        });

        return c.json({ orderId: order.id, amount: order.amount, currency: order.currency });
    } catch (error) {
        console.error('Create order error:', error);
        return c.json({ error: 'Failed to create payment order' }, 500);
    }
});

// POST /pay
// Verify Razorpay payment signature (or accept demo payments) and update booking/transaction
app.post('/pay', async (c) => {
    try {
        const { transactionId, razorpay_payment_id, razorpay_order_id, razorpay_signature, demo } = await c.req.json();
        const userId = c.req.header('X-User-Id');

        if (!userId) return c.json({ error: 'Unauthorized' }, 401);

        // Find transaction
        const transaction = await db.select().from(transactions).where(eq(transactions.id, transactionId));
        if (!transaction.length) return c.json({ error: 'Transaction not found' }, 404);

        // Verify Razorpay signature (skip in demo mode)
        if (!demo && isRazorpayConfigured) {
            const secret = process.env.RAZORPAY_KEY_SECRET || '';
            const body = razorpay_order_id + '|' + razorpay_payment_id;
            const expectedSignature = createHmac('sha256', secret).update(body).digest('hex');

            if (expectedSignature !== razorpay_signature) {
                console.error('Signature mismatch!');
                return c.json({ error: 'Payment verification failed' }, 400);
            }
        }

        // Update transaction
        const updatedTransaction = await db.update(transactions)
            .set({ status: 'completed' })
            .where(eq(transactions.id, transactionId))
            .returning();

        // Update booking to 'paid_pending_approval' (needs admin approval)
        if (transaction[0].bookingId) {
            await db.update(parkingBookings)
                .set({ paymentStatus: 'paid_pending_approval' })
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

// GET /all-bookings (Admin only)
app.get('/all-bookings', async (c) => {
    const role = c.req.header('X-User-Role');
    if (role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

    try {
        const bookings = await db.select({
            id: parkingBookings.id,
            slotId: parkingBookings.slotId,
            startTime: parkingBookings.startTime,
            endTime: parkingBookings.endTime,
            paymentStatus: parkingBookings.paymentStatus,
            approvalStatus: parkingBookings.approvalStatus,
            adminNote: parkingBookings.adminNote,
            userName: parkingUsers.name,
            userEmail: parkingUsers.email,
        })
            .from(parkingBookings)
            .leftJoin(parkingUsers, eq(parkingBookings.userId, parkingUsers.id))
            .orderBy(desc(parkingBookings.startTime));

        return c.json(bookings);
    } catch (error) {
        console.error('Fetch all bookings error:', error);
        return c.json({ error: 'Failed to fetch all bookings' }, 500);
    }
});

// POST /approve (Admin only)
app.post('/approve', async (c) => {
    const role = c.req.header('X-User-Role');
    if (role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

    try {
        const { bookingId } = await c.req.json();
        if (!bookingId) return c.json({ error: 'Missing bookingId' }, 400);

        const entryCode = randomUUID();
        const updated = await db.update(parkingBookings)
            .set({ approvalStatus: 'approved', paymentStatus: 'approved', entryCode })
            .where(eq(parkingBookings.id, bookingId))
            .returning();

        if (!updated.length) return c.json({ error: 'Booking not found' }, 404);
        return c.json({ success: true, booking: updated[0] });
    } catch (error) {
        console.error('Approve error:', error);
        return c.json({ error: 'Failed to approve booking' }, 500);
    }
});

// POST /reject (Admin only)
app.post('/reject', async (c) => {
    const role = c.req.header('X-User-Role');
    if (role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

    try {
        const { bookingId, reason } = await c.req.json();
        if (!bookingId) return c.json({ error: 'Missing bookingId' }, 400);

        const updated = await db.update(parkingBookings)
            .set({
                approvalStatus: 'rejected',
                paymentStatus: 'rejected',
                adminNote: reason || 'Rejected by admin'
            })
            .where(eq(parkingBookings.id, bookingId))
            .returning();

        if (!updated.length) return c.json({ error: 'Booking not found' }, 404);
        return c.json({ success: true, booking: updated[0] });
    } catch (error) {
        console.error('Reject error:', error);
        return c.json({ error: 'Failed to reject booking' }, 500);
    }
});

// GET /booking-by-code/:code — fetch booking details by QR entry code
app.get('/booking-by-code/:code', async (c) => {
    const code = c.req.param('code');
    if (!code) return c.json({ error: 'Missing code' }, 400);

    try {
        const bookings = await db.select({
            id: parkingBookings.id,
            slotId: parkingBookings.slotId,
            startTime: parkingBookings.startTime,
            endTime: parkingBookings.endTime,
            approvalStatus: parkingBookings.approvalStatus,
            entryCode: parkingBookings.entryCode,
            entryTime: parkingBookings.entryTime,
            exitTime: parkingBookings.exitTime,
            userName: parkingUsers.name,
            userEmail: parkingUsers.email,
        })
            .from(parkingBookings)
            .leftJoin(parkingUsers, eq(parkingBookings.userId, parkingUsers.id))
            .where(eq(parkingBookings.entryCode, code));

        if (!bookings.length) return c.json({ error: 'Invalid QR code' }, 404);
        return c.json(bookings[0]);
    } catch (error) {
        console.error('Booking by code error:', error);
        return c.json({ error: 'Failed to fetch booking' }, 500);
    }
});

// POST /verify-entry — record entry time when QR scanned at gate
app.post('/verify-entry', async (c) => {
    const role = c.req.header('X-User-Role');
    if (role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

    try {
        const { entryCode } = await c.req.json();
        if (!entryCode) return c.json({ error: 'Missing entryCode' }, 400);

        // Find booking
        const booking = await db.select().from(parkingBookings)
            .where(eq(parkingBookings.entryCode, entryCode));

        if (!booking.length) return c.json({ error: 'Invalid QR code' }, 404);
        if (booking[0].approvalStatus !== 'approved') return c.json({ error: 'Booking not approved' }, 400);
        if (booking[0].entryTime) return c.json({ error: 'Already entered', entryTime: booking[0].entryTime }, 400);

        const updated = await db.update(parkingBookings)
            .set({ entryTime: new Date() })
            .where(eq(parkingBookings.entryCode, entryCode))
            .returning();

        return c.json({ success: true, message: 'Entry recorded', booking: updated[0] });
    } catch (error) {
        console.error('Verify entry error:', error);
        return c.json({ error: 'Failed to verify entry' }, 500);
    }
});

// POST /verify-exit — record exit time when QR scanned at gate
app.post('/verify-exit', async (c) => {
    const role = c.req.header('X-User-Role');
    if (role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

    try {
        const { entryCode } = await c.req.json();
        if (!entryCode) return c.json({ error: 'Missing entryCode' }, 400);

        const booking = await db.select().from(parkingBookings)
            .where(eq(parkingBookings.entryCode, entryCode));

        if (!booking.length) return c.json({ error: 'Invalid QR code' }, 404);
        if (!booking[0].entryTime) return c.json({ error: 'No entry recorded yet' }, 400);
        if (booking[0].exitTime) return c.json({ error: 'Already exited', exitTime: booking[0].exitTime }, 400);

        const updated = await db.update(parkingBookings)
            .set({ exitTime: new Date() })
            .where(eq(parkingBookings.entryCode, entryCode))
            .returning();

        return c.json({ success: true, message: 'Exit recorded', booking: updated[0] });
    } catch (error) {
        console.error('Verify exit error:', error);
        return c.json({ error: 'Failed to verify exit' }, 500);
    }
});

export default app;
