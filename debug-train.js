
const irctc = require('irctc-connect');

async function test() {
    try {
        const today = '19-02-2026';
        const data = await irctc.trackTrain('12942', today);
        if (data.data?.stations) {
            console.log('--- All Stations ---');
            data.data.stations.forEach((stn, i) => {
                console.log(`${i}: code="${stn.stationCode}" name="${stn.stationName}"`);
            });
        }
    } catch (e) {
        console.error(e);
    }
}

test();
