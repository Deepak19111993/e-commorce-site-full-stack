'use client';

import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Landmark, Search, Clock, Train, ArrowRight, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function LiveStationPage() {
    const [stnCode, setStnCode] = useState('');
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState('');
    const [selectedStationName, setSelectedStationName] = useState('');
    const [popoverWidth, setPopoverWidth] = useState<number | string>('auto');

    useEffect(() => {
        const fetchStations = async () => {
            if (!searchQuery || searchQuery.length < 2) {
                setSuggestions([]);
                return;
            }
            setSearchLoading(true);
            try {
                const res = await fetch(`/api/train/stations/search?q=${searchQuery}`);
                const json = await res.json();
                if (json.success) {
                    setSuggestions(json.data);
                }
            } catch (e) {
                console.error("Failed to search stations", e);
            } finally {
                setSearchLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchStations, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // Auto-refresh every 2 minutes if viewing live station
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (data && stnCode) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/train/station/${stnCode}`);
                    const json = await res.json();
                    if (json.success) {
                        setData(json.data);
                    }
                } catch (err) {
                    console.error("Auto-fetch error:", err);
                }
            }, 120000); // 2 minutes
        }
        return () => clearInterval(interval);
    }, [data, stnCode]);

    const handleSearch = async (codeToSearch?: string) => {
        const code = codeToSearch || stnCode;
        if (!code || code.length < 2) {
            setError('Please select a valid Station');
            return;
        }

        setLoading(true);
        setError('');
        setData(null);

        try {
            const res = await fetch(`/api/train/station/${code}`);
            const json = await res.json();

            if (!json.success) {
                setError(json.error || 'Failed to fetch station status');
            } else {
                setData(json.data);
            }

        } catch (err) {
            setError('An error occurred while fetching station status');
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
                <div className="bg-gradient-to-r from-orange-600 to-red-600 sm:p-8 p-5 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <Landmark className="h-8 w-8" />
                        <h1 className="text-3xl font-bold">Live Station</h1>
                    </div>
                    <p className="text-orange-100">Check upcoming trains at a station (next 2-4 hours)</p>
                </div>

                <div className="py-4 px-3 sm:px-5 sm:py-8">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        ref={(el) => {
                                            if (el) {
                                                setPopoverWidth(el.offsetWidth);
                                            }
                                        }}
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={open}
                                        className="w-full justify-between text-sm sm:text-lg h-10 md:h-[50px] lg:h-[55px] px-4"
                                    >
                                        {selectedStationName
                                            ? `${selectedStationName} (${stnCode})`
                                            : (stnCode ? stnCode : "Select Station...")}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="p-0"
                                    align="start"
                                    style={{ width: popoverWidth }}
                                >
                                    <div className="p-2 border-b">
                                        <div className="flex items-center px-2 py-1 mb-1">
                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                            <input
                                                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                                placeholder="Search station name or code..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto p-1">
                                        {searchLoading ? (
                                            <div className="py-6 flex justify-center items-center text-sm text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Searching...
                                            </div>
                                        ) : suggestions.length === 0 ? (
                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                                {searchQuery.length < 2 ? "Type to search..." : "No station found."}
                                            </div>
                                        ) : (
                                            suggestions.map((station) => (
                                                <div
                                                    key={station.code}
                                                    className={cn(
                                                        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer",
                                                        stnCode === station.code && "bg-slate-100"
                                                    )}
                                                    onClick={() => {
                                                        setStnCode(station.code);
                                                        setSelectedStationName(station.name);
                                                        setOpen(false);
                                                        setSearchQuery('');
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            stnCode === station.code ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{station.name}</span>
                                                        <span className="text-xs text-gray-500">{station.code}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Button
                            onClick={() => handleSearch()}
                            disabled={loading || !stnCode}
                            className="bg-orange-600 hover:bg-orange-700 h-10 md:h-[50px] lg:h-[55px] px-8 text-sm sm:text-lg"
                        >
                            {loading ? 'Checking...' : (
                                <>
                                    <Search className="mr-2 h-5 w-5" /> Check Station
                                </>
                            )}
                        </Button>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 mt-8">
                            {error}
                        </div>
                    )}

                    {data && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6 mt-6"
                        >
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                                <h2 className="text-base sm:text-lg font-bold text-gray-800">
                                    Trains in Next 2-4 Hours
                                </h2>
                                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-100/50 px-3 py-1.5 rounded-full border border-emerald-200 w-fit">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-400" />
                                    Live Auto-Update Active (every 2 min)
                                </div>
                            </div>

                            {/* Assuming data is a list of trains. Adjusting based on likely API structure or logging to debug later */}
                            {Array.isArray(data) && data.length > 0 ? (
                                <div className="border rounded-xl flex flex-col overflow-hidden">
                                    {/* Desktop Table View */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-left text-sm text-gray-600 min-w-[600px]">
                                            <thead className="bg-gray-100 uppercase font-medium">
                                                <tr>
                                                    <th className="px-6 py-4">Train</th>
                                                    <th className="px-6 py-4">Time</th>
                                                    <th className="px-6 py-4">Source</th>
                                                    <th className="px-6 py-4">Destination</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {data.map((train: any, i: number) => (
                                                    <tr key={i} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-gray-900">{train.trainno}</div>
                                                            <div className="text-xs text-gray-500">{train.trainname}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-1">
                                                                <Clock size={14} className="text-orange-600" />
                                                                <span className="font-medium text-gray-900">{train.timeat}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-1">
                                                                {train.source}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-1">
                                                                {train.dest}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Card View */}
                                    <div className="md:hidden flex flex-col divide-y divide-gray-100">
                                        {data.map((train: any, i: number) => (
                                            <div key={i} className="p-4 hover:bg-orange-50/50 transition-colors">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                                            <Train className="w-3.5 h-3.5 text-orange-500" />
                                                            {train.trainno}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 leading-tight mt-0.5 max-w-[180px] truncate">{train.trainname}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs font-semibold bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                                                        <Clock size={12} />
                                                        {train.timeat}
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center text-xs font-medium pt-2 border-t border-gray-100">
                                                    <div className="flex items-center gap-1.5 text-gray-600">
                                                        <span className="text-[9px] text-gray-400 uppercase tracking-wider">From:</span>
                                                        <span className="text-gray-900">{train.source}</span>
                                                    </div>
                                                    <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                                                    <div className="flex items-center gap-1.5 text-gray-600">
                                                        <span className="text-[9px] text-gray-400 uppercase tracking-wider">To:</span>
                                                        <span className="text-gray-900">{train.dest}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-8 text-center rounded-xl text-gray-500">
                                    {Array.isArray(data) && data.length === 0
                                        ? "No trains found arriving/departing in the next few hours."
                                        : <pre className="text-left text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>}
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
