const fs = require('fs');

async function fetchDynamicRoute(trainNo) {
    try {
        console.log(`Fetching info for ${trainNo}...`);
        const trainInfoResp = await fetch(
            `https://erail.in/rail/getTrains.aspx?TrainNo=${trainNo}&DataSource=0&Language=0&Cache=true`
        );
        if (!trainInfoResp.ok) { console.log("train info resp not ok"); return {}; }

        const trainInfoRaw = await trainInfoResp.text();
        console.log("Got train info, length:", trainInfoRaw.length);

        const trainIdMatch = trainInfoRaw.match(/~SHATABDI~(\d+)~|~MAIL~(\d+)~|~EXP~(\d+)~|~(\d{4,5})~\d~0~0~\d~\d~/);
        let trainId = '';
        if (trainIdMatch) {
            trainId = (trainIdMatch[1] || trainIdMatch[2] || trainIdMatch[3] || trainIdMatch[4] || '').trim();
        }
        
        if (!trainId) {
            const allMatches = trainInfoRaw.match(/~(\d{4,5})~[01]~[01]/g);
            if (allMatches && allMatches.length > 0) {
                trainId = allMatches[allMatches.length - 1].replace(/~[01]~[01]/, '').replace(/^~/, '');
            }
        }
        console.log("Extracted Train ID:", trainId);
        if (!trainId) return {};

        console.log(`Fetching route for trainId ${trainId}...`);
        const routeResp = await fetch(
            `https://erail.in/data.aspx?Action=TRAINROUTE&Password=2012&Data1=${trainId}&Data2=4&Cache=true`
        );
        if (!routeResp.ok) { console.log("route resp not ok"); return {}; }

        const routeRaw = await routeResp.text();
        console.log("Got route data, length:", routeRaw.length);

        const chunks = routeRaw.split('^').slice(1).filter(Boolean);
        console.log("Total chunks:", chunks.length);
        
        const intermediateMap = {};
        let currentHalt = null;

        for (const chunk of chunks) {
            const fields = chunk.split('~');
            if (fields.length < 3) continue;

            const stnCode = (fields[1] || '').trim();
            const stnName = (fields[2] || '').trim();
            const haltRaw = (fields[5] || '').trim();
            const haltMinutes = haltRaw === '' ? 0 : (isNaN(Number(haltRaw)) ? 0 : Number(haltRaw));

            if (!stnCode || !stnName) continue;

            if (haltMinutes > 0 || fields[3]?.trim() === 'First' || fields[4]?.trim() === 'Last') {
                currentHalt = stnCode;
            } else if (currentHalt !== null) {
                if (!intermediateMap[currentHalt]) intermediateMap[currentHalt] = [];
                intermediateMap[currentHalt].push({ stnCode, stnName });
            }
        }

        return intermediateMap;
    } catch (err) {
        console.error('fetchDynamicRoute error:', err);
        return {};
    }
}

fetchDynamicRoute("12018").then(res => {
    console.log("Result Keys:", Object.keys(res));
    if (Object.keys(res).length > 0) {
        console.log("First key length:", res[Object.keys(res)[0]].length);
    }
});
