'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ArrowLeft, Receipt, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FullScreenLoader } from "@/components/ui/loader";

interface Transaction {
    id: number;
    amount: string;
    status: string;
    createdAt: string;
    slotId: number | null;
    startTime: string | null;
    endTime: string | null;
}

export default function TransactionsPage() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.role === 'admin') {
                router.push('/parking/admin/dashboard');
                return;
            }
            setUser(parsedUser);
        } else {
            router.push('/login?type=parking');
        }
    }, [router]);

    useEffect(() => {
        if (!user) return;

        const fetchTransactions = async () => {
            try {
                const res = await fetch('/api/parking/transactions', {
                    headers: {
                        'X-User-Id': String(user.id)
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTransactions(data);
                }
            } catch (error) {
                console.error('Failed to fetch transactions', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, [user]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'pending':
                return <Clock className="w-5 h-5 text-yellow-500" />;
            case 'failed':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <FileText className="w-5 h-5 text-gray-500" />;
        }
    };

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

    if (loading) {
        return <FullScreenLoader />;
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="container mx-auto py-8 max-w-4xl"
        >
            <div className="flex items-center gap-4 mb-8">
                <Link href="/parking" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Transaction History</h1>
                    <p className="text-gray-500">View all your parking payments.</p>
                </div>
            </div>

            <Card className="border-none shadow-lg bg-white">
                <CardHeader className="bg-gray-50 border-b">
                    <CardTitle className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-indigo-600" />
                        Transactions
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {transactions.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No transactions found.</p>
                        </div>
                    ) : (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="divide-y divide-gray-100"
                        >
                            {transactions.map((tx) => (
                                <motion.div
                                    key={tx.id}
                                    variants={itemVariants}
                                    className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1">
                                            {getStatusIcon(tx.status)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900 text-lg">₹{tx.amount}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${tx.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                    tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                    {tx.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">Transaction ID: #{tx.id}</p>
                                            <p className="text-xs text-gray-400">{format(new Date(tx.createdAt), "PPP p")}</p>
                                        </div>
                                    </div>

                                    {tx.slotId && (
                                        <div className="bg-indigo-50 px-4 py-2 rounded-lg text-right">
                                            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">Parking Slot</p>
                                            <p className="font-bold text-indigo-900 text-lg">P-{tx.slotId}</p>
                                            <p className="text-xs text-gray-500">
                                                {tx.startTime && format(new Date(tx.startTime), "MMM dd")}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
