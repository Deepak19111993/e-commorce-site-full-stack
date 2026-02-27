const fs = require('fs');
const path = require('path');

// ============================================================================
// WHERE IS MY TRAIN - OFFLINE DATABASE GENERATOR (DATAMEET EDITION)
// ============================================================================
// Generates passing-station JSON files for ALL Indian trains from the
// open-source DataMeet Indian Railways database. No internet required!
//
// INSTRUCTIONS:
// 1. Make sure `railways-master/schedules.json` exists (already downloaded).
// 2. Run:  node generate_offline_db.js
// 3. Done! All trains get their data/routes/<trainNo>.json file.
// ============================================================================

const ROUTE_CACHE_DIR = path.join(__dirname, 'data', 'routes');

function ensureDir() {
    if (!fs.existsSync(ROUTE_CACHE_DIR)) {
        fs.mkdirSync(ROUTE_CACHE_DIR, { recursive: true });
    }
}

// A station is an OFFICIAL HALT (parent key) if:
//   - It's a terminus (only arr or only dep is present)
//   - It stops for at least MIN_HALT_MINUTES minutes
// Everything else is a "passing station" appended under the previous halt.
// 
// Why 5 minutes? DataMeet records many 2-minute "technical stops" for slow/passenger
// trains that aren't real passenger-boarding halts. Using 5 min threshold cleanly
// separates real halts (where passengers board/alight) from passing stations.
const MIN_HALT_MINUTES = 5;

function isHaltStation(stn) {
    const arr = stn.arrival;
    const dep = stn.departure;

    // Terminus: only one side is present
    if (arr === 'None' && dep !== 'None') return true;
    if (dep === 'None' && arr !== 'None') return true;
    // Both unknown → treat as passing
    if (arr === 'None' && dep === 'None') return false;

    // Calculate halt duration, handle midnight crossover
    const [arrH, arrM] = arr.split(':').map(Number);
    const [depH, depM] = dep.split(':').map(Number);
    let arrTotal = arrH * 60 + arrM;
    let depTotal = depH * 60 + depM;
    // Handle midnight crossover (e.g., arr=23:55 dep=00:02)
    if (depTotal < arrTotal) depTotal += 24 * 60;

    return (depTotal - arrTotal) >= MIN_HALT_MINUTES;
}

function processTrain(trainNo, stops) {
    // Sort chronologically by ID (DataMeet's natural sequential order along route)
    stops.sort((a, b) => a.id - b.id);

    const segments = {};
    let currentHalt = null;

    for (const stn of stops) {
        const stnCode = stn.station_code;
        const stnName = stn.station_name;

        if (!stnCode || !stnName) continue;

        if (isHaltStation(stn)) {
            // This is an official halt - becomes a "parent" key in the segment map
            currentHalt = stnCode;
            if (!segments[currentHalt]) {
                segments[currentHalt] = [];
            }
        } else if (currentHalt) {
            // This station is passed through without stopping - add to the preceding halt
            const arrival = stn.arrival === 'None' ? '' : stn.arrival.substring(0, 5);
            const departure = stn.departure === 'None' ? '' : stn.departure.substring(0, 5);

            if (!segments[currentHalt]) segments[currentHalt] = [];
            segments[currentHalt].push({
                stnCode: stnCode,
                stnName: stnName,
                arrival: arrival,
                departure: departure
            });
        }
    }

    return segments;
}

function main() {
    ensureDir();

    const schedulePath = path.join(__dirname, 'railways-master', 'schedules.json');
    if (!fs.existsSync(schedulePath)) {
        console.error('❌ railways-master/schedules.json not found!');
        console.error('   Download the DataMeet railways repo to railways-master/');
        return;
    }

    console.log('Loading DataMeet Indian Railways database (80MB)...');
    const schedules = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
    console.log(`✅ Loaded ${schedules.length.toLocaleString()} station events.\n`);

    // Group all entries by train_number
    console.log('Grouping by train number...');
    const byTrain = {};
    for (const entry of schedules) {
        if (!byTrain[entry.train_number]) byTrain[entry.train_number] = [];
        byTrain[entry.train_number].push(entry);
    }

    const trainNumbers = Object.keys(byTrain);
    console.log(`Found ${trainNumbers.length} trains in database. Generating files...\n`);

    let success = 0;
    let skipped = 0;

    for (const trainNo of trainNumbers) {
        const stops = byTrain[trainNo];
        const segments = processTrain(trainNo, stops);

        // Only write file if there are any passing stations at all
        const hasPassingStations = Object.values(segments).some(arr => arr.length > 0);
        if (hasPassingStations) {
            const filePath = path.join(ROUTE_CACHE_DIR, `${trainNo}.json`);
            fs.writeFileSync(filePath, JSON.stringify({ [trainNo]: segments }, null, 2), 'utf8');
            success++;
        } else {
            skipped++;
        }
    }

    console.log(`\n🎉 Done!`);
    console.log(`   ✅ ${success} trains written to data/routes/`);
    console.log(`   ⏭  ${skipped} trains skipped (no identifiable passing stations)`);
    console.log(`\nYour Next.js app now has a 100% offline passing station database!`);
}

main();
