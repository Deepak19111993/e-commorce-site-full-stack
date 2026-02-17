
import { pgTable, serial, text, integer, timestamp, boolean, decimal, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
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
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    stock: integer('stock').notNull().default(0),
    image: text('image'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const orders = pgTable('orders', {
    id: serial('id').primaryKey(),
    userId: uuid('user_id').references(() => users.id),
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
    user: one(users, {
        fields: [orders.userId],
        references: [users.id],
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
