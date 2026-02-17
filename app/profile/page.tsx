'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FullScreenLoader, Loader } from "@/components/ui/loader";
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

export default function UserDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            router.push('/login');
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setEditForm({ name: parsedUser.name || '', email: parsedUser.email || '', password: '' });
    }, [router]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/users/${user.id}`, {
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
                setUser({ ...user, ...updatedUser });
                localStorage.setItem('user', JSON.stringify({ ...user, ...updatedUser }));
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
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'DELETE',
                headers: {
                    'X-User-Role': user.role,
                    'X-User-Id': String(user.id)
                }
            });

            if (res.ok) {
                toast.success('Account deleted successfully');
                localStorage.removeItem('user');
                router.push('/');
            } else {
                const data = await res.json();
                toast.error('Failed to delete account: ' + data.error);
            }
        } catch (e) {
            toast.error('Error deleting account');
        }
    };

    if (!user) return <FullScreenLoader />;

    return (
        <div className="">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl sm:text-2xl font-bold">User Dashboard</h1>
            </div>

            <div className="mt-4 p-6 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <p className="text-xl">Welcome, <span className="font-bold text-indigo-900">{user.name}</span></p>
                    <p className="text-gray-500">Email: {user.email}</p>
                </div>

                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all h-9 sm:h-10 text-sm sm:text-base px-4 sm:px-6">
                            Edit Profile
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Edit Profile</DialogTitle>
                            <DialogDescription>
                                Make changes to your profile here. Click save when you're done.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4 pt-4 space-y-2">
                            <div className="flex flex-col space-y-2">
                                <Label htmlFor="name" className="">
                                    Name
                                </Label>
                                <Input
                                    id="name"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="focus:ring-indigo-500"
                                />
                            </div>
                            <div className="flex flex-col space-y-2">
                                <Label htmlFor="email" className="">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    className="focus:ring-indigo-500"
                                />
                            </div>
                            <div className="flex flex-col space-y-2">
                                <Label htmlFor="password" className="">
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="(Leave blank to keep current)"
                                    value={editForm.password}
                                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                    className="focus:ring-indigo-500"
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" className='w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md active:scale-[0.98] transition-all h-9 sm:h-10 text-sm sm:text-base'>
                                    Save changes
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

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
                            This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteAccount} className="bg-red-600 hover:bg-red-700">Delete Account</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
