const irctc = require('irctc-connect');

async function test() {
    try {
        const info = await irctc.getTrainInfo('12947');
        console.log('--- Train Info ---');
        console.log(JSON.stringify(info, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
