'use client';

import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TrainTrack, Search, Clock, Train, ArrowRight, Check, ChevronsUpDown, Loader2, ArrowRightLeft, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays } from 'date-fns';
import { cn } from "@/lib/utils";

// Station Search Component to avoid duplication
const StationSearch = ({
    label,
    value,
    onChange,
    onNameChange
}: {
    label: string,
    value: string,
    onChange: (val: string) => void,
    onNameChange: (val: string) => void
}) => {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedName, setSelectedName] = useState('');
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

    return (
        <div className="w-full sm:flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1 ml-1">{label}</label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        ref={(el) => {
                            if (el) setPopoverWidth(el.offsetWidth);
                        }}
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between text-sm sm:text-lg h-10 md:h-[50px] lg:h-[55px] px-4"
                    >
                        {selectedName
                            ? `${selectedName} (${value})`
                            : (value ? value : "Select Station...")}
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
                                        value === station.code && "bg-slate-100"
                                    )}
                                    onClick={() => {
                                        onChange(station.code);
                                        setSelectedName(station.name);
                                        onNameChange(station.name);
                                        setOpen(false);
                                        setSearchQuery('');
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === station.code ? "opacity-100" : "opacity-0"
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
    );
};

export default function TrainsBetweenPage() {
    const [fromStn, setFromStn] = useState('');
    const [fromName, setFromName] = useState('');
    const [toStn, setToStn] = useState('');
    const [toName, setToName] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        setDate(new Date());
    }, []);

    const handleSwap = () => {
        const tempStn = fromStn;
        const tempName = fromName;
        setFromStn(toStn);
        setFromName(toName);
        setToStn(tempStn);
        setToName(tempName);
    };

    const handleSearch = async () => {
        if (!fromStn || !toStn) {
            setError('Please select both From and To stations.');
            return;
        }

        if (fromStn === toStn) {
            setError('From and To stations cannot be the same.');
            return;
        }

        setLoading(true);
        setError('');
        setData(null);

        try {
            const res = await fetch(`/api/train/between/${fromStn}/${toStn}`);
            const json = await res.json();

            if (!json.success && json.error) {
                setError(json.error || 'Failed to fetch trains between stations');
            } else {
                setData(json.data || json); // Handle varying API array responses
            }
        } catch (err) {
            setError('An error occurred while fetching trains');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl w-full mx-auto py-4 sm:py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
            >
                <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 sm:p-8 text-white">
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                        <ArrowRightLeft className="h-6 w-6 sm:h-8 sm:w-8" />
                        <h1 className="text-2xl sm:text-3xl font-bold">Trains Between Stations</h1>
                    </div>
                    <p className="text-sm sm:text-base text-orange-100">Find direct trains connecting two stations</p>
                </div>

                <div className="py-4 px-3 sm:px-5 sm:py-8">
                    <div className="flex flex-col sm:flex-row sm:gap-4 gap-7 items-end relative">
                        <StationSearch
                            label="From Station"
                            value={fromStn}
                            onChange={setFromStn}
                            onNameChange={setFromName}
                        />

                        <div className="hidden sm:flex self-center px-4 pt-6">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full bg-gray-50 hover:bg-orange-100 text-gray-500 hover:text-orange-600 transition-colors"
                                onClick={handleSwap}
                                title="Swap Stations"
                            >
                                <ArrowRightLeft className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="flex sm:hidden w-full justify-center -my-2 z-10">
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full bg-white shadow-sm hover:bg-orange-50 text-gray-500 hover:text-orange-600"
                                onClick={handleSwap}
                            >
                                <ArrowRightLeft className="h-4 w-4 mr-2" /> Swap
                            </Button>
                        </div>

                        <StationSearch
                            label="To Station"
                            value={toStn}
                            onChange={setToStn}
                            onNameChange={setToName}
                        />

                        <div className="w-full sm:w-56">
                            <label className="block text-sm font-medium text-gray-700 mb-1 ml-1 text-xs">Travel Date</label>
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

                        <div className="w-full sm:w-auto mt-4 sm:mt-0">
                            <Button
                                onClick={handleSearch}
                                disabled={loading || !fromStn || !toStn}
                                className="bg-orange-600 hover:bg-orange-700 h-10 md:h-[50px] lg:h-[55px] px-6 sm:px-8 text-sm sm:text-lg w-full"
                            >
                                {loading ? 'Searching...' : (
                                    <>
                                        <Search className="mr-2 h-5 w-5" /> Search
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 mb-6 mt-8">
                            {error}
                        </div>
                    )}

                    {data && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6 mt-8"
                        >
                            {Array.isArray(data) && data.length > 0 ? (
                                <div className="border rounded-xl overflow-hidden">
                                    <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
                                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                            {fromName || fromStn} <ArrowRight className="w-4 h-4 text-orange-500" /> {toName || toStn}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">{data.length} Trains Found</p>
                                    </div>

                                    {/* Desktop Table View */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-left text-sm text-gray-600 min-w-[600px]">
                                            <thead className="bg-gray-50 uppercase font-medium text-xs text-gray-500">
                                                <tr>
                                                    <th className="px-6 py-3">Train</th>
                                                    <th className="px-6 py-3">Departure</th>
                                                    <th className="px-6 py-3">Arrival</th>
                                                    <th className="px-6 py-3">Travel Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {data.map((train: any, i: number) => (
                                                    <tr key={i} className="hover:bg-orange-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-gray-900 text-base">{train.train_no}</div>
                                                            <div className="text-xs text-gray-500 truncate max-w-[150px] sm:max-w-xs">{train.train_name}</div>
                                                            {train.running_days && (
                                                                <div className="flex gap-1 mt-1">
                                                                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, dIdx) => (
                                                                        <span key={dIdx} className={`text-[9px] w-3.5 h-3.5 flex items-center justify-center rounded-sm font-bold ${train.running_days[dIdx] === '1' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-300'}`}>
                                                                            {day}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-semibold text-gray-900 text-lg">{train.from_time}</div>
                                                            <div className="text-xs text-gray-500">{train.from_stn_code}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-semibold text-gray-900 text-lg">{train.to_time}</div>
                                                            <div className="text-xs text-gray-500">{train.to_stn_code}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-1.5 text-gray-700 font-medium bg-gray-50 px-2.5 py-1 rounded inline-flex">
                                                                <Clock size={14} className="text-orange-500" />
                                                                {train.travel_time}
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
                                                            {train.train_no}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 leading-tight mt-0.5 max-w-[180px] truncate">{train.train_name}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] font-semibold bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">
                                                        <Clock size={10} />
                                                        {train.travel_time}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mb-3 bg-gray-50 p-2 rounded-lg border border-gray-100/50">
                                                    <div className="text-center flex-1">
                                                        <div className="text-base font-bold text-gray-900">{train.from_time}</div>
                                                        <div className="text-[10px] text-gray-500 font-medium uppercase">{train.from_stn_code}</div>
                                                    </div>
                                                    <div className="px-3 text-gray-400">
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="text-center flex-1">
                                                        <div className="text-base font-bold text-gray-900">{train.to_time}</div>
                                                        <div className="text-[10px] text-gray-500 font-medium uppercase">{train.to_stn_code}</div>
                                                    </div>
                                                </div>

                                                {train.running_days && (
                                                    <div className="flex items-center gap-1.5 justify-center">
                                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider mr-1">Runs:</span>
                                                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, dIdx) => (
                                                            <span key={dIdx} className={`text-[9px] w-4 h-4 flex items-center justify-center rounded-sm font-bold ${train.running_days[dIdx] === '1' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-300'}`}>
                                                                {day}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-8 text-center rounded-xl text-gray-500">
                                    {Array.isArray(data) && data.length === 0
                                        ? "No direct trains found between these stations."
                                        : <pre className="text-left text-xs overflow-auto bg-white p-4 rounded border mt-4">{JSON.stringify(data, null, 2)}</pre>}
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
