const fs = require('fs');

const trains = ['11271', '12075', '12431']; // sample diverse trains

async function run() {
    for (const trainNo of trains) {
        try {
            const res = await fetch(`http://localhost:3000/api/train/live/${trainNo}`);
            const data = await res.json();
            if(!data.success) {
                console.log(`Train ${trainNo}: FAILED (${data.error})`);
                continue;
            }
            
            const imap = data.data.intermediateMap;
            let passingCount = 0;
            let formattedCount = 0;
            
            for(const halt of Object.keys(imap)) {
                for(const stn of imap[halt]) {
                    passingCount++;
                    if(stn.arrival && stn.arrival.includes('-')) formattedCount++;
                    if(stn.departure && stn.departure.includes('-')) formattedCount++;
                }
            }
            
            console.log(`Train ${trainNo}: Verified ${formattedCount/2}/${passingCount} passing stations formatted correctly.`);
            
        } catch(e) {
            console.error(`Train ${trainNo} error:`, e.message);
        }
    }
}
run();
