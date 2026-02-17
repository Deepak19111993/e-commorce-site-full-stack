
import { config } from 'dotenv';
config({ path: '.env' });

import { db } from '../db';
import { products } from '../db/schema';

const run = async () => {
    try {
        console.log('Seeding products...');

        const sampleProducts = [
            { name: 'HD Webcam', price: '45.00', stock: 60, description: '1080p Webcam for streaming' },
            { name: 'USB Microphone', price: '85.00', stock: 40, description: 'Clear audio recording' },
            { name: 'LED Desk Lamp', price: '30.00', stock: 80, description: 'Adjustable brightness and color temp' },
            { name: 'Ergonomic Chair', price: '250.00', stock: 15, description: 'Comfortable office chair with lumbar support' },
            { name: 'RGB Mousepad', price: '25.00', stock: 150, description: 'Large mousepad with lighting effects' }
        ];

        for (const p of sampleProducts) {
            await db.insert(products).values(p);
            console.log(`Added: ${p.name}`);
        }

        console.log('Seeding complete!');
    } catch (e) {
        console.error('Seeding failed:', e);
    }
};

run();
