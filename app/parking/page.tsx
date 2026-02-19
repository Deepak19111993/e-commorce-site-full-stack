'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Calendar as CalendarIcon, Clock, Car, History, MapPin } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PaymentModal } from "@/components/parking/PaymentModal";
import { ReceiptModal } from "@/components/parking/ReceiptModal";

export default function ParkingPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Date & Time State
    const [startDate, setStartDate] = useState<Date>();
    const [startTimeStr, setStartTimeStr] = useState('');
    const [endDate, setEndDate] = useState<Date>();
    const [endTimeStr, setEndTimeStr] = useState('');
    const [hasChecked, setHasChecked] = useState(false);

    const [availableSlots, setAvailableSlots] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [myBookings, setMyBookings] = useState<any[]>([]);

    useEffect(() => {
        setMounted(true);
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            router.push('/login');
        }

        // Restore parking state
        const savedState = localStorage.getItem('parkingValetState');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                if (parsed.startDate) setStartDate(new Date(parsed.startDate));
                if (parsed.startTimeStr) setStartTimeStr(parsed.startTimeStr);
                if (parsed.endDate) setEndDate(new Date(parsed.endDate));
                if (parsed.endTimeStr) setEndTimeStr(parsed.endTimeStr);
                if (parsed.availableSlots) setAvailableSlots(parsed.availableSlots);
                if (parsed.hasChecked) setHasChecked(parsed.hasChecked);
            } catch (e) {
                console.error('Failed to parse parking state', e);
            }
        }
    }, [router]);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        if (!mounted) return;
        const stateToSave = {
            startDate: startDate ? startDate.toISOString() : undefined,
            startTimeStr,
            endDate: endDate ? endDate.toISOString() : undefined,
            endTimeStr,
            availableSlots,
            hasChecked
        };
        localStorage.setItem('parkingValetState', JSON.stringify(stateToSave));
    }, [startDate, startTimeStr, endDate, endTimeStr, availableSlots, hasChecked, mounted]);


    // Initialize with current time if no saved state
    useEffect(() => {
        if (mounted && !startDate && !hasChecked) {
            const now = new Date();
            const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

            setStartDate(now);
            setStartTimeStr(format(now, 'HH:mm'));
            setEndDate(oneHourLater);
            setEndTimeStr(format(oneHourLater, 'HH:mm'));

            // Trigger check via the auto-check effect
        }
    }, [mounted, startDate, hasChecked]);

    useEffect(() => {
        if (user) {
            fetchMyBookings();
            // Auto check availability on load
            // Need to wrap in timeout or useEffect to ensure state is ready?
            // Actually, we can just call checkAvailability directly here since state is initialized
            // But verify checkAvailability uses state variables which are closures...
            // It uses state from render scope. So it should work?
            // checking availability requires startDate etc.
        }
    }, [user]);



    const fetchMyBookings = async () => {
        try {
            const res = await fetch('/api/parking/my-bookings', {
                headers: { 'X-User-Id': String(user.id) }
            });
            if (res.ok) {
                const data = await res.json();
                setMyBookings(data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const combineDateTime = (date: Date | undefined, time: string) => {
        if (!date || !time) return null;
        const [hours, minutes] = time.split(':').map(Number);
        const result = new Date(date);
        result.setHours(hours, minutes, 0, 0);
        return result;
    };

    // Auto-check availability when date/time changes
    useEffect(() => {
        const timer = setTimeout(() => {
            if (startDate && startTimeStr && endDate && endTimeStr) {
                const start = combineDateTime(startDate, startTimeStr);
                const end = combineDateTime(endDate, endTimeStr);
                if (start && end && end > start) {
                    checkAvailability(true);
                }
            } else {
                setHasChecked(false);
                setAvailableSlots([]);
            }
        }, 500); // Debounce to prevent too many requests

        return () => clearTimeout(timer);
    }, [startDate, startTimeStr, endDate, endTimeStr]);

    const checkAvailability = async (isAuto = false) => {
        const start = combineDateTime(startDate, startTimeStr);
        const end = combineDateTime(endDate, endTimeStr);

        if (!start || !end) return;

        if (end <= start) {
            if (!isAuto) {
                toast.error("Check-out time must be after Check-in time");
            }
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/parking/availability?start=${start.toISOString()}&end=${end.toISOString()}`);
            if (res.ok) {
                const data = await res.json();
                setAvailableSlots(data.availableSlots);
                setHasChecked(true);
            } else {
                // Suppress toast errors during auto-check as to not spam user
                if (!isAuto) {
                    toast.error('Failed to check availability');
                }
                console.error('Failed to check availability');
            }
        } catch (error) {
            console.error(error);
            if (!isAuto) {
                toast.error('Something went wrong');
            }
        } finally {
            setLoading(false);
        }
    };

    // Payment State
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [selectedSlotForPayment, setSelectedSlotForPayment] = useState<number | null>(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [receiptOpen, setReceiptOpen] = useState(false);
    const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);

    const initiateBooking = (slotId: number) => {
        if (!user) {
            toast.error('Please login to book');
            return;
        }

        const start = combineDateTime(startDate, startTimeStr);
        const end = combineDateTime(endDate, endTimeStr);

        if (!start || !end) {
            toast.error('Please select valid time range');
            return;
        }

        setSelectedSlotForPayment(slotId);
        setPaymentOpen(true);
    };

    const handlePaymentConfirm = async () => {
        if (!selectedSlotForPayment || !user) return;

        setPaymentLoading(true);
        try {
            const start = combineDateTime(startDate, startTimeStr);
            const end = combineDateTime(endDate, endTimeStr);

            if (!start || !end) return;

            // 1. Create Booking & Transaction
            const bookRes = await fetch('/api/parking/book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': String(user.id)
                },
                body: JSON.stringify({
                    slotId: selectedSlotForPayment,
                    start: start.toISOString(),
                    end: end.toISOString()
                })
            });

            const bookData = await bookRes.json();

            if (!bookRes.ok) {
                toast.error(bookData.error || 'Booking failed');
                setPaymentLoading(false);
                return;
            }

            // 2. Process Payment
            const transactionId = bookData.transaction.id;
            const payRes = await fetch('/api/parking/pay', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': String(user.id)
                },
                body: JSON.stringify({ transactionId })
            });

            if (!payRes.ok) {
                toast.error('Payment failed');
                setPaymentLoading(false);
                return;
            }

            // Success!
            setLastTransactionId(transactionId);
            setPaymentOpen(false);
            setReceiptOpen(true);

            // Refresh data
            fetchMyBookings();
            checkAvailability();

        } catch (error) {
            console.error(error);
            toast.error('Something went wrong');
        } finally {
            setPaymentLoading(false);
        }
    };

    // Auto-redirect to transactions page after receipt is shown
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (receiptOpen) {
            timer = setTimeout(() => {
                setReceiptOpen(false);
                router.push('/parking/transactions');
            }, 3000);
        }
        return () => clearTimeout(timer);
    }, [receiptOpen, router]);

    if (!mounted) return null;

    const allSlots = Array.from({ length: 20 }, (_, i) => i + 1);
    const validRange = startDate && startTimeStr && endDate && endTimeStr;

    return (
        <div className="container mx-auto py-8">
            <PaymentModal
                isOpen={paymentOpen}
                onClose={() => setPaymentOpen(false)}
                onConfirm={handlePaymentConfirm}
                loading={paymentLoading}
                amount={20}
                slotId={selectedSlotForPayment}
            />

            <ReceiptModal
                isOpen={receiptOpen}
                onClose={() => setReceiptOpen(false)}
                transactionId={lastTransactionId}
                slotId={selectedSlotForPayment}
                amount={20}
                date={new Date()}
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Smart Parking</h1>
                    <p className="text-gray-500">Book your secure parking spot instantly.</p>
                </div>
                <div className="flex gap-3">
                    <Card className="p-4 flex items-center gap-3 bg-indigo-50 border-indigo-100 shadow-sm">
                        <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                            <Car className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Available Slots</p>
                            <p className="text-xl font-bold text-indigo-900">{hasChecked ? availableSlots.length : 20}</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-3 bg-emerald-50 border-emerald-100 shadow-sm">
                        <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">My Bookings</p>
                            <p className="text-xl font-bold text-emerald-900">{myBookings.length}</p>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Booking Workflow */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Step 1: Time Selection */}
                    <Card className="border-none shadow-lg bg-white overflow-hidden">
                        <CardHeader className="bg-gray-50 border-b pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</div>
                                Select Date & Time
                            </CardTitle>
                            <CardDescription>Choose when you need the parking spot.</CardDescription>
                        </CardHeader>
                        <CardContent className="sm:p-6 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Start Selection */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Check-in</label>
                                    <div className="space-y-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal border-gray-300 hover:bg-gray-50",
                                                        !startDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-indigo-600" />
                                                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 bg-white shadow-xl border rounded-lg z-50 min-w-[300px]" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={startDate}
                                                    onSelect={setStartDate}
                                                    initialFocus
                                                    className="rounded-md border-none p-4"
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <Input
                                                type="time"
                                                value={startTimeStr}
                                                onChange={(e) => setStartTimeStr(e.target.value)}
                                                className="pl-9 w-full border-gray-300"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* End Selection */}
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Check-out</label>
                                    <div className="space-y-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal border-gray-300 hover:bg-gray-50",
                                                        !endDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-indigo-600" />
                                                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 bg-white shadow-xl border rounded-lg z-50 min-w-[300px]" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={endDate}
                                                    onSelect={setEndDate}
                                                    initialFocus
                                                    className="rounded-md border-none p-4"
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <Input
                                                type="time"
                                                value={endTimeStr}
                                                onChange={(e) => setEndTimeStr(e.target.value)}
                                                className="pl-9 w-full border-gray-300"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t flex justify-end">
                                <Button
                                    onClick={() => checkAvailability(false)}
                                    disabled={!validRange || loading}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[160px]"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Check Availability'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Step 2: Slot Selection */}
                    <Card className="border-none shadow-lg bg-white overflow-hidden">
                        <CardHeader className="bg-gray-50 border-b pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</div>
                                Choose Parking Slot
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="sm:p-6 p-4">
                            <div>
                                {!validRange && (
                                    <p className="text-center text-sm text-gray-500 mb-4">Please select a date and time to check precise availability. Showing all slots.</p>
                                )}
                                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-4">
                                    {allSlots.map((slotId) => {
                                        const isAvailable = hasChecked ? availableSlots.includes(slotId) : true;
                                        return (
                                            <button
                                                key={slotId}
                                                disabled={bookingLoading}
                                                onClick={() => initiateBooking(slotId)}
                                                className={`
                                                        group relative p-4 rounded-xl text-center border-2 transition-all duration-200
                                                        flex flex-col items-center justify-center gap-3 h-32
                                                        ${isAvailable
                                                        ? 'border-emerald-500 bg-white hover:bg-emerald-50 hover:-translate-y-1 hover:shadow-md cursor-pointer'
                                                        : 'border-rose-200 bg-rose-50 cursor-not-allowed opacity-80'}
                                                    `}
                                            >
                                                <div className={`p-2 rounded-full ${isAvailable ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-400'}`}>
                                                    <Car className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <span className={`block font-bold text-lg ${isAvailable ? 'text-gray-800' : 'text-rose-800'}`}>P-{slotId}</span>
                                                    <span className={`text-[10px] uppercase font-bold tracking-wider ${isAvailable ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                        {isAvailable ? 'Available' : 'Booked'}
                                                    </span>
                                                </div>
                                                {isAvailable && (
                                                    <div className="absolute inset-x-0 bottom-0 top-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 rounded-xl transition-colors" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-6 flex gap-6 text-sm font-medium text-gray-600 justify-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-white border-2 border-emerald-500 rounded"></div>
                                        <span>Available</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-rose-50 border-2 border-rose-200 rounded"></div>
                                        <span>Booked</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: History */}
                <div className="lg:col-span-1">
                    <Card className="border-none shadow-lg bg-white h-full max-h-[calc(100vh-120px)] flex flex-col">
                        <CardHeader className="bg-gray-50 border-b pb-4">
                            <CardTitle className="text-lg">Recent Bookings</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-y-auto">
                            {myBookings.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No bookings history.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {myBookings.map((booking) => (
                                        <div key={booking.id} className="p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded">
                                                        <Car className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-bold text-gray-900">Slot P-{booking.slotId}</span>
                                                </div>
                                                <span className="text-[10px] font-mono text-gray-400">#{booking.id}</span>
                                            </div>
                                            <div className="space-y-1.5 ml-8">
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <span className="text-gray-400 font-medium w-10">Start</span>
                                                    <span>{format(new Date(booking.startTime), "MMM dd, p")}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <span className="text-gray-400 font-medium w-10">End</span>
                                                    <span>{format(new Date(booking.endTime), "MMM dd, p")}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
