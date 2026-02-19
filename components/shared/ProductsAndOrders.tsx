"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ProductSkeleton from "./ProductSkeleton";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";

import { motion } from "framer-motion";

export default function ProductsAndOrders() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [products, setProducts] = useState<any[]>([]);
    const [allCategories, setAllCategories] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);
    const [cart, setCart] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

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

    // Get filter values from URL query parameters
    const selectedCategory = searchParams.get('category') || 'All';
    const selectedPriceRange = searchParams.get('priceRange') || 'All';
    const showInStockOnly = searchParams.get('inStock') === 'true';

    useEffect(() => {
        setMounted(true);

        // Load cart from localStorage
        const storedCart = JSON.parse(localStorage.getItem('cart') || '[]');
        setCart(storedCart);

        // Fetch all categories for the filter sidebar (fetch without filters to get all category options)
        fetch("/api/products")
            .then((res) => res.json())
            .then((data) => {
                const categories = Array.from(new Set(data.map((p: any) => p.category).filter(Boolean)));
                setAllCategories(categories as string[]);
            });
    }, []);

    // Fetch filtered products when URL params change
    useEffect(() => {
        if (!mounted) return;

        setLoading(true);

        // Build query string based on filters
        const params = new URLSearchParams();

        if (selectedCategory && selectedCategory !== 'All') {
            params.append('category', selectedCategory);
        }

        // Handle price range
        const priceRanges: Record<string, { min: number, max: number }> = {
            "Under $50": { min: 0, max: 50 },
            "$50 - $100": { min: 50, max: 100 },
            "$100 - $200": { min: 100, max: 200 },
            "$200+": { min: 200, max: Infinity },
        };

        if (selectedPriceRange && selectedPriceRange !== 'All') {
            const range = priceRanges[selectedPriceRange];
            if (range) {
                params.append('minPrice', range.min.toString());
                if (range.max !== Infinity) {
                    params.append('maxPrice', range.max.toString());
                }
            }
        }

        if (showInStockOnly) {
            params.append('inStock', 'true');
        }

        const queryString = params.toString();
        const url = `/api/products${queryString ? `?${queryString}` : ''}`;

        fetch(url)
            .then((res) => res.json())
            .then((data) => {
                setProducts(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [selectedCategory, selectedPriceRange, showInStockOnly, mounted]);

    // Update URL when filters change
    const updateFilter = (key: string, value: string | boolean) => {
        const params = new URLSearchParams(searchParams.toString());

        if (value === 'All' || value === false || value === '') {
            params.delete(key);
        } else {
            params.set(key, value.toString());
        }

        router.push(`?${params.toString()}`, { scroll: false });
    };

    const clearAllFilters = () => {
        router.push('?', { scroll: false });
    };

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
            toast.error("Please login to add items to basket");
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
        toast.success(`Added ${product.name} to basket`);
    };

    const isAdmin = mounted && JSON.parse(localStorage.getItem('user') || '{}').role === 'admin';

    const categories = ["All", ...allCategories];

    const priceRanges = [
        { label: "All", min: 0, max: Infinity },
        { label: "Under $50", min: 0, max: 50 },
        { label: "$50 - $100", min: 50, max: 100 },
        { label: "$100 - $200", min: 100, max: 200 },
        { label: "$200+", min: 200, max: Infinity },
    ];

    return (
        <div className="">
            {/* Mobile filter toggle & Admin button */}
            <div className="flex justify-end gap-2 sm:mb-0 mb-4">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="md:hidden text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1"
                >
                    <Filter className="h-4 w-4" />
                    Filters
                </button>
                {isAdmin && (
                    <button onClick={createProduct} className="text-sm bg-green-500 text-white px-2 py-1 rounded">Add Product</button>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Mobile Drawer Backdrop */}
                {sidebarOpen && (
                    <div
                        className="md:hidden fixed inset-0 bg-black/50 z-40"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Left Sidebar - Filters */}
                <aside className={`
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                    md:translate-x-0
                    fixed md:static
                    inset-y-0 left-0 z-50 md:z-auto
                    w-80 md:w-64 flex-shrink-0
                    md:sticky md:top-[70px] md:self-start
                    md:max-h-[calc(100vh-70px-2rem)] md:overflow-y-auto
                    bg-white md:bg-gray-50 md:p-4 md:rounded-lg 
                    shadow-2xl md:shadow-none
                    transition-transform duration-300 ease-in-out
                    flex flex-col md:block
                `}>
                    {/* Mobile Drawer Header */}
                    <div className="md:hidden flex items-center justify-between p-4 pb-4 border-b flex-shrink-0">
                        <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Scrollable Filter Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-0 space-y-6">
                        {/* Categories */}
                        <div>
                            <h3 className="font-semibold text-sm text-gray-700 mb-3 uppercase tracking-wide">Categories</h3>
                            <div className="space-y-2">
                                {categories.map((cat: any) => (
                                    <button
                                        key={cat}
                                        onClick={() => updateFilter('category', cat)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all
                                                ${selectedCategory === cat
                                                ? 'bg-indigo-600 text-white font-medium'
                                                : 'text-gray-700 hover:bg-gray-200'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Price Range */}
                        <div>
                            <h3 className="font-semibold text-sm text-gray-700 mb-3 uppercase tracking-wide">Price Range</h3>
                            <div className="space-y-2">
                                {priceRanges.map((range) => (
                                    <button
                                        key={range.label}
                                        onClick={() => updateFilter('priceRange', range.label)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all
                                                ${selectedPriceRange === range.label
                                                ? 'bg-indigo-600 text-white font-medium'
                                                : 'text-gray-700 hover:bg-gray-200'}`}
                                    >
                                        {range.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Stock Availability */}
                        <div>
                            <h3 className="font-semibold text-sm text-gray-700 mb-3 uppercase tracking-wide">Availability</h3>
                            <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md hover:bg-gray-200 transition-all">
                                <input
                                    type="checkbox"
                                    checked={showInStockOnly}
                                    onChange={(e) => updateFilter('inStock', e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-700">In Stock Only</span>
                            </label>
                        </div>

                        {/* Clear Filters */}
                        {(selectedCategory !== "All" || selectedPriceRange !== "All" || showInStockOnly) && (
                            <button
                                onClick={clearAllFilters}
                                className="w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium py-2"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>

                    {/* Mobile Apply Button - Fixed Footer */}
                    <div className="md:hidden border-t bg-white p-4 flex-shrink-0">
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg"
                        >
                            Apply Filters
                        </button>
                    </div>
                </aside>

                {/* Right Panel - Products Grid */}
                <div className="flex-1">
                    {loading ? (
                        <ProductSkeleton />
                    ) : products.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-gray-500 text-lg mb-2">No products found</p>
                            <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                        </div>
                    ) : (
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="show"
                            className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4"
                        >
                            {products.map((p) => {
                                const isInCart = cart.some((item) => item.id === p.id);
                                const isOutOfStock = p.stock <= 0;
                                return (
                                    <motion.div key={p.id} variants={itemVariants} className="h-full">
                                        <Card className={`overflow-hidden flex flex-col h-full ${isOutOfStock ? 'opacity-60 grayscale pointer-events-none' : ''}`}>
                                            <div className="h-40 sm:h-48 bg-gray-200 flex items-center justify-center text-gray-500 relative">
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
                                                {p.category && (
                                                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-indigo-700 uppercase tracking-wider shadow-sm border border-indigo-100">
                                                        {p.category}
                                                    </div>
                                                )}
                                            </div>
                                            <CardHeader className="p-2 sm:p-4">
                                                <CardTitle className="text-sm sm:text-lg leading-[120%]">{p.name}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-2 sm:p-4 pt-0 flex flex-col flex-1">
                                                <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2 leading-[120%]">{p.description || "No description provided."}</p>
                                                <div className="flex justify-between items-center font-bold mb-2 text-sm sm:text-base">
                                                    <span>${p.price}</span>
                                                    <span className="text-[10px] sm:text-xs text-gray-500 font-normal">{p.stock} in stock</span>
                                                </div>
                                                <button
                                                    onClick={() => addToCart(p)}
                                                    disabled={isInCart || isOutOfStock}
                                                    className={`w-full py-2 sm:py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-sm active:scale-[0.98] text-xs sm:text-base mt-auto
                                                            ${isOutOfStock
                                                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed border'
                                                            : isInCart
                                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border'
                                                                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300'}`}
                                                >
                                                    {isOutOfStock ? "Out of Stock" : isInCart ? "Already in Basket" : "Add to Basket"}
                                                </button>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
