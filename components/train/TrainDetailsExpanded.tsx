'use client';

import { useState, useEffect } from 'react';
import { Loader2, Calendar as CalendarIcon, Map, Train as TrainIcon, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { TRAIN_COMPOSITIONS, DEFAULT_COMPOSITION } from '@/data/compositions';

interface TrainDetailsExpandedProps {
    trainNo: string;
    fromStnCode: string;
    toStnCode: string;
    date: Date;
    runningDays?: string; // e.g. "1111111"
    currentStnCode?: string;
    route?: any[];
    trainType?: string; // e.g. "SHATABDI", "MAIL_EXPRESS", "RAJDHANI"
}

export default function TrainDetailsExpanded({ trainNo, fromStnCode, toStnCode, date, runningDays, currentStnCode, route, trainType }: TrainDetailsExpandedProps) {
    const formattedDate = format(date, 'dd-MM-yyyy');

    return (
        <div className="bg-gray-50 border-t border-gray-100 p-4 sm:p-6 shadow-inner">
            <Tabs defaultValue="availability" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8 bg-gray-200/50 p-1.5 rounded-xl h-10">
                    <TabsTrigger
                        value="availability"
                        className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm rounded-lg py-1 font-semibold transition-all"
                    >
                        Availability
                    </TabsTrigger>
                    <TabsTrigger
                        value="schedule"
                        className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm rounded-lg py-1 font-semibold transition-all"
                    >
                        Schedule
                    </TabsTrigger>
                    <TabsTrigger
                        value="coach"
                        className="data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm rounded-lg py-1 font-semibold transition-all"
                    >
                        Coach
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="availability" className="outline-none">
                    <AvailabilityTab
                        trainNo={trainNo}
                        fromStnCode={fromStnCode}
                        toStnCode={toStnCode}
                        date={formattedDate}
                        runningDays={runningDays}
                        currentStnCode={currentStnCode}
                        route={route}
                        trainType={trainType}
                    />
                </TabsContent>

                <TabsContent value="schedule" className="outline-none">
                    <ScheduleTab trainNo={trainNo} />
                </TabsContent>

                <TabsContent value="coach" className="outline-none">
                    <div className="bg-white rounded-xl border p-4 sm:p-6 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h4 className="text-lg font-bold text-gray-800">Coach Position</h4>
                                <p className="text-xs text-gray-500 font-medium">
                                    {TRAIN_COMPOSITIONS[trainNo] ? 'Verified rake composition for this train' : 'Standard rake composition for this train'}
                                </p>
                            </div>
                            <div className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-tighter ${TRAIN_COMPOSITIONS[trainNo] ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                {TRAIN_COMPOSITIONS[trainNo] ? 'Verified Layout' : 'Typical Layout'}
                            </div>
                        </div>

                        <div className="relative group/coach">
                            {/* Scrollable Coach Container with Drag Support */}
                            <div
                                className="flex overflow-x-auto gap-2 pb-4 pt-1 px-1 scrollbar-hide no-scrollbar cursor-grab active:cursor-grabbing select-none"
                                ref={(el) => {
                                    if (!el) return;
                                    let isDown = false;
                                    let startX = 0;
                                    let scrollLeft = 0;

                                    el.onmousedown = (e) => {
                                        isDown = true;
                                        el.classList.add('active:cursor-grabbing');
                                        startX = e.pageX - el.offsetLeft;
                                        scrollLeft = el.scrollLeft;
                                    };
                                    el.onmouseleave = () => { isDown = false; };
                                    el.onmouseup = () => { isDown = false; };
                                    el.onmousemove = (e) => {
                                        if (!isDown) return;
                                        e.preventDefault();
                                        const x = e.pageX - el.offsetLeft;
                                        const walk = (x - startX) * 2;
                                        el.scrollLeft = scrollLeft - walk;
                                    };
                                }}
                            >
                                {(TRAIN_COMPOSITIONS[trainNo] || DEFAULT_COMPOSITION).map((coach, idx) => (
                                    <div key={idx} className="flex flex-col items-center flex-shrink-0 group">
                                        <div className={`w-14 h-10 ${coach.color} rounded-t-md relative flex items-center justify-center shadow-md transition-transform group-hover:-translate-y-1`}>
                                            <span className="text-white text-[10px] font-black tracking-tighter">{coach.name}</span>
                                            {/* Wheels visualization */}
                                            <div className="absolute -bottom-1 left-2 w-2 h-2 rounded-full bg-slate-800 border-2 border-slate-400"></div>
                                            <div className="absolute -bottom-1 right-2 w-2 h-2 rounded-full bg-slate-800 border-2 border-slate-400"></div>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-200 mt-1 rounded-full overflow-hidden">
                                            <div className={`h-full w-full opacity-30 ${coach.color}`}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Scroll Indicator Gradients (both sides) */}
                            <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none opacity-0 group-hover/coach:opacity-100 transition-opacity"></div>
                            <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>

                            {/* Drag hint */}
                            <p className="text-[10px] text-gray-400 text-center mt-1 italic">← Drag to scroll →</p>
                        </div>

                        <div className="mt-4 bg-blue-50/50 rounded-lg p-3 border border-blue-100 flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <p className="text-[11px] text-blue-800 leading-relaxed italic">
                                {TRAIN_COMPOSITIONS[trainNo]
                                    ? "Note: While this layout is verified, coach positions can change due to last-minute operational requirements."
                                    : "Note: Exact coach position is dynamic and may vary depending on operational requirements. Please verify with digital indicators at the station platform."
                                }
                            </p>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Internal Component for Availability
function AvailabilityTab({
    trainNo,
    fromStnCode,
    toStnCode,
    date,
    runningDays,
    currentStnCode,
    route: initialRoute,
    trainType
}: {
    trainNo: string,
    fromStnCode: string,
    toStnCode: string,
    date: string,
    runningDays?: string,
    currentStnCode?: string,
    route?: any[],
    trainType?: string
}) {
    // Get classes based on train type (zero API calls!)
    const getClassesForType = (type?: string): string[] => {
        const t = (type || '').toUpperCase();
        if (t.includes('VANDE') || t.includes('SHATABDI') || t.includes('TEJAS') || t.includes('GATIMAAN')) {
            return ['CC', 'EC'];
        }
        if (t.includes('RAJDHANI') || t.includes('DURONTO')) {
            return ['1A', '2A', '3A'];
        }
        if (t.includes('GARIB')) {
            return ['3A'];
        }
        if (t.includes('MEMU') || t.includes('DMU') || t.includes('DEMU') || t.includes('PASSENGER') || t.includes('LOCAL')) {
            return ['2S'];
        }
        // Default for MAIL_EXPRESS, SUPERFAST, SPL, etc.
        return ['SL', '3A', '2A', '1A', '2S'];
    };

    const [availableClasses] = useState(getClassesForType(trainType));
    const [disabledClasses, setDisabledClasses] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState(getClassesForType(trainType)[0]);
    const [route, setRoute] = useState<any[] | undefined>(initialRoute);

    // Background class probing — disable invalid classes before user clicks them
    useEffect(() => {
        let isMounted = true;
        const probeClasses = async () => {
            const classes = getClassesForType(trainType);
            // Skip the first class (already being loaded by the availability useEffect)
            for (let i = 1; i < classes.length; i++) {
                if (!isMounted) break;
                await new Promise(r => setTimeout(r, 600)); // Throttle to avoid rate-limiting
                if (!isMounted) break;
                try {
                    const res = await fetch(`/api/train/availability/${trainNo}?from=${fromStnCode}&to=${toStnCode}&date=${date}&class=${classes[i]}&quota=GN`);
                    const json = await res.json();
                    if (!isMounted) break;
                    if (json.error?.toLowerCase().includes('class does not exist')) {
                        setDisabledClasses(prev => new Set(prev).add(classes[i]));
                    }
                } catch { /* ignore network errors */ }
            }
        };
        probeClasses();
        return () => { isMounted = false; };
    }, [trainNo, fromStnCode, toStnCode]);

    // Fetch route if missing but needed for offset calculation
    useEffect(() => {
        if (!route && currentStnCode) {
            const fetchRouteInfo = async () => {
                try {
                    const res = await fetch(`/api/train/info/${trainNo}`);
                    const json = await res.json();
                    const rawData = json.data || json;
                    if (rawData.route) setRoute(rawData.route);
                } catch (e) {
                    console.error("Failed to fetch route for offset:", e);
                }
            };
            fetchRouteInfo();
        }
    }, [trainNo, currentStnCode, route]);

    // Calculate journey day offset
    let dayOffset = 0;
    let stnName = '';
    if (currentStnCode && route && Array.isArray(route)) {
        const stop = route.find(s =>
            s.stnCode?.toUpperCase() === currentStnCode.toUpperCase()
        );
        if (stop && stop.day) {
            dayOffset = Math.max(0, parseInt(stop.day) - 1);
            stnName = stop.stnName;
        }
    }

    // Shift running days based on offset (IRCTC string: 0=Mon, 6=Sun)
    const getShiftedRunningDays = (original: string, offset: number) => {
        if (!original || original.length !== 7 || offset === 0) return original;
        const shifted = new Array(7).fill('0');
        for (let i = 0; i < 7; i++) {
            if (original[i] === '1') {
                const newPos = (i + offset) % 7;
                shifted[newPos] = '1';
            }
        }
        return shifted.join('');
    };

    const effectiveRunningDays = getShiftedRunningDays(runningDays || '', dayOffset);

    useEffect(() => {
        let isMounted = true;
        const fetchAvail = async () => {
            setLoading(true);
            setError(null);
            setData(null);

            // Adjust date for journey day offset (IRCTC availability is based on source departure date)
            let searchDate = date;
            if (dayOffset > 0) {
                try {
                    const [d, m, y] = date.split('-').map(Number);
                    const sourceDate = new Date(y, m - 1, d);
                    sourceDate.setDate(sourceDate.getDate() - dayOffset);
                    searchDate = format(sourceDate, 'dd-MM-yyyy');
                } catch (e) {
                    console.error("Date adjustment failed:", e);
                }
            }

            try {
                const res = await fetch(`/api/train/availability/${trainNo}?from=${fromStnCode}&to=${toStnCode}&date=${searchDate}&class=${selectedClass}&quota=GN`);
                const json = await res.json();
                if (!isMounted) return;

                if (json.success === false) {
                    const errMsg = json.error || "Failed to fetch availability.";
                    // Mark class as unavailable instead of removing it
                    if (errMsg.toLowerCase().includes('class does not exist')) {
                        setDisabledClasses(prev => new Set(prev).add(selectedClass));
                        // Auto-switch to first non-disabled class
                        const nextValid = availableClasses.find(c => c !== selectedClass && !disabledClasses.has(c));
                        if (nextValid) setSelectedClass(nextValid);
                        return;
                    }
                    setError(errMsg);
                } else {
                    setData(json.data || json);
                }
            } catch (err: any) {
                if (!isMounted) return;
                setError(err.message || 'Network error fetching data');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchAvail();
        return () => { isMounted = false; };
    }, [trainNo, fromStnCode, toStnCode, date, selectedClass, dayOffset]);

    const currentFare = data?.fare?.totalFare || data?.availability?.[0]?.fare || data?.availability?.[0]?.totalFare || (Array.isArray(data) && (data[0]?.fare || data[0]?.totalFare));

    return (
        <div className="bg-white rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between border-b bg-gray-50/50 p-1.5 overflow-hidden">
                <div className="flex overflow-x-auto gap-1.5 hide-scrollbar">
                    {availableClasses.map(cls => {
                        const isDisabled = disabledClasses.has(cls);
                        return (
                            <button
                                key={cls}
                                onClick={() => !isDisabled && setSelectedClass(cls)}
                                disabled={isDisabled}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold min-w-[50px] transition-colors ${isDisabled ? 'bg-gray-100 text-gray-300 line-through cursor-not-allowed border border-gray-100' : selectedClass === cls ? 'bg-orange-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-orange-50'}`}
                                title={isDisabled ? 'Not available on this train' : ''}
                            >
                                {cls}
                            </button>
                        );
                    })}
                </div>

                {!loading && !error && currentFare && (
                    <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-md shadow-sm border border-red-700 animate-in fade-in slide-in-from-right-2 duration-300">
                        <span className="text-[10px] font-black uppercase opacity-80 leading-none">Total Fare</span>
                        <span className="text-sm font-black leading-none tracking-tighter">₹{currentFare}</span>
                    </div>
                )}
            </div>

            <div className="p-3 sm:p-4 min-h-[150px] flex flex-col relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 text-red-700 p-5 rounded-lg border border-red-100 shadow-sm">
                        <div className="flex items-start gap-3 mb-4">
                            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="font-bold text-sm mb-1">
                                    {(() => {
                                        const errLower = error.toLowerCase();
                                        if (errLower.includes('too many requests')) return "IRCTC Servers Busy";
                                        if (errLower.includes('departed') || errLower.includes('closed')) return "Booking Closed";
                                        if (errLower.includes('not available for booking')) {
                                            const [day, month, year] = date.split('-').map(Number);
                                            const d = new Date(year, month - 1, day);
                                            const irctcIdx = (d.getDay() + 6) % 7;
                                            const runsToday = effectiveRunningDays?.[irctcIdx] === '1';
                                            if (!runsToday) return "Train Not Running Today";
                                            const t = (trainType || '').toUpperCase();
                                            if (t.includes('MEMU') || t.includes('DMU') || t.includes('DEMU') || t.includes('PASSENGER') || t.includes('LOCAL'))
                                                return "Not Available for Online Booking";
                                            return "Booking Closed – Train Already Departed";
                                        }
                                        return error;
                                    })()}
                                </h4>
                                <p className="text-xs text-red-800/80 leading-snug mb-2">
                                    {(() => {
                                        const errLower = error.toLowerCase();
                                        if (errLower.includes('too many requests')) return "IRCTC is limiting requests right now. Please wait a few seconds and try again.";
                                        if (errLower.includes('departed') || errLower.includes('closed')) return "This train has already departed or chart has been prepared.";
                                        if (errLower.includes('not available for booking')) {
                                            // Check if the train actually runs today
                                            const [day, month, year] = date.split('-').map(Number);
                                            const d = new Date(year, month - 1, day);
                                            const irctcIdx = (d.getDay() + 6) % 7;
                                            const runsToday = effectiveRunningDays?.[irctcIdx] === '1';

                                            if (!runsToday) return "This train does not operate on your selected date. Please check the schedule below.";

                                            // Train runs today — check if it's a MEMU/local type
                                            const t = (trainType || '').toUpperCase();
                                            const isMemu = t.includes('MEMU') || t.includes('DMU') || t.includes('DEMU') || t.includes('PASSENGER') || t.includes('LOCAL');
                                            if (isMemu) return "MEMU/Local trains do not support online booking. Tickets are available at the station counter.";

                                            // Regular train that runs today but isn't bookable — likely already departed
                                            return "This train runs today but booking is closed — it has likely already departed from its source station or the chart has been prepared.";
                                        }
                                        return "Try selecting another class or check the schedule below for more details.";
                                    })()}
                                </p>
                            </div>
                        </div>

                        {runningDays && (
                            <div className="bg-white/60 p-3 rounded-md border border-red-100/50">
                                <div className="text-[10px] uppercase font-black text-red-900/40 tracking-widest mb-2 flex justify-between">
                                    <span>{stnName ? `Runs at ${stnName} on:` : 'Operational Days at Source:'}</span>
                                </div>
                                <div className="flex gap-2">
                                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                                        const isActive = effectiveRunningDays[idx] === '1';
                                        return (
                                            <div key={idx} className="flex flex-col items-center gap-1">
                                                <div className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black transition-all ${isActive ? 'bg-red-600 text-white shadow-md shadow-red-200' : 'bg-red-100/50 text-red-300'}`}>
                                                    {day}
                                                </div>
                                                <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-red-600' : 'bg-red-100'}`}></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!loading && !error && data && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {data.availability && Array.isArray(data.availability) && data.availability.length > 0 ? (
                            data.availability.map((item: any, idx: number) => {
                                const status = (item.currentStatus || item.status || "").toUpperCase();
                                const prediction = (item.prediction || "").toUpperCase();

                                const isAvail = status.includes('AVAILABLE') || status.includes('AVL') || parseInt(status) > 0;
                                const isRegret = status.includes('REGRET') || status.includes('NO MORE BOOKING') || status.includes('DEPARTED') || prediction.includes('NO MORE BOOKING');
                                const isWL = status.includes('WL') || status.includes('WAITLIST');
                                const isRAC = status.includes('RAC');

                                let statusColor = 'text-gray-600 bg-gray-50 border-gray-200';
                                if (isRegret) statusColor = 'text-red-700 bg-red-50 border-red-200 opacity-80';
                                else if (isAvail) statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                                else if (isRAC) statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
                                else if (isWL) statusColor = 'text-orange-700 bg-orange-50 border-orange-200';

                                return (
                                    <div key={idx} className={`p-3 rounded-lg border-2 flex flex-col justify-between h-full transition-all hover:shadow-sm ${statusColor}`}>
                                        <div>
                                            <span className="text-[12px] font-semibold opacity-70 mb-0.5 block uppercase tracking-wider">{item.date || `Option ${idx + 1}`}</span>
                                            <span className="text-base font-bold block mb-1">{isRegret ? "REGRET" : (item.currentStatus || item.status || "N/A")}</span>
                                            {item.prediction && !isAvail && (
                                                <span className={`text-[12px] font-bold px-1.5 py-0.5 rounded-sm inline-block mb-1 ${isRegret ? 'bg-red-100 text-red-700' :
                                                    isWL ? 'bg-orange-100 text-orange-700' :
                                                        isRAC ? 'bg-amber-100 text-amber-700' :
                                                            'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {item.prediction} {item.predictionPercentage && item.predictionPercentage > 0 ? `(${item.predictionPercentage}%)` : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        ) : Array.isArray(data) && data.length > 0 ? (
                            data.map((item: any, idx: number) => {
                                const status = (item.currentStatus || item.status || "").toUpperCase();
                                const isRegret = status.includes('REGRET') || status.includes('NO MORE BOOKING') || status.includes('DEPARTED');
                                const isAvail = status.includes('AVAILABLE') || status.includes('AVL') || parseInt(status) > 0;
                                const isWL = status.includes('WL') || status.includes('WAITLIST');
                                const isRAC = status.includes('RAC');

                                let statusColor = 'text-gray-600 bg-gray-50 border-gray-200';
                                if (isRegret) statusColor = 'text-red-700 bg-red-50 border-red-200 opacity-80';
                                else if (isAvail) statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                                else if (isRAC) statusColor = 'text-amber-700 bg-amber-50 border-amber-200';
                                else if (isWL) statusColor = 'text-orange-700 bg-orange-50 border-orange-200';

                                return (
                                    <div key={idx} className={`p-3 rounded-lg border-2 flex flex-col justify-between h-full transition-all hover:shadow-sm ${statusColor}`}>
                                        <div>
                                            <span className="text-[10px] font-semibold opacity-70 mb-0.5 block uppercase tracking-wider">{item.date || `Option ${idx + 1}`}</span>
                                            <span className="text-base font-bold block mb-1">{isRegret ? "REGRET" : (item.currentStatus || item.status || "N/A")}</span>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="col-span-full bg-gray-50 p-6 rounded-lg border text-center">
                                <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                                <h3 className="text-sm text-gray-700 font-semibold mb-1">Data format unresolved</h3>
                                <pre className="text-[10px] text-left text-gray-500 overflow-auto max-h-40 bg-white p-3 rounded border mt-3">{JSON.stringify(data, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Internal Component for Schedule
function ScheduleTab({ trainNo }: { trainNo: string }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchSchedule = async () => {
            try {
                const res = await fetch(`/api/train/info/${trainNo}`);
                const json = await res.json();
                if (!isMounted) return;

                if (json.success === false) {
                    setError(json.error || "Failed to fetch schedule.");
                } else {
                    setData(json.data?.route || json.route || json);
                }
            } catch (err: any) {
                if (!isMounted) return;
                setError(err.message || 'Network error fetching schedule');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchSchedule();
        return () => { isMounted = false; };
    }, [trainNo]);

    return (
        <div className="bg-white rounded-xl border p-4 sm:p-6 min-h-[200px] flex flex-col relative overflow-hidden">
            {loading && (
                <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                </div>
            )}

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}

            {!loading && !error && data && (
                <div className="w-full">
                    <div className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Map className="w-5 h-5 text-indigo-500" />
                        Full Train Route
                    </div>
                    {Array.isArray(data) && data.length > 0 ? (
                        <div className="relative border-l-2 border-indigo-100 ml-3 pl-6 space-y-6 pb-4">
                            {data.map((stn: any, idx: number) => {
                                const isFirst = idx === 0;
                                const isLast = idx === data.length - 1;
                                return (
                                    <div key={idx} className="relative">
                                        <div className={`absolute w-3 h-3 rounded-full border-2 border-white shadow-sm -left-[29.5px] top-1.5 ${isFirst ? 'bg-green-500' : isLast ? 'bg-red-500' : 'bg-indigo-400'}`}></div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                                            <div>
                                                <h5 className="font-bold text-gray-900 leading-tight">{stn.stationName || stn.stnName}</h5>
                                                <span className="text-xs text-gray-500 font-semibold">{stn.stationCode || stn.stnCode}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 sm:mt-0 bg-gray-50 px-3 py-1.5 rounded-md border text-sm text-gray-700">
                                                <div className="flex flex-col text-center">
                                                    <span className="text-[9px] uppercase font-bold text-gray-400">Arr</span>
                                                    <span className="font-semibold">{stn.arrivalTime || stn.arrival || '--'}</span>
                                                </div>
                                                <div className="w-px h-6 bg-gray-200"></div>
                                                <div className="flex flex-col text-center">
                                                    <span className="text-[9px] uppercase font-bold text-gray-400">Dep</span>
                                                    <span className="font-semibold">{stn.departureTime || stn.departure || '--'}</span>
                                                </div>
                                                <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>
                                                <div className="flex flex-col text-center hidden sm:flex">
                                                    <span className="text-[9px] uppercase font-bold text-gray-400">Halt</span>
                                                    <span className="font-semibold text-xs">{stn.haltTime || stn.haltMinutes || '0'}m</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <pre className="text-xs text-gray-500 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
                    )}
                </div>
            )}
        </div>
    );
}
