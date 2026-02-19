'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Car } from 'lucide-react';

import { motion } from "framer-motion";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialType = searchParams.get('type') === 'parking' ? 'parking' : 'store';

    const [activeTab, setActiveTab] = useState<'store' | 'parking'>(initialType);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (searchParams.get('type') === 'parking') {
            setActiveTab('parking');
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, type: activeTab }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Store user/role in localStorage for demo purposes
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect based on role and context
            if (activeTab === 'parking') {
                if (data.user.role === 'admin') {
                    router.push('/parking/admin/dashboard');
                } else {
                    router.push('/parking');
                }
            } else {
                if (data.user.role === 'admin') {
                    router.push('/admin/dashboard');
                } else {
                    router.push('/');
                }
            }
            // Force a refresh to update header state
            router.refresh();

        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleTabChange = (type: 'store' | 'parking') => {
        setActiveTab(type);
        const newUrl = type === 'parking' ? '/login?type=parking' : '/login';
        router.replace(newUrl, { scroll: false });
    };

    const formVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5 }
        }
    };


    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={formVariants}
            className="w-full max-w-md space-y-8"
        >
            <div className="flex flex-col items-center gap-4 mb-4">
                <div className={`p-4 rounded-2xl text-white shadow-xl transition-transform duration-500 hover:scale-110 hover:rotate-3 ${activeTab === 'parking' ? 'bg-gradient-to-br from-emerald-600 to-teal-600 shadow-emerald-100' : 'bg-gradient-to-br from-indigo-600 to-violet-600 shadow-indigo-100'}`}>
                    {activeTab === 'parking' ? <Car size={32} /> : <ShoppingBag size={32} />}
                </div>
            </div>


            <div className="sm:p-8 p-4 bg-white rounded-2xl shadow-xl border border-gray-100">

                <div>
                    <h2 className="text-center text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
                        Sign in to <span className={activeTab === 'store' ? 'text-indigo-600' : 'text-emerald-600'}>
                            {activeTab === 'store' ? 'Store' : 'Parking'}
                        </span>
                    </h2>

                    <div className="flex p-1 bg-gray-100 rounded-lg mb-8">
                        <button
                            type="button"
                            onClick={() => handleTabChange('store')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'store' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <ShoppingBag className="w-4 h-4" />
                            Store User
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTabChange('parking')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'parking' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Car className="w-4 h-4" />
                            Parking User
                        </button>
                    </div>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                            {error}
                        </div>
                    )}
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <Input
                                id="email-address"
                                name="email"
                                type="email"
                                required
                                placeholder="Email address"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                placeholder="Password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <Button
                            type="submit"
                            className={`w-full h-9 sm:h-10 text-sm sm:text-base ${activeTab === 'parking' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                        >
                            Sign in
                        </Button>
                    </div>
                    <div className="text-center text-sm">
                        <Link
                            href={`/signup${activeTab === 'parking' ? '?type=parking' : ''}`}
                            className={`font-medium ${activeTab === 'parking' ? 'text-emerald-600 hover:text-emerald-500' : 'text-indigo-600 hover:text-indigo-500'}`}
                        >
                            Don't have an account? Sign up
                        </Link>
                    </div>
                </form>
            </div>
        </motion.div>
    );
}


export default function LoginPage() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 py-8 md:py-12">
            <Suspense fallback={<div>Loading...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    );
}
