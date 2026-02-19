'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import { Car, User, Mail, Calendar, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { FullScreenLoader } from "@/components/ui/loader";
import { toast } from "sonner";

export default function ParkingAdminPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            router.push('/login?type=parking');
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role !== 'admin') {
            toast.error("Unauthorized access");
            router.push('/parking/profile');
            return;
        }
        setUser(parsedUser);
        fetchBookings(parsedUser);
    }, [router]);

    const fetchBookings = async (currentUser: any) => {
        try {
            const res = await fetch('/api/parking/all-bookings', {
                headers: {
                    'X-User-Role': currentUser.role,
                    'X-User-Id': String(currentUser.id)
                }
            });
            const data = await res.json();
            if (res.ok) {
                setBookings(data);
            } else {
                toast.error(data.error || "Failed to fetch bookings");
            }
        } catch (e) {
            console.error('Fetch bookings error:', e);
            toast.error("An error occurred while fetching bookings");
        } finally {
            setLoading(false);
        }
    };

    if (!user || loading) return <FullScreenLoader />;

    return (
        <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200">
                            <Car className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Parking Administration</h1>
                            <p className="text-gray-500 text-sm italic">Manage all site-wide parking reservations</p>
                        </div>
                    </div>
                </div>

                {/* Statistics Overview (Optional but nice) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Bookings</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{bookings.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active/Completed</p>
                        <p className="text-3xl font-bold text-emerald-600 mt-1">
                            {bookings.filter(b => b.paymentStatus === 'succcess' || b.paymentStatus === 'completed').length}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pending/Failed</p>
                        <p className="text-3xl font-bold text-amber-600 mt-1">
                            {bookings.filter(b => b.paymentStatus !== 'succcess' && b.paymentStatus !== 'completed').length}
                        </p>
                    </div>
                </div>

                {/* Bookings List */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <h2 className="text-lg font-semibold text-gray-700">All User Reservations</h2>
                    </div>

                    <div className="grid gap-4">
                        {bookings.map((booking, index) => (
                            <motion.div
                                key={booking.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div className="flex flex-col sm:flex-row gap-6">
                                        {/* Slot Icon */}
                                        <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-2xl border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                                            <div className="text-center">
                                                <span className="block text-[10px] font-bold text-emerald-600 uppercase">Slot</span>
                                                <span className="text-xl font-bold text-emerald-700">P-{booking.slotId}</span>
                                            </div>
                                        </div>

                                        {/* User & Date Info */}
                                        <div className="space-y-2">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 bg-gray-50 px-3 py-1 rounded-full">
                                                    <User className="w-3.5 h-3.5 text-indigo-500" />
                                                    {booking.userName}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 break-all">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    {booking.userEmail}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Calendar className="w-4 h-4 text-emerald-500" />
                                                    <span className="font-medium">{new Date(booking.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-emerald-50/50 px-2 py-0.5 rounded-md">
                                                    <Clock className="w-4 h-4 text-emerald-500" />
                                                    <span>
                                                        {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        <span className="mx-2 text-gray-400">→</span>
                                                        {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Section */}
                                    <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-4 lg:pt-0">
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</div>
                                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold shadow-sm ${booking.paymentStatus === 'succcess' || booking.paymentStatus === 'completed'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                                                }`}>
                                                {booking.paymentStatus === 'succcess' || booking.paymentStatus === 'completed' ? (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                ) : (
                                                    <AlertCircle className="w-4 h-4" />
                                                )}
                                                {booking.paymentStatus === 'succcess' ? 'Success' :
                                                    booking.paymentStatus === 'completed' ? 'Completed' :
                                                        booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {bookings.length === 0 && (
                            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">No reservations found in the system.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
