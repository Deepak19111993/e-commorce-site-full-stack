'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import { Camera, QrCode, Car, User, Calendar, Clock, CheckCircle2, XCircle, ArrowLeft, LogIn, LogOut, Loader2, AlertCircle } from "lucide-react";
import { FullScreenLoader } from "@/components/ui/loader";
import { toast } from "sonner";

export default function ParkingScanPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [scanning, setScanning] = useState(false);
    const [booking, setBooking] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const scannerRef = useRef<any>(null);
    const scannerContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            router.push('/login?type=parking');
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role !== 'admin') {
            toast.error("Unauthorized access");
            router.push('/parking');
            return;
        }
        setUser(parsedUser);
    }, [router]);

    const startScanner = async () => {
        setScanning(true);
        setError(null);
        setBooking(null);

        try {
            const { Html5Qrcode } = await import('html5-qrcode');

            // Wait for container to appear
            await new Promise(r => setTimeout(r, 300));

            if (!scannerContainerRef.current) return;

            const scanner = new Html5Qrcode("qr-reader");
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                async (decodedText) => {
                    // QR code detected
                    await scanner.stop();
                    scannerRef.current = null;
                    setScanning(false);
                    lookupBooking(decodedText);
                },
                () => { /* ignore scan failures */ }
            );
        } catch (err: any) {
            console.error('Scanner error:', err);
            setError('Camera access denied or not available. Use manual entry below.');
            setScanning(false);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
            } catch { }
            scannerRef.current = null;
        }
        setScanning(false);
    };

    const lookupBooking = async (code: string) => {
        setError(null);
        setBooking(null);
        setActionLoading(true);

        try {
            const res = await fetch(`/api/parking/booking-by-code/${code}`, {
                headers: {
                    'X-User-Role': user.role,
                    'X-User-Id': String(user.id)
                }
            });
            const data = await res.json();
            if (res.ok) {
                setBooking(data);
            } else {
                setError(data.error || 'Invalid QR Code');
            }
        } catch (e) {
            setError('Failed to verify QR code');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEntry = async () => {
        if (!booking) return;
        setActionLoading(true);
        try {
            const res = await fetch('/api/parking/verify-entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': user.role,
                    'X-User-Id': String(user.id)
                },
                body: JSON.stringify({ entryCode: booking.entryCode })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('✅ Entry recorded successfully!');
                setBooking({ ...booking, entryTime: new Date().toISOString() });
            } else {
                toast.error(data.error || 'Failed to record entry');
            }
        } catch (e) {
            toast.error('An error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    const handleExit = async () => {
        if (!booking) return;
        setActionLoading(true);
        try {
            const res = await fetch('/api/parking/verify-exit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': user.role,
                    'X-User-Id': String(user.id)
                },
                body: JSON.stringify({ entryCode: booking.entryCode })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('✅ Exit recorded successfully!');
                setBooking({ ...booking, exitTime: new Date().toISOString() });
            } else {
                toast.error(data.error || 'Failed to record exit');
            }
        } catch (e) {
            toast.error('An error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode.trim()) {
            lookupBooking(manualCode.trim());
        }
    };

    useEffect(() => {
        return () => { stopScanner(); };
    }, []);

    if (!user) return <FullScreenLoader />;

    return (
        <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-lg mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/parking/admin/dashboard')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-violet-600 rounded-xl text-white shadow-lg shadow-violet-200">
                            <QrCode className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">QR Scanner</h1>
                            <p className="text-xs text-gray-500">Scan entry/exit QR codes</p>
                        </div>
                    </div>
                </div>

                {/* Scanner Section */}
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    <div className="p-6">
                        {!scanning && !booking && (
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-violet-50 rounded-2xl mx-auto flex items-center justify-center">
                                    <Camera className="w-10 h-10 text-violet-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">Ready to Scan</h3>
                                    <p className="text-sm text-gray-500 mt-1">Point camera at user's QR code or enter code manually</p>
                                </div>
                                <button
                                    onClick={startScanner}
                                    className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-all flex items-center justify-center gap-2 shadow-sm shadow-violet-200"
                                >
                                    <Camera className="w-5 h-5" />
                                    Open Camera Scanner
                                </button>

                                {/* Manual Entry */}
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                                    <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400 uppercase font-bold tracking-widest">or enter manually</span></div>
                                </div>
                                <form onSubmit={handleManualSubmit} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value)}
                                        placeholder="Paste QR code..."
                                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!manualCode.trim() || actionLoading}
                                        className="px-5 py-2.5 bg-gray-800 text-white rounded-xl font-semibold text-sm hover:bg-gray-900 transition-colors disabled:opacity-50"
                                    >
                                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {scanning && (
                            <div className="space-y-4">
                                <div ref={scannerContainerRef} id="qr-reader" className="w-full rounded-xl overflow-hidden" style={{ minHeight: 300 }}></div>
                                <button
                                    onClick={stopScanner}
                                    className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
                                >
                                    Cancel Scanning
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3"
                        >
                            <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-red-800 text-sm">{error}</p>
                                <button onClick={() => { setError(null); setBooking(null); }} className="text-xs text-red-600 underline mt-1">Scan another</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Booking Result */}
                <AnimatePresence>
                    {booking && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-lg border-2 border-emerald-200 overflow-hidden"
                        >
                            {/* Status Header */}
                            <div className={`px-6 py-4 ${booking.exitTime ? 'bg-gray-50' : booking.entryTime ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        <span className="font-bold text-emerald-800">Valid Booking</span>
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${booking.exitTime ? 'bg-gray-200 text-gray-700' : booking.entryTime ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {booking.exitTime ? 'Completed' : booking.entryTime ? 'Inside Parking' : 'Ready for Entry'}
                                    </span>
                                </div>
                            </div>

                            {/* Booking Details */}
                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                                        <div className="text-center">
                                            <span className="block text-[10px] font-bold text-emerald-600 uppercase">Slot</span>
                                            <span className="text-xl font-bold text-emerald-700">P-{booking.slotId}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                            <User className="w-4 h-4 text-indigo-500" />
                                            {booking.userName}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">{booking.userEmail}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                            <Calendar className="w-3 h-3" /> Booked
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {new Date(booking.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                            <Clock className="w-3 h-3" /> Time
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Entry/Exit Times */}
                                {booking.entryTime && (
                                    <div className="flex items-center gap-2 text-sm bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                                        <LogIn className="w-4 h-4 text-blue-600" />
                                        <span className="text-blue-800"><strong>Entry:</strong> {new Date(booking.entryTime).toLocaleTimeString()}</span>
                                    </div>
                                )}
                                {booking.exitTime && (
                                    <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                        <LogOut className="w-4 h-4 text-gray-600" />
                                        <span className="text-gray-800"><strong>Exit:</strong> {new Date(booking.exitTime).toLocaleTimeString()}</span>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-2">
                                    {!booking.entryTime && !booking.exitTime && (
                                        <button
                                            onClick={handleEntry}
                                            disabled={actionLoading}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
                                        >
                                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-5 h-5" />}
                                            Record Entry
                                        </button>
                                    )}
                                    {booking.entryTime && !booking.exitTime && (
                                        <button
                                            onClick={handleExit}
                                            disabled={actionLoading}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-sm disabled:opacity-50"
                                        >
                                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-5 h-5" />}
                                            Record Exit
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setBooking(null); setManualCode(''); }}
                                        className="px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
                                    >
                                        Scan Next
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
