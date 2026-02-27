const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
    const fileStream = fs.createReadStream('railways-master/schedules.json', { encoding: 'utf8' });
    let data = '';

    fileStream.on('data', chunk => {
        data += chunk;
        if (data.length > 500000) {
            fileStream.pause();
            try {
                // The file is a single array. Let's try parsing it manually
                // since JSON.parse on 82MB might be slow but it usually works in node.
            } catch (e) { }
        }
    });
}

// Let's just use require, it should work for an 80MB file in V8 (Heap limit is >1GB)
try {
    console.log("Parsing JSON...");
    const schedules = JSON.parse(fs.readFileSync('railways-master/schedules.json', 'utf8'));
    const train12002 = schedules.filter(s => s.train_number === '12002');
    console.log("Found", train12002.length, "stations for 12002");

    // sorting by id or something?
    train12002.sort((a, b) => a.id - b.id);
    console.log("Stations:");
    for (let i = 0; i < Math.min(15, train12002.length); i++) {
        console.log(`${train12002[i].station_code} - ${train12002[i].station_name} | Arr: ${train12002[i].arrival} Dep: ${train12002[i].departure}`);
    }
} catch (e) {
    console.log("Error:", e.message);
}
