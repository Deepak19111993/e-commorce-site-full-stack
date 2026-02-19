"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FullScreenLoader, Loader } from "@/components/ui/loader";
import Image from "next/image";
import { toast } from "sonner";
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

import { ChevronDown, ChevronUp } from "lucide-react";

import { motion } from "framer-motion";

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [orderToCancel, setOrderToCancel] = useState<number | null>(null);
    const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

    const toggleOrderExpansion = (orderId: number) => {
        setExpandedOrders(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        // Validation: Check if user exists and has a valid UUID (contains hyphens)
        if (user.id && !String(user.id).includes('-')) {
            console.warn("Detected invalid/old User ID type. Clearing session.");
            localStorage.removeItem('user');
            localStorage.removeItem('cart');
            window.location.href = '/login';
            return;
        }

        if (!user.id) {
            setLoading(false);
            return;
        }

        console.log("Fetching orders for user:", user.id);

        fetch("/api/orders", {
            headers: {
                'X-User-Role': user.role || 'user',
                'X-User-Id': String(user.id)
            }
        }).then((res) => {
            if (res.ok) return res.json();
            return res.text().then(text => {
                throw new Error(text || 'Failed to fetch');
            });
        })
            .then(data => {
                console.log("Orders fetched:", data);
                if (Array.isArray(data)) {
                    setOrders(data);
                } else {
                    console.error("Orders data is not an array:", data);
                    setOrders([]);
                }
            })
            .catch((err) => {
                console.error("Error fetching orders:", err);
                toast.error("Failed to load orders. Please try logging in again.");
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const handleCancelOrder = async () => {
        if (!orderToCancel) return;

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        try {
            const res = await fetch(`/api/orders/${orderToCancel}`, {
                method: 'DELETE',
                headers: {
                    'X-User-Role': user.role || 'user',
                    'X-User-Id': String(user.id)
                }
            });

            if (res.ok) {
                toast.success("Order cancelled successfully");
                setOrders(orders.filter(o => o.id !== orderToCancel));
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to cancel order");
            }
        } catch (error) {
            console.error("Error cancelling order:", error);
            toast.error("An error occurred");
        } finally {
            setOrderToCancel(null);
        }
    };

    if (loading) return <FullScreenLoader />;

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


    return (
        <div className="space-y-6 max-w-5xl w-full mx-auto pt-6">
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-2xl sm:text-3xl font-bold mb-6"
            >
                Your Orders
            </motion.h1>
            {orders.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                        <p className="text-xl">No orders yet.</p>
                        <p>Go shopping and fill up your cart!</p>
                    </CardContent>
                </Card>
            ) : (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="space-y-6"
                >
                    {orders.map((order) => (
                        <motion.div key={order.id} variants={itemVariants}>
                            <Card className="overflow-hidden border shadow-sm">
                                <CardHeader className="bg-gray-50 border-b p-4 flex flex-row justify-between items-center space-y-0">
                                    <div className="space-y-1">
                                        <div className="font-bold">Order #{order.id}</div>
                                        <div className="text-sm text-gray-500">
                                            {new Date(order.createdAt).toLocaleDateString()} • {new Date(order.createdAt).toLocaleTimeString()}
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <div className="font-bold text-lg">${order.total}</div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-1 rounded-full text-white uppercase font-bold
                                            ${order.status === 'processing' ? 'bg-blue-500' :
                                                    order.status === 'shipped' ? 'bg-indigo-500' :
                                                        order.status === 'delivered' ? 'bg-green-500' : 'bg-gray-500'}
                                        `}>
                                                {order.status}
                                            </span>
                                            {order.status === 'processing' && (
                                                <button
                                                    onClick={() => setOrderToCancel(order.id)}
                                                    className="text-xs bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full hover:bg-rose-600 hover:text-white transition-all duration-200 font-semibold border border-rose-100 hover:border-rose-600 shadow-sm active:scale-[0.95]"
                                                >
                                                    Cancel Order
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-gray-100">
                                        {(expandedOrders.has(order.id) ? order.items : order.items?.slice(0, 1)).map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-4 py-3 px-4 hover:bg-gray-50/50 transition-colors">
                                                {/* Product Image */}
                                                <div className="h-14 w-14 bg-gray-100 rounded-lg flex items-center justify-center text-2xl shrink-0 overflow-hidden relative border shadow-sm">
                                                    {item.product?.image ? (
                                                        <Image
                                                            src={item.product.image}
                                                            alt={item.product.name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="56px"
                                                        />
                                                    ) : (
                                                        <span>📦</span>
                                                    )}
                                                </div>
                                                <div className="flex-grow">
                                                    <h4 className="font-semibold text-gray-900 leading-tight">{item.product?.name || "Unknown Product"}</h4>
                                                    <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{item.product?.description || "No description provided"}</p>
                                                </div>
                                                <div className="text-right whitespace-nowrap min-w-[70px]">
                                                    <div className="font-bold text-indigo-600">${item.price}</div>
                                                    <div className="text-xs text-gray-400 font-medium">Qty: {item.quantity}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {order.items?.length > 1 && (
                                        <button
                                            onClick={() => toggleOrderExpansion(order.id)}
                                            className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50/50 transition-colors border-t border-gray-100"
                                        >
                                            {expandedOrders.has(order.id) ? (
                                                <>
                                                    Show Less <ChevronUp size={16} />
                                                </>
                                            ) : (
                                                <>
                                                    Show {order.items.length - 1} More Items <ChevronDown size={16} />
                                                </>
                                            )}
                                        </button>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            <AlertDialog open={!!orderToCancel} onOpenChange={(open) => !open && setOrderToCancel(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently cancel your order.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelOrder} className="bg-red-600 hover:bg-red-700">
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
