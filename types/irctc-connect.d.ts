declare module 'irctc-connect' {
    export function checkPNRStatus(pnr: string): Promise<any>;
    export function getTrainInfo(trainNo: string): Promise<any>;
    export function trackTrain(trainNo: string, date: string): Promise<any>;
    export function liveAtStation(stnCode: string): Promise<any>;
    export function searchTrainBetweenStations(from: string, to: string): Promise<any>;
    export function getAvailability(trainNo: string, from: string, to: string, date: string, coach: string, quota: string): Promise<any>;
}
