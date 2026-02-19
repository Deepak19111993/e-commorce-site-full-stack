
import { pgTable, serial, text, integer, timestamp, boolean, decimal, uuid } from 'drizzle-orm/pg-core';

export const storeUsers = pgTable('store_users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name'),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    role: text('role').default('user'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const parkingUsers = pgTable('parking_users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name'),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    role: text('role').default('user'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    stock: integer('stock').notNull().default(0),
    image: text('image'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const orders = pgTable('orders', {
    id: serial('id').primaryKey(),
    userId: uuid('user_id').references(() => storeUsers.id),
    status: text('status').default('processing'),
    paymentMethod: text('payment_method').default('cod'),
    total: decimal('total', { precision: 10, scale: 2 }).notNull().default('0'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const orderItems = pgTable('order_items', {
    id: serial('id').primaryKey(),
    orderId: integer('order_id').references(() => orders.id),
    productId: integer('product_id').references(() => products.id),
    quantity: integer('quantity').notNull(),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
});
import { relations } from 'drizzle-orm';

export const ordersRelations = relations(orders, ({ one, many }) => ({
    user: one(storeUsers, {
        fields: [orders.userId],
        references: [storeUsers.id],
    }),
    items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    order: one(orders, {
        fields: [orderItems.orderId],
        references: [orders.id],
    }),
    product: one(products, {
        fields: [orderItems.productId],
        references: [products.id],
    }),
}));

export const productsRelations = relations(products, ({ many }) => ({
    orderItems: many(orderItems),
}));

export const parkingBookings = pgTable('parking_bookings', {
    id: serial('id').primaryKey(),
    userId: uuid('user_id').references(() => parkingUsers.id).notNull(),
    slotId: integer('slot_id').notNull(),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    paymentStatus: text('payment_status').default('pending'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const transactions = pgTable('transactions', {
    id: serial('id').primaryKey(),
    userId: uuid('user_id').references(() => parkingUsers.id).notNull(),
    bookingId: integer('booking_id').references(() => parkingBookings.id),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull().default('20.00'),
    status: text('status').default('pending'), // pending, completed, failed
    createdAt: timestamp('created_at').defaultNow(),
});

export const parkingBookingsRelations = relations(parkingBookings, ({ one, many }) => ({
    user: one(parkingUsers, {
        fields: [parkingBookings.userId],
        references: [parkingUsers.id],
    }),
    transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
    user: one(parkingUsers, {
        fields: [transactions.userId],
        references: [parkingUsers.id],
    }),
    booking: one(parkingBookings, {
        fields: [transactions.bookingId],
        references: [parkingBookings.id],
    }),
}));

export const storeUsersRelations = relations(storeUsers, ({ many }) => ({
    orders: many(orders),
}));

export const parkingUsersRelations = relations(parkingUsers, ({ many }) => ({
    parkingBookings: many(parkingBookings),
    transactions: many(transactions),
}));
