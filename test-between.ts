import * as irctc from 'irctc-connect';
async function test() {
    try {
        const response = await irctc.searchTrainBetweenStations('NDLS', 'BCT');
        console.log(JSON.stringify(response.data?.[0] || response[0], null, 2));
    } catch (e: any) {
        console.error("CAUGHT:", e.message);
    }
}
test();
