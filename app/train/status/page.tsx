'use client';

import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Activity, Search, MapPin, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

export default function LiveStatusPage() {
    const [trainNo, setTrainNo] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        setDate(new Date());
    }, []);

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
                                        disabled={{ before: new Date() }}
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
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
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
                                <div className="text-lg text-gray-700 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-orange-600" />
                                    {data.statusNote ? (
                                        <span><strong>{data.statusNote}</strong></span>
                                    ) : (
                                        <span>Status: <strong>{data.status || 'Running'}</strong></span>
                                    )}
                                </div>
                                {data.delay && (
                                    <div className="mt-2 text-red-600 font-semibold bg-red-50 inline-block px-3 py-1 rounded-full text-sm">
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
                                                    // ALGORITHM: Time-Based Progress Tracking with Robust Parsing
                                                    // 1. Parse the "Current Status Time" from `statusNote`.
                                                    // 2. Iterate through stations and parse their "Actual Departure" (or Arrival) time.
                                                    // 3. IMPORTANT: Sanitize strings (remove '*') before parsing.
                                                    // 4. The first station where Station Time > Status Time is CURRENT/NEXT.

                                                    let activeIndex = -1;
                                                    let statusTimeObj: Date | null = null;

                                                    const currentYear = new Date().getFullYear();

                                                    if (data.statusNote) {
                                                        // Example: "11:30 20-Feb"
                                                        const timeMatch = data.statusNote.match(/(\d{1,2}:\d{2})\s+(\d{1,2}-[A-Za-z]{3})/);
                                                        if (timeMatch) {
                                                            const [_, timeStr, dateStr] = timeMatch;
                                                            statusTimeObj = new Date(`${dateStr}-${currentYear} ${timeStr}`);
                                                        }
                                                    }

                                                    if (statusTimeObj) {
                                                        // Find the transition point
                                                        const found = data.stations.findIndex((stn: any) => {
                                                            if (!stn.stationCode) return false;

                                                            // Prefer departure time, fall back to arrival
                                                            let timeStr = stn.departure?.actual || stn.arrival?.actual;
                                                            // Example inputs: "19:45 19-Feb", "20:53 19-Feb*", "SRC", "DST"

                                                            if (!timeStr || timeStr.includes('SRC') || timeStr.includes('DST')) return false;

                                                            // SANITIZE: Remove asterisks which indicate estimated time
                                                            timeStr = timeStr.replace(/\*/g, '').trim();

                                                            // Parse station time
                                                            const parts = timeStr.split(' ');
                                                            // Expect parts like ["19:45", "19-Feb"]
                                                            if (parts.length < 2) return false;

                                                            const stnDate = new Date(`${parts[1]}-${currentYear} ${parts[0]}`);

                                                            // If date is invalid, skip
                                                            if (isNaN(stnDate.getTime())) return false;

                                                            // If this station's time is AFTER the status time, it's the next/current one
                                                            return stnDate > statusTimeObj;
                                                        });

                                                        if (found !== -1) {
                                                            activeIndex = found;
                                                        } else {
                                                            // If no future station found, likely reached destination?
                                                            // Or status time is very recent.
                                                            if (data.stations.length > 0) {
                                                                activeIndex = data.stations.length - 1;
                                                            }
                                                        }
                                                    } else {
                                                        // Fallback: If date parsing fails, use fallback matching (Index/Anomaly detection)
                                                        const match = data.statusNote?.match(/\(([A-Z]+)\)/);
                                                        if (match && match[1]) {
                                                            const idx = data.stations.findIndex((s: any) => s.stationCode === match[1]);
                                                            if (idx !== -1) {
                                                                if (data.statusNote?.toLowerCase().includes('departed')) activeIndex = idx + 1;
                                                                else activeIndex = idx;
                                                            }
                                                        } else {
                                                            // Last Resort: Look for the anomaly row (missing station code)
                                                            const anomalyIdx = data.stations.findIndex((s: any) => !s.stationCode);
                                                            if (anomalyIdx !== -1) {
                                                                activeIndex = anomalyIdx + 1;
                                                            }
                                                        }
                                                    }

                                                    // Clamp index
                                                    if (activeIndex >= data.stations.length) activeIndex = data.stations.length - 1;
                                                    if (activeIndex < 0) activeIndex = 0;

                                                    return data.stations.map((stn: any, i: number) => {
                                                        if (!stn.stationCode) return null;

                                                        const delay = stn.arrival?.delay || 'On Time';
                                                        const isLate = delay !== 'On Time' && delay !== '00:00' && !delay.includes('No Delay');

                                                        const isPassed = i < activeIndex;
                                                        const isCurrent = i === activeIndex;

                                                        let rowClass = "active:bg-gray-50 transition-colors border-b border-gray-100";
                                                        let textClass = "text-gray-900";
                                                        let subTextClass = "text-gray-500";

                                                        if (isPassed) {
                                                            rowClass = "bg-emerald-50/40";
                                                            textClass = "text-gray-400";
                                                            subTextClass = "text-gray-300";
                                                        } else if (isCurrent) {
                                                            rowClass = "bg-gradient-to-r from-orange-600 to-orange-500 shadow-xl transform scale-[1.02] z-20 rounded-lg border-none relative my-1";
                                                            textClass = "text-white font-bold";
                                                            subTextClass = "text-orange-100";
                                                        }

                                                        return (
                                                            <tr key={i} className={rowClass}>
                                                                <td className="px-6 py-4 font-medium">
                                                                    <div className="flex flex-col">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={textClass}>{stn.stationName}</span>
                                                                            {isCurrent && (
                                                                                <span className="animate-pulse bg-white text-orange-600 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full shadow-sm ml-2">
                                                                                    Current
                                                                                </span>
                                                                            )}
                                                                            {isPassed && (
                                                                                <span className="text-emerald-600/60 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-emerald-200 hidden sm:inline-block ml-2">
                                                                                    Passed
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <span className={`text-xs ${subTextClass}`}>({stn.stationCode})</span>
                                                                    </div>
                                                                </td>
                                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>
                                                                    <div className="flex flex-col">
                                                                        <span className={`text-xs ${isCurrent ? 'text-orange-100' : 'text-gray-400'}`}>Sch: {stn.arrival?.scheduled}</span>
                                                                        <span className="font-semibold">{stn.arrival?.actual}</span>
                                                                    </div>
                                                                </td>
                                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>
                                                                    <div className="flex flex-col">
                                                                        <span className={`text-xs ${isCurrent ? 'text-orange-100' : 'text-gray-400'}`}>{stn.arrival?.actual === 'SRC' ? '' : `Sch: ${stn.departure?.scheduled}`}</span>
                                                                        <span>{stn.departure?.actual}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block shadow-sm ${isCurrent
                                                                        ? 'bg-white text-orange-700'
                                                                        : (!isLate
                                                                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                                            : 'bg-rose-100 text-rose-700 border border-rose-200')
                                                                        }`}>
                                                                        {delay}
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
                                            let activeIndex = -1;
                                            let statusTimeObj: Date | null = null;
                                            const currentYear = new Date().getFullYear();

                                            if (data.statusNote) {
                                                const timeMatch = data.statusNote.match(/(\d{1,2}:\d{2})\s+(\d{1,2}-[A-Za-z]{3})/);
                                                if (timeMatch) {
                                                    statusTimeObj = new Date(`${timeMatch[2]}-${currentYear} ${timeMatch[1]}`);
                                                }
                                            }

                                            if (statusTimeObj) {
                                                const found = data.stations.findIndex((stn: any) => {
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
                                                if (found !== -1) activeIndex = found;
                                                else if (data.stations.length > 0) activeIndex = data.stations.length - 1;
                                            } else {
                                                const match = data.statusNote?.match(/\(([A-Z]+)\)/);
                                                if (match && match[1]) {
                                                    const idx = data.stations.findIndex((s: any) => s.stationCode === match[1]);
                                                    if (idx !== -1) {
                                                        if (data.statusNote?.toLowerCase().includes('departed')) activeIndex = idx + 1;
                                                        else activeIndex = idx;
                                                    }
                                                }
                                            }

                                            if (activeIndex >= data.stations.length) activeIndex = data.stations.length - 1;
                                            if (activeIndex < 0) activeIndex = 0;

                                            return data.stations.map((stn: any, i: number) => {
                                                if (!stn.stationCode) return null;

                                                const delay = stn.arrival?.delay || 'On Time';
                                                const isLate = delay !== 'On Time' && delay !== '00:00' && !delay.includes('No Delay');
                                                const isPassed = i < activeIndex;
                                                const isCurrent = i === activeIndex;

                                                let cardClass = "bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden";
                                                let textClass = "text-gray-900";
                                                let subTextClass = "text-gray-500";

                                                if (isPassed) {
                                                    cardClass = "bg-emerald-50/20 p-4 rounded-xl border border-emerald-50 relative opacity-70";
                                                    textClass = "text-gray-500";
                                                    subTextClass = "text-gray-400";
                                                } else if (isCurrent) {
                                                    cardClass = "bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl shadow-lg relative transform scale-[1.02] border border-orange-400";
                                                    textClass = "text-white font-bold";
                                                    subTextClass = "text-orange-100";
                                                }

                                                return (
                                                    <div key={i} className={cardClass}>
                                                        {isCurrent && (
                                                            <div className="absolute top-0 right-0 bg-white text-orange-600 text-[9px] font-bold px-2 py-0.5 rounded-bl shadow-sm z-10 animate-pulse">
                                                                CURRENT
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between items-start mb-2 mt-0.5">
                                                            <div>
                                                                <h4 className={`text-sm leading-tight ${textClass}`}>{stn.stationName}</h4>
                                                                <span className={`text-[10px] ${subTextClass} uppercase font-semibold tracking-wider`}>{stn.stationCode}</span>
                                                            </div>
                                                            <div className={`px-2 py-1 rounded text-[10px] font-bold shadow-sm whitespace-nowrap ${isCurrent
                                                                ? 'bg-white/20 text-white border border-white/30'
                                                                : (!isLate
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-rose-100 text-rose-700')}`}>
                                                                {delay}
                                                            </div>
                                                        </div>

                                                        <div className={`grid grid-cols-2 gap-2 p-2 rounded-lg ${isCurrent ? 'bg-orange-700/30' : 'bg-gray-50'} border ${isCurrent ? 'border-orange-400' : 'border-gray-100/50'}`}>
                                                            <div>
                                                                <div className={`text-[9px] uppercase font-bold ${isCurrent ? 'text-orange-200' : 'text-gray-400'} mb-0.5`}>Arrival</div>
                                                                <div className={`text-xs ${isCurrent ? 'text-white' : 'text-gray-900'} font-medium`}>Act: {stn.arrival?.actual}</div>
                                                                <div className={`text-[10px] mt-0.5 ${isCurrent ? 'text-orange-100' : 'text-gray-500'}`}>Sch: {stn.arrival?.scheduled}</div>
                                                            </div>
                                                            <div>
                                                                <div className={`text-[9px] uppercase font-bold ${isCurrent ? 'text-orange-200' : 'text-gray-400'} mb-0.5`}>Departure</div>
                                                                <div className={`text-xs ${isCurrent ? 'text-white' : 'text-gray-900'} font-medium`}>Act: {stn.departure?.actual}</div>
                                                                {stn.arrival?.actual !== 'SRC' && (
                                                                    <div className={`text-[10px] mt-0.5 ${isCurrent ? 'text-orange-100' : 'text-gray-500'}`}>Sch: {stn.departure?.scheduled}</div>
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
