'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Search, MapPin, Clock, Calendar as CalendarIcon, ChevronDown, Train, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { cn } from "@/lib/utils";

interface TrainResult {
    number: string;
    name: string;
    from: string;
    to: string;
}

export default function LiveStatusPage() {
    const [trainNo, setTrainNo] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [loading, setLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState('');
    const [isPassedExpanded, setIsPassedExpanded] = useState(false);
    const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);
    const [expandedStations, setExpandedStations] = useState<Set<string>>(new Set());

    // Autocomplete state
    const [searchResults, setSearchResults] = useState<TrainResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search
    useEffect(() => {
        if (trainNo.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);

        const fetchTrains = async () => {
            try {
                const res = await fetch(`/api/train/search?q=${trainNo}`);
                const data = await res.json();
                if (data.success) {
                    setSearchResults(data.data);
                    setShowDropdown(true);
                }
            } catch (err) {
                console.error("Failed to search trains", err);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(fetchTrains, 300);
        return () => clearTimeout(timeoutId);
    }, [trainNo]);

    const toggleStation = (code: string) =>
        setExpandedStations(prev => {
            const next = new Set(prev);
            next.has(code) ? next.delete(code) : next.add(code);
            return next;
        });

    const { nextIdx, prevIdx, destinationIdx, passedCount, upcomingCount, firstPassedIdx, firstUpcomingIdx, liveAnomaly, isAtDestination, intermediateMap, isYetToStart } = useMemo(() => {
        if (!data || !data.stations) return { nextIdx: -1, prevIdx: -1, destinationIdx: -1, passedCount: 0, upcomingCount: 0, firstPassedIdx: -1, firstUpcomingIdx: -1, liveAnomaly: null, isAtDestination: false, intermediateMap: {}, isYetToStart: false };

        let nextIdx = -1;
        const anomalyIdx = data.stations.findIndex((s: any) => !s.stationCode);
        const isYetToStart = (data.status?.toLowerCase().includes('yet to start')) || (data.statusNote?.toLowerCase().includes('yet to start')) || false;

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

        if (anomalyIdx !== -1) {
            nextIdx = anomalyIdx + 1;
        } else if (data.statusNote) {
            const match = data.statusNote.match(/\(([A-Z]+)\)/); // match the uppercase station code
            if (match && match[1]) {
                const idx = data.stations.findIndex((s: any) => s.stationCode === match[1]);
                if (idx !== -1) {
                    if (data.statusNote.toLowerCase().includes('departed')) nextIdx = idx + 1;
                    else nextIdx = idx;
                }
            }
        }

        // Fallback: Use the time-based comparison ONLY if we still don't know the nextIdx
        if (nextIdx === -1 && statusTimeObj) {
            nextIdx = data.stations.findIndex((stn: any, i: number) => {
                if (!stn.stationCode) return false;

                let timeStr = stn.departure?.actual || stn.arrival?.actual;
                if (!timeStr || timeStr.includes('SRC') || timeStr.includes('DST')) return false;

                timeStr = timeStr.replace(/\*/g, '').trim();
                const parts = timeStr.split(' ');
                if (parts.length < 2) return false;

                const stnDate = new Date(`${parts[1]}-${currentYear} ${parts[0]}`);
                if (isNaN(stnDate.getTime())) return false;

                return stnDate > statusTimeObj!;
            });
        }

        if (nextIdx === -1) {
            const isYetToStart = (data.status?.toLowerCase().includes('yet to start')) || (data.statusNote?.toLowerCase().includes('yet to start'));
            if (isYetToStart) nextIdx = 0;
            else nextIdx = data.stations.length - 1;
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
        let firstPassedIdx = -1;
        for (let i = 0; i < prevIdx; i++) {
            if (data.stations[i].stationCode) {
                passedCount++;
                if (firstPassedIdx === -1) firstPassedIdx = i;
            }
        }

        let upcomingCount = 0;
        let firstUpcomingIdx = -1;
        for (let i = nextIdx + 1; i < destinationIdx; i++) {
            if (data.stations[i].stationCode) {
                upcomingCount++;
                if (firstUpcomingIdx === -1) firstUpcomingIdx = i;
            }
        }

        // Train has arrived at last stop when nextIdx points to the destination and statusNote says "Arrived"
        const isAtDestination =
            nextIdx === destinationIdx &&
            !!(data.statusNote?.toLowerCase().includes('arrived'));

        // Build map: mainStationCode → intermediate through-stations between it and the next main halt.
        //
        // Primary source: backend dynamic route (data.intermediateMap) from erail TRAINROUTE (all stations)
        // Fallback/supplement: erail halt-only route + live anomaly
        const intermediateMap: Record<string, { stnCode: string; stnName: string; arrival: string; departure: string; isLive?: boolean; }[]> = {};
        const route: any[] = data.route || [];

        // Collect main station codes in order (from live status — these are the scheduled halts)
        const mainCodes: string[] = data.stations
            .filter((s: any) => s.stationCode)
            .map((s: any) => s.stationCode as string);
        const mainCodeSet = new Set(mainCodes);

        // Seed from backend's dynamic intermediateMap (from erail TRAINROUTE with all stations)
        if (data.intermediateMap) {
            for (const [haltCode, stns] of Object.entries(data.intermediateMap) as [string, any[]][]) {
                intermediateMap[haltCode] = stns.map((s: any) => ({
                    stnCode: s.stnCode,
                    stnName: s.stnName,
                    arrival: s.arrival || '–',
                    departure: s.departure || '–',
                }));
            }
        }

        // Fallback/supplement: Use erail halt route to catch anything the backend didn't
        if (mainCodes.length > 0 && route.length > 0) {
            let currentMainCode: string | null = null;
            for (const r of route) {
                const code: string = r.stnCode;
                if (mainCodeSet.has(code)) {
                    currentMainCode = code;
                } else if (currentMainCode !== null) {
                    if (!intermediateMap[currentMainCode]) intermediateMap[currentMainCode] = [];
                    // Only add if not already there
                    if (!intermediateMap[currentMainCode].some(s => s.stnCode === code)) {
                        intermediateMap[currentMainCode].push({
                            stnCode: code,
                            stnName: r.stnName,
                            arrival: r.arrival || '–',
                            departure: r.departure || '–',
                        });
                    }
                }
            }
        }

        // Strategy B: show liveAnomaly crossing station in the toggle of the previous main stop
        // (only when it is NOT itself a main station — which means the train is between two main stops)
        if (liveAnomaly && !liveAnomaly.isMainStation && prevIdx >= 0 && nextIdx >= 0) {
            const prevStn = data.stations[prevIdx];
            if (prevStn?.stationCode) {
                const existing = intermediateMap[prevStn.stationCode] || [];
                if (!existing.some((e) => e.stnCode === liveAnomaly.code)) {
                    intermediateMap[prevStn.stationCode] = [
                        ...existing,
                        {
                            stnCode: liveAnomaly.code,
                            stnName: liveAnomaly.name,
                            arrival: liveAnomaly.time,
                            departure: '–',
                            isLive: true,
                        },
                    ];
                } else {
                    intermediateMap[prevStn.stationCode] = existing.map(e =>
                        e.stnCode === liveAnomaly.code ? { ...e, isLive: true } : e
                    );
                }
            }
        }

        return { nextIdx, prevIdx, destinationIdx, passedCount, upcomingCount, firstPassedIdx, firstUpcomingIdx, liveAnomaly, isAtDestination, intermediateMap, isYetToStart };
    }, [data]);



    useEffect(() => {
        setDate(new Date());
    }, []);

    const getRemainingTime = () => {
        if (!isYetToStart) { console.log("getRemainingTime: isYetToStart is false"); return null; }
        if (!data?.stations?.[0]) { console.log("getRemainingTime: data.stations[0] missing"); return null; }
        const startObj = data.stations[0];
        const deptTime = startObj.departure?.scheduled;
        if (!deptTime || deptTime === '--:--' || deptTime === 'SRC') { console.log("getRemainingTime: invalid deptTime:", deptTime); return null; }

        // deptTime format: "16:20 27-Feb"
        const timePart = deptTime.split(' ')[0];
        if (!timePart) { console.log("getRemainingTime: invalid timePart:", timePart); return null; }

        const targetDate = new Date(date || new Date());
        const [hours, minutes] = timePart.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) { console.log("getRemainingTime: NaN hours/mins:", timePart); return null; }
        targetDate.setHours(hours, minutes, 0, 0);

        const now = new Date();
        const diffMs = targetDate.getTime() - now.getTime();

        console.log("getRemainingTime: diffMs =", diffMs, "targetDate =", targetDate, "now =", now);

        if (diffMs <= 0) return "Starting soon";

        const diffMins = Math.floor(diffMs / 60000);
        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;

        if (h > 0) return `In ${h}h ${m}m`;
        return `In ${m}m`;
    };

    // Auto-refresh every 1 minute if viewing live status
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (data && trainNo && trainNo.length === 5) {
            // polling interval: 60000ms = 1 minute
            interval = setInterval(async () => {
                try {
                    setIsUpdating(true);
                    const formattedDate = date ? format(date, 'dd-MM-yyyy') : format(new Date(), 'dd-MM-yyyy');
                    const res = await fetch(`/api/train/live/${trainNo}?date=${formattedDate}`, {
                        cache: 'no-store',
                        headers: { 'Cache-Control': 'no-cache' }
                    });
                    const json = await res.json();
                    if (json.success) {
                        setData(json.data);
                    }
                } catch (err) {
                    console.error("Auto-refresh failed", err);
                } finally {
                    setIsUpdating(false);
                }
            }, 60000);
        }
        return () => clearInterval(interval);
    }, [data, trainNo, date]);

    const refreshStatus = async () => {
        if (!trainNo || trainNo.length !== 5) return;
        try {
            setIsUpdating(true);
            const formattedDate = date ? format(date, 'dd-MM-yyyy') : format(new Date(), 'dd-MM-yyyy');
            const res = await fetch(`/api/train/live/${trainNo}?date=${formattedDate}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            }
        } catch (err) {
            console.error("Manual refresh failed", err);
        } finally {
            setIsUpdating(false);
        }
    };

    const TrainIconTooltip = ({ className = "text-xl", defaultOpen = false }: { className?: string, defaultOpen?: boolean }) => {
        const [isOpen, setIsOpen] = useState(false);
        const triggerRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            if (defaultOpen) {
                // Wait for Framer Motion then check if element is actually visible using layout rect
                const timer = setTimeout(() => {
                    if (triggerRef.current) {
                        const rect = triggerRef.current.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            setIsOpen(true);
                        }
                    }
                }, 800);
                return () => clearTimeout(timer);
            }
        }, [defaultOpen]);

        return (
            <Tooltip
                open={isOpen}
                onOpenChange={(open) => {
                    // Only allow the tooltip to close/open via built-in events 
                    // (like hovering or clicking outside)
                    setIsOpen(open);
                }}
            >
                <TooltipTrigger asChild>
                    <div ref={triggerRef} className="cursor-help inline-flex relative z-50 hover:z-[99]">
                        <motion.span animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className={className}>🚆</motion.span>
                    </div>
                </TooltipTrigger>
                <TooltipContent sideOffset={5} className="bg-[#0a1a38] text-white p-3 shadow-2xl rounded-lg border-none max-w-[250px] z-[9999]">
                    <div className="flex flex-col gap-1 text-xs">
                        <span className="font-medium text-slate-400 text-[10px] uppercase tracking-wider">As of {liveAnomaly?.time || "few seconds ago"}</span>
                        <span className="font-bold text-sm leading-snug">{data?.statusNote || "Live Location Tracking"}</span>
                    </div>
                </TooltipContent>
            </Tooltip>
        );
    };

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
            const res = await fetch(`/api/train/live/${trainNo}?date=${formattedDate}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
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
        <TooltipProvider delayDuration={100}>
            <div className="max-w-4xl w-full mx-auto sm:py-8 py-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-xl border border-gray-100 relative z-10"
                >
                    <div className="bg-gradient-to-r from-orange-600 to-red-600 sm:p-8 p-4 text-white rounded-t-2xl">
                        <div className="flex items-center gap-3 mb-2">
                            <Activity className="h-8 w-8" />
                            <h1 className="sm:text-3xl text-2xl font-bold">Live Train Status</h1>
                        </div>
                        <p className="text-orange-100">Track real-time location and delay info</p>
                    </div>

                    <div className="py-4 px-3 sm:px-5 sm:py-8">
                        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-x-4 items-start sm:items-end">
                            <div className="w-full sm:flex-1 flex flex-col relative" ref={dropdownRef}>
                                <label className="block text-sm font-medium text-gray-700 mb-1 ml-1 text-xs">Train Number</label>
                                <Input
                                    placeholder="Search by Train Number or Name"
                                    value={trainNo}
                                    onChange={(e) => {
                                        setTrainNo(e.target.value);
                                        setError('');
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => {
                                        if (trainNo.length >= 2) setShowDropdown(true);
                                    }}
                                    className="text-sm sm:text-lg h-10 md:h-[50px] lg:h-[55px] px-4"
                                />

                                {/* Autocomplete Dropdown */}
                                <AnimatePresence>
                                    {showDropdown && (trainNo.length >= 2) && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-[100%] z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl overflow-hidden"
                                        >
                                            {isSearching ? (
                                                <div className="p-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                                    Searching...
                                                </div>
                                            ) : searchResults.length > 0 ? (
                                                <ul className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                                                    {searchResults.map((train, idx) => (
                                                        <li
                                                            key={`${train.number}-${idx}`}
                                                            className="px-4 py-3 hover:bg-orange-50 cursor-pointer transition-colors group flex items-start gap-3"
                                                            onClick={() => {
                                                                setTrainNo(train.number);
                                                                setShowDropdown(false);
                                                            }}
                                                        >
                                                            <div className="bg-orange-100 p-2 rounded-lg group-hover:bg-orange-500 transition-colors mt-0.5">
                                                                <Train className="w-4 h-4 text-orange-600 group-hover:text-white transition-colors" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-gray-900 group-hover:text-orange-900 text-sm sm:text-base">{train.number} - {train.name}</span>
                                                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded font-medium">{train.from}</span>
                                                                    <span className="text-gray-300">→</span>
                                                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded font-medium">{train.to}</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="p-4 text-center text-sm text-gray-500">
                                                    No trains found matching "{trainNo}"
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <div className="w-full sm:w-56 flex flex-col">
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
                                        {isAtDestination ? (
                                            <div className="flex items-center gap-2 text-xs font-semibold text-green-800 bg-green-100 px-3 py-1.5 rounded-full border border-green-300">
                                                <span>✅</span>
                                                Train Arrived at Destination
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 min-w-[210px] justify-center transition-all duration-300">
                                                    {isUpdating ? (
                                                        <>
                                                            <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                                            Updating live info...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-400" />
                                                            Live Auto-Update (every 1 min)
                                                        </>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    type="button"
                                                    className="h-[34px] w-[34px] rounded-full text-emerald-700 border-emerald-200 bg-white hover:bg-emerald-50 hover:text-emerald-800 transition-colors shadow-sm shrink-0"
                                                    onClick={refreshStatus}
                                                    disabled={isUpdating}
                                                    title="Refresh Live Status"
                                                >
                                                    <RefreshCw className={cn("h-4 w-4", isUpdating && "animate-spin")} />
                                                </Button>
                                            </div>
                                        )}
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
                                                                if (i === firstPassedIdx && passedCount > 0) {
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
                                                                if (i === firstUpcomingIdx && upcomingCount > 0) {
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

                                                            // Hide non-halt (anomaly) stations from the main list.
                                                            // They will only appear in the expanded intermediate list of the previous halt.
                                                            if (isAnomaly) return null;


                                                            let delay = stn.arrival?.delay || 'On Time';
                                                            let actualArrDisplay = stn.arrival?.actual || '--';

                                                            // Propagate global delay to upcoming stations if they stubbornly say 'On Time'
                                                            if (isUpcomingGroup && (delay === 'On Time' || delay === '00:00') && data.delay && data.delay !== 'On Time' && data.delay !== '00:00') {
                                                                delay = data.delay;
                                                            }

                                                            // If upcoming and we have a delay but no actual arrival time yet, calculate expected arrival!
                                                            if (isUpcomingGroup && actualArrDisplay === '--' && delay !== 'On Time' && stn.arrival?.scheduled) {
                                                                try {
                                                                    const scheduledArr = stn.arrival.scheduled.replace(/\*/g, '').trim();
                                                                    const [timeStr, dateStr] = scheduledArr.split(' ');
                                                                    if (timeStr && dateStr) {
                                                                        const [h, m] = timeStr.split(':').map(Number);
                                                                        const delayMins = parseInt(delay, 10);
                                                                        if (!isNaN(h) && !isNaN(m) && !isNaN(delayMins)) {
                                                                            const totalMins = h * 60 + m + delayMins;
                                                                            const newH = Math.floor(totalMins / 60) % 24;
                                                                            const newM = totalMins % 60;
                                                                            const formattedH = newH.toString().padStart(2, '0');
                                                                            const formattedM = newM.toString().padStart(2, '0');
                                                                            actualArrDisplay = `Exp: ${formattedH}:${formattedM} ${dateStr}*`;
                                                                        }
                                                                    }
                                                                } catch (e) {
                                                                    // ignore parse errors and fallback to '--'
                                                                }
                                                            }

                                                            let actualDepDisplay = stn.departure?.actual || '--';
                                                            if (isUpcomingGroup && actualDepDisplay === '--' && delay !== 'On Time' && stn.departure?.scheduled) {
                                                                try {
                                                                    const scheduledDep = stn.departure.scheduled.replace(/\*/g, '').trim();
                                                                    const [timeStr, dateStr] = scheduledDep.split(' ');
                                                                    if (timeStr && dateStr) {
                                                                        const [h, m] = timeStr.split(':').map(Number);
                                                                        const delayMins = parseInt(delay, 10);
                                                                        if (!isNaN(h) && !isNaN(m) && !isNaN(delayMins)) {
                                                                            const totalMins = h * 60 + m + delayMins;
                                                                            const newH = Math.floor(totalMins / 60) % 24;
                                                                            const newM = totalMins % 60;
                                                                            const formattedH = newH.toString().padStart(2, '0');
                                                                            const formattedM = newM.toString().padStart(2, '0');
                                                                            actualDepDisplay = `Exp: ${formattedH}:${formattedM} ${dateStr}*`;
                                                                        }
                                                                    }
                                                                } catch (e) {
                                                                    // ignore
                                                                }
                                                            }

                                                            const isLate = delay !== 'On Time' && delay !== '00:00' && !delay.includes('No Delay');
                                                            const isNext = i === nextIdx;
                                                            const isDestinationArrived = isAtDestination && i === destinationIdx;
                                                            const isCurrentLiveStation = liveAnomaly?.isMainStation && liveAnomaly.code === stn.stationCode;

                                                            let rowClass = "active:bg-gray-50 transition-colors border-b border-gray-100 relative";
                                                            let textClass = "text-gray-900";
                                                            let subTextClass = "text-gray-500";

                                                            if (isDestinationArrived) {
                                                                rowClass = "bg-gradient-to-r from-green-600 to-emerald-500 shadow-xl transform scale-[1.02] z-20 rounded-lg border-none relative my-1";
                                                                textClass = "text-white font-bold";
                                                                subTextClass = "text-green-100";
                                                            } else if (isCurrentLiveStation) {
                                                                rowClass = "bg-orange-50 border-y-2 border-orange-200 shadow-sm relative z-10";
                                                                textClass = "font-extrabold text-orange-900";
                                                                subTextClass = "text-orange-700 font-bold";
                                                            } else if (i <= prevIdx && !isNext) {
                                                                rowClass = "bg-emerald-50/40 relative";
                                                                textClass = "text-gray-500 font-semibold";
                                                                subTextClass = "text-gray-400";
                                                            } else if (isNext) {
                                                                if (isYetToStart) {
                                                                    rowClass = "bg-indigo-50/50 relative border-b border-indigo-100";
                                                                    textClass = "text-indigo-900 font-bold";
                                                                    subTextClass = "text-indigo-500";
                                                                } else {
                                                                    rowClass = "bg-gradient-to-r from-orange-600 to-orange-500 shadow-xl transform scale-[1.02] z-20 rounded-lg border-none relative my-1";
                                                                    textClass = "text-white font-bold";
                                                                    subTextClass = "text-orange-100";
                                                                }
                                                            }

                                                            const intermediateStnList = intermediateMap[stn.stationCode] || [];
                                                            const isExpanded = expandedStations.has(stn.stationCode);

                                                            return (
                                                                <>
                                                                    <tr key={i} className={rowClass}>
                                                                        <td
                                                                            className={`px-6 py-4 font-medium relative select-none ${intermediateStnList.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                                                                            onClick={() => intermediateStnList.length > 0 && toggleStation(stn.stationCode)}
                                                                            title={intermediateStnList.length === 0 ? 'No through-station data for this segment' : undefined}
                                                                        >
                                                                            <div className="flex flex-col gap-1">
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    {isCurrentLiveStation && (
                                                                                        <TrainIconTooltip className="text-xl" defaultOpen={true} />
                                                                                    )}
                                                                                    <span className={textClass}>{stn.stationName}</span>
                                                                                    {/* Chevron: highlighted+animated when has data, empty when no data */}
                                                                                    {intermediateStnList.length > 0 && (
                                                                                        <span className={`ml-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${(isNext && !isYetToStart) || isDestinationArrived ? 'text-white/80' : 'text-indigo-500'}`}>
                                                                                            <ChevronDown className="w-4 h-4" />
                                                                                        </span>
                                                                                    )}
                                                                                    {isDestinationArrived && (
                                                                                        <span className="bg-white text-green-700 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                                                                                            ✅ Arrived
                                                                                        </span>
                                                                                    )}
                                                                                    {isNext && !isDestinationArrived && (
                                                                                        <span className={`${isYetToStart ? 'bg-indigo-100 text-indigo-700' : 'animate-pulse bg-white text-orange-600'} text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full shadow-sm`}>
                                                                                            {isYetToStart ? (getRemainingTime() || 'Source') : 'Next Stop'}
                                                                                        </span>
                                                                                    )}
                                                                                    {i <= prevIdx && !isNext && !isCurrentLiveStation && (
                                                                                        <span className="text-emerald-600/60 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-emerald-200 hidden sm:inline-block">
                                                                                            Passed
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex flex-col gap-0.5 mt-0.5">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className={`text-xs ${subTextClass}`}>({stn.stationCode})</span>
                                                                                        {intermediateStnList.length > 0 && (
                                                                                            <span className={`text-[10px] font-semibold ${isNext || isDestinationArrived ? 'text-white/60' : 'text-indigo-500'}`}>
                                                                                                {intermediateStnList.length} through stn{intermediateStnList.length !== 1 ? 's' : ''}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    {isCurrentLiveStation && (
                                                                                        <div className="flex items-center gap-2 mt-1">
                                                                                            <span className="bg-orange-200 text-orange-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm">Live Loc</span>
                                                                                            <span className="text-[11px] text-orange-700 font-bold">{liveAnomaly.action} at {liveAnomaly.time}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </td>

                                                                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>
                                                                            <div className="flex flex-col">
                                                                                <span className={`text-xs ${isNext ? 'text-orange-100' : 'text-gray-400'}`}>Sch: {stn.arrival?.scheduled}</span>
                                                                                <span className="font-semibold">{actualArrDisplay}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>
                                                                            <div className="flex flex-col">
                                                                                <span className={`text-xs ${isNext ? 'text-orange-100' : 'text-gray-400'}`}>{stn.arrival?.actual === 'SRC' ? '' : `Sch: ${stn.departure?.scheduled}`}</span>
                                                                                <span>{actualDepDisplay}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block shadow-sm ${isDestinationArrived
                                                                                ? 'bg-white text-green-700'
                                                                                : (isCurrentLiveStation
                                                                                    ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                                                                    : (isNext
                                                                                        ? 'bg-white text-orange-700'
                                                                                        : (!isLate
                                                                                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                                                            : 'bg-rose-100 text-rose-700')))
                                                                                }`}>
                                                                                {isDestinationArrived ? '✅ Arrived' : (isCurrentLiveStation ? 'LIVE' : delay)}
                                                                            </span>
                                                                        </td>
                                                                    </tr>

                                                                    {/* Intermediate through-stations sub-rows */}
                                                                    {isExpanded && intermediateStnList.map((ist, j) => {
                                                                        const isLiveHere = !liveAnomaly?.isMainStation && liveAnomaly?.code === ist.stnCode;
                                                                        return (
                                                                            <tr key={`ist-${i}-${j}`} className={`border-b border-dashed border-indigo-100 ${isLiveHere ? 'bg-amber-50' : 'bg-indigo-50/40'}`}>
                                                                                <td className="pl-14 pr-4 py-2">
                                                                                    <div className="flex items-center gap-2">
                                                                                        {isLiveHere && (
                                                                                            <TrainIconTooltip className="text-base" defaultOpen={true} />
                                                                                        )}
                                                                                        <div className="flex flex-col">
                                                                                            <span className={`text-xs font-semibold ${isLiveHere ? 'text-amber-800' : 'text-indigo-800'}`}>{ist.stnName}</span>
                                                                                            <span className="text-[10px] text-indigo-400 uppercase font-bold">{ist.stnCode}</span>
                                                                                        </div>
                                                                                        {isLiveHere && (
                                                                                            <span className="ml-1 bg-amber-500 text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded-full animate-pulse">
                                                                                                🚆 Live
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-4 py-2">
                                                                                    <span className="text-[11px] text-indigo-500 font-medium">{ist.arrival || '–'}</span>
                                                                                </td>
                                                                                <td className="px-4 py-2">
                                                                                    <span className="text-[11px] text-indigo-500 font-medium">{ist.departure || '–'}</span>
                                                                                </td>
                                                                                <td className="px-4 py-2">
                                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isLiveHere ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-indigo-100 text-indigo-500 border border-indigo-200'}`}>
                                                                                        {isLiveHere ? '🚆 Here' : 'passing'}
                                                                                    </span>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </>
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
                                                        if (i === firstPassedIdx && passedCount > 0) {
                                                            return (
                                                                <div key="toggle-passed" className="bg-gray-100 rounded-lg p-3 flex justify-center items-center cursor-pointer mb-2" onClick={() => setIsPassedExpanded(true)}>
                                                                    <span className="text-sm font-semibold text-gray-500 flex items-center gap-1"><ChevronDown className="w-4 h-4" /> Show {passedCount} Passed Station{passedCount !== 1 ? 's' : ''}</span>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }

                                                    if (isUpcomingGroup && !isUpcomingExpanded) {
                                                        if (i === firstUpcomingIdx && upcomingCount > 0) {
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
                                                                    <div className="mr-3 z-10">
                                                                        <TrainIconTooltip className="text-3xl filter drop-shadow-sm" defaultOpen={true} />
                                                                    </div>
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
                                                                        <TrainIconTooltip className="text-2xl mt-1" defaultOpen={true} />
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
                                                    const isDestinationArrived = isAtDestination && i === destinationIdx;
                                                    const isCurrentLiveStation = liveAnomaly?.isMainStation && liveAnomaly.code === stn.stationCode;

                                                    let cardClass = "bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden";
                                                    let textClass = "text-gray-900";
                                                    let subTextClass = "text-gray-500";

                                                    if (isDestinationArrived) {
                                                        cardClass = "bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-xl shadow-lg relative transform scale-[1.02] border border-green-400 mt-2 z-10";
                                                        textClass = "text-white font-bold";
                                                        subTextClass = "text-green-100";
                                                    } else if (isCurrentLiveStation) {
                                                        cardClass = "bg-orange-50 p-4 rounded-xl border-2 border-orange-200 shadow-sm relative overflow-hidden mt-2 z-10 scale-[1.02]";
                                                        textClass = "text-orange-900 font-extrabold";
                                                        subTextClass = "text-orange-700 font-bold";
                                                    } else if (i <= prevIdx && !isNext) {
                                                        cardClass = "bg-emerald-50/20 p-4 rounded-xl border border-emerald-50 relative opacity-70 mt-2";
                                                        textClass = "text-gray-500";
                                                        subTextClass = "text-gray-400";
                                                    } else if (isNext) {
                                                        if (isYetToStart) {
                                                            cardClass = "bg-indigo-50/30 p-4 rounded-xl shadow-sm relative border border-indigo-100 mt-2 z-10";
                                                            textClass = "text-indigo-900 font-bold";
                                                            subTextClass = "text-indigo-500";
                                                        } else {
                                                            cardClass = "bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl shadow-lg relative transform scale-[1.02] border border-orange-400 mt-2 z-10";
                                                            textClass = "text-white font-bold";
                                                            subTextClass = "text-orange-100";
                                                        }
                                                    }

                                                    const intermediateStnList = intermediateMap[stn.stationCode] || [];
                                                    const isExpanded = expandedStations.has(stn.stationCode);

                                                    return (
                                                        <div key={i}>
                                                            <div className={cardClass}>
                                                                {isDestinationArrived && (
                                                                    <div className="absolute top-0 right-0 bg-white text-green-700 text-[9px] font-bold px-2 py-0.5 rounded-bl shadow-sm z-10">
                                                                        ✅ ARRIVED
                                                                    </div>
                                                                )}
                                                                {isNext && !isDestinationArrived && (
                                                                    <div className={`absolute top-0 right-0 ${isYetToStart ? 'bg-indigo-500 text-white' : 'bg-white text-orange-600 animate-pulse'} text-[9px] font-bold px-2 py-0.5 rounded-bl shadow-sm z-10`}>
                                                                        {isYetToStart ? (getRemainingTime() || 'SOURCE') : 'NEXT'}
                                                                    </div>
                                                                )}
                                                                <div
                                                                    className={`flex justify-between items-start mb-2 mt-0.5 select-none ${intermediateStnList.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                                                                    onClick={() => intermediateStnList.length > 0 && toggleStation(stn.stationCode)}
                                                                >
                                                                    <div>
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            {isCurrentLiveStation && (
                                                                                <TrainIconTooltip className="text-xl" defaultOpen={true} />
                                                                            )}
                                                                            <h4 className={`text-sm leading-tight ${textClass}`}>{stn.stationName}</h4>
                                                                            {/* Chevron: only interactive when data exists */}
                                                                            {intermediateStnList.length > 0 && (
                                                                                <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} ${(isNext && !isYetToStart) || isDestinationArrived ? 'text-white/80' : 'text-indigo-500'}`}>
                                                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-col gap-0.5 mt-0.5">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`text-[10px] ${subTextClass} uppercase font-semibold tracking-wider`}>{stn.stationCode}</span>
                                                                                {intermediateStnList.length > 0 && (
                                                                                    <span className={`text-[9px] font-semibold ${isNext || isDestinationArrived ? 'text-white/60' : 'text-indigo-500'}`}>
                                                                                        {intermediateStnList.length} through stn{intermediateStnList.length !== 1 ? 's' : ''}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {isCurrentLiveStation && (
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    <span className="bg-orange-200 text-orange-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm">Live Loc</span>
                                                                                    <span className="text-[10px] text-orange-700/80 font-bold">{liveAnomaly.action} at {liveAnomaly.time}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className={`px-2 py-1 rounded text-[10px] font-bold shadow-sm whitespace-nowrap mt-1 ${isDestinationArrived
                                                                        ? 'bg-white/20 text-white border border-white/30'
                                                                        : (isCurrentLiveStation
                                                                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                                                            : (isNext
                                                                                ? 'bg-white/20 text-white border border-white/30'
                                                                                : (!isLate
                                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                                    : 'bg-rose-100 text-rose-700')))
                                                                        }`}>
                                                                        {isDestinationArrived ? '✅ Arrived' : (isCurrentLiveStation ? 'LIVE' : delay)}
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

                                                            {/* Intermediate through-stations (mobile) */}
                                                            {isExpanded && intermediateStnList.length > 0 && (
                                                                <div className="ml-4 mt-1 space-y-1 border-l-2 border-indigo-200 pl-3">
                                                                    {intermediateStnList.map((ist, j) => {
                                                                        const isLiveHere = !liveAnomaly?.isMainStation && liveAnomaly?.code === ist.stnCode;
                                                                        return (
                                                                            <div key={`ist-m-${i}-${j}`} className={`rounded-lg p-2 border flex items-center gap-2 ${isLiveHere ? 'bg-amber-50 border-amber-300' : 'bg-indigo-50/60 border-indigo-100'}`}>
                                                                                {isLiveHere && (
                                                                                    <TrainIconTooltip className="text-base flex-shrink-0" defaultOpen={true} />
                                                                                )}
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className={`text-xs font-semibold truncate ${isLiveHere ? 'text-amber-800' : 'text-indigo-800'}`}>{ist.stnName}</div>
                                                                                    <div className="text-[9px] text-indigo-400 uppercase font-bold">{ist.stnCode}</div>
                                                                                </div>
                                                                                <div className="text-right flex-shrink-0">
                                                                                    <div className="text-[10px] text-indigo-500">{ist.arrival || '–'}</div>
                                                                                    {isLiveHere && (
                                                                                        <span className="text-[9px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-full animate-pulse">LIVE</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
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
        </TooltipProvider>
    );
}
