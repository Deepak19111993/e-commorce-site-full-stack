'use client';

import { useState, useEffect, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Activity, Search, MapPin, Clock, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { cn } from "@/lib/utils";

export default function LiveStatusPage() {
    const [trainNo, setTrainNo] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState('');
    const [isPassedExpanded, setIsPassedExpanded] = useState(false);
    const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);

    const { nextIdx, prevIdx, destinationIdx, passedCount, upcomingCount, liveAnomaly } = useMemo(() => {
        if (!data || !data.stations) return { nextIdx: -1, prevIdx: -1, destinationIdx: -1, passedCount: 0, upcomingCount: 0, liveAnomaly: null };

        let nextIdx = -1;
        const anomalyIdx = data.stations.findIndex((s: any) => !s.stationCode);

        let liveAnomaly = null;
        if (anomalyIdx !== -1) {
            const anomalyStr = data.stations[anomalyIdx].stationName;
            const match = anomalyStr.match(/(Arrived at|Departed from|Crossed|Near)\s+([^(]+)\s*\(([^)]+)\)/i);
            const timeMatch = anomalyStr.match(/([0-9]{2}:[0-9]{2})/);
            if (match) {
                liveAnomaly = {
                    action: match[1],
                    name: match[2].trim(),
                    code: match[3].trim(),
                    time: timeMatch ? timeMatch[1] : "--:--",
                    isMainStation: data.stations.some((s: any) => s.stationCode === match[3].trim())
                };
            }
        }

        let statusTimeObj: Date | null = null;
        const currentYear = new Date().getFullYear();

        if (data.statusNote) {
            const timeMatch = data.statusNote.match(/(\d{1,2}:\d{2})\s+(\d{1,2}-[A-Za-z]{3})/);
            if (timeMatch) {
                statusTimeObj = new Date(`${timeMatch[2]}-${currentYear} ${timeMatch[1]}`);
            }
        }

        if (statusTimeObj) {
            nextIdx = data.stations.findIndex((stn: any, i: number) => {
                if (!stn.stationCode) return false;
                let timeStr = stn.departure?.actual || stn.arrival?.actual;
                if (!timeStr || timeStr.includes('SRC') || timeStr.includes('DST')) return false;
                timeStr = timeStr.replace(/\*/g, '').trim();
                const parts = timeStr.split(' ');
                if (parts.length < 2) return false;
                const stnDate = new Date(`${parts[1]}-${currentYear} ${parts[0]}`);
                if (isNaN(stnDate.getTime())) return false;
                return stnDate > statusTimeObj;
            });
        }

        if (nextIdx === -1) {
            if (anomalyIdx !== -1) {
                nextIdx = anomalyIdx + 1;
            } else {
                const match = data.statusNote?.match(/\(([A-Z]+)\)/);
                if (match && match[1]) {
                    const idx = data.stations.findIndex((s: any) => s.stationCode === match[1]);
                    if (idx !== -1) {
                        if (data.statusNote?.toLowerCase().includes('departed')) nextIdx = idx + 1;
                        else nextIdx = idx;
                    }
                } else {
                    nextIdx = data.stations.length - 1;
                }
            }
        }

        if (nextIdx >= data.stations.length) nextIdx = data.stations.length - 1;
        if (nextIdx < 0) nextIdx = 0;

        let prevIdx = -1;
        for (let i = nextIdx - 1; i >= 0; i--) {
            if (data.stations[i].stationCode) {
                prevIdx = i;
                break;
            }
        }

        const destinationIdx = data.stations.length - 1;

        let passedCount = 0;
        for (let i = 0; i < prevIdx; i++) {
            if (data.stations[i].stationCode) passedCount++;
        }

        let upcomingCount = 0;
        for (let i = nextIdx + 1; i < destinationIdx; i++) {
            if (data.stations[i].stationCode) upcomingCount++;
        }

        return { nextIdx, prevIdx, destinationIdx, passedCount, upcomingCount, liveAnomaly };
    }, [data]);


    useEffect(() => {
        setDate(new Date());
    }, []);

    // Auto-refresh every 2 minutes if viewing live status
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (data && trainNo && trainNo.length === 5) {
            // polling interval: 120000ms = 2 minutes
            interval = setInterval(async () => {
                try {
                    const formattedDate = date ? format(date, 'dd-MM-yyyy') : format(new Date(), 'dd-MM-yyyy');
                    const res = await fetch(`/api/train/live/${trainNo}?date=${formattedDate}`);
                    const json = await res.json();
                    if (json.success) {
                        setData(json.data);
                    }
                } catch (err) {
                    console.error("Auto-refresh failed", err);
                }
            }, 120000);
        }
        return () => clearInterval(interval);
    }, [data, trainNo, date]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trainNo || trainNo.length !== 5) {
            setError('Please enter a valid 5-digit Train Number');
            return;
        }

        setLoading(true);
        setError('');
        setData(null);

        try {
            // Format date to DD-MM-YYYY for API
            const formattedDate = date ? format(date, 'dd-MM-yyyy') : format(new Date(), 'dd-MM-yyyy');
            const res = await fetch(`/api/train/live/${trainNo}?date=${formattedDate}`);
            const json = await res.json();

            if (!json.success) {
                let errorMsg = json.error || 'Failed to fetch live status. Please check Train Number and Start Date.';
                if (errorMsg.includes('HTTP error! status: 503') || errorMsg.includes('HTTP error! status: 500')) {
                    errorMsg = 'Train information is unavailable. The train may not run on this date, or the IRCTC servers are temporarily busy.';
                }
                setError(errorMsg);
            } else {
                setData(json.data);
            }

        } catch (err) {
            setError('An error occurred while fetching live status');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl w-full mx-auto sm:py-8 py-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
            >
                <div className="bg-gradient-to-r from-orange-600 to-red-600 sm:p-8 p-4 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="h-8 w-8" />
                        <h1 className="sm:text-3xl text-2xl font-bold">Live Train Status</h1>
                    </div>
                    <p className="text-orange-100">Track real-time location and delay info</p>
                </div>

                <div className="py-4 px-3 sm:px-5 sm:py-8">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                        <div className="w-full sm:flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1 ml-1 text-xs">Train Number</label>
                            <Input
                                placeholder="Enter 5-digit Train Number"
                                value={trainNo}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                                    setTrainNo(val);
                                    setError('');
                                }}
                                className="text-sm sm:text-lg h-10 md:h-[50px] lg:h-[55px] px-4"
                            />
                        </div>
                        <div className="w-full sm:w-56">
                            <label className="block text-sm font-medium text-gray-700 mb-1 ml-1 text-xs">Start Date</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal text-sm sm:text-lg h-10 md:h-[50px] lg:h-[55px] px-4",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border-none bg-transparent shadow-none" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        disabled={{ before: subDays(new Date(), 30) }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex items-end">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-orange-600 hover:bg-orange-700 h-10 md:h-[50px] lg:h-[55px] px-8 text-sm sm:text-lg w-full"
                            >
                                {loading ? 'Tracking...' : (
                                    <>
                                        <Search className="mr-2 h-4 w-4" /> Track
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 mt-8">
                            {error}
                        </div>
                    )}

                    {data && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6 mt-8"
                        >
                            <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    {data.train_name || 'Train'} ({data.train_number || trainNo})
                                </h2>

                                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3">
                                    <div className="text-lg text-gray-700 flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-orange-600" />
                                        {data.statusNote ? (
                                            <span><strong>{data.statusNote}</strong></span>
                                        ) : (
                                            <span>Status: <strong>{data.status || 'Running'}</strong></span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-400" />
                                        Live Auto-Update Active (every 2 min)
                                    </div>
                                </div>

                                {data.delay && (
                                    <div className="mt-4 text-red-600 font-semibold bg-red-50 inline-block px-3 py-1 rounded-full text-sm">
                                        Delayed by {data.delay} minutes
                                    </div>
                                )}
                            </div>

                            {/* Assuming data has a route or stations array. Structure varies by API, handling generic list if present */}
                            {data.stations ? (
                                <div className="border rounded-xl flex flex-col overflow-hidden">
                                    {/* Desktop Table View */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-left text-sm text-gray-600 min-w-[600px]">
                                            <thead className="bg-gray-100 uppercase font-medium">
                                                <tr>
                                                    <th className="px-6 py-4">Station</th>
                                                    <th className="px-6 py-4">Sch. Arr</th>
                                                    <th className="px-6 py-4">Act. Arr</th>
                                                    <th className="px-6 py-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {(() => {
                                                    return data.stations.map((stn: any, i: number) => {
                                                        const isAnomaly = !stn.stationCode;
                                                        const isPassedGroup = i < prevIdx && !isAnomaly;
                                                        const isUpcomingGroup = i > nextIdx && i < destinationIdx && !isAnomaly;

                                                        if (isPassedGroup && !isPassedExpanded) {
                                                            if (i === 0 && passedCount > 0) {
                                                                return (
                                                                    <tr key="toggle-passed" className="bg-gray-50/80 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setIsPassedExpanded(true)}>
                                                                        <td colSpan={4} className="px-6 py-3 text-center text-sm font-medium text-gray-500">
                                                                            <div className="flex items-center justify-center gap-2">
                                                                                <ChevronDown className="w-4 h-4" />
                                                                                Show {passedCount} Passed Station{passedCount !== 1 ? 's' : ''}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }
                                                            return null;
                                                        }

                                                        if (isUpcomingGroup && !isUpcomingExpanded) {
                                                            if (i === nextIdx + 1 && upcomingCount > 0) {
                                                                return (
                                                                    <tr key="toggle-upcoming" className="bg-gray-50/80 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setIsUpcomingExpanded(true)}>
                                                                        <td colSpan={4} className="px-6 py-3 text-center text-sm font-medium text-gray-500">
                                                                            <div className="flex items-center justify-center gap-2">
                                                                                <ChevronDown className="w-4 h-4" />
                                                                                Show {upcomingCount} Intermediate Station{upcomingCount !== 1 ? 's' : ''}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }
                                                            return null;
                                                        }

                                                        if (isAnomaly) {
                                                            if (liveAnomaly && liveAnomaly.isMainStation) return null; // Rendered on main stn
                                                            const match = stn.stationName.match(/(Arrived at|Departed from|Crossed|Near)\s+([^(]+)\s*\(([^)]+)\)/i);
                                                            const timeMatch = stn.stationName.match(/([0-9]{2}:[0-9]{2})/);

                                                            let formattedName = match ? match[2].trim() : stn.stationName;
                                                            let formattedCode = match ? match[3].trim() : "LIVE";
                                                            let formattedAction = match ? match[1] : "Status";
                                                            let formattedTime = timeMatch ? timeMatch[1] : "--:--";

                                                            return (
                                                                <tr key={`anomaly-${i}`} className="bg-orange-50 border-y border-orange-200">
                                                                    <td colSpan={match ? 1 : 4} className={`px-6 py-4 font-medium relative ${match ? '' : 'text-center'}`}>
                                                                        <div className={`flex items-center ${match ? 'gap-2' : 'justify-center gap-3'}`}>
                                                                            <motion.span animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className={match ? "text-xl" : "text-3xl filter drop-shadow-sm"}>🚆</motion.span>
                                                                            <span className={`text-orange-900 font-bold ${match ? '' : 'text-lg leading-tight'}`}>{formattedName}</span>
                                                                            {match && <span className="bg-orange-200 text-orange-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm ml-2 hidden sm:inline-block">Live Loc</span>}
                                                                        </div>
                                                                        {match && <span className="text-xs text-orange-700/80 pl-8 block mt-1">({formattedCode}) - {formattedAction}</span>}
                                                                    </td>
                                                                    {match && (
                                                                        <>
                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-xs text-gray-400">Time:</span>
                                                                                    <span className="font-bold text-orange-700">{formattedTime}</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-xs text-gray-400">Sch:</span>
                                                                                    <span className="font-semibold text-gray-400">--:--</span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-6 py-4">
                                                                                <span className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block shadow-sm bg-orange-100 text-orange-700 border border-orange-200">
                                                                                    LIVE
                                                                                </span>
                                                                            </td>
                                                                        </>
                                                                    )}
                                                                </tr>
                                                            );
                                                        }

                                                        const delay = stn.arrival?.delay || 'On Time';
                                                        const isLate = delay !== 'On Time' && delay !== '00:00' && !delay.includes('No Delay');
                                                        const isNext = i === nextIdx;
                                                        const isCurrentLiveStation = liveAnomaly?.isMainStation && liveAnomaly.code === stn.stationCode;

                                                        let rowClass = "active:bg-gray-50 transition-colors border-b border-gray-100 relative";
                                                        let textClass = "text-gray-900";
                                                        let subTextClass = "text-gray-500";

                                                        if (isCurrentLiveStation) {
                                                            rowClass = "bg-orange-50 border-y-2 border-orange-200 shadow-sm relative z-10";
                                                            textClass = "font-extrabold text-orange-900";
                                                            subTextClass = "text-orange-700 font-bold";
                                                        } else if (i <= prevIdx && !isNext) {
                                                            rowClass = "bg-emerald-50/40 relative";
                                                            textClass = "text-gray-500 font-semibold";
                                                            subTextClass = "text-gray-400";
                                                        } else if (isNext) {
                                                            rowClass = "bg-gradient-to-r from-orange-600 to-orange-500 shadow-xl transform scale-[1.02] z-20 rounded-lg border-none relative my-1";
                                                            textClass = "text-white font-bold";
                                                            subTextClass = "text-orange-100";
                                                        }

                                                        return (
                                                            <tr key={i} className={rowClass}>
                                                                <td className="px-6 py-4 font-medium relative">
                                                                    <div className="flex flex-col">
                                                                        <div className="flex items-center gap-2">
                                                                            {isCurrentLiveStation && (
                                                                                <motion.span animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-xl">🚆</motion.span>
                                                                            )}
                                                                            <span className={textClass}>{stn.stationName}</span>
                                                                            {isCurrentLiveStation && (
                                                                                <span className="bg-orange-200 text-orange-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm ml-2 hidden sm:inline-block">Live Loc</span>
                                                                            )}
                                                                            {isNext && (
                                                                                <span className="animate-pulse bg-white text-orange-600 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full shadow-sm ml-2">
                                                                                    Next Stop
                                                                                </span>
                                                                            )}
                                                                            {i <= prevIdx && !isNext && !isCurrentLiveStation && (
                                                                                <span className="text-emerald-600/60 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-emerald-200 hidden sm:inline-block ml-2">
                                                                                    Passed
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <span className={`text-xs ${subTextClass}`}>({stn.stationCode})</span>
                                                                        {isCurrentLiveStation && (
                                                                            <span className="text-[10px] text-orange-700/80 block mt-1 font-bold">{liveAnomaly.action} at {liveAnomaly.time}</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>
                                                                    <div className="flex flex-col">
                                                                        <span className={`text-xs ${isNext ? 'text-orange-100' : 'text-gray-400'}`}>Sch: {stn.arrival?.scheduled}</span>
                                                                        <span className="font-semibold">{stn.arrival?.actual}</span>
                                                                    </div>
                                                                </td>
                                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>
                                                                    <div className="flex flex-col">
                                                                        <span className={`text-xs ${isNext ? 'text-orange-100' : 'text-gray-400'}`}>{stn.arrival?.actual === 'SRC' ? '' : `Sch: ${stn.departure?.scheduled}`}</span>
                                                                        <span>{stn.departure?.actual}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block shadow-sm ${isCurrentLiveStation
                                                                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                                                        : (isNext
                                                                            ? 'bg-white text-orange-700'
                                                                            : (!isLate
                                                                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                                                : 'bg-rose-100 text-rose-700 border border-rose-200'))
                                                                        }`}>
                                                                        {isCurrentLiveStation ? 'LIVE' : delay}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    });
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Card View */}
                                    <div className="md:hidden flex flex-col divide-y divide-gray-100 p-2 space-y-2 bg-gray-50/50">
                                        {(() => {
                                            return data.stations.map((stn: any, i: number) => {
                                                const isAnomaly = !stn.stationCode;
                                                const isPassedGroup = i < prevIdx && !isAnomaly;
                                                const isUpcomingGroup = i > nextIdx && i < destinationIdx && !isAnomaly;

                                                if (isPassedGroup && !isPassedExpanded) {
                                                    if (i === 0 && passedCount > 0) {
                                                        return (
                                                            <div key="toggle-passed" className="bg-gray-100 rounded-lg p-3 flex justify-center items-center cursor-pointer mb-2" onClick={() => setIsPassedExpanded(true)}>
                                                                <span className="text-sm font-semibold text-gray-500 flex items-center gap-1"><ChevronDown className="w-4 h-4" /> Show {passedCount} Passed Station{passedCount !== 1 ? 's' : ''}</span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }

                                                if (isUpcomingGroup && !isUpcomingExpanded) {
                                                    if (i === nextIdx + 1 && upcomingCount > 0) {
                                                        return (
                                                            <div key="toggle-upcoming" className="bg-gray-100 rounded-lg p-3 flex justify-center items-center cursor-pointer mt-2" onClick={() => setIsUpcomingExpanded(true)}>
                                                                <span className="text-sm font-semibold text-gray-500 flex items-center gap-1"><ChevronDown className="w-4 h-4" /> Show {upcomingCount} Intermediate Station{upcomingCount !== 1 ? 's' : ''}</span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }

                                                if (isAnomaly) {
                                                    if (liveAnomaly && liveAnomaly.isMainStation) return null; // Rendered on main stn
                                                    const match = stn.stationName.match(/(Arrived at|Departed from|Crossed|Near)\s+([^(]+)\s*\(([^)]+)\)/i);
                                                    const timeMatch = stn.stationName.match(/([0-9]{2}:[0-9]{2})/);

                                                    let formattedName = match ? match[2].trim() : stn.stationName;
                                                    let formattedCode = match ? match[3].trim() : "LIVE";
                                                    let formattedAction = match ? match[1] : "Status";
                                                    let formattedTime = timeMatch ? timeMatch[1] : "--:--";

                                                    if (!match) {
                                                        return (
                                                            <div key={`anomaly-${i}`} className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200 shadow-sm flex items-center justify-center relative overflow-hidden my-2">
                                                                <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="mr-3 z-10">
                                                                    <span className="text-3xl filter drop-shadow-sm">🚆</span>
                                                                </motion.div>
                                                                <span className="text-orange-900 font-bold text-sm leading-tight text-center z-10">{stn.stationName}</span>
                                                                <div className="absolute inset-0 opacity-[0.03] bg-[rgba(0,0,0,1)] z-0" style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)" }} />
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div key={`anomaly-${i}`} className="bg-orange-50 p-4 rounded-xl shadow-md border-2 border-orange-400 relative overflow-hidden mt-2 z-10 scale-[1.02]">
                                                            <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl shadow-sm z-10 animate-pulse">
                                                                LIVE LOC
                                                            </div>

                                                            <div className="flex justify-between items-start mb-2 mt-0.5">
                                                                <div className="flex items-start gap-2">
                                                                    <motion.span animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-2xl mt-1">🚆</motion.span>
                                                                    <div>
                                                                        <h4 className="text-base font-extrabold text-orange-900 leading-tight">{formattedName}</h4>
                                                                        <span className="text-[10px] text-orange-700 uppercase font-bold tracking-wider">({formattedCode}) - {formattedAction}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-orange-100/50 border border-orange-200">
                                                                <div>
                                                                    <div className="text-[9px] uppercase font-bold text-orange-600 mb-0.5">{formattedAction} Time</div>
                                                                    <div className="text-sm text-orange-900 font-bold">{formattedTime}</div>
                                                                </div>
                                                                <div className="flex items-center justify-end">
                                                                    <span className="px-2 py-1 rounded text-[10px] font-bold shadow-sm whitespace-nowrap bg-orange-500 text-white">
                                                                        LIVE
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                const delay = stn.arrival?.delay || 'On Time';
                                                const isLate = delay !== 'On Time' && delay !== '00:00' && !delay.includes('No Delay');
                                                const isNext = i === nextIdx;
                                                const isCurrentLiveStation = liveAnomaly?.isMainStation && liveAnomaly.code === stn.stationCode;

                                                let cardClass = "bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden";
                                                let textClass = "text-gray-900";
                                                let subTextClass = "text-gray-500";

                                                if (isCurrentLiveStation) {
                                                    cardClass = "bg-orange-50 p-4 rounded-xl border-2 border-orange-200 shadow-sm relative overflow-hidden mt-2 z-10 scale-[1.02]";
                                                    textClass = "text-orange-900 font-extrabold";
                                                    subTextClass = "text-orange-700 font-bold";
                                                } else if (i <= prevIdx && !isNext) {
                                                    cardClass = "bg-emerald-50/20 p-4 rounded-xl border border-emerald-50 relative opacity-70 mt-2";
                                                    textClass = "text-gray-500";
                                                    subTextClass = "text-gray-400";
                                                } else if (isNext) {
                                                    cardClass = "bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl shadow-lg relative transform scale-[1.02] border border-orange-400 mt-2 z-10";
                                                    textClass = "text-white font-bold";
                                                    subTextClass = "text-orange-100";
                                                }

                                                return (
                                                    <div key={i} className={cardClass}>
                                                        {isNext && (
                                                            <div className="absolute top-0 right-0 bg-white text-orange-600 text-[9px] font-bold px-2 py-0.5 rounded-bl shadow-sm z-10 animate-pulse">
                                                                NEXT
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between items-start mb-2 mt-0.5">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    {isCurrentLiveStation && (
                                                                        <motion.span animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-xl">🚆</motion.span>
                                                                    )}
                                                                    <h4 className={`text-sm leading-tight ${textClass}`}>{stn.stationName}</h4>
                                                                    {isCurrentLiveStation && (
                                                                        <span className="bg-orange-200 text-orange-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm">Live Loc</span>
                                                                    )}
                                                                </div>
                                                                <span className={`text-[10px] ${subTextClass} uppercase font-semibold tracking-wider`}>{stn.stationCode}</span>
                                                                {isCurrentLiveStation && (
                                                                    <span className="text-[10px] text-orange-700/80 block mt-0.5 font-bold">{liveAnomaly.action} at {liveAnomaly.time}</span>
                                                                )}
                                                            </div>
                                                            <div className={`px-2 py-1 rounded text-[10px] font-bold shadow-sm whitespace-nowrap mt-1 ${isCurrentLiveStation
                                                                ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                                                : (isNext
                                                                    ? 'bg-white/20 text-white border border-white/30'
                                                                    : (!isLate
                                                                        ? 'bg-emerald-100 text-emerald-700'
                                                                        : 'bg-rose-100 text-rose-700'))
                                                                }`}>
                                                                {isCurrentLiveStation ? 'LIVE' : delay}
                                                            </div>
                                                        </div>

                                                        <div className={`grid grid-cols-2 gap-2 p-2 rounded-lg ${isNext ? 'bg-orange-700/30' : 'bg-gray-50'} border ${isNext ? 'border-orange-400' : 'border-gray-100/50'}`}>
                                                            <div>
                                                                <div className={`text-[9px] uppercase font-bold ${isNext ? 'text-orange-200' : 'text-gray-400'} mb-0.5`}>Arrival</div>
                                                                <div className={`text-xs ${isNext ? 'text-white' : 'text-gray-900'} font-medium`}>Act: {stn.arrival?.actual}</div>
                                                                <div className={`text-[10px] mt-0.5 ${isNext ? 'text-orange-100' : 'text-gray-500'}`}>Sch: {stn.arrival?.scheduled}</div>
                                                            </div>
                                                            <div>
                                                                <div className={`text-[9px] uppercase font-bold ${isNext ? 'text-orange-200' : 'text-gray-400'} mb-0.5`}>Departure</div>
                                                                <div className={`text-xs ${isNext ? 'text-white' : 'text-gray-900'} font-medium`}>Act: {stn.departure?.actual}</div>
                                                                {stn.arrival?.actual !== 'SRC' && (
                                                                    <div className={`text-[10px] mt-0.5 ${isNext ? 'text-orange-100' : 'text-gray-500'}`}>Sch: {stn.departure?.scheduled}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <pre className="overflow-auto text-xs">{JSON.stringify(data, null, 2)}</pre>
                                </div>
                            )}

                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
