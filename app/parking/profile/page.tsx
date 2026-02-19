'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FullScreenLoader } from "@/components/ui/loader";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Car, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function ParkingUserDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });
    const [bookings, setBookings] = useState<any[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            router.push('/login?type=parking');
            return;
        }
        const parsedUser = JSON.parse(storedUser);

        // Basic check to ensure we are in parking context (though data separation handles security)
        if (parsedUser.type && parsedUser.type !== 'parking') {
            // Maybe redirect to store profile? Or allowing viewing if we support cross-portal?
            // For now, let's just stick to "if you are here, you are a parking user" logic or similar.
        }

        setUser(parsedUser);
        if (parsedUser.role === 'admin') {
            router.push('/parking/admin/profile');
            return;
        }
        setEditForm({ name: parsedUser.name || '', email: parsedUser.email || '', password: '' });

        // Fetch bookings
        fetchBookings(parsedUser.id);
    }, [router]);

    const fetchBookings = async (userId: string) => {
        try {
            const res = await fetch('/api/parking/my-bookings', {
                headers: {
                    'X-User-Id': userId
                }
            });
            if (res.ok) {
                const data = await res.json();
                setBookings(data);
            }
        } catch (error) {
            console.error("Failed to fetch bookings", error);
        } finally {
            setLoadingBookings(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Using separate API for parking users
            const res = await fetch(`/api/parking-users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': user.role,
                    'X-User-Id': String(user.id)
                },
                body: JSON.stringify(editForm)
            });

            if (res.ok) {
                const updatedUser = await res.json();
                const newUserState = { ...user, ...updatedUser, type: 'parking' };
                setUser(newUserState);
                localStorage.setItem('user', JSON.stringify(newUserState));
                setIsEditOpen(false);
                toast.success('Profile updated successfully');
            } else {
                toast.error('Failed to update profile');
            }
        } catch (e) {
            toast.error('Error updating profile');
        }
    };

    const handleDeleteAccount = () => {
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteAccount = async () => {
        setIsDeleteDialogOpen(false);
        try {
            const res = await fetch(`/api/parking-users/${user.id}`, {
                method: 'DELETE',
                headers: {
                    'X-User-Role': user.role,
                    'X-User-Id': String(user.id)
                }
            });

            if (res.ok) {
                toast.success('Account deleted successfully');
                localStorage.removeItem('user');
                router.push('/parking'); // Redirect to parking home
            } else {
                const data = await res.json();
                toast.error('Failed to delete account: ' + data.error);
            }
        } catch (e) {
            toast.error('Error deleting account');
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    if (!user) return <FullScreenLoader />;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="pt-6 container mx-auto sm:px-4 px-0"
        >
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <Car className="text-emerald-600" />
                    Parking Dashboard
                </h1>
            </div>

            <div className="mt-4 p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <p className="text-xl">Welcome, <span className="font-bold text-emerald-900">{user.name}</span></p>
                    <p className="text-gray-500">Email: {user.email}</p>
                </div>

                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all h-9 sm:h-10 text-sm sm:text-base px-4 sm:px-6">
                            Edit Profile
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Edit Profile</DialogTitle>
                            <DialogDescription>
                                Update your parking account details.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4 pt-4 space-y-2">
                            <div className="flex flex-col space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="(Leave blank to keep current)"
                                    value={editForm.password}
                                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" className='w-full bg-emerald-600 hover:bg-emerald-700'>
                                    Save changes
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* My Bookings Section - Specific to Parking Profile */}
            {user?.role !== 'admin' && (
                <div className="mt-8">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-500" />
                        Reservation History
                    </h2>

                    {loadingBookings ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm animate-pulse">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="h-5 bg-gray-200 rounded-md w-24"></div>
                                        <div className="h-5 bg-gray-100 rounded-full w-16"></div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="h-3 bg-gray-100 rounded-md w-16"></div>
                                            <div className="h-4 bg-gray-200 rounded-md w-32"></div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-3 bg-gray-100 rounded-md w-16"></div>
                                            <div className="h-4 bg-gray-200 rounded-md w-32"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : bookings.length > 0 ? (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                        >
                            {bookings.map((booking) => (
                                <motion.div
                                    key={booking.id}
                                    variants={itemVariants}
                                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-gray-800">Slot P-{booking.slotId}</h3>
                                        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full font-medium">Confirmed</span>
                                    </div>
                                    <div className="space-y-3 text-sm text-gray-600">
                                        <div className="flex items-start gap-2">
                                            <div className="grid gap-1">
                                                <p className="text-xs text-gray-500 font-medium">Check-in</p>
                                                <div className="flex items-center gap-2 font-medium">
                                                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                                    {format(new Date(booking.startTime), 'MMM dd, yyyy')}
                                                    <Clock className="w-3.5 h-3.5 ml-1 text-emerald-600" />
                                                    {format(new Date(booking.startTime), 'hh:mm a')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <div className="grid gap-1">
                                                <p className="text-xs text-gray-500 font-medium">Check-out</p>
                                                <div className="flex items-center gap-2 font-medium">
                                                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                                    {format(new Date(booking.endTime), 'MMM dd, yyyy')}
                                                    <Clock className="w-3.5 h-3.5 ml-1 text-emerald-600" />
                                                    {format(new Date(booking.endTime), 'hh:mm a')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <p className="text-gray-500">No parking reservations found.</p>
                            <Button
                                variant="link"
                                className="text-emerald-600 font-semibold mt-2"
                                onClick={() => router.push('/parking')}
                            >
                                Book a Spot
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {user.role !== 'admin' && (
                <div className="mt-12 border-t pt-8">
                    <h2 className="text-xl font-bold text-rose-600 mb-2">Danger Zone</h2>
                    <p className="text-sm text-gray-500 mb-6">Once you delete your account, there is no going back. Please be certain.</p>
                    <button
                        onClick={handleDeleteAccount}
                        className="px-4 sm:px-6 py-2 sm:py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg hover:bg-rose-600 hover:text-white transition-all duration-200 font-semibold shadow-sm active:scale-[0.98] text-sm sm:text-base"
                    >
                        Delete My Account
                    </button>
                </div>
            )}

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account and remove your parking data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteAccount} className="bg-red-600 hover:bg-red-700">Delete Account</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}
