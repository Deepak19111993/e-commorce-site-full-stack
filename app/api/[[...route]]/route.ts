
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import users from '../users';
import products from '../products';
import orders from '../orders';
import auth from '../auth';
import parking from '../parking';
import parkingUsers from '../parking-users';

export const runtime = 'nodejs';

const app = new Hono().basePath('/api')

app.route('/users', users);
app.route('/products', products);
app.route('/orders', orders);
app.route('/auth', auth);
app.route('/parking', parking);
app.route('/parking-users', parkingUsers);

app.get('/hello', (c) => {
    return c.json({
        message: 'Hello from Hono!',
    })
})

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
