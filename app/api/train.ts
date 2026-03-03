
import { Hono } from 'hono';
import * as irctc from 'irctc-connect';
import fs from 'fs/promises';
import path from 'path';

const app = new Hono();

const ROUTE_CACHE_DIR = path.join(process.cwd(), 'data', 'routes');

// Ensure cache directory exists
async function ensureCacheDir() {
    try {
        await fs.access(ROUTE_CACHE_DIR);
    } catch {
        await fs.mkdir(ROUTE_CACHE_DIR, { recursive: true });
    }
}

// Get learned route from cache (pre-seeded)
async function getLearnedRoute(trainNo: string) {
    try {
        const filePath = path.join(ROUTE_CACHE_DIR, `${trainNo}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        const json = JSON.parse(data);
        if (json[trainNo] && Object.keys(json[trainNo]).length > 0) {
            return json[trainNo];
        }
        return {};
    } catch {
        return {};
    }
}

// Save learned route to cache
async function saveLearnedRoute(trainNo: string, learnedData: any) {
    try {
        await ensureCacheDir();
        const filePath = path.join(ROUTE_CACHE_DIR, `${trainNo}.json`);
        const content = JSON.stringify({ [trainNo]: learnedData }, null, 2);
        await fs.writeFile(filePath, content, 'utf8');
    } catch (err) {
        console.error('Failed to save route cache:', err);
    }
}
function parseAnomalyStation(stationName: string) {
    if (!stationName) return null;
    const match = stationName.match(/from\s+([^(]+)\(([^)]+)\)/i);
    if (match) {
        return {
            stnCode: match[2].trim(),
            stnName: match[1].trim()
        };
    }
    return null;
}



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
        const date = dateParam || new Date().toISOString().split('T')[0].split('-').reverse().join('-');

        // Fetch live status, official route, and learned cache in parallel
        const [liveRes, infoRes, learnedRoute] = await Promise.all([
            irctc.trackTrain(trainNo, date),
            irctc.getTrainInfo(trainNo),
            getLearnedRoute(trainNo),
        ]);

        if (!liveRes.success) {
            return c.json(liveRes);
        }

        const stations = liveRes.data?.stations || [];

        // --- Live Learning Logic ---
        // Capture the current "live anomaly" (passing station) and add to learned route
        const liveAnomaly = stations.find((s: any) => !s.stationCode);

        if (liveAnomaly) {
            const parsed = parseAnomalyStation(liveAnomaly.stationName);
            if (parsed) {
                let lastHaltCode = '';
                for (const stn of stations) {
                    if (stn === liveAnomaly) break;
                    if (stn.stationCode) lastHaltCode = stn.stationCode;
                }

                if (lastHaltCode) {
                    const currentList = learnedRoute[lastHaltCode] || [];
                    if (!currentList.some((s: any) => s.stnCode === parsed.stnCode)) {
                        learnedRoute[lastHaltCode] = [...currentList, parsed];
                        saveLearnedRoute(trainNo, learnedRoute);  // async, don't await
                    }
                }
            }
        }

        // Re-align the learned route with the official IRCTC route
        const officialHalts = new Set<string>();
        if (liveRes.data?.stations) {
            liveRes.data.stations.forEach((s: any) => {
                if (s.stationCode) officialHalts.add(s.stationCode);
            });
        }

        const fullSequence: any[] = [];
        for (const [haltCode, learnedStations] of Object.entries(learnedRoute) as [string, any[]][]) {
            fullSequence.push({ stnCode: haltCode, isKey: true });
            fullSequence.push(...learnedStations);
        }

        // Helper to format HH:mm into HH:MM DD-Mon based on a reference date string (like "16:20 27-Feb")
        const formatPassingTime = (timeStr: string, refTimeStr?: string) => {
            if (!timeStr || !refTimeStr) return timeStr || '';
            const refParts = refTimeStr.replace(/\*/g, '').trim().split(' ');
            if (refParts.length < 2) return timeStr;
            // E.g., refParts[1] is "27-Feb"
            return `${timeStr} ${refParts[1]}*`;
        };

        const mergedSegments: Record<string, { stnCode: string; stnName: string; arrival?: string; departure?: string }[]> = {};
        let currentRealHalt: any = null;

        for (const stn of fullSequence) {
            if (stn.isKey) {
                if (officialHalts.has(stn.stnCode)) {
                    currentRealHalt = liveRes.data?.stations.find((s: any) => s.stationCode === stn.stnCode);
                }
                continue;
            }

            if (officialHalts.has(stn.stnCode)) {
                // This passing station from offline DB is actually an official halt today!
                currentRealHalt = liveRes.data?.stations.find((s: any) => s.stationCode === stn.stnCode);
            } else {
                // True passing station. Map it under the current real halt.
                if (currentRealHalt) {
                    const haltCode = currentRealHalt.stationCode;
                    if (!mergedSegments[haltCode]) mergedSegments[haltCode] = [];
                    if (!mergedSegments[haltCode].some((s) => s.stnCode === stn.stnCode)) {

                        // Extract base reference time from the preceding halt
                        const refTime = currentRealHalt.departure?.scheduled || currentRealHalt.arrival?.scheduled;

                        mergedSegments[haltCode].push({
                            ...stn,
                            arrival: formatPassingTime(stn.arrival, refTime),
                            departure: formatPassingTime(stn.departure, refTime),
                            _rawArr: stn.arrival // keep raw for sorting
                        });

                        // Sort the segment chronologically so passing stations are always in proper time order
                        mergedSegments[haltCode].sort((a: any, b: any) => {
                            if (!a._rawArr || !b._rawArr) return 0;
                            return a._rawArr.localeCompare(b._rawArr);
                        });
                    }
                }
            }
        }

        // --- Build the merged official route array ---
        const officialRoute = infoRes.success ? (infoRes.data?.route ?? []) : [];
        const mergedRoute = [...officialRoute];

        Object.entries(mergedSegments).forEach(([haltCode, passingStations]) => {
            const haltIdx = mergedRoute.findIndex((r) => r.stnCode === haltCode);
            if (haltIdx !== -1) {
                let maxAllowedRaw = "23:59";
                for (let k = haltIdx + 1; k < mergedRoute.length; k++) {
                    const nextHalt = mergedRoute[k];
                    const nextTime = nextHalt.arrival?.scheduled || nextHalt.departure?.scheduled || nextHalt.arrival || nextHalt.departure;
                    if (nextTime && typeof nextTime === "string") {
                        const candidate = nextTime.split(" ")[0].replace(/\*/g, '').trim();
                        if (candidate !== "SRC" && candidate !== "DST" && candidate !== "") {
                            maxAllowedRaw = candidate;
                            break;
                        }
                    }
                }

                // Filter out any passing station where the raw time > next halt's raw time
                // This prevents weird UI jumps caused by database mismatches (e.g. 16:50 passing > 16:49 halt)
                const validPassingStations = passingStations.filter((ps: any) => {
                    const rawTime = (ps._rawArr || "").trim();
                    if (!rawTime || maxAllowedRaw === "23:59") return true;

                    const [psH, psM] = rawTime.split(':').map(Number);
                    const [mxH, mxM] = maxAllowedRaw.split(':').map(Number);

                    if (isNaN(psH) || isNaN(mxH)) return true;

                    // If they are on the same day context (difference is small, e.g., within 4 hours)
                    // and passing time is logically greater, drop it.
                    const psTotalMins = psH * 60 + psM;
                    const mxTotalMins = mxH * 60 + mxM;

                    // Detect if they are near each other (prevents dropping actual midnight rollovers)
                    if (Math.abs(psTotalMins - mxTotalMins) < 240) {
                        return psTotalMins <= mxTotalMins;
                    }

                    return true;
                });

                // Update the original map so the JSON response receives the filtered list
                mergedSegments[haltCode] = validPassingStations;

                const toAdd = validPassingStations.filter(
                    (ps: any) => !mergedRoute.some((mr) => mr.stnCode === ps.stnCode)
                );
                if (toAdd.length > 0) {
                    const formattedAdd = toAdd.map((ps) => ({
                        stnCode: ps.stnCode,
                        stnName: ps.stnName,
                        haltMinutes: 0,
                        arrival: '',
                        departure: '',
                        isLearned: true,
                    }));
                    mergedRoute.splice(haltIdx + 1, 0, ...formattedAdd);
                }
            }
        });

        return c.json({
            success: true,
            data: {
                ...liveRes.data,
                route: mergedRoute,
                intermediateMap: mergedSegments,  // Pass JSON cache data to frontend
            },
        });
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

// Get Seat Availability
app.get('/availability/:trainNo', async (c) => {
    const trainNo = c.req.param('trainNo');
    const from = c.req.query('from');
    const to = c.req.query('to');
    const date = c.req.query('date');
    const coach = c.req.query('class') || 'SL';
    const quota = c.req.query('quota') || 'GN';

    if (!from || !to || !date) {
        return c.json({ success: false, error: 'Missing required parameters: from, to, date' }, 400);
    }

    try {
        const response = await irctc.getAvailability(trainNo, from, to, date, coach, quota);
        return c.json(response);
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to fetch seat availability' }, 500);
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

// Search Trains
app.get('/search', async (c) => {
    const query = c.req.query('q')?.toLowerCase();
    if (!query || query.length < 2) {
        return c.json({ success: false, data: [] });
    }

    try {
        const filePath = path.join(process.cwd(), 'data', 'train-list.json');
        const fileData = await fs.readFile(filePath, 'utf8');
        const trainList: any[] = JSON.parse(fileData);

        const results = trainList
            .filter(t => t.number.includes(query) || t.name.toLowerCase().includes(query))
            .slice(0, 10);

        return c.json({ success: true, data: results });
    } catch (error: any) {
        return c.json({ error: error.message || 'Failed to search trains' }, 500);
    }
});

export default app;
