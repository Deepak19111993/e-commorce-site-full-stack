'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Calendar as CalendarIcon, Clock, Car, History, MapPin, QrCode, Map, LayoutGrid } from 'lucide-react';
import QRCode from 'react-qr-code';
import dynamic from 'next/dynamic';

const ParkingMap = dynamic(() => import('@/components/parking/ParkingMap'), { ssr: false });
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
import { motion } from "framer-motion";

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
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [myBookings, setMyBookings] = useState<any[]>([]);
    const [bookingsLoading, setBookingsLoading] = useState(true);
    const [qrModal, setQrModal] = useState<{ code: string; slotId: number } | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    useEffect(() => {
        const init = () => {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser.role === 'admin') {
                    router.push('/parking/admin/dashboard');
                    return;
                }
                setUser(parsedUser);
            } else {
                router.push('/login');
                return;
            }

            // Restore parking state OR Set Defaults
            const savedState = localStorage.getItem('parkingValetState');
            let restored = false;

            if (savedState) {
                try {
                    const parsed = JSON.parse(savedState);
                    if (parsed.startDate) {
                        setStartDate(new Date(parsed.startDate));
                        restored = true;
                    }
                    if (parsed.startTimeStr) setStartTimeStr(parsed.startTimeStr);
                    if (parsed.endDate) setEndDate(new Date(parsed.endDate));
                    if (parsed.endTimeStr) setEndTimeStr(parsed.endTimeStr);
                    if (parsed.availableSlots) setAvailableSlots(parsed.availableSlots);
                    if (parsed.hasChecked) setHasChecked(parsed.hasChecked);
                } catch (e) {
                    console.error('Failed to parse parking state', e);
                }
            }

            if (!restored) {
                const now = new Date();
                const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

                setStartDate(now);
                setStartTimeStr(format(now, 'HH:mm'));
                setEndDate(oneHourLater);
                setEndTimeStr(format(oneHourLater, 'HH:mm'));
                // Don't set hasChecked=true here, let the debounce check do it
            }

            setMounted(true);
        };

        init();
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


    useEffect(() => {
        if (user) {
            fetchMyBookings();
        }
    }, [user]);

    const fetchMyBookings = async () => {
        try {
            setBookingsLoading(true);
            const res = await fetch('/api/parking/my-bookings', {
                headers: { 'X-User-Id': String(user?.id) }
            });
            if (res.ok) {
                const data = await res.json();
                setMyBookings(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setBookingsLoading(false);
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
        if (!mounted) return;

        const timer = setTimeout(() => {
            if (startDate && startTimeStr && endDate && endTimeStr) {
                const start = combineDateTime(startDate, startTimeStr);
                const end = combineDateTime(endDate, endTimeStr);
                if (start && end && end > start) {
                    checkAvailability(true);
                } else {
                    setHasChecked(false);
                    setAvailableSlots([]);
                    setLoading(false); // Stop loading if input is invalid
                }
            } else {
                setHasChecked(false);
                setAvailableSlots([]);
                setLoading(false); // Stop loading if input is missing
            }
        }, 500); // Debounce to prevent too many requests

        return () => clearTimeout(timer);
    }, [startDate, startTimeStr, endDate, endTimeStr, mounted]);

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

            const transactionId = bookData.transaction.id;

            // 2. Create Razorpay Order
            const orderRes = await fetch('/api/parking/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': String(user.id)
                },
                body: JSON.stringify({ amount: 20, transactionId })
            });

            const orderData = await orderRes.json();

            if (!orderRes.ok) {
                toast.error(orderData.error || 'Failed to create payment order');
                setPaymentLoading(false);
                return;
            }

            // Demo mode — no Razorpay keys, process payment directly
            if (orderData.demo) {
                setPaymentOpen(false);
                try {
                    const payRes = await fetch('/api/parking/pay', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-User-Id': String(user.id)
                        },
                        body: JSON.stringify({ transactionId, demo: true })
                    });

                    if (payRes.ok) {
                        toast.success('✅ Payment successful (demo mode)');
                        setLastTransactionId(transactionId);
                        setReceiptOpen(true);
                        fetchMyBookings();
                        checkAvailability();
                    } else {
                        toast.error('Payment failed');
                    }
                } catch (err) {
                    toast.error('Payment error');
                } finally {
                    setPaymentLoading(false);
                }
                return;
            }

            // 3. Real Razorpay — close modal and open checkout
            setPaymentOpen(false);

            // Load Razorpay script if not already loaded
            if (!(window as any).Razorpay) {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('Failed to load Razorpay'));
                    document.body.appendChild(script);
                });
            }

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Smart Parking',
                description: `Parking Slot P-${selectedSlotForPayment}`,
                order_id: orderData.orderId,
                prefill: {
                    name: user.name,
                    email: user.email,
                },
                theme: {
                    color: '#4f46e5'
                },
                handler: async (response: any) => {
                    // 4. Verify payment on server
                    try {
                        const payRes = await fetch('/api/parking/pay', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-User-Id': String(user.id)
                            },
                            body: JSON.stringify({
                                transactionId,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                            })
                        });

                        if (payRes.ok) {
                            setLastTransactionId(transactionId);
                            setReceiptOpen(true);
                            fetchMyBookings();
                            checkAvailability();
                        } else {
                            toast.error('Payment verification failed');
                        }
                    } catch (err) {
                        toast.error('Payment verification error');
                    }
                },
                modal: {
                    ondismiss: () => {
                        toast.info('Payment cancelled');
                        setPaymentLoading(false);
                    }
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();

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
        <motion.div
            className="container mx-auto py-8"
            variants={containerVariants}
            initial="hidden"
            animate="show"
        >
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

            <motion.div
                variants={itemVariants}
                className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
            >
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
                            <div className="h-7 flex items-center">
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                                ) : (
                                    <p className="text-xl font-bold text-indigo-900 leading-none">
                                        {hasChecked ? availableSlots.length : 20}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-3 bg-emerald-50 border-emerald-100 shadow-sm">
                        <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                            <History className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">My Bookings</p>
                            <div className="h-7 flex items-center">
                                {bookingsLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                                ) : (
                                    <p className="text-xl font-bold text-emerald-900 leading-none">
                                        {myBookings.length}
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </motion.div>

            <motion.div
                variants={containerVariants}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
                {/* Left Column: Booking Workflow */}
                <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">
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
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</div>
                                    Choose Parking Slot
                                </CardTitle>
                                <div className="flex bg-gray-200 rounded-lg p-0.5">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        <LayoutGrid className="w-3.5 h-3.5" />
                                        Grid
                                    </button>
                                    <button
                                        onClick={() => setViewMode('map')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        <Map className="w-3.5 h-3.5" />
                                        Map
                                    </button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="sm:p-6 p-4">
                            <div>
                                {!validRange && (
                                    <p className="text-center text-sm text-gray-500 mb-4">Please select a date and time to check precise availability. Showing all slots.</p>
                                )}

                                {viewMode === 'map' ? (
                                    <ParkingMap
                                        availableSlots={availableSlots}
                                        hasChecked={hasChecked}
                                        onBookSlot={initiateBooking}
                                    />
                                ) : (
                                    <>
                                        <motion.div
                                            variants={containerVariants}
                                            initial="hidden"
                                            animate="show"
                                            className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-4"
                                        >
                                            {allSlots.map((slotId) => {
                                                const isAvailable = hasChecked ? availableSlots.includes(slotId) : true;
                                                return (
                                                    <motion.button
                                                        key={slotId}
                                                        variants={itemVariants}
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
                                                    </motion.button>
                                                );
                                            })}
                                        </motion.div>
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
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Right Column: History */}
                <motion.div variants={itemVariants} className="lg:col-span-1">
                    <Card className="border-none shadow-lg bg-white h-fit flex flex-col">
                        <CardHeader className="bg-gray-50 border-b pb-4 sticky top-[60px] z-10">
                            <CardTitle className="text-lg">Recent Bookings</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1">
                            {bookingsLoading ? (
                                <div className="divide-y divide-gray-100">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="p-4 animate-pulse">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-gray-200 w-7 h-7 rounded"></div>
                                                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                                                </div>
                                                <div className="h-3 bg-gray-100 rounded w-8"></div>
                                            </div>
                                            <div className="space-y-2 ml-9">
                                                <div className="h-3 bg-gray-100 rounded w-32"></div>
                                                <div className="h-3 bg-gray-100 rounded w-32"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : myBookings.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No bookings history.</p>
                                </div>
                            ) : (
                                <motion.div
                                    variants={containerVariants}
                                    initial="hidden"
                                    animate="show"
                                    className="divide-y divide-gray-100"
                                >
                                    {myBookings.map((booking) => {
                                        const statusConfig = booking.approvalStatus === 'approved'
                                            ? { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
                                            : booking.approvalStatus === 'rejected'
                                                ? { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
                                                : booking.paymentStatus === 'paid_pending_approval'
                                                    ? { label: 'Awaiting Approval', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
                                                    : { label: 'Pending Payment', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
                                        return (
                                            <motion.div
                                                key={booking.id}
                                                variants={itemVariants}
                                                className="p-4 hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded">
                                                            <Car className="w-4 h-4" />
                                                        </div>
                                                        <span className="font-bold text-gray-900">Slot P-{booking.slotId}</span>
                                                    </div>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                                                        {statusConfig.label}
                                                    </span>
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
                                                    {booking.adminNote && (
                                                        <div className="text-[11px] text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 mt-1">
                                                            <strong>Reason:</strong> {booking.adminNote}
                                                        </div>
                                                    )}
                                                    {booking.entryCode && (
                                                        <div
                                                            className="mt-2 p-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:shadow-md transition-shadow inline-block"
                                                            onClick={() => setQrModal({ code: booking.entryCode, slotId: booking.slotId })}
                                                            title="Tap to enlarge QR"
                                                        >
                                                            <QRCode value={booking.entryCode} size={64} />
                                                            <p className="text-[9px] text-gray-400 text-center mt-1 font-medium">Tap to enlarge</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            {/* QR Fullscreen Modal */}
            {qrModal && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setQrModal(null)}
                >
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4">
                            <QrCode className="w-8 h-8 text-violet-500 mx-auto mb-2" />
                            <h3 className="text-lg font-bold text-gray-900">Parking Entry QR</h3>
                            <p className="text-sm text-gray-500">Slot P-{qrModal.slotId}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 inline-block">
                            <QRCode value={qrModal.code} size={220} />
                        </div>
                        <p className="text-xs text-gray-400 mt-4">Show this QR code at the parking gate</p>
                        <button
                            onClick={() => setQrModal(null)}
                            className="mt-4 w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
