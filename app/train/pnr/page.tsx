'use client';

import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ticket, Search, User, Calendar, Train } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PNRStatusPage() {
    const [pnr, setPnr] = useState('');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pnr || pnr.length !== 10) {
            setError('Please enter a valid 10-digit PNR number');
            return;
        }

        setLoading(true);
        setError('');
        setData(null);

        try {
            const res = await fetch(`/api/train/pnr/${pnr}`);
            const json = await res.json();

            if (!json.success && !json.Status) { // Handling different API response structures if necessary
                setError(json.error || 'Failed to fetch PNR status');
            } else {
                setData(json.data || json); // Adapt based on actual response structure
            }

        } catch (err) {
            setError('An error occurred while fetching PNR status');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl w-full mx-auto py-8 px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
            >
                <div className="bg-gradient-to-r from-orange-600 to-red-600 sm:p-8 p-4 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <Ticket className="h-8 w-8" />
                        <h1 className="text-2xl sm:text-3xl font-bold">PNR Status</h1>
                    </div>
                    <p className="text-orange-100">Check current status of your train booking</p>
                </div>

                <div className="py-4 px-3 sm:px-5 sm:py-8">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                        <Input
                            placeholder="Enter 10-digit PNR Number"
                            value={pnr}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setPnr(val);
                                setError('');
                            }}
                            className="flex-1 text-lg py-6"
                        />
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-orange-600 hover:bg-orange-700 py-6 px-8 text-lg"
                        >
                            {loading ? 'Checking...' : (
                                <>
                                    <Search className="mr-2 h-5 w-5" /> Check Status
                                </>
                            )}
                        </Button>
                    </form>

                    {error && (
                        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                            {error}
                        </div>
                    )}

                    {data && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-8 space-y-6"
                        >
                            {/* Raw Data Display for now to ensure we see what we get, can style better once data structure is confirmed */}
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Train className="text-orange-600" />
                                    Journey Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                                    <div><strong>Train Name:</strong> {data.TrainName || data.train_name || 'N/A'}</div>
                                    <div><strong>Train Number:</strong> {data.TrainNo || data.train_number || 'N/A'}</div>
                                    <div><strong>Date:</strong> {data.Doj || data.doj || 'N/A'}</div>
                                    <div><strong>From:</strong> {data.From || data.from_station || 'N/A'}</div>
                                    <div><strong>To:</strong> {data.To || data.to_station || 'N/A'}</div>
                                    <div><strong>Boarding:</strong> {data.BoardingPoint || data.boarding_point || 'N/A'}</div>
                                </div>
                            </div>

                            <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <User className="text-orange-600" />
                                    Passenger Status
                                </h3>
                                {/* Assuming PassengerList is an array */}
                                {data.PassengerStatus ? (
                                    <div className="space-y-3">
                                        {Array.isArray(data.PassengerStatus) ? data.PassengerStatus.map((p: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                                                <span className="font-medium">Passenger {i + 1}</span>
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-500">Booking Status</div>
                                                    <div className="font-bold text-gray-900">{p.BookingStatus || p.CurrentStatus || 'N/A'}</div>
                                                </div>
                                            </div>
                                        )) : <pre>{JSON.stringify(data.PassengerStatus, null, 2)}</pre>}
                                    </div>
                                ) : (
                                    <div className="text-gray-500">Passenger details specific structure varies. Raw: <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre></div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
