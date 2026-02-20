'use client';

import Link from 'next/link';
import { Train, Ticket, Activity, Landmark, ArrowRightLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TrainDashboard() {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    return (
        <div className="max-w-7xl w-full mx-auto py-8">
            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="space-y-8"
            >
                <motion.div variants={itemVariants} className="text-center space-y-4">
                    <h1 className="text-4xl font-bold text-gray-900">Train Services</h1>
                    <p className="text-lg text-gray-600">Access real-time information for Indian Railways</p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6">
                    <motion.div variants={itemVariants}>
                        <Link href="/train/pnr" className="block group">
                            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 group-hover:border-orange-200">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
                                        <Ticket size={32} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800">PNR Status</h2>
                                </div>
                                <p className="text-gray-600">
                                    Check the current status of your train ticket bookings. Get confirmation probability and chart status.
                                </p>
                            </div>
                        </Link>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <Link href="/train/status" className="block group">
                            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 group-hover:border-orange-200">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
                                        <Activity size={32} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800">Live Status</h2>
                                </div>
                                <p className="text-gray-600">
                                    Track your train in real-time. See current location, delay information, and upcoming stations.
                                </p>
                            </div>
                        </Link>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <Link href="/train/station" className="block group">
                            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 group-hover:border-orange-200">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
                                        <Landmark size={32} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800">Live Station</h2>
                                </div>
                                <p className="text-gray-600">
                                    Check upcoming trains at a station. See arrival/departure times, platforms, and delay status.
                                </p>
                            </div>
                        </Link>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <Link href="/train/between" className="block group">
                            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 group-hover:border-orange-200">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 rounded-lg bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
                                        <ArrowRightLeft size={32} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800">Trains Between</h2>
                                </div>
                                <p className="text-gray-600">
                                    Find direct trains running between two specific stations along with their schedule.
                                </p>
                            </div>
                        </Link>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
