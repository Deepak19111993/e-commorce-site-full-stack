const fs = require('fs');
const rawData = fs.readFileSync('railways-master/schedules.json', 'utf8');
const schedules = JSON.parse(rawData);
const train11271 = schedules.filter(s => s.train_number === '11271');
console.log(`Found ${train11271.length} stops for train 11271.`);
if (train11271.length > 0) {
    train11271.sort((a,b) => a.id - b.id);
    for(let i=0; i < Math.min(100, train11271.length); i++) {
        console.log(`${train11271[i].station_code} - ${train11271[i].station_name} | Arr: ${train11271[i].arrival} | Dep: ${train11271[i].departure}`);
    }
}
