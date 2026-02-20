
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import users from '../users';
import products from '../products';
import orders from '../orders';
import auth from '../auth';
import parking from '../parking';
import parkingUsers from '../parking-users';
import train from '../train';

export const runtime = 'nodejs';

const app = new Hono().basePath('/api')

app.route('/users', users);
app.route('/products', products);
app.route('/orders', orders);
app.route('/auth', auth);
app.route('/parking', parking);
app.route('/parking-users', parkingUsers);
app.route('/train', train);

app.get('/hello', (c) => {
    return c.json({
        message: 'Hello from Hono!',
    })
})

app.onError((err, c) => {
    console.error(`[Hono Error]: ${err.message}`);
    console.error(err.stack);
    return c.json({
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        message: 'An internal server error occurred'
    }, 500);
})

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
