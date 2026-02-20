const irctc = require('irctc-connect');

async function testLiveStation() {
    try {
        console.log("Fetching live station data for ADI (Ahmedabad)...");
        const data = await irctc.liveAtStation('ADI');
        console.log("Response Structure:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
}

testLiveStation();
