
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const userId = id;

        // Security check: Ensure the requester is the user themselves or an admin
        const requesterId = request.headers.get('X-User-Id');
        const requesterRole = request.headers.get('X-User-Role');

        if (!requesterId || (requesterRole !== 'admin' && requesterId !== id)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Prepare update data
        const updateData: any = {};
        if (body.name) updateData.name = body.name;
        if (body.email) updateData.email = body.email;
        if (body.password) updateData.password = body.password; // In a real app, hash this!

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No data to update' }, { status: 400 });
        }

        const updatedUser = await db.update(users)
            .set(updateData)
            .where(eq(users.id, userId))
            .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

        if (updatedUser.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(updatedUser[0]);
    } catch (e) {
        console.error('Error updating user:', e);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}
