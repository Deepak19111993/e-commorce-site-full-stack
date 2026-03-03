/**
 * Static mapping of train numbers to their coach compositions.
 * This can be updated manually for popular trains.
 */

export interface CoachInfo {
    name: string;
    type: 'engine' | 'sleeper' | 'ac' | 'general' | 'luggage' | 'pantry';
    color: string;
}

export const TRAIN_COMPOSITIONS: Record<string, CoachInfo[]> = {
    // Default compositions for common trains
    "12947": [ // AZIMABAD EXP
        { name: 'LOCO', type: 'engine', color: 'bg-slate-700' },
        { name: 'EOG', type: 'luggage', color: 'bg-amber-600' },
        { name: 'GEN', type: 'general', color: 'bg-orange-600' },
        { name: 'S1', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'S2', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'S3', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'S4', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'S5', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'S6', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'S7', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'S8', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'PC', type: 'pantry', color: 'bg-red-700' },
        { name: 'B1', type: 'ac', color: 'bg-teal-700' },
        { name: 'B2', type: 'ac', color: 'bg-teal-700' },
        { name: 'B3', type: 'ac', color: 'bg-teal-700' },
        { name: 'B4', type: 'ac', color: 'bg-teal-700' },
        { name: 'B5', type: 'ac', color: 'bg-teal-700' },
        { name: 'B6', type: 'ac', color: 'bg-teal-700' },
        { name: 'A1', type: 'ac', color: 'bg-indigo-800' },
        { name: 'A2', type: 'ac', color: 'bg-indigo-800' },
        { name: 'H1', type: 'ac', color: 'bg-purple-900' },
        { name: 'GEN', type: 'general', color: 'bg-orange-600' },
        { name: 'EOG', type: 'luggage', color: 'bg-amber-600' },
    ],
    "12941": [ // PARASNATH EXP
        { name: 'LOCO', type: 'engine', color: 'bg-slate-700' },
        { name: 'SLR', type: 'luggage', color: 'bg-amber-600' },
        { name: 'GEN', type: 'general', color: 'bg-orange-600' },
        { name: 'S1', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'S2', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'S3', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'S4', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'S5', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'S6', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'S7', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'S8', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'S9', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'S10', type: 'sleeper', color: 'bg-emerald-600' },
        { name: 'B1', type: 'ac', color: 'bg-teal-700' },
        { name: 'B2', type: 'ac', color: 'bg-teal-700' },
        { name: 'B3', type: 'ac', color: 'bg-teal-700' },
        { name: 'A1', type: 'ac', color: 'bg-indigo-800' },
        { name: 'GEN', type: 'general', color: 'bg-orange-600' },
        { name: 'SLR', type: 'luggage', color: 'bg-amber-600' },
    ],
    // Add more trains here as needed
};

export const DEFAULT_COMPOSITION: CoachInfo[] = [
    { name: 'LOCO', type: 'engine', color: 'bg-slate-700' },
    { name: 'SLR', type: 'luggage', color: 'bg-amber-600' },
    { name: 'GEN', type: 'general', color: 'bg-orange-600' },
    { name: 'S1', type: 'sleeper', color: 'bg-emerald-600' },
    { name: 'S2', type: 'sleeper', color: 'bg-emerald-600' },
    { name: 'S3', type: 'sleeper', color: 'bg-emerald-600' },
    { name: 'S4', type: 'sleeper', color: 'bg-emerald-600' },
    { name: 'S5', type: 'sleeper', color: 'bg-emerald-600' },
    { name: 'B1', type: 'ac', color: 'bg-teal-700' },
    { name: 'A1', type: 'ac', color: 'bg-indigo-800' },
    { name: 'GEN', type: 'general', color: 'bg-orange-600' },
    { name: 'SLR', type: 'luggage', color: 'bg-amber-600' },
];
