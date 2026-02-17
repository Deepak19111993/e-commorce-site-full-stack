"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Minus, Plus, Trash2 } from "lucide-react";

export default function CartPage() {
    const [cart, setCart] = useState<any[]>([]);
    const [mounted, setMounted] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("cod");
    const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        const storedCart = JSON.parse(localStorage.getItem('cart') || '[]');
        setCart(storedCart);
    }, []);

    const updateQuantity = (productId: number, delta: number) => {
        const updatedCart = cart.map(item => {
            if (item.id === productId) {
                const newQuantity = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQuantity };
            }
            return item;
        }).filter(item => item.quantity > 0);

        setCart(updatedCart);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        if (updatedCart.length === 0) {
            toast.info("Basket is now empty");
        }
    };

    const removeItem = (productId: number) => {
        const updatedCart = cart.filter(item => item.id !== productId);
        setCart(updatedCart);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        toast.info("Item removed from cart");
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handlePlaceOrderClick = () => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.id) {
            toast.error("Please login to place an order");
            router.push("/login");
            return;
        }
        setIsPaymentModalOpen(true);
    };

    const confirmOrder = async () => {
        if (paymentMethod === 'card') {
            if (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv) {
                toast.error("Please fill in all card details");
                return;
            }
            if (cardDetails.number.replace(/\s/g, '').length < 16) {
                toast.error("Invalid card number");
                return;
            }
        }

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const orderData = {
            userId: user.id,
            total: total,
            paymentMethod: paymentMethod,
            items: cart.map(item => ({
                productId: item.id,
                quantity: item.quantity,
                price: item.price
            }))
        };

        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (res.ok) {
                localStorage.removeItem('cart');
                setCart([]);
                setIsPaymentModalOpen(false);
                setCardDetails({ number: '', expiry: '', cvv: '' });
                toast.success("Order placed successfully!");
                router.push("/orders");
            } else {
                toast.error("Failed to place order");
            }
        } catch (error) {
            console.error("Error placing order:", error);
            toast.error("An error occurred");
        }
    };

    if (!mounted) return null;

    if (cart.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10 space-y-4">
                <span className="text-6xl">🛒</span>
                <h1 className="text-2xl font-bold text-gray-700">Your cart is empty</h1>
                <p className="text-gray-500">Go add some products to get started!</p>
                <button
                    onClick={() => router.push("/")}
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white px-6 sm:px-8 py-2 sm:py-2.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] text-sm sm:text-base"
                >
                    Browse Products
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold">Shopping Basket</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Cart Items - Left Column */}
                <div className="md:col-span-2 space-y-4">
                    {cart.map((item) => (
                        <Card key={item.id} className="overflow-hidden border shadow-sm hover:shadow-md transition relative group">
                            {/* Remove Button - Top Right */}
                            <button
                                onClick={() => removeItem(item.id)}
                                className="absolute top-2 right-2 p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                                title="Remove from cart"
                            >
                                <Trash2 size={18} />
                            </button>

                            <CardContent className="p-3 sm:p-4">
                                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
                                    {/* Product Image and Main Info Row */}
                                    <div className="flex gap-3 items-center sm:items-start grow">
                                        {/* Product Image */}
                                        <div className="h-20 w-20 sm:h-24 sm:w-24 bg-gray-100 rounded-md flex items-center justify-center text-3xl sm:text-4xl shrink-0 overflow-hidden relative border">
                                            {item.image ? (
                                                <Image
                                                    src={item.image}
                                                    alt={item.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="(max-width: 640px) 80px, 96px"
                                                />
                                            ) : (
                                                <span>📦</span>
                                            )}
                                        </div>

                                        <div className="flex-grow min-w-0">
                                            <h3 className="font-semibold text-base sm:text-lg truncate" title={item.name}>{item.name}</h3>
                                            <p className="text-gray-500 text-xs sm:text-sm line-clamp-1">{item.description}</p>

                                            {/* Quantity and Price - Desktop Only (Hidden on mobile row) */}
                                            <div className="hidden sm:flex mt-3 items-center gap-6">
                                                {/* Quantity Controls */}
                                                <div className="flex items-center border rounded-lg bg-gray-50 overflow-hidden">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, -1)}
                                                        className="p-1.5 hover:bg-gray-200 text-gray-600 transition"
                                                        title="Decrease quantity"
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className="w-10 text-center font-medium text-sm">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, 1)}
                                                        className="p-1.5 hover:bg-gray-200 text-gray-600 transition"
                                                        title="Increase quantity"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                                <span className="font-bold text-blue-600 text-sm sm:text-base">${item.price}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile Only: Quantity, Price, and Total Row */}
                                    <div className="flex sm:hidden items-center justify-between pt-2 border-t mt-1">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center border rounded-lg bg-gray-50 overflow-hidden">
                                                <button
                                                    onClick={() => updateQuantity(item.id, -1)}
                                                    className="p-1 px-2 hover:bg-gray-200 text-gray-600 transition"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="w-8 text-center font-medium text-xs">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, 1)}
                                                    className="p-1 px-2 hover:bg-gray-200 text-gray-600 transition"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                            <span className="text-xs text-gray-400">@ ${item.price}</span>
                                        </div>
                                        <div className="font-bold text-lg">
                                            ${(item.price * item.quantity).toFixed(2)}
                                        </div>
                                    </div>

                                    {/* Desktop Only: Item Total Price */}
                                    <div className="hidden sm:block text-right font-bold text-lg sm:text-xl min-w-[80px]">
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Order Summary - Right Column */}
                <div className="md:col-span-1">
                    <Card className="sticky top-4 border shadow-md">
                        <CardHeader className="bg-gray-50/50 pb-4 border-b">
                            <CardTitle className="text-lg">Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="sm:p-6 p-4 space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Items ({totalItems})</span>
                                <span>${total}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Shipping</span>
                                <span className="text-green-600">Free</span>
                            </div>
                            <div className="border-t pt-4 flex justify-between items-center font-bold text-xl">
                                <span>Total</span>
                                <span>${total}</span>
                            </div>
                            <button
                                onClick={handlePlaceOrderClick}
                                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-2 sm:py-3 rounded-lg transition-all duration-200 font-semibold shadow-md hover:shadow-lg active:scale-[0.98] mt-2 flex items-center justify-center gap-2 text-sm sm:text-base"
                            >
                                Place Order
                            </button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Select Payment Method</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-6">
                        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="gap-4">
                            <div className={`flex items-center space-x-2 border p-4 rounded-lg cursor-pointer transition ${paymentMethod === 'cod' ? 'border-blue-500 bg-blue-50/50' : 'hover:bg-gray-50'}`} onClick={() => setPaymentMethod("cod")}>
                                <RadioGroupItem value="cod" id="cod" />
                                <Label htmlFor="cod" className="cursor-pointer flex-grow font-medium text-base">Cash on Delivery</Label>
                                <span className="text-2xl">💵</span>
                            </div>
                            <div className={`flex items-center space-x-2 border p-4 rounded-lg cursor-pointer transition ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-50/50' : 'hover:bg-gray-50'}`} onClick={() => setPaymentMethod("card")}>
                                <RadioGroupItem value="card" id="card" />
                                <Label htmlFor="card" className="cursor-pointer flex-grow font-medium text-base">Card Payment</Label>
                                <span className="text-2xl">💳</span>
                            </div>
                        </RadioGroup>

                        {paymentMethod === 'card' && (
                            <div className="space-y-4 pt-4 border-t animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label htmlFor="cardNumber">Card Number</Label>
                                    <input
                                        id="cardNumber"
                                        type="text"
                                        placeholder="0000 0000 0000 0000"
                                        maxLength={19}
                                        value={cardDetails.number}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
                                            setCardDetails({ ...cardDetails, number: val.slice(0, 19) });
                                        }}
                                        className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="expiry">Expiry Date</Label>
                                        <input
                                            id="expiry"
                                            type="text"
                                            placeholder="MM/YY"
                                            maxLength={5}
                                            value={cardDetails.expiry}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                let formatted = val;
                                                if (val.length > 2) {
                                                    formatted = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
                                                }
                                                setCardDetails({ ...cardDetails, expiry: formatted });
                                            }}
                                            className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cvv">CVV</Label>
                                        <input
                                            id="cvv"
                                            type="password"
                                            placeholder="123"
                                            maxLength={3}
                                            value={cardDetails.cvv}
                                            onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                                            className="w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <button
                            onClick={confirmOrder}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2 sm:py-2.5 rounded-lg w-full font-semibold shadow-md transition-all duration-200 active:scale-[0.98] text-sm sm:text-base"
                        >
                            Confirm Order
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
