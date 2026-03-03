'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import { Car, User, Mail, Calendar, Clock, CheckCircle2, AlertCircle, Loader2, XCircle, ShieldCheck, MessageSquare, X, QrCode } from "lucide-react";
import { FullScreenLoader } from "@/components/ui/loader";
import { toast } from "sonner";

export default function ParkingAdminPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [rejectModal, setRejectModal] = useState<{ bookingId: number; userName: string } | null>(null);
    const [rejectReason, setRejectReason] = useState('');

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

    const handleApprove = async (bookingId: number) => {
        setActionLoading(bookingId);
        try {
            const res = await fetch('/api/parking/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': user.role,
                    'X-User-Id': String(user.id)
                },
                body: JSON.stringify({ bookingId })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Booking approved successfully!");
                fetchBookings(user);
            } else {
                toast.error(data.error || "Failed to approve");
            }
        } catch (e) {
            toast.error("An error occurred");
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (!rejectModal) return;
        setActionLoading(rejectModal.bookingId);
        try {
            const res = await fetch('/api/parking/reject', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': user.role,
                    'X-User-Id': String(user.id)
                },
                body: JSON.stringify({ bookingId: rejectModal.bookingId, reason: rejectReason })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Booking rejected");
                fetchBookings(user);
            } else {
                toast.error(data.error || "Failed to reject");
            }
        } catch (e) {
            toast.error("An error occurred");
        } finally {
            setActionLoading(null);
            setRejectModal(null);
            setRejectReason('');
        }
    };

    const getStatusConfig = (booking: any) => {
        const approval = booking.approvalStatus;
        const payment = booking.paymentStatus;

        if (approval === 'approved') return { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <CheckCircle2 className="w-4 h-4" /> };
        if (approval === 'rejected') return { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-100', icon: <XCircle className="w-4 h-4" /> };
        if (payment === 'paid_pending_approval') return { label: 'Awaiting Approval', color: 'bg-amber-50 text-amber-700 border-amber-100', icon: <ShieldCheck className="w-4 h-4" /> };
        if (payment === 'succcess' || payment === 'completed') return { label: 'Paid', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <CheckCircle2 className="w-4 h-4" /> };
        return { label: payment?.charAt(0).toUpperCase() + payment?.slice(1) || 'Pending', color: 'bg-gray-50 text-gray-700 border-gray-100', icon: <AlertCircle className="w-4 h-4" /> };
    };

    if (!user || loading) return <FullScreenLoader />;

    const pendingApproval = bookings.filter(b => b.paymentStatus === 'paid_pending_approval' && b.approvalStatus !== 'approved' && b.approvalStatus !== 'rejected');
    const approved = bookings.filter(b => b.approvalStatus === 'approved' || b.paymentStatus === 'succcess' || b.paymentStatus === 'completed');
    const rejected = bookings.filter(b => b.approvalStatus === 'rejected');

    return (
        <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
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
                    <button
                        onClick={() => router.push('/parking/admin/scan')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 transition-all shadow-sm shadow-violet-200"
                    >
                        <QrCode className="w-4 h-4" />
                        Scan QR Code
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{bookings.length}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-[40px]"></div>
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Pending Approval</p>
                        <p className="text-3xl font-bold text-amber-600 mt-1">{pendingApproval.length}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Approved</p>
                        <p className="text-3xl font-bold text-emerald-600 mt-1">{approved.length}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100">
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Rejected</p>
                        <p className="text-3xl font-bold text-red-500 mt-1">{rejected.length}</p>
                    </div>
                </div>

                {/* Pending Approval Section */}
                {pendingApproval.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-amber-500" />
                            <h2 className="text-lg font-semibold text-gray-700">Pending Approval ({pendingApproval.length})</h2>
                        </div>
                        <div className="grid gap-4">
                            {pendingApproval.map((booking, index) => {
                                const status = getStatusConfig(booking);
                                return (
                                    <motion.div
                                        key={booking.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-white rounded-2xl p-6 shadow-sm border-2 border-amber-200 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                            <div className="flex flex-col sm:flex-row gap-6">
                                                <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 bg-amber-50 rounded-2xl border border-amber-100">
                                                    <div className="text-center">
                                                        <span className="block text-[10px] font-bold text-amber-600 uppercase">Slot</span>
                                                        <span className="text-xl font-bold text-amber-700">P-{booking.slotId}</span>
                                                    </div>
                                                </div>
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
                                                            <Calendar className="w-4 h-4 text-amber-500" />
                                                            <span className="font-medium">{new Date(booking.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-amber-50/50 px-2 py-0.5 rounded-md">
                                                            <Clock className="w-4 h-4 text-amber-500" />
                                                            <span>
                                                                {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                <span className="mx-2 text-gray-400">→</span>
                                                                {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0">
                                                <button
                                                    onClick={() => handleApprove(booking.id)}
                                                    disabled={actionLoading === booking.id}
                                                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 disabled:opacity-50"
                                                >
                                                    {actionLoading === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => setRejectModal({ bookingId: booking.id, userName: booking.userName })}
                                                    disabled={actionLoading === booking.id}
                                                    className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-100 transition-all border border-red-200 disabled:opacity-50"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* All Bookings */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <h2 className="text-lg font-semibold text-gray-700">All Reservations</h2>
                    </div>

                    <div className="grid gap-4">
                        {bookings.map((booking, index) => {
                            const status = getStatusConfig(booking);
                            return (
                                <motion.div
                                    key={booking.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                        <div className="flex flex-col sm:flex-row gap-6">
                                            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-2xl border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                                                <div className="text-center">
                                                    <span className="block text-[10px] font-bold text-emerald-600 uppercase">Slot</span>
                                                    <span className="text-xl font-bold text-emerald-700">P-{booking.slotId}</span>
                                                </div>
                                            </div>
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
                                                {/* Show admin note for rejected bookings */}
                                                {booking.adminNote && (
                                                    <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                                                        <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                                        <span><strong>Rejection Reason:</strong> {booking.adminNote}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-4 lg:pt-0">
                                            <div className="text-right">
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</div>
                                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold shadow-sm border ${status.color}`}>
                                                    {status.icon}
                                                    {status.label}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}

                        {bookings.length === 0 && (
                            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">No reservations found in the system.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reject Modal */}
            <AnimatePresence>
                {rejectModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setRejectModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <XCircle className="w-5 h-5 text-red-500" />
                                    Reject Booking
                                </h3>
                                <button onClick={() => setRejectModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <p className="text-sm text-gray-600 mb-4">
                                Rejecting booking for <strong>{rejectModal.userName}</strong>. This will free up the parking slot.
                            </p>

                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Enter reason for rejection (optional)..."
                                className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
                            />

                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => setRejectModal(null)}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={actionLoading !== null}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {actionLoading !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    Confirm Reject
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
