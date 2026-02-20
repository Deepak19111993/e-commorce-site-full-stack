
import { Hono } from 'hono';
import * as irctc from 'irctc-connect';

const app = new Hono();

// Get PNR Status
app.get('/pnr/:pnr', async (c) => {
    const pnr = c.req.param('pnr');
    try {
        const response = await irctc.checkPNRStatus(pnr);
        return c.json(response);
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to fetch PNR status' }, 500);
    }
});

// Get Train Information
app.get('/info/:trainNo', async (c) => {
    const trainNo = c.req.param('trainNo');
    try {
        const response = await irctc.getTrainInfo(trainNo);
        return c.json(response);
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to fetch train info' }, 500);
    }
});

// Get Live Train Status
app.get('/live/:trainNo', async (c) => {
    const trainNo = c.req.param('trainNo');
    const dateParam = c.req.query('date');
    try {
        // Use provided date or default to today
        const date = dateParam || new Date().toISOString().split('T')[0].split('-').reverse().join('-');

        const response = await irctc.trackTrain(trainNo, date);
        return c.json(response);
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to fetch live status' }, 500);
    }
});

// Get Trains Between Stations
app.get('/between/:from/:to', async (c) => {
    const from = c.req.param('from');
    const to = c.req.param('to');
    try {
        const response = await irctc.searchTrainBetweenStations(from, to);
        return c.json(response);
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to fetch trains between stations' }, 500);
    }
});

// Get Live Station Status
app.get('/station/:stnCode', async (c) => {
    const stnCode = c.req.param('stnCode');
    try {
        const response = await irctc.liveAtStation(stnCode);
        return c.json(response);
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to fetch station status' }, 500);
    }
});


// Search Stations
import { db } from '../../db';
import { stations } from '../../db/schema';
import { ilike, or } from 'drizzle-orm';

app.get('/stations/search', async (c) => {
    const query = c.req.query('q');
    if (!query || query.length < 2) {
        return c.json({ success: false, data: [] });
    }

    try {
        const result = await db.select().from(stations).where(
            or(
                ilike(stations.name, `${query}%`),
                ilike(stations.code, `${query}%`)
            )
        ).limit(50);
        return c.json({ success: true, data: result });
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to search stations' }, 500);
    }
});

export default app;
