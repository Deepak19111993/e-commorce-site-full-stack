
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Fix for "remaining connection slots are reserved"
// Use a singleton connection pool in development to avoid exhausting connections
// during hot reloading.

let client: ReturnType<typeof postgres>;

if (process.env.NODE_ENV === 'production') {
    client = postgres(connectionString, { prepare: false });
} else {
    if (!(global as any).databaseClient) {
        (global as any).databaseClient = postgres(connectionString, {
            prepare: false,
            max: 1 // Limit dev connections 
        });
    }
    client = (global as any).databaseClient;
}

export const db = drizzle(client, { schema });
export { client };
