'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, ShieldCheck } from "lucide-react";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    loading: boolean;
    amount: number;
    slotId: number | null;
}

export function PaymentModal({
    isOpen,
    onClose,
    onConfirm,
    loading,
    amount,
    slotId
}: PaymentModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Confirm Parking Booking</DialogTitle>
                    <DialogDescription>
                        You are booking Slot P-{slotId}. Complete the payment to confirm your spot.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 flex flex-col items-center justify-center space-y-4">
                    <div className="p-4 bg-indigo-50 rounded-full">
                        <CreditCard className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-500">Total Amount</p>
                        <p className="text-3xl font-bold text-gray-900">₹{amount}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Secured by Razorpay • UPI, Cards, Wallets</span>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:justify-between gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="w-full">
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Pay with Razorpay'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
