const fs = require('fs');

try {
    console.log("Reading 82MB schedules.json into memory...");
    const rawData = fs.readFileSync('railways-master/schedules.json', 'utf8');

    console.log("Parsing JSON...");
    const schedules = JSON.parse(rawData);
    console.log("Total entries in DataMeet schedule:", schedules.length);

    // Filter out our train
    const train12002 = schedules.filter(s => s.train_number === '12002');
    console.log(`Found ${train12002.length} stops for train 12002.`);

    if (train12002.length > 0) {
        // Sort by day and time or id
        train12002.sort((a, b) => a.id - b.id);
        console.log("\nFirst 15 stations:");
        for (let i = 0; i < Math.min(15, train12002.length); i++) {
            console.log(`${train12002[i].station_code} - ${train12002[i].station_name} | Arr: ${train12002[i].arrival} | Dep: ${train12002[i].departure}`);
        }
    }
} catch (e) {
    console.error("Error:", e.message);
}
