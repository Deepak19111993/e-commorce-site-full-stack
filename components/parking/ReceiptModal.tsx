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
import { CheckCircle2, Download } from "lucide-react";

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactionId: string | number | null;
    slotId: number | null;
    amount: number;
    date: Date;
}

export function ReceiptModal({
    isOpen,
    onClose,
    transactionId,
    slotId,
    amount,
    date
}: ReceiptModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <DialogTitle className="text-xl text-green-700">Payment Successful!</DialogTitle>
                    <DialogDescription>
                        Your parking slot has been securely booked.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Transaction ID</span>
                            <span className="font-mono text-gray-900">#{transactionId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Slot Number</span>
                            <span className="font-bold text-gray-900">P-{slotId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Date</span>
                            <span className="text-gray-900">{date.toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 mt-2">
                            <span className="font-semibold text-gray-900">Amount Paid</span>
                            <span className="font-bold text-indigo-600">₹{amount}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={onClose} className="w-full bg-gray-900 hover:bg-gray-800 text-white">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
