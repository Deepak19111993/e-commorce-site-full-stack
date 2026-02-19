'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import { User, Mail, Shield, UserCircle } from "lucide-react";
import { FullScreenLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function ParkingAdminProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            router.push('/login?type=parking');
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role !== 'admin') {
            router.push('/parking/profile');
            return;
        }
        setUser(parsedUser);
        setEditForm({ name: parsedUser.name || '', email: parsedUser.email || '', password: '' });
        setLoading(false);
    }, [router]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
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
                const newUserState = { ...user, ...updatedUser };
                setUser(newUserState);
                localStorage.setItem('user', JSON.stringify(newUserState));
                setIsEditOpen(false);
                toast.success('Admin profile updated successfully');
            } else {
                toast.error('Failed to update profile');
            }
        } catch (e) {
            toast.error('Error updating profile');
        }
    };

    if (loading || !user) return <FullScreenLoader />;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8"
        >
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200">
                        <UserCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Admin Profile</h1>
                        <p className="text-gray-500 text-sm italic">Manage your parking administrator account</p>
                    </div>
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                    <div className="relative">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 border-4 border-emerald-50">
                            <User size={48} className="sm:hidden" />
                            <User size={64} className="hidden sm:block" />
                        </div>
                        <div className="absolute bottom-1 right-1 bg-emerald-600 text-white p-2 rounded-full border-4 border-white shadow-sm ring-1 ring-emerald-50">
                            <Shield size={16} />
                        </div>
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{user.name}</h2>
                            <p className="text-gray-500 flex items-center justify-center md:justify-start gap-2">
                                <Mail size={16} />
                                {user.email}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-full border border-emerald-100">
                                Parking Admin
                            </span>
                            <span className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-full border border-gray-100 italic">
                                Site-wide Manager
                            </span>
                        </div>

                        <div className="pt-4">
                            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all px-8 h-12 rounded-xl font-bold">
                                        Edit Admin Account
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Update Admin Profile</DialogTitle>
                                        <DialogDescription>
                                            Modify your administrative credentials here.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleUpdateProfile} className="space-y-6 pt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Name</Label>
                                            <Input
                                                id="name"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                className="rounded-xl border-gray-200 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                value={editForm.email}
                                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                className="rounded-xl border-gray-200 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Update Password</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="(Optional)"
                                                value={editForm.password}
                                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                                className="rounded-xl border-gray-200 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" className='w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-11 font-bold'>
                                                Save Updates
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>

                {/* Info Note */}
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-4">
                    <div className="bg-amber-100 p-2 rounded-xl h-fit text-amber-700 shrink-0">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-900 text-sm">Security Policy</h4>
                        <p className="text-amber-800/80 text-sm leading-relaxed mt-1">
                            You are currently logged in with **Administrative Privileges**. All actions are logged.
                            If you need to change your portal role, please contact the system owner at `creole@smartparking.com`.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
