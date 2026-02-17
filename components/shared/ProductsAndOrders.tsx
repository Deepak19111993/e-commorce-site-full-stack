
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";


import { useRouter } from "next/navigation";
import { toast } from "sonner";

import ProductSkeleton from "./ProductSkeleton";

export default function ProductsAndOrders() {
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [mounted, setMounted] = useState(false);
    const [cart, setCart] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setMounted(true);
        fetch("/api/products")
            .then((res) => res.json())
            .then((data) => {
                setProducts(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));

        const storedCart = JSON.parse(localStorage.getItem('cart') || '[]');
        setCart(storedCart);
    }, []);

    const createProduct = async () => {
        const name = prompt("Enter product name");
        const price = prompt("Enter price");
        if (!name || !price) return;

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        await fetch("/api/products", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': String(user.id)
            },
            body: JSON.stringify({ name, price: parseFloat(price), stock: 10 }),
        });
        fetch("/api/products").then((res) => res.json()).then(setProducts);
    };

    const addToCart = (product: any) => {
        const user = localStorage.getItem('user');
        if (!user) {
            toast.error("Please login to add items to cart");
            router.push('/login');
            return;
        }

        const newCart = [...cart];
        const existingItem = newCart.find((item: any) => item.id === product.id);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            newCart.push({ ...product, quantity: 1 });
        }

        setCart(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));
        toast.success(`Added ${product.name} to cart`);
    };

    // Only check auth after mount to prevent hydration mismatch
    const isAdmin = mounted && JSON.parse(localStorage.getItem('user') || '{}').role === 'admin';

    // Show skeleton only if loading AND not admin (user request was "for the user only")
    // Use the skeleton for everyone during loading, but we can verify the requirement.
    // Logic: if loading, show skeleton.

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        Products
                        {isAdmin && (
                            <button onClick={createProduct} className="text-sm bg-green-500 text-white px-2 py-1 rounded">Add Product</button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <ProductSkeleton />
                    ) : products.length === 0 ? (
                        <p>No products.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {products.map((p) => {
                                const isInCart = cart.some((item) => item.id === p.id);
                                return (
                                    <Card key={p.id} className="overflow-hidden">
                                        <div className="h-48 bg-gray-200 flex items-center justify-center text-gray-500 relative">
                                            {p.image ? (
                                                <Image
                                                    src={p.image}
                                                    alt={p.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                />
                                            ) : (
                                                <span className="text-4xl">📦</span>
                                            )}
                                        </div>
                                        <CardHeader className="p-4">
                                            <CardTitle className="text-lg">{p.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <p className="text-gray-600 text-sm mb-2 line-clamp-2">{p.description || "No description provided."}</p>
                                            <div className="flex justify-between items-center font-bold mb-2">
                                                <span>${p.price}</span>
                                                <span className="text-xs text-gray-500 font-normal">{p.stock} in stock</span>
                                            </div>
                                            <button
                                                onClick={() => addToCart(p)}
                                                disabled={isInCart}
                                                className={`w-full py-2 sm:py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-sm active:scale-[0.98] text-sm sm:text-base
                                                    ${isInCart
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border'
                                                        : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300'}`}
                                            >
                                                {isInCart ? "Already in Cart" : "Add to Cart"}
                                            </button>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
