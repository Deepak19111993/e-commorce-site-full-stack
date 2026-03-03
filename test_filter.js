const fs = require('fs');

async function check() {
    const res = await fetch("http://localhost:3000/api/train/live/11271");
    const data = await res.json();
    const mergedRoute = data.data.route;
    
    const haltIdx = mergedRoute.findIndex((r) => r.stnCode === 'ET');
    let maxAllowedRaw = "23:59";
    for (let k = haltIdx + 1; k < mergedRoute.length; k++) {
        const nextHalt = mergedRoute[k];
        const nextTime = nextHalt.arrival?.scheduled || nextHalt.departure?.scheduled || nextHalt.arrival || nextHalt.departure;
        
        console.log(`Checking ${nextHalt.stnCode}: nextTime=${nextTime}`);
        if (nextTime && typeof nextTime === "string") {
            const candidate = nextTime.split(" ")[0].replace(/\*/g, '').trim(); 
            if(candidate !== "SRC" && candidate !== "DST" && candidate !== "") {
                maxAllowedRaw = candidate;
                break;
            }
        }
    }
    console.log("maxAllowedRaw is:", maxAllowedRaw);
    
    // Now apply filter to Bagra Tawa
    const rawTime = "16:50";
    const [psH, psM] = rawTime.split(':').map(Number);
    const [mxH, mxM] = maxAllowedRaw.split(':').map(Number);
    
    const psTotalMins = psH * 60 + psM;
    const mxTotalMins = mxH * 60 + mxM;
    
    console.log(`psTotalMins=${psTotalMins}, mxTotalMins=${mxTotalMins}, diff=${Math.abs(psTotalMins - mxTotalMins)}`);
    console.log(`Should it be dropped?`, Math.abs(psTotalMins-mxTotalMins) < 240 && psTotalMins > mxTotalMins);
}

check();
